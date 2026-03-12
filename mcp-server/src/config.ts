import path from 'node:path';

export const config = {
  rootPath: process.env.MCP_ROOT_PATH || 'P:\\',
  authToken: process.env.MCP_AUTH_TOKEN,
  port: parseInt(process.env.MCP_PORT || '3100', 10),
  maxFileSize: 10 * 1024 * 1024,      // 10 MB
  maxReadSize: 1 * 1024 * 1024,        // 1 MB (truncate text reads beyond this)
  maxExcelRows: 500,
  maxRequestsPerMinute: 60,
  allowedExtensions: new Set([
    '.xlsx', '.xls', '.csv',
    '.pdf',
    '.txt', '.log', '.md',
    '.doc', '.docx',
    '.jpg', '.jpeg', '.png',
  ]),
};

/**
 * Resolve a user-provided path to an absolute path within the configured root.
 * Rejects any path that escapes the sandbox via traversal.
 *
 * @param userPath - Relative or absolute path from the user (e.g., "/WIP - Financial")
 * @returns Resolved absolute filesystem path
 * @throws Error if path escapes the root directory
 */
export function resolveSandboxedPath(userPath: string): string {
  // Normalise forward-slashes to the OS separator
  const normalised = userPath.replace(/\//g, path.sep);

  // If the path is already absolute and starts with rootPath, use it directly;
  // otherwise treat it as relative to rootPath.
  const resolved = path.resolve(config.rootPath, normalised);

  // Ensure the resolved path is within rootPath (case-insensitive on Windows)
  const rootNorm = path.resolve(config.rootPath).toLowerCase();
  const resolvedNorm = resolved.toLowerCase();

  if (!resolvedNorm.startsWith(rootNorm)) {
    throw new Error(`Access denied — path "${userPath}" resolves outside the allowed root`);
  }

  return resolved;
}

/**
 * Simple sliding-window rate limiter.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.limit) return false;
    this.timestamps.push(now);
    return true;
  }
}
