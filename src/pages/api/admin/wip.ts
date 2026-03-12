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
 * GET /api/admin/wip — Returns all WIP snapshots for a given year/month.
 *
 * Query params:
 *   year (required), month (required),
 *   pm (optional filter), includeHidden (default true)
 *
 * Returns: snapshots, totals, PM summary stats, month-over-month comparison.
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
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month");
    const pmFilter = url.searchParams.get("pm");
    const includeHidden = url.searchParams.get("includeHidden") !== "false";

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

    // Build snapshot query with optional filters
    let snapshotsResult;
    if (pmFilter && includeHidden) {
      snapshotsResult = await sql`
        SELECT * FROM wip_snapshots
        WHERE snapshot_year = ${year}
          AND snapshot_month = ${month}
          AND project_manager = ${pmFilter.toUpperCase()}
        ORDER BY job_number
      `;
    } else if (pmFilter && !includeHidden) {
      snapshotsResult = await sql`
        SELECT * FROM wip_snapshots
        WHERE snapshot_year = ${year}
          AND snapshot_month = ${month}
          AND project_manager = ${pmFilter.toUpperCase()}
          AND is_hidden_in_source = false
        ORDER BY job_number
      `;
    } else if (!pmFilter && !includeHidden) {
      snapshotsResult = await sql`
        SELECT * FROM wip_snapshots
        WHERE snapshot_year = ${year}
          AND snapshot_month = ${month}
          AND is_hidden_in_source = false
        ORDER BY job_number
      `;
    } else {
      snapshotsResult = await sql`
        SELECT * FROM wip_snapshots
        WHERE snapshot_year = ${year}
          AND snapshot_month = ${month}
        ORDER BY job_number
      `;
    }

    // Totals for the requested month
    const totalsResult = await sql`
      SELECT * FROM wip_snapshot_totals
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
    `;

    // PM performance summary
    const pmSummaryResult = await sql`
      SELECT
        project_manager,
        COUNT(*)::int AS job_count,
        COALESCE(SUM(backlog_revenue), 0)::numeric AS total_backlog,
        CASE
          WHEN COUNT(*) FILTER (WHERE gross_margin_pct IS NOT NULL) > 0
          THEN AVG(gross_margin_pct) FILTER (WHERE gross_margin_pct IS NOT NULL)
          ELSE NULL
        END AS avg_margin,
        COALESCE(SUM(gross_profit), 0)::numeric AS total_profit,
        COALESCE(SUM(revised_contract), 0)::numeric AS total_revised_contract
      FROM wip_snapshots
      WHERE snapshot_year = ${year}
        AND snapshot_month = ${month}
      GROUP BY project_manager
      ORDER BY project_manager
    `;

    // Previous month totals for month-over-month comparison
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevTotalsResult = await sql`
      SELECT * FROM wip_snapshot_totals
      WHERE snapshot_year = ${prevYear}
        AND snapshot_month = ${prevMonth}
    `;

    // Prior year end (December) snapshots for YTD calculation
    const priorYearDecResult = await sql`
      SELECT * FROM wip_snapshots
      WHERE snapshot_year = ${year - 1}
        AND snapshot_month = 12
      ORDER BY job_number
    `;

    const currentTotals = totalsResult.rows[0] ?? null;
    const prevTotals = prevTotalsResult.rows[0] ?? null;

    // Build month-over-month comparison
    let monthOverMonth = null;
    if (currentTotals && prevTotals) {
      monthOverMonth = {
        revisedContractChange: Number(currentTotals.revised_contract ?? 0) - Number(prevTotals.revised_contract ?? 0),
        earnedRevenueChange: Number(currentTotals.earned_revenue ?? 0) - Number(prevTotals.earned_revenue ?? 0),
        grossProfitChange: Number(currentTotals.gross_profit ?? 0) - Number(prevTotals.gross_profit ?? 0),
        backlogRevenueChange: Number(currentTotals.backlog_revenue ?? 0) - Number(prevTotals.backlog_revenue ?? 0),
        jobCountChange: (currentTotals.job_count ?? 0) - (prevTotals.job_count ?? 0),
      };
    }

    return new Response(
      JSON.stringify({
        year,
        month,
        snapshots: snapshotsResult.rows,
        totals: currentTotals,
        pmSummary: pmSummaryResult.rows.map((row) => ({
          projectManager: row.project_manager,
          jobCount: row.job_count,
          totalBacklog: Number(row.total_backlog),
          avgMargin: row.avg_margin !== null ? Number(row.avg_margin) : null,
          totalProfit: Number(row.total_profit),
          totalRevisedContract: Number(row.total_revised_contract),
        })),
        monthOverMonth,
        priorYearEndSnapshots:
          priorYearDecResult.rows.length > 0
            ? priorYearDecResult.rows
            : null,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin WIP fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
