import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../lib/db-env";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(JSON.stringify([]), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const url = new URL(request.url);
  const featured = url.searchParams.get("featured");

  try {
    const result = featured
      ? await sql`
          SELECT id, name, logo_url, logo_type, display_scale, needs_invert
          FROM clients
          WHERE active = TRUE AND is_featured = TRUE AND logo_url IS NOT NULL
          ORDER BY sort_order, id
        `
      : await sql`
          SELECT id, name, domain, color, description, logo_scale,
                 logo_url, logo_type, display_scale, needs_invert, is_featured
          FROM clients
          WHERE active = TRUE
          ORDER BY sort_order, id
        `;
    return new Response(JSON.stringify(result.rows), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Public clients fetch error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify([]), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
};
