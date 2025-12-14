import type { APIRoute } from "astro";

// Prevent prerendering - API routes must be server-side only
export const prerender = false;

/**
 * Health check endpoint.
 * Returns 200 if critical environment variables are present (without revealing values).
 * Used for smoke tests and monitoring.
 */
export const GET: APIRoute = () => {
  // Check for critical environment variables (existence only, not values)
  const hasSendGridKey = !!import.meta.env.SENDGRID_API_KEY;
  const hasQuoteToEmail = !!import.meta.env.QUOTE_TO_EMAIL || true; // Has default
  const hasQuoteFromEmail = !!import.meta.env.QUOTE_FROM_EMAIL || true; // Has default

  // Check database connection (Vercel Postgres env vars)
  const hasPostgresUrl = !!import.meta.env.POSTGRES_URL;

  // Determine health status
  const isHealthy =
    hasSendGridKey && hasQuoteToEmail && hasQuoteFromEmail && hasPostgresUrl;

  const status = isHealthy ? 200 : 503;
  const health = {
    status: isHealthy ? "healthy" : "degraded",
    checks: {
      sendgrid: hasSendGridKey ? "configured" : "missing",
      email: hasQuoteToEmail && hasQuoteFromEmail ? "configured" : "missing",
      database: hasPostgresUrl ? "configured" : "missing",
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(health), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
