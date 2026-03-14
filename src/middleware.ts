import { defineMiddleware } from "astro:middleware";
import { isAuthenticated } from "./lib/admin-auth";
import { isPmAuthenticated } from "./lib/pm-auth";
import { apiError, ErrorCode, MAX_BODY_BYTES } from "./lib/api-response";

// ---------------------------------------------------------------------------
// CORS — allowed origins for API routes
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "https://rmi-llc.net",
  "https://www.rmi-llc.net",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow localhost dev servers
  if (origin.startsWith("http://localhost:")) return true;
  // Allow Vercel preview deployments
  if (origin.endsWith(".vercel.app")) return true;
  return false;
}

export const onRequest = defineMiddleware(async ({ request, url, redirect }, next) => {
  const isApiRoute = url.pathname.startsWith("/api/");

  // ── CORS preflight for API routes ──────────────────────────────────────
  if (isApiRoute && request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    const allowOrigin = isAllowedOrigin(origin) ? origin! : "";
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ── Body size validation for API write methods ─────────────────────────
  if (isApiRoute && ["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return apiError(413, "Request body too large (max 50KB)", ErrorCode.PAYLOAD_TOO_LARGE);
    }
  }

  // ── Admin page auth (not API — API routes handle their own auth) ───────
  if (url.pathname.startsWith("/admin") && !isApiRoute) {
    if (url.pathname === "/admin/login") {
      return next();
    }
    if (!isAuthenticated(request)) {
      return redirect("/admin/login", 302);
    }
  }

  // ── PM page auth (not API — API routes handle their own auth) ──────────
  if (url.pathname.startsWith("/pm") && !isApiRoute) {
    if (url.pathname === "/pm" || url.pathname === "/pm/login") {
      return next();
    }
    if (!isPmAuthenticated(request)) {
      return redirect("/pm", 302);
    }
  }

  const response = await next();

  // ── Append CORS headers to API responses ───────────────────────────────
  if (isApiRoute) {
    const origin = request.headers.get("origin");
    if (isAllowedOrigin(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin!);
      response.headers.set("Vary", "Origin");
    }
  }

  return response;
});
