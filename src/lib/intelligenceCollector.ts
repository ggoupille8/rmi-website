declare global {
  interface Window {
    __rmiPageLoadTime?: number;
  }
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  rtt?: number;
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
  // Device & Browser (existing)
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

  // Network (existing)
  connectionType: string;
  connectionDownlink: number | null;
  saveDataMode: boolean;

  // Traffic source (existing)
  referrerUrl: string;
  referrerDomain: string;
  entryUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;

  // Session & behavioral (existing)
  sessionDurationMs: number;
  scrollDepthPct: number;
  tabBlurCount: number;
  returnVisitor: boolean;
  submittedAtLocal: string;
  dayOfWeek: number;
  hourOfDay: number;

  // Form-specific behavioral (existing, passed through)
  timeToFirstKeyMs: number;
  timeOnFormMs: number;
  fieldEditCount: number;
  messageLength: number;
  optionalFieldsFilled: number;
  pasteDetected: boolean;
  idlePeriods: number;
  submissionSpeedMs: number;

  // === NEW — BROWSER FINGERPRINT ===
  browserLanguages: string[];
  browserDoNotTrack: string | null;
  browserMaxTouchPoints: number;
  browserWebdriver: boolean;

  // === NEW — SCREEN & DISPLAY ===
  screenOrientation: string;
  screenAvailWidth: number;
  screenAvailHeight: number;

  // === NEW — TIMEZONE & LOCALE ===
  timezone: string;
  locale: string;

  // === NEW — NETWORK DEEP ===
  networkEffectiveType: string;
  networkRtt: number;
  networkSaveData: boolean;

  // === NEW — PERFORMANCE TIMING ===
  perfPageLoadMs: number;
  perfDomReadyMs: number;
  perfDnsLookupMs: number;
  perfTcpConnectMs: number;
  perfTtfbMs: number;
  perfEntriesCount: number;

  // === NEW — PAGE CONTEXT ===
  pageUrl: string;
  pageTitle: string;
  pageHistoryLength: number;
  pageReferrer: string;

  // === NEW — MEDIA CAPABILITIES ===
  hasWebcam: boolean;
  hasMicrophone: boolean;
  mediaDeviceCount: number;

  // === NEW — STORAGE PROBING ===
  storageLocalAvailable: boolean;
  storageSessionAvailable: boolean;
  storageIndexedDbAvailable: boolean;

  // === NEW — CANVAS FINGERPRINT HASH ===
  canvasFingerprint: string;

  // === NEW — WEBGL RENDERER ===
  webglVendor: string;
  webglRenderer: string;

  // === NEW — FONT DETECTION ===
  installedFontsHash: string;

  // === NEW — ADVANCED BEHAVIORAL ===
  mouseMoveCount: number;
  mouseClickCount: number;
  keyPressCount: number;
  touchEventCount: number;
  formFieldFocusOrder: string[];
  formFieldTimeMs: Record<string, number>;
  formCorrectionsCount: number;
  scrollDirectionChanges: number;
  maxScrollSpeed: number;
  timeToFirstInteractionMs: number;
  pageVisibilityChanges: number;

  // === NEW — SUBMISSION META ===
  submittedAtUtc: string;
  formCompletionTimeMs: number;
  submissionMethod: string;
}

// --- Module-level trackers (initialized on import) ---

let maxScrollDepth = 0;
let blurCount = 0;
let trackingInitialized = false;

// Advanced behavioral trackers
let mouseMoveCount = 0;
let mouseClickCount = 0;
let keyPressCount = 0;
let touchEventCount = 0;
let correctionsCount = 0;
let scrollDirectionChanges = 0;
let maxScrollSpeed = 0;
let lastScrollY = 0;
let lastScrollTime = 0;
let lastScrollDirection: "up" | "down" | null = null;
let visibilityChangeCount = 0;
let firstInteractionTime: number | null = null;
let submissionMethodTracked: "click" | "enter_key" | "unknown" = "unknown";

// Form field tracking
const fieldFocusOrder: string[] = [];
const fieldTimeMap: Record<string, number> = {};
let currentFocusedField: string | null = null;
let currentFocusStart = 0;

// Cached fingerprints (computed once)
let cachedCanvasFingerprint: string | null = null;
let cachedWebglInfo: { vendor: string; renderer: string } | null = null;
let cachedFontHash: string | null = null;

