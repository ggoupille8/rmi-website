/**
 * Unit tests for visitor-tracker.ts
 *
 * Strategy: Import the exported utility functions directly for pure-function tests.
 * For integration tests of initTracker(), call it explicitly with proper DOM setup.
 * The auto-init guard at the bottom of visitor-tracker.ts fires on first import,
 * so we reset __rmiTrackerInit before each test that calls initTracker().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateId,
  getVisitorId,
  getUTMParams,
  getDeviceType,
  getBrowserInfo,
  getOSInfo,
  getConnectionType,
  sendGA4Event,
  calculateScrollPercent,
  classifyClick,
  SCROLL_MILESTONES,
  TIME_MILESTONES,
  initTracker,
} from "../visitor-tracker";

// ── Reusable helpers ─────────────────────────────────────────────────

/** Build a minimal localStorage mock backed by a Map. */
function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store.set(key, val);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((i: number) => [...store.keys()][i] ?? null),
  };
}

/** Create a minimal IntersectionObserver mock that captures callbacks. */
function createIntersectionObserverMock(): {
  MockClass: typeof IntersectionObserver;
  instances: Array<{
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    observed: Element[];
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>;
} {
  const instances: Array<{
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    observed: Element[];
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  class MockIntersectionObserver {
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit | undefined;
    observed: Element[] = [];
    observe = vi.fn((el: Element) => { this.observed.push(el); });
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
    root = null;
    rootMargin = "";
    thresholds = [0];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options;
      instances.push(this);
    }
  }

  return { MockClass: MockIntersectionObserver as unknown as typeof IntersectionObserver, instances };
}

/** Extract the JSON payload from a fetch mock call's Blob body. */
function extractPayload(call: unknown[]): Record<string, unknown> {
  const body = (call[1] as Record<string, unknown>).body as { parts: string[] };
  return JSON.parse(body.parts[0]) as Record<string, unknown>;
}

// ── Shared state ────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;
let sendBeaconMock: ReturnType<typeof vi.fn>;
let gtagMock: ReturnType<typeof vi.fn>;
let localStorageMock: Storage;
let ioMock: ReturnType<typeof createIntersectionObserverMock>;
let trackerCleanup: (() => void) | undefined;

// ── Setup / Teardown ────────────────────────────────────────────────

beforeEach(() => {
  // Use fake timers FIRST, before any DOM or global manipulation
  vi.useFakeTimers();

  // Reset tracker init guard so initTracker() can run
  delete (window as Record<string, unknown>).__rmiTrackerInit;

  // fetch
  fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", fetchMock);

  // navigator.sendBeacon
  sendBeaconMock = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", {
    value: sendBeaconMock,
    writable: true,
    configurable: true,
  });

  // navigator.userAgent — default to desktop Chrome on Windows
  Object.defineProperty(navigator, "userAgent", {
    value:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    writable: true,
    configurable: true,
  });

  // navigator.language
  Object.defineProperty(navigator, "language", {
    value: "en-US",
    writable: true,
    configurable: true,
  });

  // navigator.hardwareConcurrency
  Object.defineProperty(navigator, "hardwareConcurrency", {
    value: 8,
    writable: true,
    configurable: true,
  });

  // navigator.maxTouchPoints
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: 0,
    writable: true,
    configurable: true,
  });

  // localStorage
  localStorageMock = createLocalStorageMock();
  vi.stubGlobal("localStorage", localStorageMock);

  // window.location
  Object.defineProperty(window, "location", {
    value: {
      href: "http://localhost:4321/",
      pathname: "/",
      search: "",
      hash: "",
      origin: "http://localhost:4321",
    },
    writable: true,
    configurable: true,
  });

  // screen
  Object.defineProperty(window, "screen", {
    value: { width: 1920, height: 1080, colorDepth: 24 },
    writable: true,
    configurable: true,
  });

  // window dimensions
  Object.defineProperty(window, "innerWidth", { value: 1440, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 900, writable: true, configurable: true });
  Object.defineProperty(window, "devicePixelRatio", { value: 1, writable: true, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });

  // document.readyState — "complete" so DOMContentLoaded branch is skipped
  Object.defineProperty(document, "readyState", {
    value: "complete",
    writable: true,
    configurable: true,
  });

  // document.referrer
  Object.defineProperty(document, "referrer", {
    value: "",
    writable: true,
    configurable: true,
  });

  // document.visibilityState
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    writable: true,
    configurable: true,
  });

  // crypto.getRandomValues — deterministic for testing
  let callCount = 0;
  vi.stubGlobal("crypto", {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      callCount++;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = (i + callCount * 17) % 256;
      }
      return arr;
    }),
  });

  // IntersectionObserver
  ioMock = createIntersectionObserverMock();
  vi.stubGlobal("IntersectionObserver", ioMock.MockClass);

  // Blob — extend the real Blob so prototype chain stays intact
  const OrigBlob = globalThis.Blob;
  vi.stubGlobal(
    "Blob",
    class MockBlob extends OrigBlob {
      parts: unknown[];
      constructor(parts: unknown[], options?: BlobPropertyBag) {
        super([], options);
        this.parts = parts;
      }
    },
  );

  // gtag
  gtagMock = vi.fn();
  (window as Record<string, unknown>).gtag = gtagMock;

  // Intl.DateTimeFormat
  vi.stubGlobal("Intl", {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: "America/Detroit" }),
    }),
  });

  // DOM sections for observer / CTA tracking
  document.body.innerHTML = `
    <section id="hero">Hero</section>
    <section id="services">Services</section>
    <section id="contact">Contact</section>
    <form id="contact-form"><input type="text" name="name" /><textarea name="message"></textarea></form>
    <a href="tel:+17345551234" id="phone-link">Call Us</a>
    <a href="mailto:info@rmi-llc.net" id="email-link">Email Us</a>
    <button id="cta-btn" class="cta">Get a Quote</button>
    <a id="plain-link" href="/about">About</a>
  `;
});

