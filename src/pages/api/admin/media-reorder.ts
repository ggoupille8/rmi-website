import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { ensureMediaTable } from "../../../lib/ensure-media-table";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/** POST /api/admin/media-reorder — swap images between two slots */
export const POST: APIRoute = async ({ request }) => {
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
    await ensureMediaTable();

    const body = await request.json();
    const { slotA, slotB } = body as { slotA?: unknown; slotB?: unknown };

    if (
      !slotA ||
      typeof slotA !== "string" ||
      !slotB ||
      typeof slotB !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Both slotA and slotB are required strings", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (slotA.trim() === slotB.trim()) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: SECURITY_HEADERS,
      });
    }

    // Atomically swap slot assignments
    const result = await sql.query(
      `UPDATE media
       SET slot = CASE slot
         WHEN $1 THEN $2
         WHEN $2 THEN $1
       END,
       updated_at = NOW()
       WHERE slot IN ($1, $2)`,
      [slotA.trim(), slotB.trim()]
    );

    return new Response(
      JSON.stringify({ ok: true, swapped: result.rowCount ?? 0 }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin media reorder error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
