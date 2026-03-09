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

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: SECURITY_HEADERS,
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
      SELECT id, sync_type, jobs_total, jobs_created, jobs_updated,
             jobs_unchanged, errors, duration_ms, status, created_at
      FROM sync_log
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const flagCount = await sql`
      SELECT COUNT(*)::int AS count FROM job_flags WHERE resolved = false
    `;

    return new Response(
      JSON.stringify({
        recent_syncs: result.rows,
        unresolved_flags: flagCount.rows[0]?.count ?? 0,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Sync status error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
