import { useState, useRef, useEffect } from "react";
import { X, ChevronUp, Mail, Save, Send, Clock } from "lucide-react";

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

interface EnrichmentData {
  emailDomain?: string | null;
  hasMxRecords?: boolean;
  isFreeMail?: boolean;
  emailFormat?: "professional" | "generic" | "personal" | "suspicious";
  companyWebsiteExists?: boolean | null;
  companyWebsiteTitle?: string | null;
  phoneValid?: boolean;
  phoneAreaCode?: string | null;
  phoneRegion?: string | null;
  ipOrgMatch?: boolean | null;
  legitimacyScore?: number;
  quality?: "high" | "medium" | "low" | "spam";
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
  enrichment?: EnrichmentData | null;
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
  inline?: boolean;
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

function extractSignals(message: string): string[] {
  const signals: string[] = [];
  const lower = message.toLowerCase();

  if (
    lower.includes("emergency") ||
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("immediately")
  )
    signals.push("\u{1F534} Urgent");
  if (
    lower.includes("quote") ||
    lower.includes("estimate") ||
    lower.includes("bid") ||
    lower.includes("price")
  )
    signals.push("\u{1F4B0} Requesting Quote");
  if (
    lower.includes("maintenance") ||
    lower.includes("contract") ||
    lower.includes("ongoing")
  )
    signals.push("\u{1F504} Recurring Work");
  if (
    lower.includes("hospital") ||
    lower.includes("medical") ||
    lower.includes("healthcare")
  )
    signals.push("\u{1F3E5} Healthcare Facility");
  if (
    lower.includes("plant") ||
    lower.includes("factory") ||
    lower.includes("industrial") ||
    lower.includes("manufacturing")
  )
    signals.push("\u{1F3ED} Industrial");
  if (
    lower.includes("school") ||
    lower.includes("university") ||
    lower.includes("college")
  )
    signals.push("\u{1F3EB} Education");
  if (lower.includes("pipe") || lower.includes("piping"))
    signals.push("\u{1F527} Piping");
  if (lower.includes("duct") || lower.includes("hvac"))
    signals.push("\u{1F4A8} Ductwork/HVAC");
  if (lower.includes("tank") || lower.includes("vessel"))
    signals.push("\u{1F6E2} Equipment");
  if (lower.includes("removable") || lower.includes("blanket"))
    signals.push("\u{1F9E4} Removable Covers");

  return signals;
}

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-1.5 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
      title="Copy"
    >
      {copied ? "\u2714" : "\u{1F4CB}"}
    </button>
  );
}

