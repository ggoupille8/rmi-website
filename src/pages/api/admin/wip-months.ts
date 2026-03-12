import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * GET /api/admin/wip-months — Returns available months for the WIP month selector.
 * Returns array of { year, month, jobCount }.
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...SECURITY_HEADERS,
        "WWW-Authenticate": 'Bearer realm="admin"',
      },
    });
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const result = await sql`
      SELECT
        snapshot_year AS year,
        snapshot_month AS month,
        COUNT(*)::int AS job_count
      FROM wip_snapshots
      GROUP BY snapshot_year, snapshot_month
      ORDER BY snapshot_year DESC, snapshot_month DESC
    `;

    return new Response(JSON.stringify(result.rows), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error(
      "Admin WIP months error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