function initTracking(): void {
  if (trackingInitialized) return;
  trackingInitialized = true;

  const pageLoadTime =
    window.__rmiPageLoadTime ??
    performance.timing?.navigationStart ??
    Date.now();

  // Track max scroll depth + scroll speed + direction changes
  const updateScroll = () => {
    const now = Date.now();
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      const pct = (window.scrollY / docHeight) * 100;
      if (pct > maxScrollDepth) maxScrollDepth = pct;
    }

    // Scroll speed
    if (lastScrollTime > 0) {
      const dt = now - lastScrollTime;
      if (dt > 0) {
        const dy = Math.abs(window.scrollY - lastScrollY);
        const speed = (dy / dt) * 1000; // px/sec
        if (speed > maxScrollSpeed) maxScrollSpeed = speed;
      }
    }

    // Scroll direction changes
    const direction: "up" | "down" =
      window.scrollY > lastScrollY ? "down" : "up";
    if (
      lastScrollDirection !== null &&
      direction !== lastScrollDirection &&
      Math.abs(window.scrollY - lastScrollY) > 5
    ) {
      scrollDirectionChanges++;
    }
    lastScrollDirection = direction;
    lastScrollY = window.scrollY;
    lastScrollTime = now;
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  // Track tab blur count + visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      blurCount++;
    }
    visibilityChangeCount++;
  });

  // Track mouse movements
  document.addEventListener(
    "mousemove",
    () => {
      mouseMoveCount++;
      if (firstInteractionTime === null) {
        firstInteractionTime = Date.now() - pageLoadTime;
      }
    },
    { passive: true }
  );

  // Track clicks
  document.addEventListener(
    "click",
    () => {
      mouseClickCount++;
      if (firstInteractionTime === null) {
        firstInteractionTime = Date.now() - pageLoadTime;
      }
    },
    { passive: true }
  );

  // Track key presses (count only, NOT content)
  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      keyPressCount++;
      if (firstInteractionTime === null) {
        firstInteractionTime = Date.now() - pageLoadTime;
      }
      // Track corrections (backspace/delete)
      if (e.key === "Backspace" || e.key === "Delete") {
        correctionsCount++;
      }
      // Track submission method
      if (e.key === "Enter") {
        submissionMethodTracked = "enter_key";
      }
    },
    { passive: true }
  );

  // Track touch events
  document.addEventListener(
    "touchstart",
    () => {
      touchEventCount++;
      if (firstInteractionTime === null) {
        firstInteractionTime = Date.now() - pageLoadTime;
      }
    },
    { passive: true }
  );

  // Track form field focus order and time
  document.addEventListener(
    "focusin",
    (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        const fieldName = target.name || target.id || "";
        if (fieldName) {
          // Record focus order (unique entries)
          if (!fieldFocusOrder.includes(fieldName)) {
            fieldFocusOrder.push(fieldName);
          }
          // End timing for previous field
          if (currentFocusedField && currentFocusStart > 0) {
            const elapsed = Date.now() - currentFocusStart;
            fieldTimeMap[currentFocusedField] =
              (fieldTimeMap[currentFocusedField] || 0) + elapsed;
          }
          currentFocusedField = fieldName;
          currentFocusStart = Date.now();
        }
      }
    },
    { passive: true }
  );

  // Track submit button clicks (vs enter key)
  document.addEventListener(
    "submit",
    () => {
      // If enter_key was not detected, it was a click
      if (submissionMethodTracked !== "enter_key") {
        submissionMethodTracked = "click";
      }
    },
    { passive: true }
  );

  // Pre-compute fingerprints in the background
  requestIdleCallback(() => {
    cachedCanvasFingerprint = getCanvasFingerprint();
    cachedWebglInfo = getWebGLInfo();
    cachedFontHash = getFontHash();
  });
}

// --- Fingerprinting functions ---

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unsupported";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("RMI fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("RMI fingerprint", 4, 17);
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(16);
  } catch {
    return "blocked";
  }
}

function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { vendor: "unsupported", renderer: "unsupported" };
    const ext = (gl as WebGLRenderingContext).getExtension(
      "WEBGL_debug_renderer_info"
    );
    if (!ext) return { vendor: "hidden", renderer: "hidden" };
    return {
      vendor:
        (gl as WebGLRenderingContext).getParameter(
          ext.UNMASKED_VENDOR_WEBGL
        ) || "unknown",
      renderer:
        (gl as WebGLRenderingContext).getParameter(
          ext.UNMASKED_RENDERER_WEBGL
        ) || "unknown",
    };
  } catch {
    return { vendor: "error", renderer: "error" };
  }
}

