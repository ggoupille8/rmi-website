/**
 * Client-side visitor tracking + enhanced GA4 events.
 *
 * Loaded inline in BaseLayout.astro. Tracks:
 * - Page views with full device fingerprint → server beacon
 * - Scroll depth milestones → GA4 + beacon
 * - Time on page milestones → GA4 + beacon
 * - Section visibility → GA4 + beacon
 * - CTA interactions → GA4 + beacon
 * - Form interaction start → GA4 + beacon
 * - Exit intent detection → GA4 + beacon
 * - Periodic behavioral updates → beacon
 *
 * Privacy: No PII collected. All data is anonymous behavioral signals.
 * Persistent visitor ID uses localStorage (first-party, no cross-site).
 */

// ── Exported utility functions (testable) ────────────────────────────

export function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getVisitorId(): { id: string; visitNumber: number } {
  try {
    const stored = localStorage.getItem("rmi_vid");
    if (stored) {
      const parsed = JSON.parse(stored) as { id: string; visits: number };
      const visits = (parsed.visits || 0) + 1;
      localStorage.setItem("rmi_vid", JSON.stringify({ id: parsed.id, visits }));
      return { id: parsed.id, visitNumber: visits };
    }
  } catch {
    // Ignore
  }
  const id = generateId();
  try {
    localStorage.setItem("rmi_vid", JSON.stringify({ id, visits: 1 }));
  } catch {
    // Ignore
  }
  return { id, visitNumber: 1 };
}

export function getUTMParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

export function getDeviceType(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua) && !/tablet/i.test(ua)) return "mobile";
  return "desktop";
}

export function getBrowserInfo(ua: string): { name: string; version: string } {
  if (/Edg\/(\d+)/.test(ua)) return { name: "Edge", version: RegExp.$1 };
  if (/Chrome\/(\d+)/.test(ua) && !/Edg/.test(ua)) return { name: "Chrome", version: RegExp.$1 };
  if (/Firefox\/(\d+)/.test(ua)) return { name: "Firefox", version: RegExp.$1 };
  if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
    const m = ua.match(/Version\/(\d+)/);
    return { name: "Safari", version: m ? m[1] : RegExp.$1 };
  }
  return { name: "Unknown", version: "" };
}

export function getOSInfo(ua: string): { name: string; version: string } {
  if (/Windows NT (\d+\.\d+)/.test(ua)) return { name: "Windows", version: RegExp.$1 };
  if (/Mac OS X (\d+[._]\d+)/.test(ua)) return { name: "macOS", version: RegExp.$1.replace(/_/g, ".") };
  if (/Android (\d+\.?\d*)/.test(ua)) return { name: "Android", version: RegExp.$1 };
  if (/iPhone|iPad/.test(ua)) {
    const m = ua.match(/OS (\d+_\d+)/);
    return { name: "iOS", version: m ? m[1].replace(/_/g, ".") : "" };
  }
  if (/Linux/.test(ua)) return { name: "Linux", version: "" };
  if (/CrOS/.test(ua)) return { name: "ChromeOS", version: "" };
  return { name: "Unknown", version: "" };
}

export function getConnectionType(): string {
  const nav = navigator as Record<string, unknown>;
  const conn = nav.connection as Record<string, unknown> | undefined;
  return (conn?.effectiveType as string) || "unknown";
}

export function sendGA4Event(name: string, params: Record<string, unknown>): void {
  try {
    const w = window as Record<string, unknown>;
    if (typeof w.gtag === "function") {
      (w.gtag as (...args: unknown[]) => void)("event", name, params);
    }
  } catch {
    // Ignore
  }
}

export const SCROLL_MILESTONES = [10, 25, 50, 75, 90, 100];
export const TIME_MILESTONES = [10, 30, 60, 120, 300]; // seconds

export function calculateScrollPercent(
  scrollTop: number,
  viewportHeight: number,
  docHeight: number,
): number {
  if (docHeight <= 0) return 0;
  return Math.min(Math.round(((scrollTop + viewportHeight) / docHeight) * 100), 100);
}