afterEach(() => {
  // Run cleanup from initTracker if it was called
  if (trackerCleanup) {
    trackerCleanup();
    trackerCleanup = undefined;
  }
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  delete (window as Record<string, unknown>).__rmiTrackerInit;
  delete (window as Record<string, unknown>).gtag;
});

/** Helper to init the tracker and store cleanup handle. */
function startTracker(): void {
  trackerCleanup = initTracker();
}

// =====================================================================
// 1. Pure function: generateId
// =====================================================================

describe("generateId", () => {
  it("should return a 32-char hex string (16 bytes)", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("should return different IDs on successive calls", () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });

  it("should use crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateId();
    expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
  });
});

// =====================================================================
// 2. Pure function: getVisitorId
// =====================================================================

describe("getVisitorId", () => {
  it("should create new visitor on first visit", () => {
    const result = getVisitorId();
    expect(result.id).toMatch(/^[0-9a-f]{32}$/);
    expect(result.visitNumber).toBe(1);
  });

  it("should persist to localStorage", () => {
    getVisitorId();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "rmi_vid",
      expect.stringContaining('"visits":1'),
    );
  });

  it("should increment visit count for returning visitor", () => {
    localStorageMock.getItem = vi.fn().mockReturnValue(
      JSON.stringify({ id: "abc123", visits: 3 }),
    );
    const result = getVisitorId();
    expect(result.id).toBe("abc123");
    expect(result.visitNumber).toBe(4);
  });

  it("should handle localStorage.getItem throwing", () => {
    localStorageMock.getItem = vi.fn().mockImplementation(() => {
      throw new Error("Access denied");
    });
    const result = getVisitorId();
    expect(result.visitNumber).toBe(1);
    expect(result.id).toBeDefined();
  });

  it("should handle localStorage.setItem throwing", () => {
    localStorageMock.setItem = vi.fn().mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const result = getVisitorId();
    expect(result.visitNumber).toBe(1);
  });

  it("should handle malformed JSON in localStorage", () => {
    localStorageMock.getItem = vi.fn().mockReturnValue("not-valid-json");
    const result = getVisitorId();
    expect(result.visitNumber).toBe(1);
  });

  it("should handle stored object with missing visits field", () => {
    localStorageMock.getItem = vi.fn().mockReturnValue(
      JSON.stringify({ id: "test123" }),
    );
    const result = getVisitorId();
    expect(result.id).toBe("test123");
    expect(result.visitNumber).toBe(1);
  });
});

// =====================================================================
// 3. Pure function: getUTMParams
// =====================================================================

describe("getUTMParams", () => {
  it("should extract utm_source", () => {
    expect(getUTMParams("?utm_source=google")).toEqual({ utm_source: "google" });
  });

  it("should extract utm_medium", () => {
    expect(getUTMParams("?utm_medium=cpc")).toEqual({ utm_medium: "cpc" });
  });

  it("should extract utm_campaign", () => {
    expect(getUTMParams("?utm_campaign=spring2026")).toEqual({ utm_campaign: "spring2026" });
  });

  it("should extract utm_term", () => {
    expect(getUTMParams("?utm_term=insulation+contractor")).toEqual({
      utm_term: "insulation contractor",
    });
  });

  it("should extract utm_content", () => {
    expect(getUTMParams("?utm_content=hero-banner")).toEqual({ utm_content: "hero-banner" });
  });

  it("should return empty object when no UTM params present", () => {
    expect(getUTMParams("")).toEqual({});
    expect(getUTMParams("?foo=bar")).toEqual({});
  });

  it("should extract all UTM params together", () => {
    const search =
      "?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=rmi&utm_content=ad1";
    expect(getUTMParams(search)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      utm_term: "rmi",
      utm_content: "ad1",
    });
  });

  it("should handle partial UTM params", () => {
    const result = getUTMParams("?utm_source=linkedin&utm_campaign=hiring");
    expect(result).toEqual({ utm_source: "linkedin", utm_campaign: "hiring" });
    expect(result.utm_medium).toBeUndefined();
  });

  it("should ignore non-UTM params", () => {
    const result = getUTMParams("?page=1&utm_source=twitter&lang=en");
    expect(result).toEqual({ utm_source: "twitter" });
  });
});

