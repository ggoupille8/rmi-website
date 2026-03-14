import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { logActivity } from "../../../lib/activity-log";

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

const VALID_TAX_STATUSES = ["taxable", "exempt", "mixed", "unknown"] as const;
const VALID_CONTRACT_TYPES = ["LS", "TM", "TM NTE", "NTE"] as const;
const VALID_PMS = ["GG", "MD", "RG", "SB"] as const;
const VALID_EXEMPTION_TYPES = [
  "nonprofit_hospital",
  "church_sanctuary",
  "pollution_control",
  "data_center",
  "nonprofit_housing",
  "indian_tribe",
  "enterprise_zone",
  "industrial_processing",
  "out_of_state",
  "brownfield",
  "other",
] as const;
const VALID_SORT_COLS = [
  "job_number",
  "year",
  "description",
  "customer_name_raw",
  "contract_type",
  "tax_status",
  "general_contractor",
  "project_manager",
] as const;

type TaxStatus = (typeof VALID_TAX_STATUSES)[number];
type ExemptionType = (typeof VALID_EXEMPTION_TYPES)[number];

function isValidTaxStatus(s: unknown): s is TaxStatus {
  return typeof s === "string" && VALID_TAX_STATUSES.includes(s as TaxStatus);
}

function isValidExemptionType(s: unknown): s is ExemptionType {
  return (
    typeof s === "string" &&
    VALID_EXEMPTION_TYPES.includes(s as ExemptionType)
  );
}

