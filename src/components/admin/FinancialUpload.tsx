import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadResult {
  snapshotId: string;
  summary: Record<string, unknown>;
}

interface UploadItem {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  result?: UploadResult;
  error?: string;
}

interface FinancialUploadProps {
  onUploadComplete: () => void;
}

export default function FinancialUpload({ onUploadComplete }: FinancialUploadProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const newUploads: UploadItem[] = Array.from(files)
      .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
      .map((file) => ({ file, status: "pending" as const }));

    if (newUploads.length === 0) return;
    setUploads((prev) => [...prev, ...newUploads]);

    // Auto-upload each file
    newUploads.forEach((item, i) => {
      uploadFile(item.file, uploads.length + i);
    });
  }

  async function uploadFile(file: File, index: number) {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "uploading" } : u))
    );

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/financial-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: "success", result: data } : u
        )
      );
      onUploadComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: "error", error: message } : u
        )
      );
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-500/10"
            : "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50"
        }`}
      >
        <Upload className="mx-auto mb-3 text-neutral-500" size={32} />
        <p className="text-sm text-neutral-300">
          Drop PDF files here or click to browse
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Supports AR Aging, Balance Sheet, Income Statement, and Borrowing Base reports
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Upload results */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((item, i) => (
            <div
              key={`${item.file.name}-${i}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
            >
              <FileText size={18} className="text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 truncate">{item.file.name}</p>
                {item.status === "success" && item.result?.summary && (
                  <p className="text-xs text-green-400 mt-0.5">
                    {formatSummary(item.result.summary)}
                  </p>
                )}
                {item.status === "error" && (
                  <p className="text-xs text-red-400 mt-0.5">{item.error}</p>
                )}
              </div>
              <div className="shrink-0">
                {item.status === "uploading" && <Loader2 size={18} className="animate-spin text-blue-400" />}
                {item.status === "success" && <CheckCircle size={18} className="text-green-400" />}
                {item.status === "error" && <AlertCircle size={18} className="text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSummary(summary: Record<string, unknown>): string {
  const type = summary.reportType as string;
  if (type === "ar_aging") {
    return `AR Aging: ${summary.customerCount} customers, total $${Number(summary.total).toLocaleString()}`;
  }
  if (type === "balance_sheet") {
    return `Balance Sheet: Total Assets $${Number(summary.totalAssets).toLocaleString()}`;
  }
  if (type === "income_statement") {
    const totals = summary.totals as Record<string, Record<string, number>>;
    return `Income Statement: Net Income $${totals.netIncome.balance.toLocaleString()}`;
  }
  if (type === "borrowing_base") {
    return `Borrowing Base: Availability $${Number(summary.excessAvailability).toLocaleString()}`;
  }
  return "Uploaded successfully";
}
