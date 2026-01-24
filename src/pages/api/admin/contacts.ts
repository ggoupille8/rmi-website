import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { getPostgresEnv } from "../../../lib/db-env";

// Prevent prerendering - API routes must be server-side only
export const prerender = false;

// Simple admin authentication check
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const adminKey = import.meta.env.ADMIN_API_KEY;
  if (!adminKey) {
    // If no admin key is set, deny access
    return false;
  }

  // Enforce exact Bearer scheme with no extra whitespace
  if (!/^Bearer [^\s]+$/.test(authHeader)) {
    return false;
  }

  const token = authHeader.substring(7);
  const tokenBuffer = Buffer.from(token);
  const adminBuffer = Buffer.from(adminKey);
  if (tokenBuffer.length !== adminBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, adminBuffer);
}

export const GET: APIRoute = async ({ request }) => {
  // Check authorization
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="admin"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
    const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50;
    const offset = Number.isFinite(offsetParam)
      ? Math.min(Math.max(offsetParam, 0), 10000)
      : 0;
    const sourceParam = url.searchParams.get("source");
    const source =
      sourceParam === "contact" || sourceParam === null
        ? sourceParam
        : null;

    if (sourceParam !== null && source === null) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Build query
    let result;
    let countResult;

    if (source) {
      result = await sql`
        SELECT id, created_at, name, email, message, source, metadata
        FROM contacts
        WHERE source = ${source}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM contacts WHERE source = ${source}
      `;
    } else {
      result = await sql`
        SELECT id, created_at, name, email, message, source, metadata
        FROM contacts
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM contacts
      `;
    }

    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    return new Response(
      JSON.stringify({
        contacts: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "Admin contacts fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
};
