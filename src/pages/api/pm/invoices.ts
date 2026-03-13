import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { getPmFromRequest } from "../../../lib/pm-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * GET /api/pm/invoices — Returns invoice cost summary, tax status,
 * and cost-vs-WIP delta scoped to the authenticated PM's jobs.
 *
 * Query params: year, month (for WIP period alignment)
 *
 * Scoping rules:
 * - PMs see full financial detail for their own jobs only
 * - Admin (GG) sees everything
 */
export const GET: APIRoute = async ({ request }) => {
  const pm = getPmFromRequest(request);
  if (!pm) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...SECURITY_HEADERS,
        "WWW-Authenticate": 'Bearer realm="pm"',
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
    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month");

    // Determine WIP period
    let year: number;
    let month: number;

    if (yearParam && monthParam) {
      year = parseInt(yearParam, 10);
      month = parseInt(monthParam, 10);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return new Response(
          JSON.stringify({ error: "Invalid year or month parameter" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
    } else {
      const latest = await sql`
        SELECT snapshot_year, snapshot_month
        FROM wip_snapshots
        ORDER BY snapshot_year DESC, snapshot_month DESC
        LIMIT 1
      `;
      if (latest.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: "No WIP data available" }),
          { status: 404, headers: SECURITY_HEADERS }
        );
      }
      year = latest.rows[0].snapshot_year;
      month = latest.rows[0].snapshot_month;
    }

    // Get the PM's job numbers from WIP snapshots for this period.
    // Admin (GG) sees all jobs.
    const isAdmin = pm.role === "admin";

    const pmJobsResult = isAdmin
      ? await sql`
          SELECT DISTINCT job_number
          FROM wip_snapshots
          WHERE snapshot_year = ${year} AND snapshot_month = ${month}
        `
      : await sql`
          SELECT DISTINCT job_number
          FROM wip_snapshots
          WHERE snapshot_year = ${year}
            AND snapshot_month = ${month}
            AND project_manager = ${pm.pmCode}
        `;

    const pmJobNumbers = pmJobsResult.rows.map((r) => String(r.job_number));

    // ── Invoice Cost Summary ──────────────────────────────
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevMonthEnd = monthStart;

    let thisMonthCosts: { total_cost: number; invoice_count: number };
    let lastMonthCosts: { total_cost: number; invoice_count: number };

    if (pmJobNumbers.length === 0) {
      thisMonthCosts = { total_cost: 0, invoice_count: 0 };
      lastMonthCosts = { total_cost: 0, invoice_count: 0 };
    } else {
      const thisMonthResult = await sql`
        SELECT
          COALESCE(SUM(subtotal), 0) AS total_cost,
          COUNT(*)::int AS invoice_count
        FROM invoices
        WHERE job_number = ANY(${pmJobNumbers as unknown as string[]})
          AND invoice_date >= ${monthStart}::date
          AND invoice_date < ${monthEnd}::date
      `;
      thisMonthCosts = {
        total_cost: Number(thisMonthResult.rows[0].total_cost),
        invoice_count: Number(thisMonthResult.rows[0].invoice_count),
      };

      const lastMonthResult = await sql`
        SELECT
          COALESCE(SUM(subtotal), 0) AS total_cost,
          COUNT(*)::int AS invoice_count
        FROM invoices
        WHERE job_number = ANY(${pmJobNumbers as unknown as string[]})
          AND invoice_date >= ${prevMonthStart}::date
          AND invoice_date < ${prevMonthEnd}::date
      `;
      lastMonthCosts = {
        total_cost: Number(lastMonthResult.rows[0].total_cost),
        invoice_count: Number(lastMonthResult.rows[0].invoice_count),
      };
    }

    // Top jobs by all-time spend
    let topJobs: Array<{
      job_number: string;
      description: string | null;
      total_cost: number;
      invoice_count: number;
    }> = [];

    if (pmJobNumbers.length > 0) {
      const topJobsResult = await sql`
        SELECT
          i.job_number,
          jm.description,
          COALESCE(SUM(i.subtotal), 0)::numeric AS total_cost,
          COUNT(*)::int AS invoice_count
        FROM invoices i
        LEFT JOIN (
          SELECT DISTINCT ON (job_number) job_number, description
          FROM jobs_master
          ORDER BY job_number, year DESC
        ) jm ON jm.job_number = i.job_number
        WHERE i.job_number = ANY(${pmJobNumbers as unknown as string[]})
        GROUP BY i.job_number, jm.description
        ORDER BY total_cost DESC
        LIMIT 5
      `;
      topJobs = topJobsResult.rows.map((r) => ({
        job_number: String(r.job_number),
        description: r.description ? String(r.description) : null,
        total_cost: Number(r.total_cost),
        invoice_count: Number(r.invoice_count),
      }));
    }

    // ── Tax Status Summary ────────────────────────────────
    let taxCounts = { taxable: 0, exempt: 0, mixed: 0, unknown: 0 };
    let jobsNeedingClassification: Array<{
      job_number: string;
      description: string | null;
      tax_status: string;
    }> = [];

    if (pmJobNumbers.length > 0) {
      const taxResult = await sql`
        SELECT
          tax_status,
          COUNT(*)::int AS cnt
        FROM (
          SELECT DISTINCT ON (job_number)
            job_number, tax_status
          FROM jobs_master
          WHERE job_number = ANY(${pmJobNumbers as unknown as string[]})
          ORDER BY job_number, year DESC
        ) latest_jobs
        GROUP BY tax_status
      `;
      for (const row of taxResult.rows) {
        const status = String(row.tax_status);
        const cnt = Number(row.cnt);
        if (status === "taxable") taxCounts.taxable = cnt;
        else if (status === "exempt") taxCounts.exempt = cnt;
        else if (status === "mixed") taxCounts.mixed = cnt;
        else taxCounts.unknown = cnt;
      }

      const needsClassResult = await sql`
        SELECT DISTINCT ON (job_number)
          job_number, description, tax_status
        FROM jobs_master
        WHERE job_number = ANY(${pmJobNumbers as unknown as string[]})
          AND (tax_status = 'unknown' OR tax_status = 'mixed')
        ORDER BY job_number, year DESC
      `;
      jobsNeedingClassification = needsClassResult.rows.map((r) => ({
        job_number: String(r.job_number),
        description: r.description ? String(r.description) : null,
        tax_status: String(r.tax_status),
      }));
    }

    // ── Cost vs WIP Delta ─────────────────────────────────
    let costDelta: Array<{
      job_number: string;
      description: string | null;
      invoice_cost: number;
      wip_costs_to_date: number | null;
      variance: number;
      status: string;
    }> = [];

    if (pmJobNumbers.length > 0) {
      const wipCosts = isAdmin
        ? await sql`
            SELECT job_number, description, costs_to_date
            FROM wip_snapshots
            WHERE snapshot_year = ${year} AND snapshot_month = ${month}
          `
        : await sql`
            SELECT job_number, description, costs_to_date
            FROM wip_snapshots
            WHERE snapshot_year = ${year}
              AND snapshot_month = ${month}
              AND project_manager = ${pm.pmCode}
          `;

      const wipMap = new Map<string, { description: string | null; costs: number | null }>();
      for (const row of wipCosts.rows) {
        wipMap.set(String(row.job_number), {
          description: row.description ? String(row.description) : null,
          costs: row.costs_to_date !== null ? Number(row.costs_to_date) : null,
        });
      }

      const invoiceTotals = await sql`
        SELECT
          job_number,
          COALESCE(SUM(subtotal), 0)::numeric AS total_cost
        FROM invoices
        WHERE job_number = ANY(${pmJobNumbers as unknown as string[]})
        GROUP BY job_number
      `;

      const invoiceMap = new Map<string, number>();
      for (const row of invoiceTotals.rows) {
        invoiceMap.set(String(row.job_number), Number(row.total_cost));
      }

      const allJobNumbers = new Set([...wipMap.keys(), ...invoiceMap.keys()]);

      for (const jobNum of allJobNumbers) {
        const wipData = wipMap.get(jobNum);
        const invCost = invoiceMap.get(jobNum) ?? 0;
        const wipCost = wipData?.costs ?? null;
        const variance = invCost - (wipCost ?? 0);

        let status: string;
        if (invCost > 0 && wipCost === null) {
          status = "invoice_only";
        } else if (invCost === 0 && wipCost !== null) {
          status = "wip_only";
        } else {
          const absPct = wipCost && wipCost !== 0
            ? Math.abs(variance / wipCost) * 100
            : 0;
          status = absPct <= 2 ? "match" : variance > 0 ? "over" : "under";
        }

        costDelta.push({
          job_number: jobNum,
          description: wipData?.description ?? null,
          invoice_cost: invCost,
          wip_costs_to_date: wipCost,
          variance,
          status,
        });
      }

      costDelta.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    }

    return new Response(
      JSON.stringify({
        currentPm: pm.pmCode,
        year,
        month,
        costSummary: {
          totalCostThisMonth: thisMonthCosts.total_cost,
          totalCostLastMonth: lastMonthCosts.total_cost,
          totalInvoiceCount: thisMonthCosts.invoice_count,
          topJobsBySpend: topJobs,
        },
        taxSummary: {
          ...taxCounts,
          jobsNeedingClassification,
        },
        costDelta,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "PM invoices fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
