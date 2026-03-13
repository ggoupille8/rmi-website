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

/**
 * GET /api/admin/wip-costs-timeline?job={jobNumber}
 *
 * Cost accumulation over time for a specific job:
 * - Monthly invoice cost totals
 * - WIP costs_to_date snapshots by month
 * - Gap between invoice costs and WIP
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      JSON.stringify({ error: "Database not configured" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const url = new URL(request.url);
    const jobNumber = url.searchParams.get("job");

    if (!jobNumber) {
      return new Response(
        JSON.stringify({ error: "job parameter required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Monthly invoice cost totals for this job
    const invoiceMonthly = await sql`
      SELECT
        TO_CHAR(i.invoice_date, 'YYYY-MM') AS month,
        SUM(li.quantity * li.price_per_item)::numeric AS invoice_cost,
        SUM(li.tax_amount)::numeric AS tax_amount,
        COUNT(DISTINCT i.id)::int AS invoice_count,
        COUNT(li.id)::int AS line_item_count
      FROM invoice_line_items li
      JOIN invoices i ON i.id = li.invoice_id
      WHERE i.job_number = ${jobNumber}
      GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM')
      ORDER BY month
    `;

    // WIP costs_to_date snapshots by month for this job
    const wipMonthly = await sql`
      SELECT
        snapshot_year,
        snapshot_month,
        costs_to_date,
        pct_complete,
        earned_revenue,
        revised_contract,
        description,
        project_manager
      FROM wip_snapshots
      WHERE job_number = ${jobNumber}
      ORDER BY snapshot_year, snapshot_month
    `;

    // Build month-keyed maps
    const invoiceByMonth = new Map<string, {
      invoiceCost: number;
      taxAmount: number;
      invoiceCount: number;
      lineItemCount: number;
    }>();

    for (const row of invoiceMonthly.rows) {
      invoiceByMonth.set(String(row.month), {
        invoiceCost: Number(row.invoice_cost),
        taxAmount: Number(row.tax_amount),
        invoiceCount: Number(row.invoice_count),
        lineItemCount: Number(row.line_item_count),
      });
    }

    const wipByMonth = new Map<string, {
      costsToDate: number;
      pctComplete: number | null;
      earnedRevenue: number | null;
      revisedContract: number | null;
    }>();

    let jobDescription: string | null = null;
    let jobPm: string | null = null;

    for (const row of wipMonthly.rows) {
      const monthKey = `${row.snapshot_year}-${String(row.snapshot_month).padStart(2, "0")}`;
      wipByMonth.set(monthKey, {
        costsToDate: Number(row.costs_to_date ?? 0),
        pctComplete: row.pct_complete !== null ? Number(row.pct_complete) : null,
        earnedRevenue: row.earned_revenue !== null ? Number(row.earned_revenue) : null,
        revisedContract: row.revised_contract !== null ? Number(row.revised_contract) : null,
      });
      if (row.description) jobDescription = row.description;
      if (row.project_manager) jobPm = row.project_manager;
    }

    // Merge into unified timeline
    const allMonths = new Set([...invoiceByMonth.keys(), ...wipByMonth.keys()]);
    const sortedMonths = Array.from(allMonths).sort();

    let cumulativeInvoiceCost = 0;
    const timeline = sortedMonths.map((month) => {
      const inv = invoiceByMonth.get(month);
      const wip = wipByMonth.get(month);

      const monthInvoiceCost = inv?.invoiceCost ?? 0;
      cumulativeInvoiceCost += monthInvoiceCost;

      const wipCostsToDate = wip?.costsToDate ?? null;
      const gap = wipCostsToDate !== null
        ? Math.round((cumulativeInvoiceCost - wipCostsToDate) * 100) / 100
        : null;

      return {
        month,
        invoiceCost: Math.round(monthInvoiceCost * 100) / 100,
        cumulativeInvoiceCost: Math.round(cumulativeInvoiceCost * 100) / 100,
        invoiceCount: inv?.invoiceCount ?? 0,
        lineItemCount: inv?.lineItemCount ?? 0,
        wipCostsToDate: wipCostsToDate !== null
          ? Math.round(wipCostsToDate * 100) / 100
          : null,
        pctComplete: wip?.pctComplete ?? null,
        gap,
      };
    });

    return new Response(
      JSON.stringify({
        jobNumber,
        description: jobDescription,
        pm: jobPm,
        timeline,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "WIP costs timeline error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
