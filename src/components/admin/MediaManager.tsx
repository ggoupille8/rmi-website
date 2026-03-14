import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  RefreshCw,
  LayoutGrid,
  List,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import MediaSlotGrid from "./MediaSlotGrid";
import MediaAuditLog from "./MediaAuditLog";

interface MediaRecord {
  id: string;
  slot: string;
  category: string;
  blob_url: string;
  file_name: string;
  file_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  uploaded_at: string;
  updated_at: string;
}

interface SlotDefinition {
  slot: string;
  label: string;
  defaultImage: string;
  category: string;
}

interface AuditEntry {
  id: string;
  slot: string;
  action: string;
  previous_blob_url: string | null;
  performed_at: string;
}

// Hero image slots
const heroSlots: SlotDefinition[] = Array.from({ length: 6 }, (_, i) => ({
  slot: `hero-${i + 1}`,
  label: `Hero Slide ${i + 1}`,
  defaultImage: `/images/hero/hero-${i + 1}.webp`,
  category: "hero",
}));

// Project image slots
const projectSlots: SlotDefinition[] = [
  {
    slot: "project-henry-ford",
    label: "Henry Ford Hospital",
    defaultImage: "/images/projects/henry-ford-hospital-960w.webp",
    category: "project",
  },
  {
    slot: "project-michigan-central",
    label: "Michigan Central Station",
    defaultImage: "/images/projects/michigan-central-station-960w.webp",
    category: "project",
  },
  {
    slot: "project-ford-hub",
    label: "Ford World Headquarters",
    defaultImage: "/images/projects/ford-hub-dearborn-960w.webp",
    category: "project",
  },
];

// Service image slots — grouped by service
interface ServiceGroup {
  title: string;
  slug: string;
  imageCount: number;
  imagePathPrefix: string;
}

const serviceGroups: ServiceGroup[] = [
  { title: "Pipe Insulation", slug: "pipe-insulation", imageCount: 21, imagePathPrefix: "pipe-insulation/pipe-insulation" },
  { title: "Duct Insulation", slug: "duct-insulation", imageCount: 13, imagePathPrefix: "duct-insulation/duct-insulation" },
  { title: "Tanks & Vessels", slug: "tanks-vessels-equipment-insulation", imageCount: 18, imagePathPrefix: "tanks-vessels/tanks-vessels" },
  { title: "Removable Blankets", slug: "removable-insulation-blankets", imageCount: 8, imagePathPrefix: "removable-blankets/removable-blankets" },
  { title: "Field-Applied Jacketing", slug: "field-applied-jacketing", imageCount: 24, imagePathPrefix: "field-applied-jacketing/field-applied-jacketing" },
  { title: "Pipe Supports", slug: "pipe-supports-fabrication", imageCount: 5, imagePathPrefix: "pipe-supports/pipe-supports" },
  { title: "Material Sales", slug: "material-sales", imageCount: 2, imagePathPrefix: "material-sales/material-sales" },
];

function buildServiceSlots(group: ServiceGroup): SlotDefinition[] {
  return Array.from({ length: group.imageCount }, (_, i) => ({
    slot: `service-${group.slug}-${i + 1}`,
    label: `${group.title} — Photo ${i + 1}`,
    defaultImage: `/images/services/${group.imagePathPrefix}-${i + 1}.webp`,
    category: "service",
  }));
}