function getFontHash(): string {
  try {
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const testFonts = [
      "Arial",
      "Courier New",
      "Georgia",
      "Helvetica",
      "Times New Roman",
      "Trebuchet MS",
      "Verdana",
      "Calibri",
      "Cambria",
      "Segoe UI",
      "Tahoma",
      "Lucida Console",
      "Impact",
      "Comic Sans MS",
      "Palatino Linotype",
    ];
    const testString = "mmmmmmmmmmlli";
    const testSize = "72px";
    const span = document.createElement("span");
    span.style.fontSize = testSize;
    span.style.position = "absolute";
    span.style.left = "-9999px";
    span.innerHTML = testString;
    document.body.appendChild(span);

    const baseWidths: Record<string, number> = {};
    baseFonts.forEach((f) => {
      span.style.fontFamily = f;
      baseWidths[f] = span.offsetWidth;
    });

    const detected: string[] = [];
    testFonts.forEach((font) => {
      for (const base of baseFonts) {
        span.style.fontFamily = `'${font}', ${base}`;
        if (span.offsetWidth !== baseWidths[base]) {
          detected.push(font);
          break;
        }
      }
    });
    document.body.removeChild(span);

    let hash = 0;
    const str = detected.join(",");
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash.toString(16);
  } catch {
    return "error";
  }
}

// --- Helpers ---

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
    const nav = navigator as unknown as Record<string, unknown>;
    return (nav.connection as NetworkInformation) ?? null;
  } catch {
    return null;
  }
}

function getPerformanceTiming(): {
  pageLoadMs: number;
  domReadyMs: number;
  dnsLookupMs: number;
  tcpConnectMs: number;
  ttfbMs: number;
  entriesCount: number;
} {
  try {
    const entries = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    if (entries.length > 0) {
      const nav = entries[0];
      return {
        pageLoadMs: Math.round(nav.loadEventEnd - nav.startTime),
        domReadyMs: Math.round(
          nav.domContentLoadedEventEnd - nav.startTime
        ),
        dnsLookupMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcpConnectMs: Math.round(nav.connectEnd - nav.connectStart),
        ttfbMs: Math.round(nav.responseStart - nav.requestStart),
        entriesCount: performance.getEntriesByType("resource").length,
      };
    }
    // Fallback to legacy timing
    const t = performance.timing;
    return {
      pageLoadMs: t.loadEventEnd > 0 ? t.loadEventEnd - t.navigationStart : -1,
      domReadyMs:
        t.domContentLoadedEventEnd > 0
          ? t.domContentLoadedEventEnd - t.navigationStart
          : -1,
      dnsLookupMs: t.domainLookupEnd - t.domainLookupStart,
      tcpConnectMs: t.connectEnd - t.connectStart,
      ttfbMs: t.responseStart - t.requestStart,
      entriesCount: performance.getEntriesByType("resource").length,
    };
  } catch {
    return {
      pageLoadMs: -1,
      domReadyMs: -1,
      dnsLookupMs: -1,
      tcpConnectMs: -1,
      ttfbMs: -1,
      entriesCount: -1,
    };
  }
}

function probeStorage(): {
  local: boolean;
  session: boolean;
  indexedDb: boolean;
} {
  let local = false;
  let session = false;
  try {
    localStorage.setItem("__rmi_probe", "1");
    localStorage.removeItem("__rmi_probe");
    local = true;
  } catch {
    /* blocked */
  }
  try {
    sessionStorage.setItem("__rmi_probe", "1");
    sessionStorage.removeItem("__rmi_probe");
    session = true;
  } catch {
    /* blocked */
  }
  return {
    local,
    session,
    indexedDb: !!window.indexedDB,
  };
}

function getScreenOrientation(): string {
  try {
    return screen.orientation?.type || "unknown";
  } catch {
    return "unknown";
  }
}

// requestIdleCallback polyfill for Safari
const requestIdleCallback: (cb: () => void) => void =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (window as unknown as { requestIdleCallback: (cb: () => void) => void })
        .requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 1);

// --- Main collection function ---