// =====================================================================
// 4. Pure function: getDeviceType
// =====================================================================

describe("getDeviceType", () => {
  it("should detect desktop", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
      ),
    ).toBe("desktop");
  });

  it("should detect mobile (iPhone)", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("mobile");
  });

  it("should detect mobile (Android phone)", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      ),
    ).toBe("mobile");
  });

  it("should detect tablet (iPad)", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("tablet");
  });

  it("should detect tablet with tablet keyword", () => {
    expect(getDeviceType("Mozilla/5.0 (Tablet; rv:68.0) Gecko/68.0")).toBe("tablet");
  });

  it("should treat unknown UA as desktop", () => {
    expect(getDeviceType("SomeBot/1.0")).toBe("desktop");
  });
});

// =====================================================================
// 5. Pure function: getBrowserInfo
// =====================================================================

describe("getBrowserInfo", () => {
  it("should detect Chrome", () => {
    expect(
      getBrowserInfo(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toEqual({ name: "Chrome", version: "120" });
  });

  it("should detect Firefox", () => {
    expect(
      getBrowserInfo("Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121"),
    ).toEqual({ name: "Firefox", version: "121" });
  });

  it("should detect Safari", () => {
    expect(
      getBrowserInfo(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17 Safari/605.1.15",
      ),
    ).toEqual({ name: "Safari", version: "17" });
  });

  it("should detect Edge", () => {
    expect(
      getBrowserInfo(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120",
      ),
    ).toEqual({ name: "Edge", version: "120" });
  });

  it("should return Unknown for unrecognized UA", () => {
    expect(getBrowserInfo("SomeRandomBot/1.0")).toEqual({ name: "Unknown", version: "" });
  });

  it("should not confuse Edge with Chrome", () => {
    const result = getBrowserInfo(
      "Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120",
    );
    expect(result.name).toBe("Edge");
  });
});

// =====================================================================
// 6. Pure function: getOSInfo
// =====================================================================

describe("getOSInfo", () => {
  it("should detect Windows with version", () => {
    expect(getOSInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toEqual({
      name: "Windows",
      version: "10.0",
    });
  });

  it("should detect macOS with version (underscore replaced)", () => {
    expect(getOSInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1)")).toEqual({
      name: "macOS",
      version: "14.1",
    });
  });

  it("should detect Android with version", () => {
    expect(getOSInfo("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toEqual({
      name: "Android",
      version: "14",
    });
  });

  it("should detect iOS with version", () => {
    expect(
      getOSInfo(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toEqual({ name: "iOS", version: "17.1" });
  });

  it("should detect Linux", () => {
    expect(getOSInfo("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101")).toEqual({
      name: "Linux",
      version: "",
    });
  });

  it("should detect ChromeOS", () => {
    expect(getOSInfo("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36")).toEqual({
      name: "ChromeOS",
      version: "",
    });
  });

  it("should return Unknown for unrecognized OS", () => {
    expect(getOSInfo("SomeBot/1.0")).toEqual({ name: "Unknown", version: "" });
  });

  it("should detect iPad as iOS", () => {
    expect(
      getOSInfo("Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15"),
    ).toEqual({ name: "iOS", version: "16.6" });
  });
});

// =====================================================================
// 7. Pure function: getConnectionType
// =====================================================================

describe("getConnectionType", () => {
  it("should return effectiveType from navigator.connection", () => {
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "4g" },
      writable: true,
      configurable: true,
    });
    expect(getConnectionType()).toBe("4g");
  });

  it("should return 'unknown' when navigator.connection is missing", () => {
    Object.defineProperty(navigator, "connection", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getConnectionType()).toBe("unknown");
  });

  it("should return 'unknown' when effectiveType is missing", () => {
    Object.defineProperty(navigator, "connection", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(getConnectionType()).toBe("unknown");
  });
});

// =====================================================================
// 8. Pure function: calculateScrollPercent
// =====================================================================

describe("calculateScrollPercent", () => {
  it("should calculate correct percentage", () => {
    expect(calculateScrollPercent(2000, 900, 5000)).toBe(58);
  });

  it("should cap at 100%", () => {
    expect(calculateScrollPercent(500, 1200, 1000)).toBe(100);
  });

  it("should return 0 when docHeight is 0", () => {
    expect(calculateScrollPercent(100, 900, 0)).toBe(0);
  });

  it("should return 0 when docHeight is negative", () => {
    expect(calculateScrollPercent(0, 900, -100)).toBe(0);
  });

  it("should handle zero scroll", () => {
    expect(calculateScrollPercent(0, 900, 5000)).toBe(18);
  });

  it("should round to nearest integer", () => {
    expect(calculateScrollPercent(100, 100, 300)).toBe(67);
  });
});

// =====================================================================
// 9. Pure function: classifyClick
// =====================================================================

describe("classifyClick", () => {
  const mockClassList = { contains: (_cls: string) => false };

  it("should detect phone links", () => {
    expect(classifyClick("tel:+17345551234", "Call Us", mockClassList, false)).toBe("phone");
  });

  it("should detect email links", () => {
    expect(classifyClick("mailto:info@rmi-llc.net", "Email", mockClassList, false)).toBe("email");
  });

  it("should detect CTA by 'quote' keyword", () => {
    expect(classifyClick("/contact", "Get a Quote", mockClassList, false)).toBe("cta");
  });

  it("should detect CTA by 'contact' keyword", () => {
    expect(classifyClick("/form", "Contact Us", mockClassList, false)).toBe("cta");
  });

  it("should detect CTA by 'get started' keyword", () => {
    expect(classifyClick("/start", "Get Started", mockClassList, false)).toBe("cta");
  });

  it("should detect CTA by 'call' keyword", () => {
    expect(classifyClick("/phone", "Call Now", mockClassList, false)).toBe("cta");
  });

  it("should detect CTA by 'schedule' keyword", () => {
    expect(classifyClick("/book", "Schedule a Visit", mockClassList, false)).toBe("cta");
  });

  it("should detect CTA by class 'cta'", () => {
    const ctaClassList = { contains: (cls: string) => cls === "cta" };
    expect(classifyClick("/about", "Learn More", ctaClassList, false)).toBe("cta");
  });

  it("should detect CTA by data-cta attribute", () => {
    expect(classifyClick("/about", "Submit", mockClassList, true)).toBe("cta");
  });

  it("should return null for non-CTA links", () => {
    expect(classifyClick("/about", "About Us", mockClassList, false)).toBeNull();
  });
});

// =====================================================================
// 10. Pure function: sendGA4Event
// =====================================================================

describe("sendGA4Event", () => {
  it("should call window.gtag if available", () => {
    sendGA4Event("test_event", { key: "value" });
    expect(gtagMock).toHaveBeenCalledWith("event", "test_event", { key: "value" });
  });

  it("should not throw when gtag is missing", () => {
    delete (window as Record<string, unknown>).gtag;
    expect(() => sendGA4Event("test_event", { key: "value" })).not.toThrow();
  });

  it("should not throw when gtag throws", () => {
    (window as Record<string, unknown>).gtag = vi.fn(() => {
      throw new Error("GA4 failed");
    });
    expect(() => sendGA4Event("test_event", {})).not.toThrow();
  });
});

// =====================================================================
// 11. Constants
// =====================================================================

describe("Constants", () => {
  it("should define scroll milestones", () => {
    expect(SCROLL_MILESTONES).toEqual([10, 25, 50, 75, 90, 100]);
  });

  it("should define time milestones in seconds", () => {
    expect(TIME_MILESTONES).toEqual([10, 30, 60, 120, 300]);
  });
});

// =====================================================================
// 12. initTracker — Initialization
// =====================================================================

describe("initTracker — Initialization", () => {
  it("should set __rmiTrackerInit to true", () => {
    startTracker();
    expect((window as Record<string, unknown>).__rmiTrackerInit).toBe(true);
  });

  it("should return a cleanup function", () => {
    const result = initTracker();
    expect(typeof result).toBe("function");
    result?.();
  });

  it("should return undefined on second call (double-init guard)", () => {
    startTracker();
    const second = initTracker();
    expect(second).toBeUndefined();
  });

  it("should return undefined when already initialized", () => {
    startTracker();
    expect(initTracker()).toBeUndefined();
  });

  it("should send initial pageview beacon", () => {
    startTracker();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.type).toBe("pageview");
  });

  it("should include session ID in beacon payload", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(typeof payload.sessionId).toBe("string");
    expect((payload.sessionId as string).length).toBe(32);
  });

  it("should create visitor ID on first visit", () => {
    startTracker();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "rmi_vid",
      expect.stringContaining('"visits":1'),
    );
  });

  it("should increment visit number on subsequent visits", () => {
    localStorageMock.getItem = vi.fn().mockReturnValue(
      JSON.stringify({ id: "abc123", visits: 3 }),
    );
    startTracker();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "rmi_vid",
      JSON.stringify({ id: "abc123", visits: 4 }),
    );
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.visitNumber).toBe(4);
  });
});

