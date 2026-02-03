/**
 * Rate limiting utilities
 *
 * Simple in-memory rate limiter for API endpoints.
 * In production, consider using Redis or a database for distributed rate limiting.
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until rate limit resets
  remaining?: number; // Remaining requests in window
}

/**
 * Rate limit record stored per IP
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter class for managing rate limits
 */
export class RateLimiter {
  private store: Map<string, RateLimitRecord>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.store = new Map();
    this.config = config;
  }

  /**
   * Check if a request should be allowed
   */
  check(identifier: string | null): RateLimitResult {
    // If no identifier, allow (best-effort in serverless)
    if (!identifier) {
      return { allowed: true };
    }

    const now = Date.now();
    const record = this.store.get(identifier);

    // No existing record or expired window - create new record
    if (!record || now > record.resetAt) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
      };
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    // Increment count and allow
    record.count++;
    this.store.set(identifier, record);

    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
    };
  }

  /**
   * Reset rate limit for an identifier (useful for testing)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clear all rate limit records (useful for testing)
   */
  clearAll(): void {
    this.store.clear();
  }

  /**
   * Get current state for an identifier (useful for testing/debugging)
   */
  getState(identifier: string): RateLimitRecord | undefined {
    return this.store.get(identifier);
  }

  /**
   * Update configuration (useful for testing)
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}

/**
 * Extract client IP from request headers
 * Tries various headers in order of preference
 */
export function getClientIP(request: Request): string | null {
  // Try Vercel/proxy headers first
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIP = xForwardedFor.split(",")[0]?.trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback to x-real-ip
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Cloudflare header
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }

  // Fastly header
  const fastlyIP = request.headers.get("fastly-client-ip");
  if (fastlyIP) {
    return fastlyIP;
  }

  // AWS ALB header
  const awsIP = request.headers.get("x-amzn-trace-id");
  if (awsIP) {
    // Extract IP from trace ID if present
    const match = awsIP.match(/Root=[\d\w-]+;Self=([\d.]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(
  ip: string | null,
  headerType: "x-forwarded-for" | "x-real-ip" | "cf-connecting-ip" = "x-forwarded-for"
): Request {
  const headers = new Headers();
  if (ip) {
    headers.set(headerType, ip);
  }
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers,
  });
}

// Pre-configured rate limiters for different endpoints
export const contactRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
});

export const quoteRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});
