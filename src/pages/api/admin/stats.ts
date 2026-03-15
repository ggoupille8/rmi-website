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
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
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
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const [totalRes, newRes, contactedRes, archivedRes, monthRes, lastRes] =
      await Promise.all([
        sql`SELECT COUNT(*) as count FROM contacts WHERE (category IS NULL OR category = 'lead')`,
        sql`SELECT COUNT(*) as count FROM contacts WHERE status = 'new' AND (category IS NULL OR category = 'lead')`,
        sql`SELECT COUNT(*) as count FROM contacts WHERE status = 'contacted' AND (category IS NULL OR category = 'lead')`,
        sql`SELECT COUNT(*) as count FROM contacts WHERE status = 'archived' AND (category IS NULL OR category = 'lead')`,
        sql`SELECT COUNT(*) as count FROM contacts WHERE created_at >= date_trunc('month', CURRENT_DATE) AND (category IS NULL OR category = 'lead')`,
        sql`SELECT created_at FROM contacts ORDER BY created_at DESC LIMIT 1`,
      ]);

    return new Response(
      JSON.stringify({
        total: parseInt(totalRes.rows[0]?.count || "0", 10),
        new: parseInt(newRes.rows[0]?.count || "0", 10),
        contacted: parseInt(contactedRes.rows[0]?.count || "0", 10),
        archived: parseInt(archivedRes.rows[0]?.count || "0", 10),
        thisMonth: parseInt(monthRes.rows[0]?.count || "0", 10),
        lastSubmission: lastRes.rows[0]?.created_at ?? null,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin stats error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
