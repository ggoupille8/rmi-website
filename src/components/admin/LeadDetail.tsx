import { useState, useRef, useEffect } from "react";
import { X, Mail, Save, Send } from "lucide-react";

interface GeoData {
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  isp?: string;
  org?: string;
  asn?: string;
}

interface LeadMetadata {
  ip?: string;
  userAgent?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  isMobile?: boolean;
  platform?: string;
  referrer?: string;
  pageUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  timeOnPageMs?: number;
  elapsedMs?: number;
  pageViews?: number;
  connectionType?: string;
  geo?: GeoData | null;
  [key: string]: unknown;
}

interface Contact {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  source: string;
  status: string;
  notes: string | null;
  updated_at: string | null;
  metadata?: LeadMetadata | null;
}

interface Props {
  contact: Contact;
  onClose: () => void;
  onUpdate: (id: string, status: string, notes: string | null) => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-primary-500" },
  { value: "contacted", label: "Contacted", color: "bg-green-500" },
  { value: "archived", label: "Archived", color: "bg-neutral-600" },
];

function parseUserAgent(ua: string): string {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Browser detection
  if (ua.includes("Edg/")) {
    const m = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${m?.[1]?.split(".")[0] || ""}`.trim();
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    const m = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${m?.[1]?.split(".")[0] || ""}`.trim();
  } else if (ua.includes("Firefox/")) {
    const m = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${m?.[1]?.split(".")[0] || ""}`.trim();
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    const m = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${m?.[1]?.split(".")[0] || ""}`.trim();
  }

  // OS detection
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows NT")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} — ${os}`;
}

