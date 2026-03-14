import { useState } from "react";
import {
  Upload,
  RotateCcw,
  Undo2,
  Edit3,
  Loader2,
  Clock,
  Copy,
  Check,
  GripVertical,
} from "lucide-react";
import ImageUploader from "./ImageUploader";

interface SlotDefinition {
  slot: string;
  label: string;
  defaultImage: string;
  category: string;
}

interface MediaRecord {
  id: string;
  slot: string;
  category?: string;
  blob_url: string;
  file_name: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
  alt_text: string | null;
  uploaded_at: string;
  updated_at?: string;
}

interface AuditEntry {
  id: string;
  slot: string;
  action: string;
  previous_blob_url: string | null;
  performed_at: string;
}

interface MediaSlotGridProps {
  slots: SlotDefinition[];
  overrides: Record<string, MediaRecord>;
  auditHistory: Record<string, AuditEntry | null>;
  onRefresh: () => void;
  viewMode: "cards" | "thumbnails";
  selectedSlots: Set<string>;
  onToggleSelect: (slot: string) => void;
  enableReorder?: boolean;
  onSwap?: (slotA: string, slotB: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaSlotGrid({
  slots,
  overrides,
  auditHistory,
  onRefresh,
  viewMode,
  selectedSlots,
  onToggleSelect,
  enableReorder,
  onSwap,
}: MediaSlotGridProps) {
  const [uploadingSlot, setUploadingSlot] = useState<SlotDefinition | null>(
    null
  );
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [reverting, setReverting] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [savingAlt, setSavingAlt] = useState(false);
  const [copiedSlot, setCopiedSlot] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<
    Record<string, { w: number; h: number }>
  >({});

  const handleRevertToDefault = async (slotDef: SlotDefinition) => {
    const record = overrides[slotDef.slot];
    if (!record) return;

    if (
      !window.confirm(
        "Revert to the original default image? The custom image is preserved and you can undo this."
      )
    ) {
      return;
    }

    setReverting(slotDef.slot);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      });
      if (!res.ok) {
        const data = (await res
          .json()
          .catch(() => ({ error: "Delete failed" }))) as { error: string };
        throw new Error(data.error || "Failed to revert");
      }
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revert image");
    } finally {
      setReverting(null);
    }
  };

  const handleUndo = async (slotDef: SlotDefinition) => {
    setUndoing(slotDef.slot);
    try {
      const res = await fetch("/api/admin/media-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo",
          slot: slotDef.slot,
          category: slotDef.category,
        }),
      });
      if (!res.ok) {
        const data = (await res
          .json()
          .catch(() => ({ error: "Undo failed" }))) as { error: string };
        throw new Error(data.error || "Failed to undo");
      }
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to undo");
    } finally {
      setUndoing(null);
    }
  };

  const handleEditAlt = (slotName: string) => {
    const record = overrides[slotName];
    setEditingAlt(slotName);
    setAltText(record?.alt_text || "");
  };

  const handleSaveAlt = async () => {
    if (!editingAlt) return;
    const record = overrides[editingAlt];
    if (!record) return;

    setSavingAlt(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, altText: altText.trim() }),
      });
      if (!res.ok) {
        const data = (await res
          .json()
          .catch(() => ({ error: "Update failed" }))) as { error: string };
        throw new Error(data.error || "Failed to update alt text");
      }
      setEditingAlt(null);
      onRefresh();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update alt text"
      );
    } finally {
      setSavingAlt(false);
    }
  };

  const handleCopyUrl = async (slotDef: SlotDefinition) => {
    const record = overrides[slotDef.slot];
    const url = record
      ? record.blob_url
      : `${window.location.origin}${slotDef.defaultImage}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlot(slotDef.slot);
      setTimeout(() => setCopiedSlot(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedSlot(slotDef.slot);
      setTimeout(() => setCopiedSlot(null), 2000);
    }
  };

  const handleImageLoad = (
    slot: string,
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setDimensions((prev) => ({
        ...prev,
        [slot]: { w: img.naturalWidth, h: img.naturalHeight },
      }));
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    slot: string
  ) => {
    setDragSource(slot);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", slot);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    slot: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (slot !== dragSource) {
      setDragTarget(slot);
    }
  };

  const handleDragLeave = () => {
    setDragTarget(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, slot: string) => {
    e.preventDefault();
    if (dragSource && dragSource !== slot && onSwap) {
      onSwap(dragSource, slot);
    }
    setDragSource(null);
    setDragTarget(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragTarget(null);
  };

  if (viewMode === "thumbnails") {
    return (
      <>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {slots.map((slotDef) => {
            const record = overrides[slotDef.slot];
            const isCustom = !!record;
            const imageSrc = isCustom ? record.blob_url : slotDef.defaultImage;
            const isSelected = selectedSlots.has(slotDef.slot);
            const isCopied = copiedSlot === slotDef.slot;

            return (
              <div
                key={slotDef.slot}
                className={`relative group rounded-lg overflow-hidden border transition-all ${
                  isSelected
                    ? "border-primary-500 ring-2 ring-primary-500/30"
                    : "border-neutral-700/50 hover:border-neutral-600"
                }`}
              >
                <div className="aspect-square bg-neutral-950">
                  <img
                    src={imageSrc}
                    alt={record?.alt_text || slotDef.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onLoad={(e) => handleImageLoad(slotDef.slot, e)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onToggleSelect(slotDef.slot)}
                  className={`absolute top-1 left-1 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary-500 border-primary-500"
                      : "border-neutral-500/50 bg-black/40 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </button>

                {isCustom && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase bg-primary-600/90 text-white">
                    Custom
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-[10px] text-white truncate mb-1">
                    {slotDef.label}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadingSlot(slotDef);
                      }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Upload new"
                    >
                      <Upload size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(slotDef);
                      }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Copy URL"
                    >
                      {isCopied ? (
                        <Check size={10} />
                      ) : (
                        <Copy size={10} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {uploadingSlot && (
          <ImageUploader
            slot={uploadingSlot.slot}
            category={uploadingSlot.category}
            slotLabel={uploadingSlot.label}
            onSuccess={onRefresh}
            onClose={() => setUploadingSlot(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slotDef) => {
          const record = overrides[slotDef.slot];
          const isCustom = !!record;
          const imageSrc = isCustom ? record.blob_url : slotDef.defaultImage;
          const isReverting = reverting === slotDef.slot;
          const isUndoing = undoing === slotDef.slot;
          const lastAudit = auditHistory[slotDef.slot];
          const hasHistory = !!lastAudit;
          const isSelected = selectedSlots.has(slotDef.slot);
          const isCopied = copiedSlot === slotDef.slot;
          const isDragOver = dragTarget === slotDef.slot;
          const isDragging = dragSource === slotDef.slot;
          const dim = dimensions[slotDef.slot];

          return (
            <div
              key={slotDef.slot}
              className={`bg-neutral-800/50 border rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? "border-primary-500 ring-2 ring-primary-500/30"
                  : isDragOver
                  ? "border-primary-400 ring-2 ring-primary-400/20"
                  : "border-neutral-700/50"
              } ${isDragging ? "opacity-50" : ""}`}
              draggable={enableReorder}
              onDragStart={
                enableReorder
                  ? (e) => handleDragStart(e, slotDef.slot)
                  : undefined
              }
              onDragOver={
                enableReorder
                  ? (e) => handleDragOver(e, slotDef.slot)
                  : undefined
              }
              onDragLeave={enableReorder ? handleDragLeave : undefined}
              onDrop={
                enableReorder
                  ? (e) => handleDrop(e, slotDef.slot)
                  : undefined
              }
              onDragEnd={enableReorder ? handleDragEnd : undefined}
            >
              <div className="relative aspect-[16/10] bg-neutral-950">
                <img
                  src={imageSrc}
                  alt={record?.alt_text || slotDef.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={(e) => handleImageLoad(slotDef.slot, e)}
                />

                <button
                  type="button"
                  onClick={() => onToggleSelect(slotDef.slot)}
                  className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary-500 border-primary-500"
                      : "border-neutral-400/60 bg-black/40 hover:border-white"
                  }`}
                >
                  {isSelected && <Check size={14} className="text-white" />}
                </button>

                {enableReorder && (
                  <div className="absolute top-2 left-10 p-1 rounded bg-black/40 text-neutral-400 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} />
                  </div>
                )}

                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                    isCustom
                      ? "bg-primary-600/90 text-white"
                      : "bg-neutral-800/90 text-neutral-400 border border-neutral-600/50"
                  }`}
                >
                  {isCustom ? "Custom" : "Default"}
                </span>

                {isDragOver && (
                  <div className="absolute inset-0 bg-primary-500/10 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-lg bg-primary-500/90 text-white text-xs font-medium">
                      Drop to swap
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm font-medium text-neutral-200 truncate">
                  {slotDef.label}
                </p>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 flex-wrap">
                  {isCustom && record.file_name && (
                    <span className="truncate max-w-[140px]">
                      {record.file_name}
                    </span>
                  )}
                  {isCustom && record.file_size != null && record.file_size > 0 && (
                    <>
                      <span className="text-neutral-700">|</span>
                      <span>{formatFileSize(record.file_size)}</span>
                    </>
                  )}
                  {dim && (
                    <>
                      <span className="text-neutral-700">|</span>
                      <span>
                        {dim.w} x {dim.h}
                      </span>
                    </>
                  )}
                </div>

                {lastAudit && (
                  <p className="flex items-center gap-1 text-[10px] text-neutral-600 mt-1">
                    <Clock size={10} />
                    Changed {formatRelativeTime(lastAudit.performed_at)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setUploadingSlot(slotDef)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors"
                  >
                    <Upload size={12} />
                    Upload New
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyUrl(slotDef)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      isCopied
                        ? "text-green-400 bg-green-500/10"
                        : "text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10"
                    }`}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? "Copied" : "Copy URL"}
                  </button>

                  {hasHistory && (
                    <button
                      type="button"
                      onClick={() => handleUndo(slotDef)}
                      disabled={isUndoing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50"
                      title="Undo last change"
                    >
                      {isUndoing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Undo2 size={12} />
                      )}
                      Undo
                    </button>
                  )}

                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => handleEditAlt(slotDef.slot)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
                    >
                      <Edit3 size={12} />
                      Alt
                    </button>
                  )}
                </div>

                {isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRevertToDefault(slotDef)}
                    disabled={isReverting}
                    className="flex items-center gap-1.5 mt-2 text-[11px] text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {isReverting ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <RotateCcw size={10} />
                    )}
                    Revert to Default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploadingSlot && (
        <ImageUploader
          slot={uploadingSlot.slot}
          category={uploadingSlot.category}
          slotLabel={uploadingSlot.label}
          onSuccess={onRefresh}
          onClose={() => setUploadingSlot(null)}
        />
      )}

      {editingAlt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setEditingAlt(null)}
          />
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-base font-semibold text-white mb-3">
              Edit Alt Text
            </h3>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this image"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAlt();
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingAlt(null)}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAlt}
                disabled={savingAlt}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {savingAlt && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