export default function LeadDetail({ contact, onClose, onUpdate, inline }: Props) {
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

  const leadAge = Math.floor(
    (Date.now() - new Date(contact.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const isStale = leadAge > 3 && contact.status === "new";
  const signals = extractSignals(contact.message);

  const mailtoHref = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent("RE: Your RMI Quote Request")}`
    : null;

  const content = (
    <div className={inline ? "p-4 space-y-4" : "p-5 space-y-5"}>
      {/* Contact Info + Message — grid on desktop for inline */}
      <div className={inline ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
        {/* Left: Contact Info */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
              Name
            </p>
            <p className="text-sm font-medium text-neutral-100">
              {contact.name}
            </p>
            {!!contact.metadata?.company && (
              <p className="text-sm text-accent-400 font-medium">
                {String(contact.metadata.company)}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-neutral-500">
                Submitted{" "}
                {leadAge === 0
                  ? "today"
                  : leadAge === 1
                    ? "yesterday"
                    : `${leadAge} days ago`}
              </span>
              {isStale && (
                <span className="px-1.5 py-0.5 rounded bg-red-600/15 text-red-400 border border-red-600/30 text-[10px] font-medium">
                  STALE &mdash; needs follow-up
                </span>
              )}
            </div>
          </div>

          {contact.email && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Email
              </p>
              <p className="text-sm text-neutral-300">{contact.email} <CopyButton text={contact.email} /></p>
            </div>
          )}

          {contact.phone && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
                Phone
              </p>
              <p className="text-sm text-neutral-300">{contact.phone} <CopyButton text={contact.phone} /></p>
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

          {/* Timeline */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
              Timeline
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-neutral-600 shrink-0" />
                <span className="text-xs text-neutral-400">
                  Created {formatDate(contact.created_at)}
                </span>
              </div>
              {contact.updated_at && contact.updated_at !== contact.created_at && (
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-neutral-600 shrink-0" />
                  <span className="text-xs text-neutral-400">
                    Updated {formatDate(contact.updated_at)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full shrink-0 ${
                  status === "new" ? "bg-primary-500" :
                  status === "contacted" ? "bg-green-500" : "bg-neutral-600"
                }`} />
                <span className="text-xs text-neutral-300">
                  Current status: <span className="font-medium capitalize">{status}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Message */}
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
            Message
          </p>
          <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3">
            <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {contact.message}
            </p>
          </div>
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {signals.map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[10px] rounded bg-neutral-800 text-neutral-300 border border-neutral-700"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enrichment + Intelligence — grid on desktop for inline */}
      <div className={inline ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-5"}>
        {/* Lead Quality */}
        {contact.metadata?.enrichment && (
          <VerificationSection enrichment={contact.metadata.enrichment} />
        )}

        {/* Intelligence */}
        {contact.metadata && (
          <IntelligenceSection metadata={contact.metadata} />
        )}
      </div>

      {/* Status + Notes + Actions — grid on desktop for inline */}
      <div className={inline ? "grid grid-cols-1 lg:grid-cols-3 gap-4" : "space-y-5"}>
        {/* Status */}
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1.5">
            Status
          </p>
          <div className="flex gap-2 flex-wrap">
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
            rows={3}
            placeholder="Add notes about this lead..."
            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
          />
          <div className="flex items-center justify-between mt-1">
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
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-0.5">
            Actions
          </p>
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
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="bg-neutral-950/60 border-t border-neutral-800">
        {/* Inline header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/50">
          <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Lead Details &mdash; {contact.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
            aria-label="Collapse"
          >
            <ChevronUp size={16} />
          </button>
        </div>
        {content}
      </div>
    );
  }

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
        {content}
      </div>
    </div>
  );
}

interface QualityBadgeProps {
  quality: string;
  score?: number;
  size?: "sm" | "md";
}

export function QualityBadge({
  quality,
  score,
  size = "md",
}: QualityBadgeProps) {
  const config: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    high: {
      dot: "bg-green-400",
      text: "text-green-400",
      bg: "bg-green-600/15 border-green-600/30",
      label: "High Quality",
    },
    medium: {
      dot: "bg-yellow-400",
      text: "text-yellow-400",
      bg: "bg-yellow-600/15 border-yellow-600/30",
      label: "Medium Quality",
    },
    low: {
      dot: "bg-red-400",
      text: "text-red-400",
      bg: "bg-red-600/15 border-red-600/30",
      label: "Low Quality",
    },
    spam: {
      dot: "bg-neutral-500",
      text: "text-neutral-500",
      bg: "bg-neutral-700/30 border-neutral-700",
      label: "Spam",
    },
  };
  const c = config[quality] || config.medium;

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${c.bg} ${c.text}`}
        title={score != null ? `Score: ${score}/100` : undefined}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {score != null ? score : c.label}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${c.bg}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
      <span className={`text-sm font-semibold ${c.text}`}>
        {c.label.toUpperCase()}
      </span>
      {score != null && (
        <span className="text-sm text-neutral-400">
          (Score: {score}/100)
        </span>
      )}
    </div>
  );
}

interface VerificationSectionProps {
  enrichment: EnrichmentData;
}

function VerificationSection({ enrichment }: VerificationSectionProps) {
  const checks: { label: string; pass: boolean | null; detail?: string }[] = [];

  if (enrichment.hasMxRecords != null) {
    checks.push({
      label: "Email domain verified (MX records active)",
      pass: enrichment.hasMxRecords,
    });
  }

  if (enrichment.isFreeMail != null) {
    checks.push({
      label: enrichment.isFreeMail
        ? "Free email provider"
        : `Company email domain (${enrichment.emailDomain || ""})`,
      pass: !enrichment.isFreeMail,
    });
  }

  if (enrichment.emailFormat) {
    const formatLabel: Record<string, string> = {
      professional: "Professional email format",
      generic: "Generic email format (info@, admin@, etc.)",
      personal: "Personal email format",
      suspicious: "Suspicious email format",
    };
    checks.push({
      label: formatLabel[enrichment.emailFormat] || enrichment.emailFormat,
      pass: enrichment.emailFormat === "professional",
    });
  }

  if (enrichment.companyWebsiteExists != null) {
    checks.push({
      label: enrichment.companyWebsiteExists
        ? `Company website exists${enrichment.companyWebsiteTitle ? ` (${enrichment.companyWebsiteTitle})` : ""}`
        : "Company website not found",
      pass: enrichment.companyWebsiteExists,
    });
  }

  if (enrichment.phoneValid != null) {
    const detail =
      enrichment.phoneAreaCode && enrichment.phoneRegion
        ? `${enrichment.phoneAreaCode} — ${enrichment.phoneRegion}`
        : enrichment.phoneAreaCode
          ? `Area code: ${enrichment.phoneAreaCode}`
          : undefined;
    checks.push({
      label: enrichment.phoneValid
        ? "Valid phone number"
        : "Phone not provided or invalid",
      pass: enrichment.phoneValid,
      detail,
    });
  }

  if (enrichment.ipOrgMatch != null) {
    checks.push({
      label: enrichment.ipOrgMatch
        ? "IP org matches company name"
        : "IP org doesn't match company name",
      pass: enrichment.ipOrgMatch,
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
        Lead Quality
      </p>
      {enrichment.quality && (
        <QualityBadge
          quality={enrichment.quality}
          score={enrichment.legitimacyScore}
        />
      )}
      {checks.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-md p-3 space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-sm mt-px shrink-0">
                {check.pass === true ? (
                  <span className="text-green-400">&#10003;</span>
                ) : check.pass === false ? (
                  <span className="text-red-400">&#10007;</span>
                ) : (
                  <span className="text-yellow-400">&#9888;</span>
                )}
              </span>
              <div>
                <p className="text-xs text-neutral-300">{check.label}</p>
                {check.detail && (
                  <p className="text-[11px] text-neutral-500">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface IntelligenceSectionProps {
  metadata: LeadMetadata;
}

function IntelligenceSection({ metadata }: IntelligenceSectionProps) {
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