function formatTimeOnPage(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatReferrerSource(referrer: string | undefined | null): string {
  if (!referrer) return "Direct Visit";
  try {
    const hostname = new URL(referrer).hostname.replace("www.", "");
    const sources: Record<string, string> = {
      "google.com": "Google Search",
      "google.co.uk": "Google Search",
      "bing.com": "Bing Search",
      "linkedin.com": "LinkedIn",
      "facebook.com": "Facebook",
      "instagram.com": "Instagram",
      "twitter.com": "Twitter/X",
      "x.com": "Twitter/X",
      "youtube.com": "YouTube",
      "rmi-llc.net": "Internal Navigation",
    };
    return sources[hostname] || hostname;
  } catch {
    return referrer;
  }
}

export default function LeadDetail({ contact, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState(contact.status);
  const [notes, setNotes] = useState(contact.notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [forwarded, setForwarded] = useState(false);
  const [forwardError, setForwardError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-save notes after 1s of inactivity
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleSave = async (newStatus?: string, newNotes?: string) => {
    const s = newStatus ?? status;
    const n = newNotes ?? notes;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          status: s,
          notes: n || null,
        }),
      });
      if (res.ok) {
        onUpdate(contact.id, s, n || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    handleSave(newStatus, notes);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(status, value);
    }, 1000);
  };

  const handleForward = async () => {
    setForwarding(true);
    setForwardError(false);
    try {
      const res = await fetch("/api/admin/forward-lead", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      if (res.ok) {
        setForwarded(true);
        // Auto-update status to "contacted"
        setStatus("contacted");
        onUpdate(contact.id, "contacted", notes || null);
      } else {
        setForwardError(true);
      }
    } catch {
      setForwardError(true);
    } finally {
      setForwarding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const mailtoHref = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent("RE: Your RMI Quote Request")}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg bg-neutral-900 border-l border-neutral-800 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-neutral-200">
            Lead Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Contact Info */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Name
              </p>
              <p className="text-sm font-medium text-neutral-100">
                {contact.name}
              </p>
            </div>

            {contact.email && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                  Email
                </p>
                <p className="text-sm text-neutral-300">{contact.email}</p>
              </div>
            )}

            {contact.phone && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                  Phone
                </p>
                <p className="text-sm text-neutral-300">{contact.phone}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Submitted
              </p>
              <p className="text-sm text-neutral-400">
                {formatDate(contact.created_at)}
              </p>
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
              Message
            </p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3">
              <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {contact.message}
              </p>
            </div>
          </div>

          {/* Intelligence */}
          {contact.metadata && (
            <IntelligenceSection metadata={contact.metadata} />
          )}

          {/* Status */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
              Status
            </p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    status === opt.value
                      ? "bg-neutral-800 text-neutral-100 ring-1 ring-neutral-600"
                      : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${opt.color}`}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
              Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={4}
              placeholder="Add notes about this lead..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-neutral-600">
                {saving
                  ? "Saving..."
                  : saved
                    ? "Saved"
                    : "Auto-saves after 1s"}
              </p>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors disabled:opacity-50"
              >
                <Save size={12} />
                Save
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
            {/* Forward to Sales */}
            <button
              type="button"
              onClick={handleForward}
              disabled={forwarding || forwarded}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                forwarded
                  ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-default"
                  : forwardError
                    ? "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30"
                    : "bg-accent-600 hover:bg-accent-500 text-white"
              } disabled:opacity-60`}
            >
              <Send size={15} />
              {forwarding
                ? "Sending..."
                : forwarded
                  ? "Forwarded to Sales"
                  : forwardError
                    ? "Retry Forward"
                    : "Forward to Sales"}
            </button>

            {mailtoHref && (
              <a
                href={mailtoHref}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Mail size={15} />
                Reply via Email
              </a>
            )}
            {status !== "contacted" && (
              <button
                type="button"
                onClick={() => handleStatusChange("contacted")}
                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-medium rounded-md transition-colors border border-green-600/30"
              >
                Mark as Contacted
              </button>
            )}
            {status !== "archived" && (
              <button
                type="button"
                onClick={() => handleStatusChange("archived")}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-sm font-medium rounded-md transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelligenceSection({ metadata }: { metadata: LeadMetadata }) {
  const geo = metadata.geo;
  const hasGeo = geo && (geo.city || geo.state || geo.country);
  const hasDevice = metadata.userAgent;
  const hasSource = metadata.referrer !== undefined || metadata.utmSource;
  const hasNetwork = metadata.ip || metadata.timezone;
  const hasAny = hasGeo || hasDevice || hasSource || hasNetwork;

  if (!hasAny) return null;

  const timeMs = metadata.timeOnPageMs ?? metadata.elapsedMs;

  const utmParts: string[] = [];
  if (metadata.utmSource) utmParts.push(`source=${metadata.utmSource}`);
  if (metadata.utmMedium) utmParts.push(`medium=${metadata.utmMedium}`);
  if (metadata.utmCampaign) utmParts.push(`campaign=${metadata.utmCampaign}`);

  const labelClass = "text-[11px] text-neutral-500 uppercase tracking-wider";
  const valueClass = "text-sm text-neutral-300";

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
        Intelligence
      </p>
      <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3 space-y-3">
        {/* Location */}
        {hasGeo && (
          <div>
            <p className={labelClass}>Location</p>
            <p className={valueClass}>
              {[geo.city, geo.state, geo.country].filter(Boolean).join(", ")}
              {geo.zip ? ` ${geo.zip}` : ""}
            </p>
            {geo.org && geo.org !== geo.isp && (
              <p className="text-sm text-accent-400 font-medium">
                Org: {geo.org}
              </p>
            )}
          </div>
        )}

        {/* Device */}
        {hasDevice && (
          <div>
            <p className={labelClass}>Device</p>
            <p className={valueClass}>
              {metadata.isMobile ? "Mobile" : "Desktop"} —{" "}
              {parseUserAgent(metadata.userAgent || "")}
            </p>
            {metadata.screenWidth && metadata.screenHeight && (
              <p className="text-xs text-neutral-500">
                Screen: {metadata.screenWidth}x{metadata.screenHeight}
                {metadata.viewportWidth && metadata.viewportHeight
                  ? ` — Viewport: ${metadata.viewportWidth}x${metadata.viewportHeight}`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* Source */}
        {hasSource && (
          <div>
            <p className={labelClass}>Source</p>
            <p className={valueClass}>
              {formatReferrerSource(metadata.referrer)}
            </p>
            {utmParts.length > 0 && (
              <p className="text-xs text-neutral-500">
                UTM: {utmParts.join(", ")}
              </p>
            )}
            <div className="flex gap-4 mt-0.5">
              {timeMs != null && timeMs > 0 && (
                <p className="text-xs text-neutral-500">
                  Time on page: {formatTimeOnPage(timeMs)}
                </p>
              )}
              {metadata.pageViews != null && (
                <p className="text-xs text-neutral-500">
                  Page views: {metadata.pageViews}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Network */}
        {hasNetwork && (
          <div>
            <p className={labelClass}>Network</p>
            {metadata.ip && (
              <p className="text-xs text-neutral-500">IP: {metadata.ip}</p>
            )}
            {geo?.isp && (
              <p className="text-xs text-neutral-500">ISP: {geo.isp}</p>
            )}
            {metadata.timezone && (
              <p className="text-xs text-neutral-500">
                Timezone: {metadata.timezone}
              </p>
            )}
            {metadata.language && (
              <p className="text-xs text-neutral-500">
                Language: {metadata.language}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
