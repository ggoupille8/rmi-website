import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  collectIntelligence,
  detectMediaDevices,
} from "../intelligenceCollector";
import type { FormBehavior } from "../intelligenceCollector";

const mockFormBehavior: FormBehavior = {
  timeToFirstKeyMs: 1500,
  timeOnFormMs: 30000,
  fieldEditCount: 5,
  messageLength: 100,
  optionalFieldsFilled: 2,
  pasteDetected: false,
  idlePeriods: 1,
  submissionSpeedMs: 500,
};

describe("collectIntelligence", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* not available */
    }
  });

  it("returns a complete payload with all required fields", () => {
    const payload = collectIntelligence(mockFormBehavior);

    // Device & browser
    expect(typeof payload.screenWidth).toBe("number");
    expect(typeof payload.screenHeight).toBe("number");
    expect(typeof payload.viewportWidth).toBe("number");
    expect(typeof payload.viewportHeight).toBe("number");
    expect(typeof payload.devicePixelRatio).toBe("number");
    expect(typeof payload.colorDepth).toBe("number");
    expect(typeof payload.touchSupport).toBe("boolean");
    expect(typeof payload.hardwareConcurrency).toBe("number");
    expect(typeof payload.platform).toBe("string");
    expect(typeof payload.browserLanguage).toBe("string");
    expect(typeof payload.timezoneOffset).toBe("number");
    expect(typeof payload.doNotTrack).toBe("boolean");
    expect(typeof payload.cookiesEnabled).toBe("boolean");
    expect(typeof payload.pdfViewerEnabled).toBe("boolean");

    // Network
    expect(typeof payload.connectionType).toBe("string");
    expect(typeof payload.saveDataMode).toBe("boolean");

    // Traffic source
    expect(typeof payload.referrerUrl).toBe("string");
    expect(typeof payload.referrerDomain).toBe("string");
    expect(typeof payload.entryUrl).toBe("string");

    // Session & behavioral
    expect(typeof payload.sessionDurationMs).toBe("number");
    expect(typeof payload.scrollDepthPct).toBe("number");
    expect(typeof payload.tabBlurCount).toBe("number");
    expect(typeof payload.returnVisitor).toBe("boolean");

    // Timestamps
    expect(typeof payload.submittedAtLocal).toBe("string");
    expect(typeof payload.submittedAtUtc).toBe("string");
    expect(payload.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(payload.dayOfWeek).toBeLessThanOrEqual(6);
    expect(payload.hourOfDay).toBeGreaterThanOrEqual(0);
    expect(payload.hourOfDay).toBeLessThanOrEqual(23);

    // Fingerprints
    expect(typeof payload.canvasFingerprint).toBe("string");
    expect(payload.canvasFingerprint.length).toBeGreaterThan(0);
    expect(typeof payload.webglVendor).toBe("string");
    expect(typeof payload.webglRenderer).toBe("string");
    expect(typeof payload.installedFontsHash).toBe("string");

    // Browser fingerprint
    expect(Array.isArray(payload.browserLanguages)).toBe(true);
    expect(typeof payload.browserMaxTouchPoints).toBe("number");
    expect(typeof payload.browserWebdriver).toBe("boolean");

    // Screen & display
    expect(typeof payload.screenOrientation).toBe("string");
    expect(typeof payload.screenAvailWidth).toBe("number");
    expect(typeof payload.screenAvailHeight).toBe("number");

    // Timezone & locale
    expect(typeof payload.timezone).toBe("string");
    expect(payload.timezone.length).toBeGreaterThan(0);
    expect(typeof payload.locale).toBe("string");

    // Performance timing
    expect(typeof payload.perfPageLoadMs).toBe("number");
    expect(typeof payload.perfDomReadyMs).toBe("number");
    expect(typeof payload.perfDnsLookupMs).toBe("number");
    expect(typeof payload.perfTcpConnectMs).toBe("number");
    expect(typeof payload.perfTtfbMs).toBe("number");
    expect(typeof payload.perfEntriesCount).toBe("number");

    // Page context
    expect(typeof payload.pageUrl).toBe("string");
    expect(typeof payload.pageTitle).toBe("string");
    // window.history.length is undefined in happy-dom mock (no length prop)
    expect(payload).toHaveProperty("pageHistoryLength");
    expect(typeof payload.pageReferrer).toBe("string");

    // Media capabilities (defaults before async merge)
    expect(payload.hasWebcam).toBe(false);
    expect(payload.hasMicrophone).toBe(false);
    expect(payload.mediaDeviceCount).toBe(0);

    // Storage
    expect(typeof payload.storageLocalAvailable).toBe("boolean");
    expect(typeof payload.storageSessionAvailable).toBe("boolean");
    expect(typeof payload.storageIndexedDbAvailable).toBe("boolean");

    // Advanced behavioral
    expect(typeof payload.mouseMoveCount).toBe("number");
    expect(typeof payload.mouseClickCount).toBe("number");
    expect(typeof payload.keyPressCount).toBe("number");
    expect(typeof payload.touchEventCount).toBe("number");
    expect(Array.isArray(payload.formFieldFocusOrder)).toBe(true);
    expect(typeof payload.formFieldTimeMs).toBe("object");
    expect(typeof payload.formCorrectionsCount).toBe("number");
    expect(typeof payload.scrollDirectionChanges).toBe("number");
    expect(typeof payload.maxScrollSpeed).toBe("number");
    expect(typeof payload.pageVisibilityChanges).toBe("number");

    // Submission meta
    expect(typeof payload.submissionMethod).toBe("string");
    expect(typeof payload.formCompletionTimeMs).toBe("number");
  });

  it("passes form behavior fields through unchanged", () => {
    const payload = collectIntelligence(mockFormBehavior);

    expect(payload.timeToFirstKeyMs).toBe(1500);
    expect(payload.timeOnFormMs).toBe(30000);
    expect(payload.fieldEditCount).toBe(5);
    expect(payload.messageLength).toBe(100);
    expect(payload.optionalFieldsFilled).toBe(2);
    expect(payload.pasteDetected).toBe(false);
    expect(payload.idlePeriods).toBe(1);
    expect(payload.submissionSpeedMs).toBe(500);
  });

  it("sets formCompletionTimeMs from timeOnFormMs", () => {
    const payload = collectIntelligence(mockFormBehavior);
    expect(payload.formCompletionTimeMs).toBe(mockFormBehavior.timeOnFormMs);
  });

  it("canvas fingerprint returns a valid string in test environment", () => {
    const payload = collectIntelligence(mockFormBehavior);
    // happy-dom: canvas.getContext("2d") → null → "unsupported"
    // If canvas throws → "blocked"
    // If canvas works → hex hash string
    expect(payload.canvasFingerprint).toMatch(
      /^(unsupported|blocked|-?[0-9a-f]+)$/
    );
  });

  it("WebGL returns valid strings in test environment", () => {
    const payload = collectIntelligence(mockFormBehavior);
    // Test env: no WebGL → "unsupported", "hidden", or "error"
    const validValues = ["unsupported", "hidden", "error", "unknown"];
    expect(
      validValues.includes(payload.webglVendor) ||
        payload.webglVendor.length > 0
    ).toBe(true);
    expect(
      validValues.includes(payload.webglRenderer) ||
        payload.webglRenderer.length > 0
    ).toBe(true);
  });

  it("font hash returns a valid string in test environment", () => {
    const payload = collectIntelligence(mockFormBehavior);
    // happy-dom: offsetWidth always 0 → no fonts detected → hash of ""
    // Or "error" if document.body isn't available
    expect(payload.installedFontsHash).toMatch(/^(error|-?[0-9a-f]+)$/);
  });

  it("produces valid ISO timestamps", () => {
    const payload = collectIntelligence(mockFormBehavior);
    expect(() => new Date(payload.submittedAtLocal)).not.toThrow();
    expect(() => new Date(payload.submittedAtUtc)).not.toThrow();
    expect(new Date(payload.submittedAtLocal).getTime()).not.toBeNaN();
    expect(new Date(payload.submittedAtUtc).getTime()).not.toBeNaN();
  });

  it("initializes behavioral counters to zero-like values", () => {
    // Module-level counters start at 0; no DOM events have been fired
    const payload = collectIntelligence(mockFormBehavior);
    expect(payload.mouseMoveCount).toBeGreaterThanOrEqual(0);
    expect(payload.mouseClickCount).toBeGreaterThanOrEqual(0);
    expect(payload.keyPressCount).toBeGreaterThanOrEqual(0);
    expect(payload.touchEventCount).toBeGreaterThanOrEqual(0);
    expect(payload.formCorrectionsCount).toBeGreaterThanOrEqual(0);
    expect(payload.scrollDirectionChanges).toBeGreaterThanOrEqual(0);
  });
});