// =====================================================================
// 13. initTracker — Beacon payloads
// =====================================================================

describe("initTracker — Beacon payloads", () => {
  it("should include all required payload fields in pageview", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    const requiredFields = [
      "type",
      "sessionId",
      "visitorId",
      "visitNumber",
      "pagePath",
      "screenWidth",
      "screenHeight",
      "viewportWidth",
      "viewportHeight",
      "deviceType",
      "browserName",
      "browserVersion",
      "osName",
      "osVersion",
      "language",
      "timezone",
      "touchSupport",
      "hardwareCores",
      "pixelRatio",
      "colorDepth",
      "connectionType",
      "scrollDepth",
      "timeOnPageMs",
      "interactions",
      "sectionsViewed",
      "ctaClicks",
      "formStarted",
      "exitIntent",
    ];
    for (const field of requiredFields) {
      expect(payload).toHaveProperty(field);
    }
  });

  it("should include pagePath from window.location.pathname", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: "/services" },
      writable: true,
      configurable: true,
    });
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.pagePath).toBe("/services");
  });

  it("should include UTM params when present", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?utm_source=google&utm_medium=cpc" },
      writable: true,
      configurable: true,
    });
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.utmSource).toBe("google");
    expect(payload.utmMedium).toBe("cpc");
  });

  it("should have undefined UTM fields when no UTM params", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.utmSource).toBeUndefined();
  });

  it("should include screen dimensions", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.screenWidth).toBe(1920);
    expect(payload.screenHeight).toBe(1080);
    expect(payload.viewportWidth).toBe(1440);
    expect(payload.viewportHeight).toBe(900);
  });

  it("should include timezone", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.timezone).toBe("America/Detroit");
  });

  it("should include touch support detection", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(typeof payload.touchSupport).toBe("boolean");
  });

  it("should include hardware concurrency", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.hardwareCores).toBe(8);
  });

  it("should include pixel ratio", () => {
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.pixelRatio).toBe(1);
  });

  it("should include referrer when present", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://google.com",
      writable: true,
      configurable: true,
    });
    startTracker();
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.referrer).toBe("https://google.com");
  });
});

