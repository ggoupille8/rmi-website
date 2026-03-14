import type { APIRoute } from "astro";

// Prevent prerendering - API routes must be server-side only
export const prerender = false;

/** Module-level start time for uptime calculation */
const startTime = Date.now();

/**
 * Health check endpoint.
 * Process-up healthz: always returns 200 when the server is running.
 */
export const GET: APIRoute = () => {
  const t0 = performance.now();

  const hasSendGridKey = !!import.meta.env.SENDGRID_API_KEY;
  const hasPostgresUrl = !!import.meta.env.POSTGRES_URL;

  const health = {
    status: "ok",
    uptime: Math.round((Date.now() - startTime) / 1000),
    responseTime: Math.round((performance.now() - t0) * 100) / 100,
    checks: {
      sendgrid: hasSendGridKey ? "configured" : "missing",
      database: hasPostgresUrl ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
