declare global {
  interface Window {
    __rmiPageLoadTime?: number;
  }
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

export interface FormBehavior {
  timeToFirstKeyMs: number;
  timeOnFormMs: number;
  fieldEditCount: number;
  messageLength: number;
  optionalFieldsFilled: number;
  pasteDetected: boolean;
  idlePeriods: number;
  submissionSpeedMs: number;
}

export interface IntelligencePayload {
  // Device & Browser
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  touchSupport: boolean;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  platform: string;
  browserLanguage: string;
  timezoneOffset: number;
  doNotTrack: boolean;
  cookiesEnabled: boolean;
  pdfViewerEnabled: boolean;

  // Network
  connectionType: string;
  connectionDownlink: number | null;
  saveDataMode: boolean;

  // Traffic source
  referrerUrl: string;
  referrerDomain: string;
  entryUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;

  // Session & behavioral
  sessionDurationMs: number;
  scrollDepthPct: number;
  tabBlurCount: number;
  returnVisitor: boolean;
  submittedAtLocal: string;
  dayOfWeek: number;
  hourOfDay: number;

  // Form-specific behavioral
  timeToFirstKeyMs: number;
  timeOnFormMs: number;
  fieldEditCount: number;
  messageLength: number;
  optionalFieldsFilled: number;
  pasteDetected: boolean;
  idlePeriods: number;
  submissionSpeedMs: number;
}

// --- Module-level trackers (initialized on import) ---

let maxScrollDepth = 0;
let blurCount = 0;
let trackingInitialized = false;

function initTracking(): void {
  if (trackingInitialized) return;
  trackingInitialized = true;

  // Track max scroll depth
  const updateScroll = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const pct = (window.scrollY / docHeight) * 100;
      if (pct > maxScrollDepth) maxScrollDepth = pct;
    }
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  // Track tab blur count
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) blurCount++;
  });
}

function getReferrerDomain(referrer: string): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname;
  } catch {
    return "";
  }
}

function getConnection(): NetworkInformation | null {
  try {
    const nav = navigator as Record<string, unknown>;
    return (nav.connection as NetworkInformation) ?? null;
  } catch {
    return null;
  }
}

export function collectIntelligence(formBehavior: FormBehavior): IntelligencePayload {
  // Ensure scroll/blur tracking is running
  initTracking();

  const now = new Date();
  const pageLoadTime = window.__rmiPageLoadTime ?? performance.timing?.navigationStart ?? Date.now();
  const searchParams = new URLSearchParams(window.location.search);
  const conn = getConnection();

  // Return visitor detection
  let returnVisitor = false;
  try {
    const fv = localStorage.getItem("rmi_fv");
    if (fv === null) {
      localStorage.setItem("rmi_fv", Date.now().toString());
    } else {
      returnVisitor = true;
    }
  } catch {
    // localStorage unavailable — treat as new visitor
  }

  const nav = navigator as Record<string, unknown>;

  return {
    // Device & Browser
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (nav.deviceMemory as number) ?? null,
    platform: navigator.platform,
    browserLanguage: navigator.language,
    timezoneOffset: now.getTimezoneOffset(),
    doNotTrack: navigator.doNotTrack === "1",
    cookiesEnabled: navigator.cookieEnabled,
    pdfViewerEnabled: typeof nav.pdfViewerEnabled === "boolean" ? (nav.pdfViewerEnabled as boolean) : false,

    // Network
    connectionType: conn?.effectiveType ?? "unknown",
    connectionDownlink: conn?.downlink ?? null,
    saveDataMode: conn?.saveData ?? false,

    // Traffic source
    referrerUrl: document.referrer,
    referrerDomain: getReferrerDomain(document.referrer),
    entryUrl: window.location.href,
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),

    // Session & behavioral
    sessionDurationMs: Date.now() - pageLoadTime,
    scrollDepthPct: Math.round(maxScrollDepth),
    tabBlurCount: blurCount,
    returnVisitor,
    submittedAtLocal: now.toISOString(),
    dayOfWeek: now.getDay(),
    hourOfDay: now.getHours(),

    // Form-specific behavioral (passed through)
    ...formBehavior,
  };
}
