import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RateLimiter,
  getClientIP,
  createMockRequest,
} from "../rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 60000, // 1 minute
    });
  });

  describe("check", () => {
    it("allows first request from new IP", () => {
      const result = limiter.check("192.168.1.100");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("allows requests up to the limit", () => {
      const ip = "192.168.1.101";

      expect(limiter.check(ip).allowed).toBe(true);
      expect(limiter.check(ip).allowed).toBe(true);
      expect(limiter.check(ip).allowed).toBe(true);
    });

    it("blocks requests exceeding the limit", () => {
      const ip = "192.168.1.102";

      limiter.check(ip);
      limiter.check(ip);
      limiter.check(ip);

      const result = limiter.check(ip);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.remaining).toBe(0);
    });

    it("allows requests from different IPs independently", () => {
      const ip1 = "192.168.1.103";
      const ip2 = "192.168.1.104";

      // Exhaust ip1's limit
      limiter.check(ip1);
      limiter.check(ip1);
      limiter.check(ip1);
      expect(limiter.check(ip1).allowed).toBe(false);

      // ip2 should still be allowed
      expect(limiter.check(ip2).allowed).toBe(true);
    });

    it("allows requests when identifier is null", () => {
      const result = limiter.check(null);
      expect(result.allowed).toBe(true);
    });

    it("tracks remaining requests correctly", () => {
      const ip = "192.168.1.105";

      const r1 = limiter.check(ip);
      expect(r1.remaining).toBe(2);

      const r2 = limiter.check(ip);
      expect(r2.remaining).toBe(1);

      const r3 = limiter.check(ip);
      expect(r3.remaining).toBe(0);

      const r4 = limiter.check(ip);
      expect(r4.remaining).toBe(0);
      expect(r4.allowed).toBe(false);
    });

    it("resets after window expires", () => {
      const ip = "192.168.1.106";

      // Use short window for testing
      limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 100, // 100ms
      });

      // Exhaust limit
      limiter.check(ip);
      limiter.check(ip);
      expect(limiter.check(ip).allowed).toBe(false);

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Should be allowed again
          const result = limiter.check(ip);
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(1);
          resolve();
        }, 150);
      });
    });
  });

  describe("reset", () => {
    it("clears rate limit for specific IP", () => {
      const ip = "192.168.1.107";

      // Exhaust limit
      limiter.check(ip);
      limiter.check(ip);
      limiter.check(ip);
      expect(limiter.check(ip).allowed).toBe(false);

      // Reset
      limiter.reset(ip);

      // Should be allowed again
      expect(limiter.check(ip).allowed).toBe(true);
    });
  });

  describe("clearAll", () => {
    it("clears all rate limit records", () => {
      const ip1 = "192.168.1.108";
      const ip2 = "192.168.1.109";

      // Exhaust limits for multiple IPs
      for (let i = 0; i < 3; i++) {
        limiter.check(ip1);
        limiter.check(ip2);
      }

      expect(limiter.check(ip1).allowed).toBe(false);
      expect(limiter.check(ip2).allowed).toBe(false);

      // Clear all
      limiter.clearAll();

      // Both should be allowed again
      expect(limiter.check(ip1).allowed).toBe(true);
      expect(limiter.check(ip2).allowed).toBe(true);
    });
  });

  describe("getState", () => {
    it("returns current state for IP", () => {
      const ip = "192.168.1.110";

      limiter.check(ip);
      limiter.check(ip);

      const state = limiter.getState(ip);
      expect(state).toBeDefined();
      expect(state?.count).toBe(2);
      expect(state?.resetAt).toBeGreaterThan(Date.now());
    });

    it("returns undefined for unknown IP", () => {
      const state = limiter.getState("unknown.ip");
      expect(state).toBeUndefined();
    });
  });

  describe("updateConfig", () => {
    it("updates configuration", () => {
      limiter.updateConfig({ maxRequests: 10 });
      expect(limiter.getConfig().maxRequests).toBe(10);
      expect(limiter.getConfig().windowMs).toBe(60000); // Unchanged
    });
  });
});

describe("getClientIP", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = createMockRequest("192.168.1.100", "x-forwarded-for");
    expect(getClientIP(request)).toBe("192.168.1.100");
  });

  it("handles multiple IPs in x-forwarded-for (takes first)", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "192.168.1.100, 10.0.0.1, 172.16.0.1");
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers,
    });
    expect(getClientIP(request)).toBe("192.168.1.100");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = createMockRequest("192.168.1.101", "x-real-ip");
    expect(getClientIP(request)).toBe("192.168.1.101");
  });

  it("extracts IP from cf-connecting-ip header", () => {
    const request = createMockRequest("192.168.1.102", "cf-connecting-ip");
    expect(getClientIP(request)).toBe("192.168.1.102");
  });

  it("returns null when no IP headers present", () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
    });
    expect(getClientIP(request)).toBeNull();
  });

  it("prefers x-forwarded-for over other headers", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "192.168.1.100");
    headers.set("x-real-ip", "192.168.1.101");
    headers.set("cf-connecting-ip", "192.168.1.102");
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers,
    });
    expect(getClientIP(request)).toBe("192.168.1.100");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "192.168.1.101");
    headers.set("cf-connecting-ip", "192.168.1.102");
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers,
    });
    expect(getClientIP(request)).toBe("192.168.1.101");
  });
});

describe("createMockRequest", () => {
  it("creates request with specified IP header", () => {
    const request = createMockRequest("10.0.0.1", "x-real-ip");
    expect(request.headers.get("x-real-ip")).toBe("10.0.0.1");
  });

  it("creates request without IP header when null", () => {
    const request = createMockRequest(null);
    expect(request.headers.get("x-forwarded-for")).toBeNull();
  });
});