// ---------------------------------------------------------------------------
// GET — list jobs, stats, or customers depending on ?action param
// ---------------------------------------------------------------------------
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "stats") return handleStats();
    if (action === "customers") return handleCustomers();
    return handleList(url);
  } catch (error) {
    console.error(
      "Admin jobs-master GET error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

// ---------------------------------------------------------------------------
// PATCH — update a single job
// ---------------------------------------------------------------------------
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = body.id;

    if (!id || typeof id !== "number") {
      return new Response(
        JSON.stringify({ error: "id (number) is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;

    // tax_status
    if (body.tax_status !== undefined) {
      if (!isValidTaxStatus(body.tax_status)) {
        return new Response(
          JSON.stringify({
            error: `Invalid tax_status. Must be one of: ${VALID_TAX_STATUSES.join(", ")}`,
          }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
      setClauses.push(`tax_status = $${idx}`);
      values.push(body.tax_status);
      idx++;

      // If switching to taxable, clear exemption type
      if (body.tax_status === "taxable") {
        setClauses.push("tax_exemption_type = NULL");
      }
    }

    // tax_exemption_type
    if (
      body.tax_exemption_type !== undefined &&
      body.tax_status !== "taxable"
    ) {
      if (body.tax_exemption_type === null) {
        setClauses.push("tax_exemption_type = NULL");
      } else if (isValidExemptionType(body.tax_exemption_type)) {
        setClauses.push(`tax_exemption_type = $${idx}`);
        values.push(body.tax_exemption_type);
        idx++;
      } else {
        return new Response(
          JSON.stringify({
            error: `Invalid tax_exemption_type. Must be one of: ${VALID_EXEMPTION_TYPES.join(", ")}`,
          }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    // description (inline edit)
    if (body.description !== undefined) {
      if (body.description === null) {
        setClauses.push("description = NULL");
      } else if (typeof body.description === "string") {
        setClauses.push(`description = $${idx}`);
        values.push(body.description);
        idx++;
      }
    }

    // customer_name_raw (inline edit)
    if (body.customer_name_raw !== undefined) {
      if (body.customer_name_raw === null) {
        setClauses.push("customer_name_raw = NULL");
      } else if (typeof body.customer_name_raw === "string") {
        setClauses.push(`customer_name_raw = $${idx}`);
        values.push(body.customer_name_raw);
        idx++;
      }
    }

    // project_manager
    if (body.project_manager !== undefined) {
      if (
        typeof body.project_manager === "string" &&
        VALID_PMS.includes(body.project_manager as (typeof VALID_PMS)[number])
      ) {
        setClauses.push(`project_manager = $${idx}`);
        values.push(body.project_manager);
        idx++;
      } else if (body.project_manager === null) {
        setClauses.push("project_manager = NULL");
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid project_manager" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    // contract_type
    if (body.contract_type !== undefined) {
      if (
        typeof body.contract_type === "string" &&
        VALID_CONTRACT_TYPES.includes(
          body.contract_type as (typeof VALID_CONTRACT_TYPES)[number]
        )
      ) {
        setClauses.push(`contract_type = $${idx}`);
        values.push(body.contract_type);
        idx++;
      } else if (body.contract_type === null) {
        setClauses.push("contract_type = NULL");
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid contract_type" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    // customer_id
    if (body.customer_id !== undefined) {
      if (body.customer_id === null) {
        setClauses.push("customer_id = NULL");
      } else if (typeof body.customer_id === "number") {
        setClauses.push(`customer_id = $${idx}`);
        values.push(body.customer_id);
        idx++;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid customer_id" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    // general_contractor
    if (body.general_contractor !== undefined) {
      if (body.general_contractor === null) {
        setClauses.push("general_contractor = NULL");
      } else if (typeof body.general_contractor === "string") {
        setClauses.push(`general_contractor = $${idx}`);
        values.push(body.general_contractor);
        idx++;
      }
    }

    if (setClauses.length <= 1) {
      return new Response(
        JSON.stringify({ error: "No valid fields to update" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE jobs_master
      SET ${setClauses.join(", ")}
      WHERE id = $${idx}
      RETURNING id, job_number, year,
                NULLIF(description, 'undefined') AS description,
                customer_id,
                NULLIF(customer_name_raw, 'undefined') AS customer_name_raw,
                NULLIF(contract_type, 'undefined') AS contract_type,
                tax_status, tax_exemption_type,
                NULLIF(general_contractor, 'undefined') AS general_contractor,
                NULLIF(project_manager, 'undefined') AS project_manager,
                is_hidden, po_number, timing, updated_at
    `;

    const result = await sql.query(updateQuery, values);

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Warn if exempt without exemption type
    const job = result.rows[0];
    const warnings: string[] = [];
    if (job.tax_status === "exempt" && !job.tax_exemption_type) {
      warnings.push(
        "Tax status is exempt but no exemption type specified"
      );
    }

    if (body.tax_status !== undefined) {
      logActivity("tax_status_change", "job", String(id), {
        job_number: job.job_number,
        new_status: body.tax_status,
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ ok: true, job, warnings }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin jobs-master PATCH error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

// ---------------------------------------------------------------------------
// POST — bulk update (tax status, PM, or contract type)
// ---------------------------------------------------------------------------
export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const { jobIds, taxStatus, taxExemptionType, projectManager, contractType } =
      body as {
        jobIds?: unknown;
        taxStatus?: unknown;
        taxExemptionType?: unknown;
        projectManager?: unknown;
        contractType?: unknown;
      };

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "jobIds must be a non-empty array" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (jobIds.length > 500) {
      return new Response(
        JSON.stringify({ error: "Cannot bulk update more than 500 jobs at once" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate all IDs are numbers
    if (!jobIds.every((id) => typeof id === "number")) {
      return new Response(
        JSON.stringify({ error: "All jobIds must be numbers" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Must provide at least one action
    const hasAction =
      taxStatus !== undefined ||
      projectManager !== undefined ||
      contractType !== undefined;

    if (!hasAction) {
      return new Response(
        JSON.stringify({
          error: "Must provide taxStatus, projectManager, or contractType",
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Build SET clause dynamically
    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (taxStatus !== undefined) {
      if (!isValidTaxStatus(taxStatus)) {
        return new Response(
          JSON.stringify({
            error: `Invalid taxStatus. Must be one of: ${VALID_TAX_STATUSES.join(", ")}`,
          }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
      setClauses.push(`tax_status = $${paramIdx}`);
      values.push(taxStatus);
      paramIdx++;

      if (taxStatus === "taxable") {
        setClauses.push("tax_exemption_type = NULL");
      } else if (taxExemptionType !== undefined && taxExemptionType !== null) {
        if (!isValidExemptionType(taxExemptionType)) {
          return new Response(
            JSON.stringify({
              error: `Invalid taxExemptionType. Must be one of: ${VALID_EXEMPTION_TYPES.join(", ")}`,
            }),
            { status: 400, headers: SECURITY_HEADERS }
          );
        }
        setClauses.push(`tax_exemption_type = $${paramIdx}`);
        values.push(taxExemptionType);
        paramIdx++;
      }
    }

    if (projectManager !== undefined) {
      if (projectManager === null) {
        setClauses.push("project_manager = NULL");
      } else if (
        typeof projectManager === "string" &&
        VALID_PMS.includes(projectManager as (typeof VALID_PMS)[number])
      ) {
        setClauses.push(`project_manager = $${paramIdx}`);
        values.push(projectManager);
        paramIdx++;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid projectManager" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    if (contractType !== undefined) {
      if (contractType === null) {
        setClauses.push("contract_type = NULL");
      } else if (
        typeof contractType === "string" &&
        VALID_CONTRACT_TYPES.includes(
          contractType as (typeof VALID_CONTRACT_TYPES)[number]
        )
      ) {
        setClauses.push(`contract_type = $${paramIdx}`);
        values.push(contractType);
        paramIdx++;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid contractType" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    }

    // Build WHERE IN with parameterized placeholders
    const placeholders = jobIds.map((_, i) => `$${paramIdx + i}`).join(", ");
    values.push(...jobIds);

    const updateQuery = `
      UPDATE jobs_master
      SET ${setClauses.join(", ")}
      WHERE id IN (${placeholders})
      RETURNING id
    `;

    const result = await sql.query(updateQuery, values);

    const updatedCount = result.rowCount ?? result.rows.length;
    const updatedIds = result.rows.map((r: Record<string, unknown>) => r.id);

    if (taxStatus !== undefined) {
      logActivity("bulk_tax_update", "job", "", {
        count: updatedCount,
        new_status: taxStatus,
        ids: updatedIds,
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        ok: true,
        updated: updatedCount,
        ids: updatedIds,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin jobs-master bulk update error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

// ---------------------------------------------------------------------------
// Handler: paginated job list
// ---------------------------------------------------------------------------
async function handleList(url: URL): Promise<Response> {
  const yearParam = url.searchParams.get("year");
  const pmParam = url.searchParams.get("pm");
  const taxParam = url.searchParams.get("tax");
  const typeParam = url.searchParams.get("type");
  const customerParam = url.searchParams.get("customer");
  const searchParam = url.searchParams.get("q");
  const sortParam = url.searchParams.get("sort");
  const orderParam = url.searchParams.get("order");

  // Pagination
  const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
  const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 50;
  const offset = (page - 1) * limit;

  // Build WHERE clauses
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (yearParam) {
    const year = parseInt(yearParam, 10);
    if (Number.isFinite(year)) {
      conditions.push(`jm.year = $${paramIndex}`);
      values.push(year);
      paramIndex++;
    }
  }

  if (pmParam && VALID_PMS.includes(pmParam as (typeof VALID_PMS)[number])) {
    conditions.push(`jm.project_manager = $${paramIndex}`);
    values.push(pmParam);
    paramIndex++;
  }

  if (taxParam && isValidTaxStatus(taxParam)) {
    conditions.push(`jm.tax_status = $${paramIndex}`);
    values.push(taxParam);
    paramIndex++;
  }

  if (
    typeParam &&
    VALID_CONTRACT_TYPES.includes(
      typeParam as (typeof VALID_CONTRACT_TYPES)[number]
    )
  ) {
    conditions.push(`jm.contract_type = $${paramIndex}`);
    values.push(typeParam);
    paramIndex++;
  }

  if (customerParam && customerParam.trim().length > 0) {
    const term = `%${customerParam.trim().toLowerCase()}%`;
    conditions.push(`LOWER(COALESCE(jm.customer_name_raw,'')) LIKE $${paramIndex}`);
    values.push(term);
    paramIndex++;
  }

  if (searchParam && searchParam.trim().length > 0) {
    const term = `%${searchParam.trim().toLowerCase()}%`;
    conditions.push(
      `(LOWER(jm.job_number) LIKE $${paramIndex} OR LOWER(COALESCE(jm.description,'')) LIKE $${paramIndex} OR LOWER(COALESCE(jm.customer_name_raw,'')) LIKE $${paramIndex} OR LOWER(COALESCE(jm.general_contractor,'')) LIKE $${paramIndex})`
    );
    values.push(term);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sort
  let sortCol = "jm.job_number";
  if (
    sortParam &&
    VALID_SORT_COLS.includes(sortParam as (typeof VALID_SORT_COLS)[number])
  ) {
    sortCol = `jm.${sortParam}`;
  }
  const sortOrder = orderParam === "asc" ? "ASC" : "DESC";

  // Main query — NULLIF guards against the string 'undefined' stored by the
  // import script when Excel cells exist (have formatting) but no value.
  const queryText = `
    SELECT jm.id, jm.job_number, jm.year,
           NULLIF(jm.description, 'undefined') AS description,
           jm.customer_id,
           NULLIF(jm.customer_name_raw, 'undefined') AS customer_name_raw,
           NULLIF(jm.contract_type, 'undefined') AS contract_type,
           jm.tax_status, jm.tax_exemption_type,
           NULLIF(jm.general_contractor, 'undefined') AS general_contractor,
           NULLIF(jm.project_manager, 'undefined') AS project_manager,
           jm.is_hidden, jm.po_number, jm.timing
    FROM jobs_master jm
    ${whereClause}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  values.push(limit, offset);

  // Count + tax status breakdown for the current filter
  const countValues = values.slice(0, -2);
  const countText = `SELECT COUNT(*)::int AS total FROM jobs_master jm ${whereClause}`;

  const taxBreakdownText = `
    SELECT
      COUNT(*) FILTER (WHERE jm.tax_status = 'taxable')::int AS taxable,
      COUNT(*) FILTER (WHERE jm.tax_status = 'exempt')::int AS exempt,
      COUNT(*) FILTER (WHERE jm.tax_status = 'mixed')::int AS mixed,
      COUNT(*) FILTER (WHERE jm.tax_status = 'unknown')::int AS unknown
    FROM jobs_master jm
    ${whereClause}
  `;

  const [result, countResult, taxResult] = await Promise.all([
    sql.query(queryText, values),
    sql.query(countText, countValues),
    sql.query(taxBreakdownText, countValues),
  ]);

  const total = countResult.rows[0]?.total ?? 0;
  const taxBreakdown = taxResult.rows[0] ?? {
    taxable: 0,
    exempt: 0,
    mixed: 0,
    unknown: 0,
  };

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
      taxBreakdown,
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

// ---------------------------------------------------------------------------
// Handler: stats
// ---------------------------------------------------------------------------
async function handleStats(): Promise<Response> {
  const statsText = `
    SELECT
      COUNT(*)::int AS "totalJobs",
      json_build_object(
        '2021', COUNT(*) FILTER (WHERE year = 2021)::int,
        '2022', COUNT(*) FILTER (WHERE year = 2022)::int,
        '2023', COUNT(*) FILTER (WHERE year = 2023)::int,
        '2024', COUNT(*) FILTER (WHERE year = 2024)::int,
        '2025', COUNT(*) FILTER (WHERE year = 2025)::int,
        '2026', COUNT(*) FILTER (WHERE year = 2026)::int
      ) AS "byYear",
      json_build_object(
        'taxable', COUNT(*) FILTER (WHERE tax_status = 'taxable')::int,
        'exempt', COUNT(*) FILTER (WHERE tax_status = 'exempt')::int,
        'mixed', COUNT(*) FILTER (WHERE tax_status = 'mixed')::int,
        'unknown', COUNT(*) FILTER (WHERE tax_status = 'unknown')::int
      ) AS "byTaxStatus",
      json_build_object(
        'GG', COUNT(*) FILTER (WHERE project_manager = 'GG')::int,
        'RG', COUNT(*) FILTER (WHERE project_manager = 'RG')::int,
        'MD', COUNT(*) FILTER (WHERE project_manager = 'MD')::int,
        'SB', COUNT(*) FILTER (WHERE project_manager = 'SB')::int
      ) AS "byPM",
      json_build_object(
        'LS', COUNT(*) FILTER (WHERE contract_type = 'LS')::int,
        'TM', COUNT(*) FILTER (WHERE contract_type = 'TM')::int,
        'TM NTE', COUNT(*) FILTER (WHERE contract_type = 'TM NTE')::int,
        'NTE', COUNT(*) FILTER (WHERE contract_type = 'NTE')::int
      ) AS "byContractType",
      COUNT(*) FILTER (WHERE tax_status = 'unknown')::int AS "needsClassification"
    FROM jobs_master
  `;

  const result = await sql.query(statsText);
  const stats = result.rows[0] ?? {};

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: SECURITY_HEADERS,
  });
}

// ---------------------------------------------------------------------------
// Handler: customers list
// ---------------------------------------------------------------------------
async function handleCustomers(): Promise<Response> {
  const customersText = `
    SELECT
      c.id,
      c.canonical_name AS "canonicalName",
      c.short_code AS "shortCode",
      COUNT(jm.id)::int AS "jobCount"
    FROM customers c
    LEFT JOIN jobs_master jm ON jm.customer_id = c.id
    GROUP BY c.id, c.canonical_name, c.short_code
    ORDER BY c.canonical_name ASC
  `;

  const result = await sql.query(customersText);

  return new Response(
    JSON.stringify({ customers: result.rows }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}


// ---------------------------------------------------------------------------
// Handler: job detail (WIP snapshot + invoices for a single job)
// ---------------------------------------------------------------------------
async function handleDetail(url: URL): Promise<Response> {
  const jobNumber = url.searchParams.get("job_number");
  if (!jobNumber || jobNumber.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "job_number parameter is required" }),
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  const jn = jobNumber.trim();

  const wipResult = await sql`
    SELECT * FROM wip_snapshots
    WHERE job_number = ${jn}
    ORDER BY snapshot_year DESC, snapshot_month DESC
    LIMIT 1
  `;

  const invoiceResult = await sql`
    SELECT i.id, i.invoice_number, i.invoice_date, i.subtotal,
           i.tax_amount, i.total, i.notes,
           v.code AS vendor_code, v.full_name AS vendor_name
    FROM invoices i
    LEFT JOIN vendors v ON v.id = i.vendor_id
    WHERE i.job_number = ${jn}
    ORDER BY i.invoice_date DESC
    LIMIT 50
  `;

  return new Response(
    JSON.stringify({
      jobNumber: jn,
      wip: wipResult.rows[0] ?? null,
      invoices: invoiceResult.rows,
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}
