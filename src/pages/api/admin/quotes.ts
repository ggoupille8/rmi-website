import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";

// Simple admin authentication check
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Basic auth or Bearer token
  const adminKey = import.meta.env.ADMIN_API_KEY;
  if (!adminKey) {
    // If no admin key is set, deny access
    return false;
  }

  // Check Bearer token
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return token === adminKey;
  }

  // Check Basic auth
  if (authHeader.startsWith("Basic ")) {
    const token = authHeader.substring(6);
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const [username, password] = decoded.split(":");
      // Simple check: username can be anything, password must match admin key
      return password === adminKey;
    } catch {
      return false;
    }
  }

  return false;
}

export const GET: APIRoute = async ({ request }) => {
  // Check authorization
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="admin"',
      },
    });
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      100
    );
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const serviceType = url.searchParams.get("serviceType");

    // Build query
    let result;
    let countResult;

    if (serviceType) {
      result = await sql`
        SELECT id, created_at, name, company, email, phone, service_type, message, metadata
        FROM quotes
        WHERE service_type = ${serviceType}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM quotes WHERE service_type = ${serviceType}
      `;
    } else {
      result = await sql`
        SELECT id, created_at, name, company, email, phone, service_type, message, metadata
        FROM quotes
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM quotes
      `;
    }

    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    return new Response(
      JSON.stringify({
        quotes: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(
      "Admin quotes fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