// =====================================================================
// 14. initTracker — Beacon transport
// =====================================================================

describe("initTracker — Beacon transport", () => {
  it("should use fetch for pageview beacons", () => {
    startTracker();
    expect(fetchMock).toHaveBeenCalledWith("/api/beacon", expect.objectContaining({ method: "POST" }));
    expect(sendBeaconMock).not.toHaveBeenCalled();
  });

  it("should send update beacons every 30 seconds via fetch", () => {
    startTracker();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const payload = extractPayload(fetchMock.mock.calls[1]);
    expect(payload.type).toBe("update");

    vi.advanceTimersByTime(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should use navigator.sendBeacon for exit type", () => {
    startTracker();
    window.dispatchEvent(new Event("beforeunload"));
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(sendBeaconMock).toHaveBeenCalledWith("/api/beacon", expect.anything());
  });

  it("should fall back to fetch with keepalive when sendBeacon is absent", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    startTracker();
    fetchMock.mockClear();
    window.dispatchEvent(new Event("beforeunload"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/beacon",
      expect.objectContaining({ keepalive: true }),
    );
  });

  it("should handle fetch failure gracefully", () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    expect(() => startTracker()).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =====================================================================
// 15. initTracker — Scroll depth tracking
// =====================================================================

describe("initTracker — Scroll depth tracking", () => {
  function setupScrollEnv(scrollY: number, docHeight: number, viewportHeight: number): void {
    Object.defineProperty(document.body, "scrollHeight", { value: docHeight, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: docHeight,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: viewportHeight, configurable: true });
  }

  it("should fire GA4 scroll_depth events at milestones", () => {
    startTracker();
    gtagMock.mockClear();

    setupScrollEnv(2000, 5000, 900);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);

    expect(gtagMock).toHaveBeenCalledWith("event", "scroll_depth", expect.objectContaining({ percent: 10 }));
    expect(gtagMock).toHaveBeenCalledWith("event", "scroll_depth", expect.objectContaining({ percent: 25 }));
    expect(gtagMock).toHaveBeenCalledWith("event", "scroll_depth", expect.objectContaining({ percent: 50 }));
  });

  it("should fire all milestones when scrolled to 100%", () => {
    startTracker();
    gtagMock.mockClear();

    setupScrollEnv(900, 1000, 100);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);

    for (const pct of [10, 25, 50, 75, 90, 100]) {
      expect(gtagMock).toHaveBeenCalledWith(
        "event",
        "scroll_depth",
        expect.objectContaining({ percent: pct }),
      );
    }
  });

  it("should not fire same milestone twice", () => {
    startTracker();
    gtagMock.mockClear();

    setupScrollEnv(400, 1000, 100);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);

    const callsBefore = gtagMock.mock.calls.filter(
      (c: unknown[]) => c[1] === "scroll_depth" && (c[2] as Record<string, unknown>).percent === 25,
    ).length;

    setupScrollEnv(200, 1000, 100);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);
    setupScrollEnv(400, 1000, 100);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);

    const callsAfter = gtagMock.mock.calls.filter(
      (c: unknown[]) => c[1] === "scroll_depth" && (c[2] as Record<string, unknown>).percent === 25,
    ).length;

    expect(callsAfter).toBe(callsBefore);
  });

  it("should cap scroll depth at 100%", () => {
    startTracker();
    gtagMock.mockClear();

    setupScrollEnv(500, 1000, 1200);
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "scroll_depth",
      expect.objectContaining({ percent: 100 }),
    );
  });

  it("should throttle scroll updates to 200ms", () => {
    startTracker();
    gtagMock.mockClear();

    setupScrollEnv(1000, 5000, 900);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));

    vi.advanceTimersByTime(200);

    const scrollCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "scroll_depth");
    const uniqueMilestones = new Set(
      scrollCalls.map((c: unknown[]) => (c[2] as Record<string, unknown>).percent),
    );
    expect(uniqueMilestones.size).toBe(scrollCalls.length);
  });
});

