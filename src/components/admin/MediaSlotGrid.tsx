import { useState } from "react";
import { Upload, RotateCcw, Edit3, Loader2 } from "lucide-react";
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
  blob_url: string;
  file_name: string;
  alt_text: string | null;
  uploaded_at: string;
}

interface MediaSlotGridProps {
  slots: SlotDefinition[];
  overrides: Record<string, MediaRecord>;
  onRefresh: () => void;
}

export default function MediaSlotGrid({
  slots,
  overrides,
  onRefresh,
}: MediaSlotGridProps) {
  const [uploadingSlot, setUploadingSlot] = useState<SlotDefinition | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [reverting, setReverting] = useState<string | null>(null);
  const [savingAlt, setSavingAlt] = useState(false);

  const handleRevert = async (slotName: string) => {
    const record = overrides[slotName];
    if (!record) return;

    if (!window.confirm("Revert to the default image? The uploaded image will be deleted.")) {
      return;
    }

    setReverting(slotName);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(data.error || "Failed to revert");
      }
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revert image");
    } finally {
      setReverting(null);
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
        const data = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(data.error || "Failed to update alt text");
      }
      setEditingAlt(null);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update alt text");
    } finally {
      setSavingAlt(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slotDef) => {
          const record = overrides[slotDef.slot];
          const isCustom = !!record;
          const imageSrc = isCustom ? record.blob_url : slotDef.defaultImage;
          const isReverting = reverting === slotDef.slot;

          return (
            <div
              key={slotDef.slot}
              className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg overflow-hidden"
            >
              {/* Image preview */}
              <div className="relative aspect-[16/10] bg-neutral-950">
                <img
                  src={imageSrc}
                  alt={record?.alt_text || slotDef.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Status badge */}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                    isCustom
                      ? "bg-primary-600/90 text-white"
                      : "bg-neutral-800/90 text-neutral-400 border border-neutral-600/50"
                  }`}
                >
                  {isCustom ? "Custom" : "Default"}
                </span>
              </div>

              {/* Info + Actions */}
              <div className="p-3">
                <p className="text-sm font-medium text-neutral-200 truncate">
                  {slotDef.label}
                </p>
                {isCustom && (
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">
                    {record.file_name}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setUploadingSlot(slotDef)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors"
                  >
                    <Upload size={12} />
                    Upload New
                  </button>
                  {isCustom && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRevert(slotDef.slot)}
                        disabled={isReverting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      >
                        {isReverting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Revert
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditAlt(slotDef.slot)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
                      >
                        <Edit3 size={12} />
                        Alt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {uploadingSlot && (
        <ImageUploader
          slot={uploadingSlot.slot}
          category={uploadingSlot.category}
          slotLabel={uploadingSlot.label}
          onSuccess={onRefresh}
          onClose={() => setUploadingSlot(null)}
        />
      )}

      {/* Alt text edit modal */}
      {editingAlt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditingAlt(null)} />
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-sm shadow-2xl p-5">
            <h3 className="text-base font-semibold text-white mb-3">Edit Alt Text</h3>
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
