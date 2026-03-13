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

// ── Types ───────────────────────────────────────────────

interface JobCostRow {
  jobNumber: string;
  description: string | null;
  pm: string | null;
  customer: string | null;
  invoiceCost: number;
  invoiceTax: number;
  invoiceLineItems: number;
  firstInvoice: string | null;
  lastInvoice: string | null;
  wipCostsToDate: number | null;
  variance: number;
  variancePct: number | null;
  status: "match" | "over" | "under" | "invoice_only" | "wip_only";
}

function computeStatus(
  invoiceCost: number | null,
  wipCost: number | null
): JobCostRow["status"] {
  if (invoiceCost !== null && invoiceCost > 0 && wipCost === null) return "invoice_only";
  if ((invoiceCost === null || invoiceCost === 0) && wipCost !== null) return "wip_only";

  const inv = invoiceCost ?? 0;
  const wip = wipCost ?? 0;
  const variance = inv - wip;
  const pct = wip !== 0 ? Math.abs(variance / wip) * 100 : 0;

  if (Math.abs(variance) < 50 || pct < 2) return "match";
  return variance > 0 ? "over" : "under";
}

/**
 * GET /api/admin/wip-costs?month={YYYY-MM}&pm={code}
 *
 * Aggregates invoice costs per job and compares to WIP costs_to_date.
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month"); // YYYY-MM
    const pmFilter = url.searchParams.get("pm");

    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return new Response(
        JSON.stringify({ error: "month parameter required (format: YYYY-MM)" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const [yearStr, monthStr] = monthParam.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return new Response(
        JSON.stringify({ error: "Invalid month parameter" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Build date range for the month
    const monthStart = `${yearStr}-${monthStr}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    // 1. Invoice costs grouped by job_number for the month
    const invoiceCosts = await sql`
      SELECT
        i.job_number,
        SUM(li.quantity * li.price_per_item)::numeric AS invoice_total_cost,
        SUM(li.tax_amount)::numeric AS total_tax,
        COUNT(li.id)::int AS line_item_count,
        MIN(i.invoice_date)::text AS first_invoice,
        MAX(i.invoice_date)::text AS last_invoice
      FROM invoice_line_items li
      JOIN invoices i ON i.id = li.invoice_id
      WHERE i.invoice_date >= ${monthStart}
        AND i.invoice_date < ${monthEnd}
      GROUP BY i.job_number
    `;

    // 2. WIP costs_to_date for the matching month
    const wipCosts = await sql`
      SELECT job_number, costs_to_date, project_manager, description
      FROM wip_snapshots
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
    `;

    // 3. Jobs master lookup for description, PM, customer
    const jobsMaster = await sql`
      SELECT DISTINCT ON (job_number)
        job_number, description, project_manager, customer_name_raw
      FROM jobs_master
      ORDER BY job_number, year DESC
    `;

    // Build lookup maps
    const invoiceMap = new Map<string, {
      invoiceCost: number;
      invoiceTax: number;
      lineItemCount: number;
      firstInvoice: string | null;
      lastInvoice: string | null;
    }>();
    for (const row of invoiceCosts.rows) {
      invoiceMap.set(String(row.job_number), {
        invoiceCost: Number(row.invoice_total_cost),
        invoiceTax: Number(row.total_tax),
        lineItemCount: Number(row.line_item_count),
        firstInvoice: row.first_invoice,
        lastInvoice: row.last_invoice,
      });
    }

    const wipMap = new Map<string, { costsToDate: number; pm: string | null; description: string | null }>();
    for (const row of wipCosts.rows) {
      wipMap.set(String(row.job_number), {
        costsToDate: Number(row.costs_to_date ?? 0),
        pm: row.project_manager,
        description: row.description,
      });
    }

    const jobsMap = new Map<string, { description: string | null; pm: string | null; customer: string | null }>();
    for (const row of jobsMaster.rows) {
      jobsMap.set(String(row.job_number), {
        description: row.description,
        pm: row.project_manager,
        customer: row.customer_name_raw,
      });
    }

    // 4. Merge datasets — all jobs that appear in either invoices or WIP
    const allJobNumbers = new Set([...invoiceMap.keys(), ...wipMap.keys()]);
    const jobs: JobCostRow[] = [];

    for (const jobNumber of allJobNumbers) {
      const inv = invoiceMap.get(jobNumber);
      const wip = wipMap.get(jobNumber);
      const master = jobsMap.get(jobNumber);

      const invoiceCost = inv?.invoiceCost ?? 0;
      const wipCostsToDate = wip?.costsToDate ?? null;
      const variance = invoiceCost - (wipCostsToDate ?? 0);
      const variancePct = wipCostsToDate && wipCostsToDate !== 0
        ? Math.round((variance / wipCostsToDate) * 1000) / 10
        : null;

      const pm = wip?.pm ?? master?.pm ?? null;

      // Apply PM filter
      if (pmFilter && pm?.toUpperCase() !== pmFilter.toUpperCase()) continue;

      const status = computeStatus(
        inv ? invoiceCost : null,
        wipCostsToDate
      );

      jobs.push({
        jobNumber,
        description: wip?.description ?? master?.description ?? null,
        pm,
        customer: master?.customer ?? null,
        invoiceCost,
        invoiceTax: inv?.invoiceTax ?? 0,
        invoiceLineItems: inv?.lineItemCount ?? 0,
        firstInvoice: inv?.firstInvoice ?? null,
        lastInvoice: inv?.lastInvoice ?? null,
        wipCostsToDate,
        variance,
        variancePct,
        status,
      });
    }

    // Sort by absolute variance descending (largest discrepancies first)
    jobs.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    // 5. Summary
    const jobsWithWip = jobs.filter((j) => j.status !== "invoice_only");

    const totalInvoiceCost = jobs.reduce((s, j) => s + j.invoiceCost, 0);
    const totalWipCost = jobsWithWip.reduce(
      (s, j) => s + (j.wipCostsToDate ?? 0),
      0
    );

    const summary = {
      totalJobs: jobs.length,
      totalInvoiceCost: Math.round(totalInvoiceCost * 100) / 100,
      totalWipCost: Math.round(totalWipCost * 100) / 100,
      variance: Math.round((totalInvoiceCost - totalWipCost) * 100) / 100,
      jobsWithInvoicesOnly: jobs.filter((j) => j.status === "invoice_only").length,
      jobsWithWipOnly: jobs.filter((j) => j.status === "wip_only").length,
    };

    // 6. PM breakdown
    const pmBreakdownMap = new Map<string, {
      invoiceCost: number;
      wipCost: number;
      variance: number;
    }>();

    for (const job of jobs) {
      const pmKey = job.pm ?? "Unknown";
      const existing = pmBreakdownMap.get(pmKey) ?? {
        invoiceCost: 0,
        wipCost: 0,
        variance: 0,
      };
      existing.invoiceCost += job.invoiceCost;
      existing.wipCost += job.wipCostsToDate ?? 0;
      existing.variance += job.variance;
      pmBreakdownMap.set(pmKey, existing);
    }

    const pmBreakdown = Array.from(pmBreakdownMap.entries())
      .map(([pm, data]) => ({
        pm,
        invoiceCost: Math.round(data.invoiceCost * 100) / 100,
        wipCost: Math.round(data.wipCost * 100) / 100,
        variance: Math.round(data.variance * 100) / 100,
      }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    return new Response(
      JSON.stringify({
        month: monthParam,
        summary,
        jobs,
        pmBreakdown,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "WIP costs aggregation error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