// =====================================================================
// 16. initTracker — Time milestone tracking
// =====================================================================

describe("initTracker — Time milestones", () => {
  it("should fire GA4 events at time milestones", () => {
    startTracker();
    gtagMock.mockClear();

    vi.advanceTimersByTime(10_000);
    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "time_on_page",
      expect.objectContaining({ seconds: 10 }),
    );

    vi.advanceTimersByTime(20_000);
    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "time_on_page",
      expect.objectContaining({ seconds: 30 }),
    );

    vi.advanceTimersByTime(30_000);
    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "time_on_page",
      expect.objectContaining({ seconds: 60 }),
    );

    vi.advanceTimersByTime(60_000);
    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "time_on_page",
      expect.objectContaining({ seconds: 120 }),
    );

    vi.advanceTimersByTime(180_000);
    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "time_on_page",
      expect.objectContaining({ seconds: 300 }),
    );
  });

  it("should not fire same time milestone twice", () => {
    startTracker();
    gtagMock.mockClear();

    vi.advanceTimersByTime(15_000);
    const count10 = gtagMock.mock.calls.filter(
      (c: unknown[]) => c[1] === "time_on_page" && (c[2] as Record<string, unknown>).seconds === 10,
    ).length;

    vi.advanceTimersByTime(10_000);
    const count10After = gtagMock.mock.calls.filter(
      (c: unknown[]) => c[1] === "time_on_page" && (c[2] as Record<string, unknown>).seconds === 10,
    ).length;

    expect(count10).toBe(1);
    expect(count10After).toBe(1);
  });

  it("should include scroll_depth in time milestone events", () => {
    startTracker();
    gtagMock.mockClear();

    vi.advanceTimersByTime(10_000);
    const call = gtagMock.mock.calls.find(
      (c: unknown[]) => c[1] === "time_on_page" && (c[2] as Record<string, unknown>).seconds === 10,
    );
    expect(call).toBeDefined();
    expect((call as unknown[])[2]).toHaveProperty("scroll_depth");
  });
});

// =====================================================================
// 17. initTracker — Section visibility
// =====================================================================

