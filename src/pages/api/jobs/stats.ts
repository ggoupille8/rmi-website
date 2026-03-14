import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";

export const prerender = false;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = async () => {
  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: HEADERS }
    );
  }

  try {
    const [byYear, byStatus, byPM, byType] = await Promise.all([
      sql`SELECT year, COUNT(*)::int AS count FROM jobs WHERE is_hidden = false GROUP BY year ORDER BY year DESC`,
      sql`SELECT status, COUNT(*)::int AS count FROM jobs WHERE is_hidden = false GROUP BY status`,
      sql`SELECT project_manager AS pm, COUNT(*)::int AS count FROM jobs WHERE is_hidden = false AND project_manager IS NOT NULL GROUP BY project_manager ORDER BY count DESC`,
      sql`SELECT job_type AS type, COUNT(*)::int AS count FROM jobs WHERE is_hidden = false AND job_type IS NOT NULL GROUP BY job_type`,
    ]);

    return new Response(
      JSON.stringify({
        by_year: byYear.rows,
        by_status: byStatus.rows,
        by_pm: byPM.rows,
        by_type: byType.rows,
      }),
      { status: 200, headers: HEADERS }
    );
  } catch (error) {
    console.error(
      "Jobs stats error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: HEADERS }
    );
  }
};
