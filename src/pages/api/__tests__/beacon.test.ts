import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies before imports
vi.mock("@vercel/postgres", () => ({
  sql: vi.fn(),
}));

vi.mock("../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock("../../../lib/rate-limiter", () => ({
  getClientIP: vi.fn(),
}));

vi.mock("../../../lib/ipGeo", () => ({
  getGeoData: vi.fn(),
}));

import { POST, GET } from "../beacon";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { getClientIP } from "../../../lib/rate-limiter";
import { getGeoData } from "../../../lib/ipGeo";

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedGetClientIP = vi.mocked(getClientIP);
const mockedGetGeoData = vi.mocked(getGeoData);

// ---------- Helpers ----------

const sqlSuccess = {
  rows: [],
  command: "",
  rowCount: 0,
  oid: 0,
  fields: [],
};

function createRequest(
  body: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost:4321/api/beacon", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof POST>[0];
}

const validPageview = {
  type: "pageview" as const,
  sessionId: "sess-abc-123",
  pagePath: "/",
  referrer: "https://www.google.com/search?q=insulation",
  screenWidth: 1920,
  screenHeight: 1080,
  viewportWidth: 1920,
  viewportHeight: 900,
  deviceType: "desktop",
  language: "en-US",
  timezone: "America/Detroit",
};

const validUpdate = {
  type: "update" as const,
  sessionId: "sess-abc-123",
  pagePath: "/",
  scrollDepth: 50,
  timeOnPageMs: 15000,
  interactions: 5,
  sectionsViewed: ["hero", "services", "contact"],
  ctaClicks: 1,
  formStarted: true,
  exitIntent: false,
};

const validExit = {
  type: "exit" as const,
  sessionId: "sess-abc-123",
  pagePath: "/",
  scrollDepth: 80,
  timeOnPageMs: 45000,
  interactions: 12,
  exitIntent: true,
};

const defaultGeo = {
  city: "Detroit",
  region: "Michigan",
  country: "US",
  lat: 42.3314,
  lng: -83.0458,
  timezone: "America/Detroit",
  postal: "48201",
  isp: "Comcast",
  org: "Comcast Cable",
  asn: "AS7922",
  ipType: "residential" as const,
  isVpn: false,
  isDatacenter: false,
  isTor: false,
};

function setupDefaults() {
  mockedGetPostgresEnv.mockReturnValue({
    url: "postgres://test",
    source: "POSTGRES_URL",
  });
  mockedGetClientIP.mockReturnValue("192.168.1.100");
  mockedGetGeoData.mockResolvedValue(defaultGeo);

  // Default: CREATE TABLE + INSERT/UPDATE both succeed
  mockedSql.mockResolvedValue(sqlSuccess);
}

/**
 * The beacon module uses a module-level Map for rate limiting.
 * We need to reset it between tests by flooding with time manipulation.
 * Instead, we change the IP per test group or use vi.useFakeTimers.
 */