describe("initTracker — Section visibility", () => {
  it("should set up IntersectionObserver for sections", () => {
    startTracker();
    expect(ioMock.instances.length).toBe(1);
    expect(ioMock.instances[0].observed.length).toBeGreaterThan(0);
  });

  it("should observe with threshold 0.3", () => {
    startTracker();
    expect(ioMock.instances.length).toBe(1);
    expect(ioMock.instances[0].options).toEqual({ threshold: 0.3 });
  });

  it("should send GA4 event when section becomes visible", () => {
    startTracker();
    gtagMock.mockClear();

    const heroEl = document.getElementById("hero") as Element;
    ioMock.instances[0].callback(
      [{ isIntersecting: true, target: heroEl } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "section_view",
      expect.objectContaining({ section: "hero" }),
    );
  });

  it("should not fire duplicate events for same section", () => {
    startTracker();
    gtagMock.mockClear();

    const heroEl = document.getElementById("hero") as Element;
    const entry = { isIntersecting: true, target: heroEl } as unknown as IntersectionObserverEntry;

    ioMock.instances[0].callback([entry], {} as IntersectionObserver);
    ioMock.instances[0].callback([entry], {} as IntersectionObserver);

    const sectionCalls = gtagMock.mock.calls.filter(
      (c: unknown[]) =>
        c[1] === "section_view" && (c[2] as Record<string, unknown>).section === "hero",
    );
    expect(sectionCalls.length).toBe(1);
  });

  it("should use data-section attribute when id is absent", () => {
    const el = document.createElement("div");
    el.setAttribute("data-section", "testimonials");
    document.body.appendChild(el);

    startTracker();
    gtagMock.mockClear();

    ioMock.instances[0].callback(
      [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "section_view",
      expect.objectContaining({ section: "testimonials" }),
    );
  });

  it("should skip non-intersecting entries", () => {
    startTracker();
    gtagMock.mockClear();

    const heroEl = document.getElementById("hero") as Element;
    ioMock.instances[0].callback(
      [{ isIntersecting: false, target: heroEl } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    const sectionCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "section_view");
    expect(sectionCalls.length).toBe(0);
  });

  it("should gracefully skip when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    expect(() => startTracker()).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// =====================================================================
// 18. initTracker — CTA click tracking
// =====================================================================

describe("initTracker — CTA click tracking", () => {
  it("should track phone link clicks (tel:)", () => {
    startTracker();
    gtagMock.mockClear();

    const phoneLink = document.getElementById("phone-link") as HTMLElement;
    phoneLink.click();

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "phone_click",
      expect.objectContaining({ phone: "+17345551234" }),
    );
  });

  it("should track email link clicks (mailto:)", () => {
    startTracker();
    gtagMock.mockClear();

    const emailLink = document.getElementById("email-link") as HTMLElement;
    emailLink.click();

    expect(gtagMock).toHaveBeenCalledWith("event", "email_click", expect.any(Object));
  });

  it("should track CTA button clicks (text contains 'quote')", () => {
    startTracker();
    gtagMock.mockClear();

    const ctaBtn = document.getElementById("cta-btn") as HTMLElement;
    ctaBtn.click();

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "cta_click",
      expect.objectContaining({ text: expect.stringContaining("get a quote") }),
    );
  });

  it("should track CTA button by class 'cta'", () => {
    startTracker();
    gtagMock.mockClear();

    const btn = document.createElement("button");
    btn.className = "cta";
    btn.textContent = "Learn More";
    document.body.appendChild(btn);
    btn.click();

    expect(gtagMock).toHaveBeenCalledWith("event", "cta_click", expect.any(Object));
  });

  it("should track CTA button by data-cta attribute", () => {
    startTracker();
    gtagMock.mockClear();

    const btn = document.createElement("button");
    btn.setAttribute("data-cta", "");
    btn.textContent = "Submit";
    document.body.appendChild(btn);
    btn.click();

    expect(gtagMock).toHaveBeenCalledWith("event", "cta_click", expect.any(Object));
  });

  it("should increment interaction count on any click", () => {
    startTracker();
    fetchMock.mockClear();

    const plainLink = document.getElementById("plain-link") as HTMLElement;
    plainLink.click();
    plainLink.click();
    plainLink.click();

    vi.advanceTimersByTime(30_000);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.interactions).toBeGreaterThanOrEqual(3);
  });

  it("should increment CTA click count", () => {
    startTracker();
    fetchMock.mockClear();

    const phoneLink = document.getElementById("phone-link") as HTMLElement;
    phoneLink.click();
    const ctaBtn = document.getElementById("cta-btn") as HTMLElement;
    ctaBtn.click();

    vi.advanceTimersByTime(30_000);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.ctaClicks).toBeGreaterThanOrEqual(2);
  });

  it("should not fire CTA event for plain links", () => {
    startTracker();
    gtagMock.mockClear();

    const plainLink = document.getElementById("plain-link") as HTMLElement;
    plainLink.click();

    const ctaCalls = gtagMock.mock.calls.filter(
      (c: unknown[]) =>
        c[1] === "cta_click" || c[1] === "phone_click" || c[1] === "email_click",
    );
    expect(ctaCalls.length).toBe(0);
  });

  it("should detect CTA keywords: contact, get started, call, schedule", () => {
    startTracker();

    const keywords = ["contact us", "get started", "call now", "schedule a visit"];
    for (const text of keywords) {
      gtagMock.mockClear();
      const btn = document.createElement("button");
      btn.textContent = text;
      document.body.appendChild(btn);
      btn.click();
      const ctaCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "cta_click");
      expect(ctaCalls.length).toBe(1);
    }
  });
});

// =====================================================================
// 19. initTracker — Form tracking
// =====================================================================

describe("initTracker — Form tracking", () => {
  it("should detect form field focus and send GA4 form_start", () => {
    startTracker();
    gtagMock.mockClear();

    const input = document.querySelector("#contact-form input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus", { bubbles: true }));

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "form_start",
      expect.objectContaining({ form_id: "contact-form" }),
    );
  });

  it("should fire form_start only once per session", () => {
    startTracker();
    gtagMock.mockClear();

    const input = document.querySelector("#contact-form input") as HTMLInputElement;
    const textarea = document.querySelector("#contact-form textarea") as HTMLTextAreaElement;

    input.dispatchEvent(new Event("focus", { bubbles: true }));
    textarea.dispatchEvent(new Event("focus", { bubbles: true }));

    const formCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "form_start");
    expect(formCalls.length).toBe(1);
  });

  it("should set formStarted flag in beacon payload", () => {
    startTracker();
    fetchMock.mockClear();

    const input = document.querySelector("#contact-form input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus", { bubbles: true }));

    vi.advanceTimersByTime(30_000);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.formStarted).toBe(true);
  });

  it("should not fire form_start for inputs outside a form", () => {
    startTracker();
    gtagMock.mockClear();

    const orphanInput = document.createElement("input");
    document.body.appendChild(orphanInput);
    orphanInput.dispatchEvent(new Event("focus", { bubbles: true }));

    const formCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "form_start");
    expect(formCalls.length).toBe(0);
  });

  it("should handle textarea focus", () => {
    startTracker();
    gtagMock.mockClear();

    const textarea = document.querySelector("#contact-form textarea") as HTMLTextAreaElement;
    textarea.dispatchEvent(new Event("focus", { bubbles: true }));

    expect(gtagMock).toHaveBeenCalledWith("event", "form_start", expect.any(Object));
  });

  it("should use 'contact' as default form_id when form has no id", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    form.appendChild(input);
    document.body.appendChild(form);

    startTracker();
    gtagMock.mockClear();

    input.dispatchEvent(new Event("focus", { bubbles: true }));

    expect(gtagMock).toHaveBeenCalledWith(
      "event",
      "form_start",
      expect.objectContaining({ form_id: "contact" }),
    );
  });
});

