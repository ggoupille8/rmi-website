import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../lib/db-env";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(JSON.stringify([]), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  try {
    const result = await sql`
      SELECT id, name, domain, color, description, logo_scale
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
