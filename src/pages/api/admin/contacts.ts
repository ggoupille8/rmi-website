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

const VALID_STATUSES = ["new", "contacted", "archived"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(s: unknown): s is LeadStatus {
  return typeof s === "string" && VALID_STATUSES.includes(s as LeadStatus);
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      ...SECURITY_HEADERS,
      "WWW-Authenticate": 'Bearer realm="admin"',
    },
  });
}

function dbNotConfiguredResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Database not configured" }),
    { status: 500, headers: SECURITY_HEADERS }
  );
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);

    // Parse pagination
    const limitParam = parseInt(url.searchParams.get("limit") || "20", 10);
    const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 20;
    const offset = Number.isFinite(offsetParam)
      ? Math.min(Math.max(offsetParam, 0), 10000)
      : 0;

    // Parse filters
    const statusParam = url.searchParams.get("status");
    const qualityParam = url.searchParams.get("quality");
    const searchParam = url.searchParams.get("search");

    const VALID_QUALITIES = ["high", "medium", "low", "spam"] as const;

    // Build WHERE clauses
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (statusParam && isValidStatus(statusParam)) {
      conditions.push(`status = $${paramIndex}`);
      values.push(statusParam);
      paramIndex++;
    }

    if (
      qualityParam &&
      VALID_QUALITIES.includes(qualityParam as (typeof VALID_QUALITIES)[number])
    ) {
      conditions.push(
        `metadata->'enrichment'->>'quality' = $${paramIndex}`
      );
      values.push(qualityParam);
      paramIndex++;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const searchTerm = `%${searchParam.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(name) LIKE $${paramIndex} OR LOWER(COALESCE(email, '')) LIKE $${paramIndex} OR LOWER(COALESCE(phone, '')) LIKE $${paramIndex})`
      );
      values.push(searchTerm);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query
    const queryText = `
      SELECT id, created_at, name, email, phone, message, source, metadata, status, notes, updated_at
      FROM contacts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const countText = `SELECT COUNT(*) as total FROM contacts ${whereClause}`;
    const countValues = values.slice(0, -2);

    const [result, countResult] = await Promise.all([
      sql.query(queryText, values),
      sql.query(countText, countValues),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    return new Response(
      JSON.stringify({
        contacts: result.rows,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin contacts fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = await request.json();
    const { id, status, notes } = body as {
      id?: unknown;
      status?: unknown;
      notes?: unknown;
    };

    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Contact ID is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid contact ID format" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (status !== undefined && !isValidStatus(status)) {
      return new Response(
        JSON.stringify({
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (notes !== undefined && typeof notes !== "string") {
      return new Response(
        JSON.stringify({ error: "Notes must be a string" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Build dynamic update
    const setClauses: string[] = ["updated_at = NOW()"];
    const updateValues: unknown[] = [];
    let idx = 1;

    if (status !== undefined) {
      setClauses.push(`status = $${idx}`);
      updateValues.push(status);
      idx++;
    }

    if (notes !== undefined) {
      setClauses.push(`notes = $${idx}`);
      updateValues.push(notes);
      idx++;
    }

    if (setClauses.length === 1) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    updateValues.push(id);
    const updateQuery = `
      UPDATE contacts
      SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING id, status, notes, updated_at
    `;

    const result = await sql.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, contact: result.rows[0] }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin contact update error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