// =====================================================================
// 20. initTracker — Exit intent detection
// =====================================================================

describe("initTracker — Exit intent", () => {
  it("should detect mouse leaving viewport (clientY <= 5)", () => {
    startTracker();
    gtagMock.mockClear();

    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 3 }));

    expect(gtagMock).toHaveBeenCalledWith("event", "exit_intent", expect.any(Object));
  });

  it("should not fire exit_intent when clientY > 5", () => {
    startTracker();
    gtagMock.mockClear();

    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 100 }));

    const exitCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "exit_intent");
    expect(exitCalls.length).toBe(0);
  });

  it("should fire exit_intent only once", () => {
    startTracker();
    gtagMock.mockClear();

    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 2 }));
    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 1 }));
    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0 }));

    const exitCalls = gtagMock.mock.calls.filter((c: unknown[]) => c[1] === "exit_intent");
    expect(exitCalls.length).toBe(1);
  });

  it("should include time_on_page, scroll_depth, sections_viewed in exit_intent", () => {
    startTracker();
    gtagMock.mockClear();

    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0 }));

    const exitCall = gtagMock.mock.calls.find((c: unknown[]) => c[1] === "exit_intent");
    expect(exitCall).toBeDefined();
    const params = (exitCall as unknown[])[2] as Record<string, unknown>;
    expect(params).toHaveProperty("time_on_page");
    expect(params).toHaveProperty("scroll_depth");
    expect(params).toHaveProperty("sections_viewed");
  });

  it("should set exitIntent flag in beacon payload", () => {
    startTracker();
    fetchMock.mockClear();

    document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0 }));

    vi.advanceTimersByTime(30_000);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.exitIntent).toBe(true);
  });
});

// =====================================================================
// 21. initTracker — Visibility change
// =====================================================================

describe("initTracker — Visibility change", () => {
  it("should send update beacon when tab becomes hidden", () => {
    startTracker();
    fetchMock.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.type).toBe("update");
  });

  it("should not send beacon when tab becomes visible", () => {
    startTracker();
    fetchMock.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// =====================================================================
// 22. initTracker — Interaction counting (keydown)
// =====================================================================

describe("initTracker — Interaction counting", () => {
  it("should count keydown events as interactions", () => {
    startTracker();
    fetchMock.mockClear();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));

    vi.advanceTimersByTime(30_000);
    const payload = extractPayload(fetchMock.mock.calls[0]);
    expect(payload.interactions).toBeGreaterThanOrEqual(2);
  });
});

// =====================================================================
// 23. initTracker — DOMContentLoaded branch
// =====================================================================

describe("initTracker — DOMContentLoaded handling", () => {
  it("should defer setup when document.readyState is 'loading'", () => {
    Object.defineProperty(document, "readyState", {
      value: "loading",
      writable: true,
      configurable: true,
    });

    const addEventSpy = vi.spyOn(document, "addEventListener");
    startTracker();

    const domContentLoadedCalls = addEventSpy.mock.calls.filter((c) => c[0] === "DOMContentLoaded");
    expect(domContentLoadedCalls.length).toBe(1);
  });
});

// =====================================================================
// 24. initTracker — beforeunload cleanup
// =====================================================================

describe("initTracker — beforeunload cleanup", () => {
  it("should clear intervals on beforeunload", () => {
    startTracker();
    fetchMock.mockClear();
    gtagMock.mockClear();

    window.dispatchEvent(new Event("beforeunload"));

    sendBeaconMock.mockClear();
    fetchMock.mockClear();
    gtagMock.mockClear();

    vi.advanceTimersByTime(60_000);

    const updateCalls = fetchMock.mock.calls.filter((c: unknown[]) => {
      try {
        const payload = extractPayload(c);
        return payload.type === "update";
      } catch {
        return false;
      }
    });
    expect(updateCalls.length).toBe(0);
  });

  it("should return a cleanup function that clears intervals", () => {
    const cleanupFn = initTracker();
    expect(cleanupFn).toBeDefined();

    fetchMock.mockClear();
    cleanupFn?.();

    vi.advanceTimersByTime(60_000);

    const updateCalls = fetchMock.mock.calls.filter((c: unknown[]) => {
      try {
        const payload = extractPayload(c);
        return payload.type === "update";
      } catch {
        return false;
      }
    });
    expect(updateCalls.length).toBe(0);

    expect((window as Record<string, unknown>).__rmiTrackerInit).toBeUndefined();
  });
});
