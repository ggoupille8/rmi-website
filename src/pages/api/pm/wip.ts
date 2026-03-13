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
 * GET /api/pm/wip — Returns WIP snapshots for the authenticated PM.
 *
 * Own jobs: full financial detail (all columns).
 * Other PMs' jobs: limited fields only.
 *
 * Query params: year, month
 * Also returns company-wide KPI totals from wip_snapshot_totals.
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

    // Default to latest available month if not specified
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
      // Find the latest available month
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

    // Fetch own jobs (full detail)
    const ownJobs = await sql`
      SELECT
        job_number, description, project_manager, is_hidden_in_source,
        contract_amount, change_orders, pending_change_orders, revised_contract,
        original_estimate, estimate_changes, pending_co_estimates, revised_estimate,
        gross_profit, gross_margin_pct, pct_complete,
        earned_revenue, costs_to_date, gross_profit_to_date,
        backlog_revenue, costs_to_complete, backlog_profit,
        billings_to_date, revenue_billing_excess, invoicing_remaining,
        revenue_excess, billings_excess
      FROM wip_snapshots
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
        AND project_manager = ${pm.pmCode}
      ORDER BY job_number
    `;

    // Fetch other PMs' jobs (limited fields only)
    const otherJobs = await sql`
      SELECT
        job_number, description, project_manager,
        pct_complete, revised_contract, backlog_revenue
      FROM wip_snapshots
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
        AND project_manager != ${pm.pmCode}
      ORDER BY project_manager, job_number
    `;

    // Company-wide totals
    const totals = await sql`
      SELECT *
      FROM wip_snapshot_totals
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
    `;

    // Available months for the month selector
    const availableMonths = await sql`
      SELECT DISTINCT snapshot_year, snapshot_month
      FROM wip_snapshots
      ORDER BY snapshot_year DESC, snapshot_month DESC
    `;

    return new Response(
      JSON.stringify({
        currentPm: pm.pmCode,
        year,
        month,
        ownJobs: ownJobs.rows,
        otherJobs: otherJobs.rows,
        companyTotals: totals.rows[0] ?? null,
        availableMonths: availableMonths.rows.map((r) => ({
          year: r.snapshot_year as number,
          month: r.snapshot_month as number,
        })),
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "PM WIP fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