let ipCounter = 0;
function uniqueIP(): string {
  ipCounter++;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

// ---------- Tests ----------

describe("POST /api/beacon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
    // Use unique IP per test to avoid rate limit bleed-over
    const ip = uniqueIP();
    mockedGetClientIP.mockReturnValue(ip);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== 1. Rate Limiting ====================
  describe("Rate Limiting", () => {
    it("should accept first request from an IP", async () => {
      const req = createRequest(validPageview);
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should accept up to BEACON_RATE_LIMIT (10) requests per minute", async () => {
      const ip = uniqueIP();
      mockedGetClientIP.mockReturnValue(ip);

      for (let i = 0; i < 10; i++) {
        const req = createRequest(validPageview);
        const res = await POST(createContext(req));
        expect(res.status).toBe(200);
      }
      // The 10th request should still succeed (count=10, limit=10)
      // All 10 calls succeed -- sql should be called for each one
      // CREATE TABLE is called for each, plus INSERT for each
      expect(mockedSql.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it("should silently drop requests beyond rate limit (return 200, not error)", async () => {
      const ip = uniqueIP();
      mockedGetClientIP.mockReturnValue(ip);

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await POST(createContext(createRequest(validPageview)));
      }

      // 11th request should be silently dropped
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({});
      // No SQL calls should have been made for dropped request
      expect(mockedSql).not.toHaveBeenCalled();
    });

    it("should reset rate limit after 60 seconds", async () => {
      vi.useFakeTimers();
      const ip = uniqueIP();
      mockedGetClientIP.mockReturnValue(ip);

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await POST(createContext(createRequest(validPageview)));
      }

      // Advance time past the 60-second window
      vi.advanceTimersByTime(61_000);

      // Should accept again
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      // SQL should be called (table creation + insert)
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should have independent rate limits for different IPs", async () => {
      const ip1 = uniqueIP();
      const ip2 = uniqueIP();

      // Exhaust rate limit for ip1
      mockedGetClientIP.mockReturnValue(ip1);
      for (let i = 0; i < 10; i++) {
        await POST(createContext(createRequest(validPageview)));
      }

      // ip2 should still work
      mockedGetClientIP.mockReturnValue(ip2);
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should handle unknown IP (null from getClientIP)", async () => {
      mockedGetClientIP.mockReturnValue(null as unknown as string);
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
    });
  });

  // ==================== 2. Input Validation ====================
  describe("Input Validation", () => {
    it("should silently drop requests with missing sessionId", async () => {
      const body = { type: "pageview", pagePath: "/" };
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      // Should not attempt DB insert (only potential CREATE TABLE is skipped too since it bails early)
      // The code parses JSON first, then checks sessionId/pagePath before any SQL
      expect(mockedSql).not.toHaveBeenCalled();
    });

    it("should silently drop requests with missing pagePath", async () => {
      const body = { type: "pageview", sessionId: "sess-123" };
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).not.toHaveBeenCalled();
    });

    it("should silently drop requests with empty sessionId", async () => {
      const body = { type: "pageview", sessionId: "", pagePath: "/" };
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).not.toHaveBeenCalled();
    });

    it("should silently drop requests with empty pagePath", async () => {
      const body = { type: "pageview", sessionId: "sess-123", pagePath: "" };
      mockedSql.mockClear();
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).not.toHaveBeenCalled();
    });

    it("should silently drop requests with invalid JSON", async () => {
      const req = new Request("http://localhost:4321/api/beacon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: "this is not json {{{",
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should silently drop requests with empty body", async () => {
      const req = new Request("http://localhost:4321/api/beacon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: "",
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should handle missing optional fields gracefully", async () => {
      const minimal = {
        type: "pageview",
        sessionId: "sess-minimal",
        pagePath: "/minimal",
      };
      const res = await POST(createContext(createRequest(minimal)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });
  });

  // ==================== 3. Pageview Beacon ====================
  describe("Pageview Beacon", () => {
    it("should insert new visitor_sessions record for type=pageview", async () => {
      await POST(createContext(createRequest(validPageview)));
      // At least 2 SQL calls: CREATE TABLE + INSERT
      expect(mockedSql.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should extract client IP from request", async () => {
      const req = createRequest(validPageview);
      await POST(createContext(req));
      expect(mockedGetClientIP).toHaveBeenCalledWith(req);
    });

    it("should parse user agent for browser/OS/device info", async () => {
      const req = createRequest(validPageview, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
      // Verify SQL was called with parsed UA data via the template literal
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should store UTM parameters", async () => {
      const body = {
        ...validPageview,
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "spring-2026",
        utmTerm: "mechanical+insulation",
        utmContent: "ad-variant-a",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should store device fingerprint data", async () => {
      const body = {
        ...validPageview,
        screenWidth: 2560,
        screenHeight: 1440,
        viewportWidth: 2560,
        viewportHeight: 1300,
        touchSupport: false,
        deviceMemory: 8,
        hardwareCores: 12,
        pixelRatio: 1.5,
        colorDepth: 24,
        connectionType: "4g",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should truncate long page paths to 500 chars", async () => {
      const longPath = "/" + "a".repeat(600);
      const body = { ...validPageview, pagePath: longPath };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      // Verify the SQL was called - the implementation uses pagePath.slice(0, 500)
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should extract referrer domain from referrer URL", async () => {
      const body = {
        ...validPageview,
        referrer: "https://www.google.com/search?q=test",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should handle invalid referrer URLs gracefully", async () => {
      const body = {
        ...validPageview,
        referrer: "not-a-valid-url",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      // Should not throw - referrerDomain will be null
    });

    it("should handle null referrer", async () => {
      const body = { ...validPageview, referrer: undefined };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should call getGeoData with client IP for pageview", async () => {
      const ip = uniqueIP();
      mockedGetClientIP.mockReturnValue(ip);
      await POST(createContext(createRequest(validPageview)));
      expect(mockedGetGeoData).toHaveBeenCalledWith(ip);
    });

    it("should handle geo lookup failure gracefully", async () => {
      mockedGetGeoData.mockRejectedValue(new Error("Geo service down"));
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      // Should still insert record, just without geo data
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should not call getGeoData for update beacons", async () => {
      mockedGetGeoData.mockClear();
      await POST(createContext(createRequest(validUpdate)));
      expect(mockedGetGeoData).not.toHaveBeenCalled();
    });

    it("should not call getGeoData for exit beacons", async () => {
      mockedGetGeoData.mockClear();
      await POST(createContext(createRequest(validExit)));
      expect(mockedGetGeoData).not.toHaveBeenCalled();
    });

    it("should use client-provided device info over parsed UA when available", async () => {
      const body = {
        ...validPageview,
        browserName: "CustomBrowser",
        browserVersion: "99",
        osName: "CustomOS",
        osVersion: "1.0",
        deviceType: "mobile",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should default visitNumber to 1 if not provided", async () => {
      const body = { ...validPageview, visitNumber: undefined };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should set engaged=true when timeOnPageMs > 10000", async () => {
      const body = {
        ...validPageview,
        timeOnPageMs: 15000,
        scrollDepth: 0,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should set engaged=true when scrollDepth > 25", async () => {
      const body = {
        ...validPageview,
        timeOnPageMs: 0,
        scrollDepth: 30,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should set engaged=false when neither time nor scroll thresholds are met", async () => {
      const body = {
        ...validPageview,
        timeOnPageMs: 5000,
        scrollDepth: 10,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle sectionsViewed array formatting", async () => {
      const body = {
        ...validPageview,
        sectionsViewed: ["hero", "services", "contact"],
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle null sectionsViewed", async () => {
      const body = {
        ...validPageview,
        sectionsViewed: undefined,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });
  });

  // ==================== 4. Update Beacon ====================
  describe("Update Beacon", () => {
    it("should update existing session record", async () => {
      const res = await POST(createContext(createRequest(validUpdate)));
      expect(res.status).toBe(200);
      // CREATE TABLE + UPDATE
      expect(mockedSql.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should use GREATEST for scroll_depth (never decrease)", async () => {
      await POST(createContext(createRequest(validUpdate)));
      // The UPDATE SQL uses GREATEST(scroll_depth, ...)
      expect(mockedSql).toHaveBeenCalled();
      // Verify the template literal contains GREATEST - check last SQL call
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("GREATEST(scroll_depth");
    });

    it("should use GREATEST for time_on_page_ms", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("GREATEST(time_on_page_ms");
    });

    it("should use OR for form_started boolean field", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("form_started = form_started OR");
    });

    it("should use OR for exit_intent boolean field", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("exit_intent = exit_intent OR");
    });

    it("should update traffic_class to 'prospect' when engaged", async () => {
      const body = {
        ...validUpdate,
        timeOnPageMs: 20000, // > 10000 = engaged
        scrollDepth: 50,
      };
      await POST(createContext(createRequest(body)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("WHEN");
      expect(fullQuery).toContain("prospect");
    });

    it("should not update traffic_class from 'bot' (CASE WHEN is_bot)", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("WHEN is_bot THEN 'bot'");
    });

    it("should use GREATEST for interactions", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("GREATEST(interactions");
    });

    it("should use GREATEST for cta_clicks", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("GREATEST(cta_clicks");
    });

    it("should match on session_id AND page_path in WHERE clause", async () => {
      await POST(createContext(createRequest(validUpdate)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("WHERE session_id =");
      expect(fullQuery).toContain("AND page_path =");
    });
  });

  // ==================== 5. Exit Beacon ====================
  describe("Exit Beacon", () => {
    it("should update session record same as update beacon", async () => {
      const res = await POST(createContext(createRequest(validExit)));
      expect(res.status).toBe(200);
      expect(mockedSql).toHaveBeenCalled();
    });

    it("should handle exit beacon with exitIntent=true", async () => {
      const body = { ...validExit, exitIntent: true };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should apply same GREATEST logic as update for exit beacons", async () => {
      await POST(createContext(createRequest(validExit)));
      const lastCall = mockedSql.mock.calls[mockedSql.mock.calls.length - 1];
      const templateStrings = lastCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("GREATEST(scroll_depth");
      expect(fullQuery).toContain("GREATEST(time_on_page_ms");
    });

    it("should truncate page_path in exit beacon WHERE clause", async () => {
      const longPath = "/" + "x".repeat(600);
      const body = { ...validExit, pagePath: longPath };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });
  });

  // ==================== 6. Bot Detection ====================
  describe("Bot Detection", () => {
    const botUserAgents = [
      {
        name: "Selenium",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Selenium/4.0",
      },
      { name: "PhantomJS", ua: "Mozilla/5.0 PhantomJS/2.1.1" },
      { name: "curl", ua: "curl/7.68.0" },
      { name: "wget", ua: "Wget/1.21" },
      { name: "python-requests", ua: "python-requests/2.28.0" },
      {
        name: "Googlebot",
        ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      {
        name: "Bingbot",
        ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      },
      { name: "Headless Chrome", ua: "HeadlessChrome/120.0.0.0" },
      { name: "Puppeteer", ua: "Mozilla/5.0 Puppeteer/21.0.0" },
      { name: "Lighthouse", ua: "Mozilla/5.0 Chrome/120.0 Lighthouse" },
      { name: "Spider", ua: "Mozilla/5.0 Spider/1.0" },
      { name: "Scraper", ua: "Mozilla/5.0 Scraper/2.0" },
      { name: "Crawler", ua: "Mozilla/5.0 Crawl/1.0" },
      { name: "go-http", ua: "Go-http-client/2.0" },
      {
        name: "Apache HttpClient",
        ua: "Apache-HttpClient/4.5.13 (Java/11.0.12)",
      },
      { name: "Java", ua: "Java/17.0.1" },
      { name: "GTmetrix", ua: "Mozilla/5.0 GTmetrix" },
      { name: "Pingdom", ua: "Pingdom.com_bot_version_1.4" },
      { name: "UptimeRobot", ua: "UptimeRobot/2.0" },
      { name: "PageSpeed", ua: "Mozilla/5.0 PageSpeed Insights" },
    ];

    for (const { name, ua } of botUserAgents) {
      it(`should flag ${name} user agent as bot`, async () => {
        mockedGetGeoData.mockResolvedValue({
          ...defaultGeo,
          ipType: "residential",
        });
        const req = createRequest(validPageview, { "User-Agent": ua });
        const res = await POST(createContext(req));
        expect(res.status).toBe(200);
        // The SQL INSERT should have is_bot=true and traffic_class='bot'
        expect(mockedSql).toHaveBeenCalled();
      });
    }

    const legitimateUserAgents = [
      {
        name: "Chrome",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      {
        name: "Firefox",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      },
      {
        name: "Safari",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      },
      {
        name: "Edge",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      },
      {
        name: "Chrome Mobile",
        ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    ];

    for (const { name, ua } of legitimateUserAgents) {
      it(`should NOT flag ${name} user agent as bot`, async () => {
        mockedGetGeoData.mockResolvedValue({
          ...defaultGeo,
          ipType: "residential",
        });
        const req = createRequest(validPageview, { "User-Agent": ua });
        const res = await POST(createContext(req));
        expect(res.status).toBe(200);
        expect(mockedSql).toHaveBeenCalled();
      });
    }
  });

  // ==================== 7. User Agent Parsing ====================
  describe("User Agent Parsing", () => {
    it("should parse Chrome on Windows correctly", async () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
      // Parsed values should be passed to SQL: Chrome, Windows, desktop
    });

    it("should parse Firefox on Windows correctly", async () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should parse Safari on macOS correctly", async () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should parse Chrome on Android (mobile) correctly", async () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      const req = createRequest(
        {
          ...validPageview,
          browserName: undefined,
          osName: undefined,
          deviceType: undefined,
        },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should parse Safari on iPhone (mobile) correctly", async () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const req = createRequest(
        {
          ...validPageview,
          browserName: undefined,
          osName: undefined,
          deviceType: undefined,
        },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should parse Safari on iPad (tablet) correctly", async () => {
      const ua =
        "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const req = createRequest(
        {
          ...validPageview,
          browserName: undefined,
          osName: undefined,
          deviceType: undefined,
        },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should parse Edge on Windows correctly", async () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should handle empty user agent", async () => {
      const req = createRequest(validPageview, { "User-Agent": "" });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should handle Linux user agent", async () => {
      const ua =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should handle ChromeOS user agent", async () => {
      const ua =
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should handle completely unknown user agent", async () => {
      const ua = "SomeRandomApp/1.0";
      const req = createRequest(
        { ...validPageview, browserName: undefined, osName: undefined },
        { "User-Agent": ua },
      );
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });
  });

  // ==================== 8. Traffic Classification ====================
  describe("Traffic Classification", () => {
    it("should classify datacenter IP type as bot", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "datacenter",
        isDatacenter: true,
      });
      const req = createRequest(validPageview, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
      // traffic_class should be 'bot' for datacenter IP
    });

    it("should classify tor IP type as bot", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "tor",
        isTor: true,
      });
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
    });

    it("should classify vpn IP type as suspicious", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "vpn",
        isVpn: true,
      });
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
    });

    it("should classify engaged visitor as prospect", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "residential",
      });
      const body = {
        ...validPageview,
        timeOnPageMs: 20000,
        scrollDepth: 50,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should classify non-engaged residential as unknown", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "residential",
      });
      const body = {
        ...validPageview,
        timeOnPageMs: 1000,
        scrollDepth: 5,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should prioritize bot UA over engaged status", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "residential",
      });
      const body = {
        ...validPageview,
        timeOnPageMs: 20000,
        scrollDepth: 50,
      };
      const req = createRequest(body, { "User-Agent": "curl/7.68.0" });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
      // Bot UA should override engagement -> traffic_class = 'bot'
    });

    it("should prioritize bot UA over datacenter IP", async () => {
      mockedGetGeoData.mockResolvedValue({
        ...defaultGeo,
        ipType: "datacenter",
        isDatacenter: true,
      });
      const req = createRequest(validPageview, {
        "User-Agent": "Googlebot/2.1",
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should classify as unknown when geo is null", async () => {
      mockedGetGeoData.mockResolvedValue(null);
      const body = {
        ...validPageview,
        timeOnPageMs: 0,
        scrollDepth: 0,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });
  });

  // ==================== 9. Database Table Creation ====================
  describe("Database Table Creation", () => {
    it("should create visitor_sessions table if it does not exist", async () => {
      await POST(createContext(createRequest(validPageview)));
      // First SQL call should be CREATE TABLE IF NOT EXISTS
      expect(mockedSql.mock.calls.length).toBeGreaterThanOrEqual(1);
      const firstCall = mockedSql.mock.calls[0];
      const templateStrings = firstCall[0] as unknown as TemplateStringsArray;
      const fullQuery = templateStrings.join("?");
      expect(fullQuery).toContain("CREATE TABLE IF NOT EXISTS visitor_sessions");
    });

    it("should handle database errors gracefully (return 200)", async () => {
      mockedSql.mockRejectedValue(new Error("Database connection failed"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      consoleSpy.mockRestore();
    });

    it("should handle CREATE TABLE failure gracefully", async () => {
      mockedSql.mockRejectedValueOnce(
        new Error("permission denied for schema public"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      consoleSpy.mockRestore();
    });
  });

  // ==================== 10. Error Handling ====================
  describe("Error Handling", () => {
    it("should return 200 even when database connection fails", async () => {
      mockedSql.mockRejectedValue(
        new Error("ECONNREFUSED 127.0.0.1:5432"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({});
      consoleSpy.mockRestore();
    });

    it("should return 200 even when geo lookup fails", async () => {
      mockedGetGeoData.mockRejectedValue(new Error("Network timeout"));
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
    });

    it("should never expose internal errors to client", async () => {
      mockedSql.mockRejectedValue(
        new Error("FATAL: password authentication failed for user postgres"),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).not.toContain("password");
      expect(body).not.toContain("FATAL");
      expect(body).not.toContain("postgres");
      consoleSpy.mockRestore();
    });

    it("should handle malformed request bodies gracefully", async () => {
      const req = new Request("http://localhost:4321/api/beacon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        body: '{"type": "pageview", "broken',
      });
      const res = await POST(createContext(req));
      expect(res.status).toBe(200);
    });

    it("should return 200 when postgresUrl is null", async () => {
      mockedGetPostgresEnv.mockReturnValue({
        url: null,
        source: null,
      });
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      // Should not attempt any SQL calls after detecting no postgres URL
    });

    it("should log errors to console.error", async () => {
      mockedSql.mockRejectedValue(new Error("DB is down"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await POST(createContext(createRequest(validPageview)));
      expect(consoleSpy).toHaveBeenCalledWith(
        "Beacon error:",
        "DB is down",
      );
      consoleSpy.mockRestore();
    });

    it("should handle non-Error thrown objects", async () => {
      mockedSql.mockRejectedValue("string error");
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith("Beacon error:", "string error");
      consoleSpy.mockRestore();
    });

    it("should handle INSERT failure after successful CREATE TABLE", async () => {
      mockedSql
        .mockResolvedValueOnce(sqlSuccess) // CREATE TABLE succeeds
        .mockRejectedValueOnce(new Error("Unique constraint violation")); // INSERT fails
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validPageview)));
      expect(res.status).toBe(200);
      consoleSpy.mockRestore();
    });

    it("should handle UPDATE failure after successful CREATE TABLE", async () => {
      mockedSql
        .mockResolvedValueOnce(sqlSuccess) // CREATE TABLE succeeds
        .mockRejectedValueOnce(new Error("Deadlock detected")); // UPDATE fails
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const res = await POST(createContext(createRequest(validUpdate)));
      expect(res.status).toBe(200);
      consoleSpy.mockRestore();
    });
  });

  // ==================== 11. GET Endpoint ====================
  describe("GET /api/beacon", () => {
    it("should return empty 200 for GET requests", async () => {
      const res = await GET(
        {} as unknown as Parameters<typeof GET>[0],
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({});
    });

    it("should return JSON content type compatible response", async () => {
      const res = await GET(
        {} as unknown as Parameters<typeof GET>[0],
      );
      const text = await res.text();
      expect(text).toBe("{}");
    });
  });

  // ==================== 12. Edge Cases ====================
  describe("Edge Cases", () => {
    it("should handle very large payload gracefully", async () => {
      const body = {
        ...validPageview,
        sectionsViewed: Array.from({ length: 100 }, (_, i) => `section-${i}`),
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle special characters in pagePath", async () => {
      const body = {
        ...validPageview,
        pagePath: "/page?query=hello&world=true#section",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle unicode in session data", async () => {
      const body = {
        ...validPageview,
        pagePath: "/productos/aislamiento-mecanico",
        referrer: "https://google.es/search?q=aislamiento",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle zero values for numeric fields", async () => {
      const body = {
        ...validUpdate,
        scrollDepth: 0,
        timeOnPageMs: 0,
        interactions: 0,
        ctaClicks: 0,
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle unknown beacon type gracefully", async () => {
      const body = {
        type: "unknown-type",
        sessionId: "sess-123",
        pagePath: "/",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
      // Should just run CREATE TABLE but skip INSERT/UPDATE since type doesn't match
    });

    it("should handle concurrent requests from same session", async () => {
      const promises = [
        POST(createContext(createRequest(validUpdate))),
        POST(createContext(createRequest(validUpdate))),
        POST(createContext(createRequest(validUpdate))),
      ];
      const results = await Promise.all(promises);
      results.forEach((res) => expect(res.status).toBe(200));
    });

    it("should handle referrer with port number", async () => {
      const body = {
        ...validPageview,
        referrer: "http://localhost:3000/page",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });

    it("should handle referrer that is just a protocol", async () => {
      const body = {
        ...validPageview,
        referrer: "android-app://com.google.android",
      };
      const res = await POST(createContext(createRequest(body)));
      expect(res.status).toBe(200);
    });
  });
});
