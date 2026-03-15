import type { APIRoute } from "astro";

export const prerender = false;

/** Minimal health check for uptime monitoring. */
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
};