const tabs = [
  { id: "hero", label: "Hero Images" },
  { id: "service", label: "Service Photos" },
  { id: "project", label: "Project Photos" },
  { id: "audit", label: "Audit Log" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function MediaManager() {
  const [activeTab, setActiveTab] = useState<TabId>("hero");
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [auditHistory, setAuditHistory] = useState<
    Record<string, AuditEntry | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "thumbnails">("cards");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("Failed to fetch media");
      const data = (await res.json()) as { media: MediaRecord[] };
      setMedia(data.media);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media-audit?limit=200");
      if (!res.ok) return;
      const data = (await res.json()) as { logs: AuditEntry[] };

      const history: Record<string, AuditEntry | null> = {};
      for (const entry of data.logs) {
        if (!history[entry.slot]) {
          history[entry.slot] = entry;
        }
      }
      setAuditHistory(history);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchMedia();
    fetchAuditHistory();
  }, [fetchMedia, fetchAuditHistory]);

  useEffect(() => {
    setSelectedSlots(new Set());
  }, [activeTab]);

  const handleRefresh = () => {
    setLoading(true);
    fetchMedia();
    fetchAuditHistory();
  };

  const overrides: Record<string, MediaRecord> = {};
  for (const record of media) {
    overrides[record.slot] = record;
  }

  const getSlots = (): SlotDefinition[] => {
    switch (activeTab) {
      case "hero":
        return heroSlots;
      case "project":
        return projectSlots;
      case "service":
        return serviceGroups.flatMap(buildServiceSlots);
      case "audit":
        return [];
    }
  };

  const handleToggleSelect = (slot: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleSlots = getSlots().map((s) => s.slot);
    setSelectedSlots(new Set(visibleSlots));
  };

  const handleDeselectAll = () => {
    setSelectedSlots(new Set());
  };

  const handleSwap = async (slotA: string, slotB: string) => {
    try {
      const res = await fetch("/api/admin/media-reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotA, slotB }),
      });
      if (!res.ok) throw new Error("Swap failed");
      handleRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to swap images");
    }
  };

  const customSelected = Array.from(selectedSlots).filter(
    (s) => overrides[s]
  );

  const handleBulkDelete = async () => {
    if (customSelected.length === 0) return;

    setBulkDeleting(true);
    try {
      for (const slot of customSelected) {
        const record = overrides[slot];
        const res = await fetch("/api/admin/media", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: record.id }),
        });
        if (!res.ok) {
          throw new Error(`Failed to revert ${slot}`);
        }
      }
      setSelectedSlots(new Set());
      setBulkDeleteOpen(false);
      handleRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk revert failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 border-b border-neutral-800">
        <div className="flex gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {activeTab !== "audit" && (
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-neutral-800 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "cards"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                title="Card view"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("thumbnails")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "thumbnails"
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                title="Thumbnail grid"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        )}
      </div>

      {selectedSlots.size > 0 && activeTab !== "audit" && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-neutral-800/80 border border-neutral-700/50 rounded-lg">
          <span className="text-sm text-neutral-300">
            {selectedSlots.size} selected
          </span>

          <button
            type="button"
            onClick={handleSelectAllVisible}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Select all
          </button>

          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Deselect all
          </button>

          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={customSelected.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              Revert to Default ({customSelected.length})
            </button>
          </div>
        </div>
      )}

      {activeTab === "audit" ? (
        <MediaAuditLog />
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-neutral-500" />
            </div>
          ) : (
            <>
              {activeTab === "service" ? (
                <div className="space-y-8">
                  {serviceGroups.map((group) => {
                    const slots = buildServiceSlots(group);
                    return (
                      <div key={group.slug}>
                        <h3 className="text-base font-semibold text-neutral-200 mb-3 flex items-center gap-2">
                          {group.title}
                          <span className="text-xs text-neutral-500 font-normal">
                            {group.imageCount} photos
                          </span>
                        </h3>
                        <MediaSlotGrid
                          slots={slots}
                          overrides={overrides}
                          auditHistory={auditHistory}
                          onRefresh={handleRefresh}
                          viewMode={viewMode}
                          selectedSlots={selectedSlots}
                          onToggleSelect={handleToggleSelect}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <MediaSlotGrid
                  slots={getSlots()}
                  overrides={overrides}
                  auditHistory={auditHistory}
                  onRefresh={handleRefresh}
                  viewMode={viewMode}
                  selectedSlots={selectedSlots}
                  onToggleSelect={handleToggleSelect}
                  enableReorder={activeTab === "hero"}
                  onSwap={activeTab === "hero" ? handleSwap : undefined}
                />
              )}
            </>
          )}
        </>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !bulkDeleting && setBulkDeleteOpen(false)}
          />
          <div className="relative bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-3 px-5 py-4 border-b border-neutral-800">
              <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  Revert {customSelected.length} image
                  {customSelected.length !== 1 ? "s" : ""} to default?
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                  Custom images will be removed from these slots. Previous
                  uploads are preserved in the audit trail for undo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors ml-auto"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-3 max-h-48 overflow-y-auto">
              <ul className="space-y-1">
                {customSelected.map((slot) => {
                  const record = overrides[slot];
                  return (
                    <li
                      key={slot}
                      className="flex items-center gap-2 text-sm text-neutral-300"
                    >
                      <img
                        src={record.blob_url}
                        alt=""
                        className="w-8 h-8 rounded object-cover border border-neutral-700"
                      />
                      <span className="truncate">{slot}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {bulkDeleting && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {bulkDeleting ? "Reverting..." : "Revert All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