export function classifyClick(
  href: string,
  textContent: string,
  classList: DOMTokenList | { contains: (cls: string) => boolean },
  hasDataCta: boolean,
): "phone" | "email" | "cta" | null {
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  const text = textContent.trim().toLowerCase();
  const isCTA =
    text.includes("quote") ||
    text.includes("contact") ||
    text.includes("get started") ||
    text.includes("call") ||
    text.includes("schedule") ||
    classList.contains("cta") ||
    hasDataCta;
  return isCTA ? "cta" : null;
}

// ── IIFE initialization (auto-runs in browser) ──────────────────────

export function initTracker(): (() => void) | undefined {
  // Prevent double-init
  if (typeof window === "undefined") return undefined;
  if ((window as Record<string, unknown>).__rmiTrackerInit) return undefined;
  (window as Record<string, unknown>).__rmiTrackerInit = true;

  // ── State ──────────────────────────────────────────────────────────
  const sessionId = generateId();
  const visitor = getVisitorId();
  const utmParams = getUTMParams(window.location.search);
  const startTime = Date.now();
  const browser = getBrowserInfo(navigator.userAgent);
  const os = getOSInfo(navigator.userAgent);

  let maxScrollDepth = 0;
  let interactions = 0;
  let ctaClicks = 0;
  let formStarted = false;
  let exitIntentDetected = false;
  const sectionsViewed = new Set<string>();
  const scrollMilestonesFired = new Set<number>();
  const timeMilestonesFired = new Set<number>();

  // ── Beacon sender ──────────────────────────────────────────────────
  function sendBeacon(type: "pageview" | "update" | "exit"): void {
    const payload = {
      type,
      sessionId,
      visitorId: visitor.id,
      visitNumber: visitor.visitNumber,
      pagePath: window.location.pathname,
      referrer: document.referrer || undefined,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      deviceType: getDeviceType(navigator.userAgent),
      browserName: browser.name,
      browserVersion: browser.version,
      osName: os.name,
      osVersion: os.version,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      deviceMemory: (navigator as Record<string, unknown>).deviceMemory as number | undefined,
      hardwareCores: navigator.hardwareConcurrency,
      pixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      connectionType: getConnectionType(),
      scrollDepth: maxScrollDepth,
      timeOnPageMs: Date.now() - startTime,
      interactions,
      sectionsViewed: Array.from(sectionsViewed),
      ctaClicks,
      formStarted,
      exitIntent: exitIntentDetected,
      utmSource: utmParams.utm_source,
      utmMedium: utmParams.utm_medium,
      utmCampaign: utmParams.utm_campaign,
      utmTerm: utmParams.utm_term,
      utmContent: utmParams.utm_content,
    };

    try {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      if (type === "exit" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/beacon", blob);
      } else {
        fetch("/api/beacon", {
          method: "POST",
          body: blob,
          keepalive: type === "exit",
        }).catch(() => {
          // Silent
        });
      }
    } catch {
      // Silent
    }
  }

  // ── Scroll depth tracking ──────────────────────────────────────────
  function updateScrollDepth(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
    const viewportHeight = window.innerHeight;
    const scrollPercent = calculateScrollPercent(scrollTop, viewportHeight, docHeight);

    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
    }

    // Fire GA4 events at milestones
    for (const milestone of SCROLL_MILESTONES) {
      if (scrollPercent >= milestone && !scrollMilestonesFired.has(milestone)) {
        scrollMilestonesFired.add(milestone);
        sendGA4Event("scroll_depth", {
          percent: milestone,
          time_on_page: Math.round((Date.now() - startTime) / 1000),
        });
      }
    }
  }

  // ── Time on page milestones ────────────────────────────────────────
  function checkTimeMilestones(): void {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    for (const ms of TIME_MILESTONES) {
      if (elapsed >= ms && !timeMilestonesFired.has(ms)) {
        timeMilestonesFired.add(ms);
        sendGA4Event("time_on_page", {
          seconds: ms,
          scroll_depth: maxScrollDepth,
        });
      }
    }
  }

  // ── Section visibility tracking ────────────────────────────────────
  function setupSectionObserver(): void {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId =
              entry.target.id ||
              entry.target.getAttribute("data-section") ||
              entry.target.tagName.toLowerCase();
            if (sectionId && !sectionsViewed.has(sectionId)) {
              sectionsViewed.add(sectionId);
              sendGA4Event("section_view", {
                section: sectionId,
                time_on_page: Math.round((Date.now() - startTime) / 1000),
                scroll_depth: maxScrollDepth,
              });
            }
          }
        }
      },
      { threshold: 0.3 },
    );

    // Observe main sections
    const sections = document.querySelectorAll(
      "section, [data-section], #hero, #services, #about, #contact, #projects, #cta",
    );
    sections.forEach((s) => observer.observe(s));
  }

  // ── CTA click tracking ─────────────────────────────────────────────
  function setupCTATracking(): void {
    document.addEventListener("click", (e) => {
      interactions++;
      const target = e.target as HTMLElement;
      const link = target.closest("a, button") as HTMLElement | null;
      if (!link) return;

      // Phone number clicks
      const href = link.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        sendGA4Event("phone_click", {
          phone: href.replace("tel:", ""),
          section: link.closest("section")?.id || "unknown",
        });
        ctaClicks++;
        return;
      }

      // Email clicks
      if (href.startsWith("mailto:")) {
        sendGA4Event("email_click", {
          section: link.closest("section")?.id || "unknown",
        });
        ctaClicks++;
        return;
      }

      // CTA buttons (contact form scroll, quote request, etc.)
      const text = (link.textContent || "").trim().toLowerCase();
      const isCTA =
        text.includes("quote") ||
        text.includes("contact") ||
        text.includes("get started") ||
        text.includes("call") ||
        text.includes("schedule") ||
        link.classList.contains("cta") ||
        link.hasAttribute("data-cta");

      if (isCTA) {
        sendGA4Event("cta_click", {
          text: text.slice(0, 50),
          section: link.closest("section")?.id || "unknown",
          time_on_page: Math.round((Date.now() - startTime) / 1000),
        });
        ctaClicks++;
      }
    });
  }

  // ── Form interaction tracking ──────────────────────────────────────
  function setupFormTracking(): void {
    document.addEventListener(
      "focus",
      (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        ) {
          const form = target.closest("form");
          if (form && !formStarted) {
            formStarted = true;
            sendGA4Event("form_start", {
              form_id: form.id || "contact",
              time_on_page: Math.round((Date.now() - startTime) / 1000),
              scroll_depth: maxScrollDepth,
            });
          }
        }
      },
      true,
    );
  }

  // ── Exit intent detection ──────────────────────────────────────────
  function setupExitIntent(): void {
    document.addEventListener("mouseout", (e) => {
      if (exitIntentDetected) return;
      const mouseY = (e as MouseEvent).clientY;
      if (mouseY <= 5) {
        exitIntentDetected = true;
        sendGA4Event("exit_intent", {
          time_on_page: Math.round((Date.now() - startTime) / 1000),
          scroll_depth: maxScrollDepth,
          sections_viewed: Array.from(sectionsViewed).join(","),
        });
      }
    });
  }

  // ── Interaction counting ───────────────────────────────────────────
  function setupInteractionTracking(): void {
    document.addEventListener("keydown", () => {
      interactions++;
    }, { passive: true });
  }

  // ── Initialize ─────────────────────────────────────────────────────

  // Send initial pageview beacon
  sendBeacon("pageview");

  // Scroll tracking (passive, throttled)
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        updateScrollDepth();
        scrollTimer = null;
      }, 200);
    },
    { passive: true },
  );

  // Time milestone check every 5 seconds
  const timeInterval = setInterval(checkTimeMilestones, 5_000);

  // Periodic behavioral update beacon every 30 seconds
  const updateInterval = setInterval(() => {
    sendBeacon("update");
  }, 30_000);

  // Setup observers and trackers after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setupSectionObserver();
      setupCTATracking();
      setupFormTracking();
      setupExitIntent();
      setupInteractionTracking();
    });
  } else {
    setupSectionObserver();
    setupCTATracking();
    setupFormTracking();
    setupExitIntent();
    setupInteractionTracking();
  }

  // Exit beacon
  window.addEventListener("beforeunload", () => {
    clearInterval(timeInterval);
    clearInterval(updateInterval);
    sendBeacon("exit");
  });

  // Visibility change — send update when tab hidden
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendBeacon("update");
    }
  });

  // Return cleanup function for testing
  return () => {
    clearInterval(timeInterval);
    clearInterval(updateInterval);
    delete (window as Record<string, unknown>).__rmiTrackerInit;
  };
}

// Auto-initialize in browser environment (IIFE behavior)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initTracker();
}