export function collectIntelligence(
  formBehavior: FormBehavior
): IntelligencePayload {
  // Ensure scroll/blur/behavioral tracking is running
  initTracking();

  const now = new Date();
  const pageLoadTime =
    window.__rmiPageLoadTime ??
    performance.timing?.navigationStart ??
    Date.now();
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

  const nav = navigator as unknown as Record<string, unknown>;
  const perf = getPerformanceTiming();
  const storage = probeStorage();

  // Finalize field time tracking for current field
  if (currentFocusedField && currentFocusStart > 0) {
    const elapsed = Date.now() - currentFocusStart;
    fieldTimeMap[currentFocusedField] =
      (fieldTimeMap[currentFocusedField] || 0) + elapsed;
  }

  return {
    // Device & Browser (existing)
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
    pdfViewerEnabled:
      typeof nav.pdfViewerEnabled === "boolean"
        ? (nav.pdfViewerEnabled as boolean)
        : false,

    // Network (existing)
    connectionType: conn?.effectiveType ?? "unknown",
    connectionDownlink: conn?.downlink ?? null,
    saveDataMode: conn?.saveData ?? false,

    // Traffic source (existing)
    referrerUrl: document.referrer,
    referrerDomain: getReferrerDomain(document.referrer),
    entryUrl: window.location.href,
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),

    // Session & behavioral (existing)
    sessionDurationMs: Date.now() - pageLoadTime,
    scrollDepthPct: Math.round(maxScrollDepth),
    tabBlurCount: blurCount,
    returnVisitor,
    submittedAtLocal: now.toISOString(),
    dayOfWeek: now.getDay(),
    hourOfDay: now.getHours(),

    // Form-specific behavioral (passed through)
    ...formBehavior,

    // === NEW — BROWSER FINGERPRINT ===
    browserLanguages: Array.from(navigator.languages || []),
    browserDoNotTrack: navigator.doNotTrack,
    browserMaxTouchPoints: navigator.maxTouchPoints || 0,
    browserWebdriver: !!(nav.webdriver as boolean),

    // === NEW — SCREEN & DISPLAY ===
    screenOrientation: getScreenOrientation(),
    screenAvailWidth: screen.availWidth,
    screenAvailHeight: screen.availHeight,

    // === NEW — TIMEZONE & LOCALE ===
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,

    // === NEW — NETWORK DEEP ===
    networkEffectiveType: conn?.effectiveType ?? "unknown",
    networkRtt: conn?.rtt ?? -1,
    networkSaveData: conn?.saveData ?? false,

    // === NEW — PERFORMANCE TIMING ===
    perfPageLoadMs: perf.pageLoadMs,
    perfDomReadyMs: perf.domReadyMs,
    perfDnsLookupMs: perf.dnsLookupMs,
    perfTcpConnectMs: perf.tcpConnectMs,
    perfTtfbMs: perf.ttfbMs,
    perfEntriesCount: perf.entriesCount,

    // === NEW — PAGE CONTEXT ===
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageHistoryLength: window.history.length,
    pageReferrer: document.referrer,

    // === NEW — MEDIA CAPABILITIES ===
    // Note: enumerateDevices is async but we provide sync defaults here;
    // the async version is called separately and merged before send
    hasWebcam: false,
    hasMicrophone: false,
    mediaDeviceCount: 0,

    // === NEW — STORAGE PROBING ===
    storageLocalAvailable: storage.local,
    storageSessionAvailable: storage.session,
    storageIndexedDbAvailable: storage.indexedDb,

    // === NEW — CANVAS FINGERPRINT HASH ===
    canvasFingerprint: cachedCanvasFingerprint ?? getCanvasFingerprint(),

    // === NEW — WEBGL RENDERER ===
    webglVendor: (cachedWebglInfo ?? getWebGLInfo()).vendor,
    webglRenderer: (cachedWebglInfo ?? getWebGLInfo()).renderer,

    // === NEW — FONT DETECTION ===
    installedFontsHash: cachedFontHash ?? getFontHash(),

    // === NEW — ADVANCED BEHAVIORAL ===
    mouseMoveCount,
    mouseClickCount,
    keyPressCount,
    touchEventCount,
    formFieldFocusOrder: [...fieldFocusOrder],
    formFieldTimeMs: { ...fieldTimeMap },
    formCorrectionsCount: correctionsCount,
    scrollDirectionChanges,
    maxScrollSpeed: Math.round(maxScrollSpeed),
    timeToFirstInteractionMs: firstInteractionTime ?? -1,
    pageVisibilityChanges: visibilityChangeCount,

    // === NEW — SUBMISSION META ===
    submittedAtUtc: now.toISOString(),
    formCompletionTimeMs: formBehavior.timeOnFormMs,
    submissionMethod: submissionMethodTracked,
  };
}

/**
 * Async media device detection — call this before collectIntelligence
 * and merge the result into the payload.
 */
export async function detectMediaDevices(): Promise<{
  hasWebcam: boolean;
  hasMicrophone: boolean;
  mediaDeviceCount: number;
}> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { hasWebcam: false, hasMicrophone: false, mediaDeviceCount: 0 };
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      hasWebcam: devices.some((d) => d.kind === "videoinput"),
      hasMicrophone: devices.some((d) => d.kind === "audioinput"),
      mediaDeviceCount: devices.length,
    };
  } catch {
    return { hasWebcam: false, hasMicrophone: false, mediaDeviceCount: 0 };
  }
}
