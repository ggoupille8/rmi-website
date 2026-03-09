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

const VALID_STATUSES = ["open", "closed", "written_up"] as const;
const VALID_TYPES = ["TM", "LS"] as const;
const VALID_PMS = ["GG", "MD", "RG", "SB"] as const;
const VALID_SORT_COLS = [
  "job_number", "description", "customer_name", "job_type",
  "contract_value", "po_number", "general_contractor",
  "project_manager", "status",
] as const;

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);

    // Parse filters
    const yearParam = url.searchParams.get("year");
    const statusParam = url.searchParams.get("status");
    const pmParam = url.searchParams.get("pm");
    const typeParam = url.searchParams.get("type");
    const searchParam = url.searchParams.get("search");
    const sortParam = url.searchParams.get("sort");
    const orderParam = url.searchParams.get("order");

    // Pagination
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (Number.isFinite(year)) {
        conditions.push(`j.year = $${paramIndex}`);
        values.push(year);
        paramIndex++;
      }
    }

    if (statusParam && VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])) {
      conditions.push(`j.status = $${paramIndex}`);
      values.push(statusParam);
      paramIndex++;
    }

    if (pmParam && VALID_PMS.includes(pmParam as (typeof VALID_PMS)[number])) {
      conditions.push(`j.project_manager = $${paramIndex}`);
      values.push(pmParam);
      paramIndex++;
    }

    if (typeParam && VALID_TYPES.includes(typeParam as (typeof VALID_TYPES)[number])) {
      conditions.push(`j.job_type = $${paramIndex}`);
      values.push(typeParam);
      paramIndex++;
    }

    if (searchParam && searchParam.trim().length > 0) {
      const term = `%${searchParam.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(j.job_number) LIKE $${paramIndex} OR LOWER(COALESCE(j.description,'')) LIKE $${paramIndex} OR LOWER(COALESCE(j.customer_name,'')) LIKE $${paramIndex} OR LOWER(COALESCE(j.po_number,'')) LIKE $${paramIndex})`
      );
      values.push(term);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Sort
    let sortCol = "j.job_number";
    if (sortParam && VALID_SORT_COLS.includes(sortParam as (typeof VALID_SORT_COLS)[number])) {
      sortCol = `j.${sortParam}`;
    }
    const sortOrder = orderParam === "asc" ? "ASC" : "DESC";

    // Main query — join flags
    const queryText = `
      SELECT j.*,
        COALESCE(
          json_agg(
            json_build_object('id', f.id, 'flag_type', f.flag_type, 'message', f.message, 'resolved', f.resolved)
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'
        ) AS flags
      FROM jobs j
      LEFT JOIN job_flags f ON f.job_id = j.id AND f.resolved = false
      ${whereClause}
      GROUP BY j.id
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    // Count query
    const countText = `SELECT COUNT(*)::int AS total FROM jobs j ${whereClause}`;
    const countValues = values.slice(0, -2);

    // Summary counts for the current filter set
    const summaryText = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE j.status = 'open')::int AS open,
        COUNT(*) FILTER (WHERE j.status = 'closed')::int AS closed,
        COUNT(*) FILTER (WHERE j.status = 'written_up')::int AS written_up,
        COUNT(*) FILTER (WHERE j.job_type = 'TM')::int AS tm,
        COUNT(*) FILTER (WHERE j.job_type = 'LS')::int AS ls
      FROM jobs j
      ${whereClause}
    `;

    const [result, countResult, summaryResult] = await Promise.all([
      sql.query(queryText, values),
      sql.query(countText, countValues),
      sql.query(summaryText, countValues),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const summary = summaryResult.rows[0] ?? {};

    return new Response(
      JSON.stringify({
        jobs: result.rows,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasMore: offset + limit < total,
        },
        summary,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin jobs fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

// PATCH — resolve a flag
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as { flag_id?: unknown };

    if (!body.flag_id || typeof body.flag_id !== "number") {
      return new Response(
        JSON.stringify({ error: "flag_id (number) is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const result = await sql.query(
      `UPDATE job_flags SET resolved = true WHERE id = $1 RETURNING id, flag_type`,
      [body.flag_id]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Flag not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, flag: result.rows[0] }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin flag resolve error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
