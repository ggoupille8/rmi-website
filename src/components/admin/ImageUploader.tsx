import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  slot: string;
  category: string;
  slotLabel: string;
  onSuccess: () => void;
  onClose: () => void;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

type UploadState = "idle" | "uploading" | "assigning" | "success" | "error";

export default function ImageUploader({
  slot,
  category,
  slotLabel,
  onSuccess,
  onClose,
}: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback((f: File) => {
    setError("");
    if (!ALLOWED_TYPES.has(f.type)) {
      setError("Invalid file type. Only JPEG, PNG, and WebP are accepted.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSetFile(f);
    },
    [validateAndSetFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      // Step 1: Upload file to Vercel Blob
      setState("uploading");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);

      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Upload failed");
      }

      const uploadData = (await uploadRes.json()) as {
        url: string;
        size: number;
        fileName: string;
        variants?: Record<string, string>;
      };

      // Step 2: Assign to slot in database
      setState("assigning");
      const assignRes = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          category,
          blobUrl: uploadData.url,
          fileName: uploadData.fileName,
          fileSize: uploadData.size,
          altText: altText.trim() || null,
          variants: uploadData.variants,
        }),
      });

      if (!assignRes.ok) {
        const data = await assignRes.json().catch(() => ({ error: "Failed to assign image" }));
        throw new Error(data.error || "Failed to assign image to slot");
      }

      setState("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Upload Image</h3>
            <p className="text-sm text-neutral-400 mt-0.5">{slotLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Drop zone / Preview */}
          {!preview ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary-400 bg-primary-400/10"
                  : "border-neutral-700 hover:border-neutral-500"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mx-auto mb-3 text-neutral-500" size={32} />
              <p className="text-sm text-neutral-300">
                Drag and drop an image here, or click to browse
              </p>
              <p className="text-xs text-neutral-500 mt-1.5">
                JPEG, PNG, or WebP. Max 10MB.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>{file?.name}</span>
                <span className="text-neutral-600">|</span>
                <span>{file ? (file.size / 1024).toFixed(0) + " KB" : ""}</span>
              </div>
            </div>
          )}

          {/* Alt text */}
          {preview && (
            <div>
              <label
                htmlFor="alt-text"
                className="block text-sm font-medium text-neutral-300 mb-1.5"
              >
                Alt text (optional)
              </label>
              <input
                id="alt-text"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe this image for accessibility"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
              <CheckCircle2 size={16} className="text-green-400" />
              <p className="text-sm text-green-300">Image uploaded and assigned successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            disabled={state === "uploading" || state === "assigning"}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || state === "uploading" || state === "assigning" || state === "success"}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {(state === "uploading" || state === "assigning") && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {state === "uploading"
              ? "Uploading..."
              : state === "assigning"
              ? "Assigning..."
              : state === "success"
              ? "Done"
              : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
