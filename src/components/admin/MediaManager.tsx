import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import MediaSlotGrid from "./MediaSlotGrid";

interface MediaRecord {
  id: string;
  slot: string;
  category: string;
  blob_url: string;
  file_name: string;
  file_size: number;
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
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function MediaManager() {
  const [activeTab, setActiveTab] = useState<TabId>("hero");
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleRefresh = () => {
    setLoading(true);
    fetchMedia();
  };

  // Build override map from media records
  const overrides: Record<string, MediaRecord> = {};
  for (const record of media) {
    overrides[record.slot] = record;
  }

  // Get current tab's slots
  const getSlots = (): SlotDefinition[] => {
    switch (activeTab) {
      case "hero":
        return heroSlots;
      case "project":
        return projectSlots;
      case "service":
        // Return all service slots, grouped
        return serviceGroups.flatMap(buildServiceSlots);
    }
  };

  return (
    <div>
      {/* Tab navigation */}
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
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 mb-6">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-neutral-500" />
        </div>
      ) : (
        <>
          {/* Service photos: show grouped sections */}
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
                      onRefresh={handleRefresh}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <MediaSlotGrid
              slots={getSlots()}
              overrides={overrides}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
    </div>
  );
}
