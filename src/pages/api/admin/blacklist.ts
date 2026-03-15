import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
    status: 401,
    headers: {
      ...SECURITY_HEADERS,
      "WWW-Authenticate": 'Bearer realm="admin"',
    },
  });
}

/**
 * GET /api/admin/blacklist — list all blocked IPs
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();
  try {
    const result = await sql`
      SELECT id, ip_address, reason, blocked_at, expires_at,
             auto_banned, submission_count, metadata
      FROM ip_blacklist
      ORDER BY blocked_at DESC
    `;

    // Stats
    const totalBlocked = result.rows.length;
    const autoBanned = result.rows.filter((r) => r.auto_banned).length;
    const manualBanned = totalBlocked - autoBanned;
    const totalAttempts = result.rows.reduce(
      (sum, r) => sum + (r.submission_count || 0),
      0
    );

    return new Response(
      JSON.stringify({
        ok: true,
        entries: result.rows,
        stats: {
          totalBlocked,
          autoBanned,
          manualBanned,
          totalAttempts,
        },
      }),
      {
        status: 200,
        headers: SECURITY_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "Blacklist GET failed:",
      error instanceof Error ? error.message : "Unknown"
    );
    return new Response(
      JSON.stringify({ error: "Failed to fetch blacklist", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/**
 * POST /api/admin/blacklist — manually block an IP
 * Body: { ip: string, reason: string, expiresAt?: string }
 */
export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ip = typeof body.ip === "string" ? body.ip.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const expiresAt =
      typeof body.expiresAt === "string" ? body.expiresAt : null;

    if (!ip || !reason) {
      return new Response(
        JSON.stringify({ error: "IP and reason are required", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate IP format (basic check)
    if (!/^[\d.:a-fA-F]+$/.test(ip)) {
      return new Response(
        JSON.stringify({ error: "Invalid IP address format", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    await sql`
      INSERT INTO ip_blacklist (ip_address, reason, auto_banned, expires_at)
      VALUES (${ip}, ${reason}, false, ${expiresAt})
      ON CONFLICT (ip_address) DO UPDATE
        SET reason = EXCLUDED.reason,
            blocked_at = NOW(),
            expires_at = EXCLUDED.expires_at,
            auto_banned = false
    `;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error(
      "Blacklist POST failed:",
      error instanceof Error ? error.message : "Unknown"
    );
    return new Response(
      JSON.stringify({ error: "Failed to block IP", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/**
 * DELETE /api/admin/blacklist?ip={ip} — unblock an IP
 */
export const DELETE: APIRoute = async ({ request, url }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const ip = url.searchParams.get("ip");
    if (!ip) {
      return new Response(
        JSON.stringify({ error: "IP parameter required", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    await sql`DELETE FROM ip_blacklist WHERE ip_address = ${ip}`;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error(
      "Blacklist DELETE failed:",
      error instanceof Error ? error.message : "Unknown"
    );
    return new Response(
      JSON.stringify({ error: "Failed to unblock IP", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
