import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { ensureMediaTable } from "../../../lib/ensure-media-table";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slot = params.slot;

  if (!slot || typeof slot !== "string" || slot.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Slot parameter is required", code: "BAD_REQUEST" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    // No database — fall back to static images
    return new Response(null, { status: 404 });
  }

  try {
    await ensureMediaTable();

    const result = await sql.query(
      `SELECT blob_url, alt_text, variants FROM media WHERE slot = $1`,
      [slot.trim()]
    );

    if (result.rows.length === 0) {
      return new Response(null, {
        status: 404,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      });
    }

    const { blob_url, alt_text, variants } = result.rows[0];

    const body: Record<string, unknown> = { url: blob_url, altText: alt_text };
    if (variants) {
      body.variants = variants;
    }

    return new Response(
      JSON.stringify(body),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error(
      "Media slot lookup error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // On error, return 404 so frontend falls back to static image
    return new Response(null, { status: 404 });
  }
};