describe("detectMediaDevices", () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Reset mediaDevices between tests
    Object.defineProperty(navigator, "mediaDevices", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  it("returns defaults when mediaDevices API is unavailable", async () => {
    const result = await detectMediaDevices();
    expect(result).toEqual({
      hasWebcam: false,
      hasMicrophone: false,
      mediaDeviceCount: 0,
    });
  });

  it("returns defaults when enumerateDevices is not available", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {},
      configurable: true,
    });
    const result = await detectMediaDevices();
    expect(result).toEqual({
      hasWebcam: false,
      hasMicrophone: false,
      mediaDeviceCount: 0,
    });
  });

  it("detects webcam and microphone when present", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: "videoinput", deviceId: "1", groupId: "g1", label: "" },
          { kind: "audioinput", deviceId: "2", groupId: "g2", label: "" },
          { kind: "audiooutput", deviceId: "3", groupId: "g3", label: "" },
        ]),
      },
      configurable: true,
    });

    const result = await detectMediaDevices();
    expect(result.hasWebcam).toBe(true);
    expect(result.hasMicrophone).toBe(true);
    expect(result.mediaDeviceCount).toBe(3);
  });

  it("reports no webcam when only audio devices present", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: "audioinput", deviceId: "1", groupId: "g1", label: "" },
        ]),
      },
      configurable: true,
    });

    const result = await detectMediaDevices();
    expect(result.hasWebcam).toBe(false);
    expect(result.hasMicrophone).toBe(true);
    expect(result.mediaDeviceCount).toBe(1);
  });

  it("returns zero devices for empty device list", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      configurable: true,
    });

    const result = await detectMediaDevices();
    expect(result.hasWebcam).toBe(false);
    expect(result.hasMicrophone).toBe(false);
    expect(result.mediaDeviceCount).toBe(0);
  });

  it("handles enumerateDevices rejection gracefully", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        enumerateDevices: vi
          .fn()
          .mockRejectedValue(new Error("NotAllowedError")),
      },
      configurable: true,
    });

    const result = await detectMediaDevices();
    expect(result).toEqual({
      hasWebcam: false,
      hasMicrophone: false,
      mediaDeviceCount: 0,
    });
  });
});
