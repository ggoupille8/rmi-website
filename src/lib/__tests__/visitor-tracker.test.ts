/**
 * Unit tests for visitor-tracker.ts
 *
 * Strategy: Test the exported pure utility functions directly.
 * Integration tests for the initTracker IIFE are done with careful
 * mocking. We do NOT use vi.useFakeTimers() in beforeEach because
 * it breaks happy-dom's prototype chain.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateId,
  getVisitorId,
  getUTMParams,
  getDeviceType,
  getBrowserInfo,
  getOSInfo,
  getConnectionType,
  sendGA4Event,
  SCROLL_MILESTONES,
  TIME_MILESTONES,
  calculateScrollPercent,
  classifyClick,
} from "../visitor-tracker";

// =====================================================================
// 1. generateId
// =====================================================================

describe("generateId", () => {
  it("should return a 32-character hex string", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("should generate unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("should use crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    generateId();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// =====================================================================
// 2. getVisitorId
// =====================================================================

describe("getVisitorId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should create a new visitor ID on first visit", () => {
    const result = getVisitorId();
    expect(result.id).toMatch(/^[0-9a-f]{32}$/);
    expect(result.visitNumber).toBe(1);
  });

  it("should persist visitor ID in localStorage as rmi_vid", () => {
    getVisitorId();
    const stored = localStorage.getItem("rmi_vid");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toMatch(/^[0-9a-f]{32}$/);
    expect(parsed.visits).toBe(1);
  });

  it("should increment visit count on return visits", () => {
    const first = getVisitorId();
    const second = getVisitorId();
    expect(second.id).toBe(first.id);
    expect(second.visitNumber).toBe(2);
  });

  it("should preserve visitor ID across multiple visits", () => {
    const first = getVisitorId();
    const second = getVisitorId();
    const third = getVisitorId();
    expect(third.id).toBe(first.id);
    expect(third.visitNumber).toBe(3);
  });

  it("should handle corrupted localStorage data", () => {
    localStorage.setItem("rmi_vid", "not valid json{{{");
    const result = getVisitorId();
    expect(result.id).toMatch(/^[0-9a-f]{32}$/);
    expect(result.visitNumber).toBe(1);
  });

  it("should handle localStorage getItem throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const result = getVisitorId();
    expect(result.id).toMatch(/^[0-9a-f]{32}$/);
    expect(result.visitNumber).toBe(1);
    spy.mockRestore();
  });

  it("should handle localStorage setItem throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const result = getVisitorId();
    expect(result.id).toMatch(/^[0-9a-f]{32}$/);
    spy.mockRestore();
  });

  it("should handle missing visits field in stored data", () => {
    localStorage.setItem("rmi_vid", JSON.stringify({ id: "abc123" }));
    const result = getVisitorId();
    expect(result.id).toBe("abc123");
    expect(result.visitNumber).toBe(1);
  });
});

// =====================================================================
// 3. getUTMParams
// =====================================================================

describe("getUTMParams", () => {
  it("should extract utm_source from URL", () => {
    const result = getUTMParams("?utm_source=google");
    expect(result.utm_source).toBe("google");
  });

  it("should extract utm_medium from URL", () => {
    const result = getUTMParams("?utm_medium=cpc");
    expect(result.utm_medium).toBe("cpc");
  });

  it("should extract utm_campaign from URL", () => {
    const result = getUTMParams("?utm_campaign=spring_sale");
    expect(result.utm_campaign).toBe("spring_sale");
  });

  it("should extract utm_term from URL", () => {
    const result = getUTMParams("?utm_term=insulation+services");
    expect(result.utm_term).toBe("insulation services");
  });

  it("should extract utm_content from URL", () => {
    const result = getUTMParams("?utm_content=hero_banner");
    expect(result.utm_content).toBe("hero_banner");
  });

  it("should extract all UTM params at once", () => {
    const result = getUTMParams(
      "?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=rmi&utm_content=ad1",
    );
    expect(result).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      utm_term: "rmi",
      utm_content: "ad1",
    });
  });

  it("should return empty object when no UTM params", () => {
    const result = getUTMParams("?page=1&sort=date");
    expect(result).toEqual({});
  });

  it("should handle empty search string", () => {
    const result = getUTMParams("");
    expect(result).toEqual({});
  });

  it("should ignore non-UTM params", () => {
    const result = getUTMParams("?utm_source=fb&foo=bar&baz=qux");
    expect(result).toEqual({ utm_source: "fb" });
    expect(result).not.toHaveProperty("foo");
  });

  it("should handle URL-encoded values", () => {
    const result = getUTMParams("?utm_source=google%20ads");
    expect(result.utm_source).toBe("google ads");
  });
});

// =====================================================================
// 4. getDeviceType
// =====================================================================

describe("getDeviceType", () => {
  it("should detect desktop on Windows Chrome UA", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
      ),
    ).toBe("desktop");
  });

  it("should detect mobile on iPhone UA", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1",
      ),
    ).toBe("mobile");
  });

  it("should detect tablet on iPad UA", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("tablet");
  });

  it("should detect mobile on Android phone UA", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Mobile Chrome/120",
      ),
    ).toBe("mobile");
  });

  it("should detect desktop on macOS Safari UA", () => {
    expect(
      getDeviceType(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15",
      ),
    ).toBe("desktop");
  });

  it("should detect desktop on Linux Firefox UA", () => {
    expect(
      getDeviceType("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0"),
    ).toBe("desktop");
  });

  it("should return desktop for empty UA", () => {
    expect(getDeviceType("")).toBe("desktop");
  });

  it("should handle tablet keyword in UA", () => {
    expect(getDeviceType("Mozilla/5.0 tablet")).toBe("tablet");
  });
});

// =====================================================================
// 5. getBrowserInfo
// =====================================================================

describe("getBrowserInfo", () => {
  it("should detect Chrome", () => {
    const result = getBrowserInfo(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );
    expect(result.name).toBe("Chrome");
    expect(result.version).toBe("120");
  });

  it("should detect Firefox", () => {
    const result = getBrowserInfo(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    );
    expect(result.name).toBe("Firefox");
    expect(result.version).toBe("120");
  });

  it("should detect Safari", () => {
    const result = getBrowserInfo(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17 Safari/605.1.15",
    );
    expect(result.name).toBe("Safari");
    expect(result.version).toBe("17");
  });

  it("should detect Edge", () => {
    const result = getBrowserInfo(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0",
    );
    expect(result.name).toBe("Edge");
    expect(result.version).toBe("120");
  });

  it("should return Unknown for unrecognized browser", () => {
    const result = getBrowserInfo("SomeWeirdBrowser/1.0");
    expect(result.name).toBe("Unknown");
    expect(result.version).toBe("");
  });

  it("should handle empty UA", () => {
    const result = getBrowserInfo("");
    expect(result.name).toBe("Unknown");
    expect(result.version).toBe("");
  });

  it("should distinguish Edge from Chrome", () => {
    const edgeUA = "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    const chromeUA = "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36";
    expect(getBrowserInfo(edgeUA).name).toBe("Edge");
    expect(getBrowserInfo(chromeUA).name).toBe("Chrome");
  });

  it("should distinguish Safari from Chrome", () => {
    const safariUA =
      "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17 Safari/605.1.15";
    expect(getBrowserInfo(safariUA).name).toBe("Safari");
  });
});

// =====================================================================
// 6. getOSInfo
// =====================================================================

describe("getOSInfo", () => {
  it("should detect Windows with version", () => {
    const result = getOSInfo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    expect(result.name).toBe("Windows");
    expect(result.version).toBe("10.0");
  });

  it("should detect macOS with version", () => {
    const result = getOSInfo("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1");
    expect(result.name).toBe("macOS");
    expect(result.version).toBe("14.2");
  });

  it("should detect Android with version", () => {
    const result = getOSInfo("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36");
    expect(result.name).toBe("Android");
    expect(result.version).toBe("14");
  });

  it("should detect iOS on iPhone", () => {
    const result = getOSInfo(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1",
    );
    expect(result.name).toBe("iOS");
    expect(result.version).toBe("17.2");
  });

  it("should detect iOS on iPad", () => {
    const result = getOSInfo(
      "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    );
    expect(result.name).toBe("iOS");
    expect(result.version).toBe("17.2");
  });

  it("should detect Linux", () => {
    const result = getOSInfo("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101");
    expect(result.name).toBe("Linux");
    expect(result.version).toBe("");
  });

  it("should detect ChromeOS", () => {
    const result = getOSInfo("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36");
    expect(result.name).toBe("ChromeOS");
    expect(result.version).toBe("");
  });

  it("should return Unknown for unrecognized OS", () => {
    const result = getOSInfo("SomeWeirdUA/1.0");
    expect(result.name).toBe("Unknown");
    expect(result.version).toBe("");
  });

  it("should handle empty UA", () => {
    const result = getOSInfo("");
    expect(result.name).toBe("Unknown");
    expect(result.version).toBe("");
  });

  it("should convert macOS underscore version to dots", () => {
    const result = getOSInfo("Mac OS X 14_2");
    expect(result.version).toBe("14.2");
  });

  it("should convert iOS underscore version to dots", () => {
    const result = getOSInfo("iPhone; CPU iPhone OS 17_2 like Mac OS X");
    expect(result.version).toBe("17.2");
  });
});

// =====================================================================
// 7. calculateScrollPercent
// =====================================================================

describe("calculateScrollPercent", () => {
  it("should calculate correct percent for top of page with viewport", () => {
    expect(calculateScrollPercent(0, 800, 2000)).toBe(40);
  });

  it("should return 100 when at bottom of page", () => {
    expect(calculateScrollPercent(1200, 800, 2000)).toBe(100);
  });

  it("should return correct percent for mid-scroll", () => {
    expect(calculateScrollPercent(500, 800, 2000)).toBe(65);
  });

  it("should cap at 100", () => {
    expect(calculateScrollPercent(2000, 800, 2000)).toBe(100);
  });

  it("should return 0 for zero doc height", () => {
    expect(calculateScrollPercent(0, 800, 0)).toBe(0);
  });

  it("should handle single-screen page", () => {
    expect(calculateScrollPercent(0, 2000, 1000)).toBe(100);
  });

  it("should round to nearest integer", () => {
    expect(calculateScrollPercent(100, 800, 3000)).toBe(30);
  });

  it("should handle negative doc height", () => {
    expect(calculateScrollPercent(0, 800, -100)).toBe(0);
  });
});

// =====================================================================
// 8. Constants
// =====================================================================

describe("Constants", () => {
  it("SCROLL_MILESTONES should be [10, 25, 50, 75, 90, 100]", () => {
    expect(SCROLL_MILESTONES).toEqual([10, 25, 50, 75, 90, 100]);
  });

  it("TIME_MILESTONES should be [10, 30, 60, 120, 300]", () => {
    expect(TIME_MILESTONES).toEqual([10, 30, 60, 120, 300]);
  });

  it("SCROLL_MILESTONES should be sorted ascending", () => {
    for (let i = 1; i < SCROLL_MILESTONES.length; i++) {
      expect(SCROLL_MILESTONES[i]).toBeGreaterThan(SCROLL_MILESTONES[i - 1]);
    }
  });

  it("TIME_MILESTONES should be sorted ascending", () => {
    for (let i = 1; i < TIME_MILESTONES.length; i++) {
      expect(TIME_MILESTONES[i]).toBeGreaterThan(TIME_MILESTONES[i - 1]);
    }
  });
});

// =====================================================================
// 9. classifyClick
// =====================================================================

describe("classifyClick", () => {
  const mockClassList = { contains: (cls: string) => cls === "cta" };
  const emptyClassList = { contains: () => false };

  it("should classify tel: links as phone", () => {
    expect(classifyClick("tel:+17345551234", "Call Us", emptyClassList, false)).toBe("phone");
  });

  it("should classify mailto: links as email", () => {
    expect(classifyClick("mailto:info@rmi-llc.net", "Email Us", emptyClassList, false)).toBe("email");
  });

  it("should classify 'quote' text as CTA", () => {
    expect(classifyClick("/contact", "Get a Quote", emptyClassList, false)).toBe("cta");
  });

  it("should classify 'contact' text as CTA", () => {
    expect(classifyClick("/contact", "Contact Us", emptyClassList, false)).toBe("cta");
  });

  it("should classify 'get started' text as CTA", () => {
    expect(classifyClick("/", "Get Started", emptyClassList, false)).toBe("cta");
  });

  it("should classify 'call' text as CTA", () => {
    expect(classifyClick("/", "Call Now", emptyClassList, false)).toBe("cta");
  });

  it("should classify 'schedule' text as CTA", () => {
    expect(classifyClick("/", "Schedule a visit", emptyClassList, false)).toBe("cta");
  });

  it("should classify element with .cta class as CTA", () => {
    expect(classifyClick("/about", "About", mockClassList, false)).toBe("cta");
  });

  it("should classify element with data-cta attribute as CTA", () => {
    expect(classifyClick("/about", "Learn More", emptyClassList, true)).toBe("cta");
  });

  it("should return null for non-CTA links", () => {
    expect(classifyClick("/about", "About Us", emptyClassList, false)).toBeNull();
  });

  it("should return null for external links without CTA keywords", () => {
    expect(classifyClick("https://google.com", "Google", emptyClassList, false)).toBeNull();
  });

  it("should prioritize tel: over CTA text", () => {
    expect(classifyClick("tel:+1234", "Call to get a quote", emptyClassList, false)).toBe("phone");
  });

  it("should prioritize mailto: over CTA text", () => {
    expect(classifyClick("mailto:x@y.com", "Contact us", emptyClassList, false)).toBe("email");
  });

  it("should be case-insensitive for CTA text", () => {
    expect(classifyClick("/", "GET A QUOTE NOW", emptyClassList, false)).toBe("cta");
  });

  it("should trim whitespace from text", () => {
    expect(classifyClick("/", "  Get a Quote  ", emptyClassList, false)).toBe("cta");
  });
});

// =====================================================================
// 10. sendGA4Event
// =====================================================================

describe("sendGA4Event", () => {
  afterEach(() => {
    delete (window as Record<string, unknown>).gtag;
  });

  it("should call window.gtag when available", () => {
    const mockGtag = vi.fn();
    (window as Record<string, unknown>).gtag = mockGtag;
    sendGA4Event("test_event", { foo: "bar" });
    expect(mockGtag).toHaveBeenCalledWith("event", "test_event", { foo: "bar" });
  });

  it("should not throw when gtag is missing", () => {
    expect(() => sendGA4Event("test_event", {})).not.toThrow();
  });

  it("should not throw when gtag is not a function", () => {
    (window as Record<string, unknown>).gtag = "not a function";
    expect(() => sendGA4Event("test_event", {})).not.toThrow();
  });

  it("should handle gtag that throws", () => {
    (window as Record<string, unknown>).gtag = () => {
      throw new Error("GA4 error");
    };
    expect(() => sendGA4Event("test_event", {})).not.toThrow();
  });

  it("should pass complex params correctly", () => {
    const mockGtag = vi.fn();
    (window as Record<string, unknown>).gtag = mockGtag;
    sendGA4Event("scroll_depth", { percent: 50, time_on_page: 30, section: "services" });
    expect(mockGtag).toHaveBeenCalledWith("event", "scroll_depth", {
      percent: 50,
      time_on_page: 30,
      section: "services",
    });
  });
});

// =====================================================================
// 11. getConnectionType
// =====================================================================

describe("getConnectionType", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
  });

  it("should return effectiveType when navigator.connection exists", () => {
    Object.defineProperty(navigator, "connection", {
      value: { effectiveType: "4g" },
      configurable: true,
    });
    expect(getConnectionType()).toBe("4g");
  });

  it("should return 'unknown' when navigator.connection is missing", () => {
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
    expect(getConnectionType()).toBe("unknown");
  });

  it("should return 'unknown' when effectiveType is missing", () => {
    Object.defineProperty(navigator, "connection", { value: {}, configurable: true });
    expect(getConnectionType()).toBe("unknown");
  });
});

// =====================================================================
// 12. initTracker integration tests
// =====================================================================

describe("initTracker", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let sendBeaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    sendBeaconSpy = vi.fn().mockReturnValue(true);
    navigator.sendBeacon = sendBeaconSpy;
    // Clear init flag so initTracker can run fresh
    delete (window as Record<string, unknown>).__rmiTrackerInit;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as Record<string, unknown>).__rmiTrackerInit;
  });

  // Helper: dynamically import with fresh module cache.
  // Pre-set __rmiTrackerInit to prevent the auto-init at module bottom,
  // then clear it and call initTracker manually.
  async function freshImport() {
    vi.resetModules();
    // Block auto-init during import
    (window as Record<string, unknown>).__rmiTrackerInit = true;
    const mod = await import("../visitor-tracker");
    // Now clear it so our manual call works
    delete (window as Record<string, unknown>).__rmiTrackerInit;
    return mod;
  }

  it("should return a cleanup function", async () => {
    const { initTracker } = await freshImport();
    const cleanup = initTracker();
    expect(typeof cleanup).toBe("function");
    if (cleanup) cleanup();
  });

  it("should return undefined on double-init", async () => {
    const { initTracker } = await freshImport();
    const first = initTracker();
    const second = initTracker();
    expect(first).toBeDefined();
    expect(second).toBeUndefined();
    if (first) first();
  });

  it("should set __rmiTrackerInit to true", async () => {
    const { initTracker } = await freshImport();
    const cleanup = initTracker();
    expect((window as Record<string, unknown>).__rmiTrackerInit).toBe(true);
    if (cleanup) cleanup();
  });

  it("should send a pageview beacon on init", async () => {
    const { initTracker } = await freshImport();
    const cleanup = initTracker();

    await new Promise((r) => setTimeout(r, 50));

    expect(fetchSpy).toHaveBeenCalled();
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe("/api/beacon");
    const body = JSON.parse(await (callArgs[1].body as Blob).text());
    expect(body.type).toBe("pageview");
    expect(body.sessionId).toMatch(/^[0-9a-f]{32}$/);

    if (cleanup) cleanup();
  });

  it("should include device info in pageview beacon", async () => {
    const { initTracker } = await freshImport();
    const cleanup = initTracker();

    await new Promise((r) => setTimeout(r, 50));

    const callArgs = fetchSpy.mock.calls[0];
    const body = JSON.parse(await (callArgs[1].body as Blob).text());
    expect(body).toHaveProperty("screenWidth");
    expect(body).toHaveProperty("screenHeight");
    expect(body).toHaveProperty("viewportWidth");
    expect(body).toHaveProperty("viewportHeight");
    expect(body).toHaveProperty("deviceType");
    expect(body).toHaveProperty("browserName");
    expect(body).toHaveProperty("osName");
    expect(body).toHaveProperty("language");

    if (cleanup) cleanup();
  });

  it("cleanup should delete __rmiTrackerInit", async () => {
    const { initTracker } = await freshImport();
    const cleanup = initTracker();
    expect((window as Record<string, unknown>).__rmiTrackerInit).toBe(true);
    if (cleanup) cleanup();
    expect((window as Record<string, unknown>).__rmiTrackerInit).toBeUndefined();
  });
});

// =====================================================================
// 13. Edge Cases
// =====================================================================

describe("Edge Cases", () => {
  it("getDeviceType handles mixed case keywords", () => {
    expect(getDeviceType("MOBILE device")).toBe("mobile");
    expect(getDeviceType("TABLET browser")).toBe("tablet");
  });

  it("getBrowserInfo handles Chrome with very high version", () => {
    const result = getBrowserInfo("Chrome/999.0.0.0");
    expect(result.name).toBe("Chrome");
    expect(result.version).toBe("999");
  });

  it("getOSInfo handles Windows 11 (NT 10.0)", () => {
    const result = getOSInfo("Windows NT 10.0; Win64; x64");
    expect(result.name).toBe("Windows");
    expect(result.version).toBe("10.0");
  });

  it("getUTMParams handles duplicate params (uses first)", () => {
    const result = getUTMParams("?utm_source=first&utm_source=second");
    expect(result.utm_source).toBe("first");
  });

  it("calculateScrollPercent handles very tall pages", () => {
    expect(calculateScrollPercent(50000, 800, 100000)).toBe(51);
  });

  it("calculateScrollPercent handles zero viewport height", () => {
    expect(calculateScrollPercent(500, 0, 2000)).toBe(25);
  });

  it("classifyClick handles empty href", () => {
    expect(classifyClick("", "About", { contains: () => false }, false)).toBeNull();
  });

  it("classifyClick handles empty text", () => {
    expect(classifyClick("/about", "", { contains: () => false }, false)).toBeNull();
  });

  it("generateId produces hex-only characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateId()).toMatch(/^[0-9a-f]+$/);
    }
  });
});
