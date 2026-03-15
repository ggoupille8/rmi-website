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

interface MonthlyCount {
  month: string;
  count: number;
}

interface MonthlyWip {
  month: string;
  backlog: number;
  earned: number;
}

interface MonthlyFinancial {
  month: string;
  ar: number | null;
  netIncome: number | null;
}

/**
 * GET /api/admin/dashboard-trends
 *
 * Returns 6-month trend data for the executive dashboard sparklines:
 * - leads: monthly lead submission counts
 * - wip: monthly backlog + earned revenue totals
 * - financials: monthly AR total + net income
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
      {
        status: 401,
        headers: {
          ...SECURITY_HEADERS,
          "WWW-Authenticate": 'Bearer realm="admin"',
        },
      }
    );
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const [leadTrend, wipTrend, arTrend, isTrend] = await Promise.all([
      fetchLeadTrend(),
      fetchWipTrend(),
      fetchArTrend(),
      fetchIncomeTrend(),
    ]);

    // Merge AR and income statement trends into a single financials array
    const financialMonths = new Set<string>();
    for (const r of arTrend) financialMonths.add(r.month);
    for (const r of isTrend) financialMonths.add(r.month);

    const arMap = new Map(arTrend.map((r) => [r.month, r.ar]));
    const isMap = new Map(isTrend.map((r) => [r.month, r.netIncome]));

    const financials: MonthlyFinancial[] = Array.from(financialMonths)
      .sort()
      .slice(-6)
      .map((m) => ({
        month: m,
        ar: arMap.get(m) ?? null,
        netIncome: isMap.get(m) ?? null,
      }));

    const niPriorYearSameMonth = await fetchPriorYearSameMonthNI();

    return new Response(
      JSON.stringify({
        leads: leadTrend,
        wip: wipTrend,
        financials,
        niPriorYearSameMonth,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[dashboard-trends] Error:", message);
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

async function fetchLeadTrend(): Promise<MonthlyCount[]> {
  const result = await sql`
    SELECT
      TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS count
    FROM contacts
    WHERE deleted_at IS NULL
      AND created_at >= date_trunc('month', CURRENT_DATE) - interval '5 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY month ASC
  `;
  return result.rows.map((r) => ({
    month: r.month as string,
    count: r.count as number,
  }));
}

async function fetchWipTrend(): Promise<MonthlyWip[]> {
  try {
    const result = await sql`
      SELECT
        snapshot_year AS year,
        snapshot_month AS month,
        COALESCE(backlog_revenue, 0)::numeric AS backlog,
        COALESCE(earned_revenue, 0)::numeric AS earned
      FROM wip_snapshot_totals
      ORDER BY snapshot_year DESC, snapshot_month DESC
      LIMIT 6
    `;
    return result.rows
      .map((r) => ({
        month: `${r.year}-${String(r.month).padStart(2, "0")}`,
        backlog: parseFloat(String(r.backlog)),
        earned: parseFloat(String(r.earned)),
      }))
      .reverse();
  } catch {
    return [];
  }
}

async function fetchArTrend(): Promise<{ month: string; ar: number }[]> {
  try {
    const result = await sql`
      SELECT
        TO_CHAR(report_date, 'YYYY-MM') AS month,
        total_amount::numeric AS ar
      FROM ar_aging_snapshots
      ORDER BY report_date DESC
      LIMIT 6
    `;
    return result.rows
      .map((r) => ({
        month: r.month as string,
        ar: parseFloat(String(r.ar)),
      }))
      .reverse();
  } catch {
    return [];
  }
}

async function fetchIncomeTrend(): Promise<{ month: string; netIncome: number }[]> {
  try {
    const result = await sql`
      SELECT
        TO_CHAR(period_end_date, 'YYYY-MM') AS month,
        net_income::numeric AS net_income
      FROM income_statement_snapshots
      WHERE EXTRACT(MONTH FROM period_end_date) != 12
      ORDER BY period_end_date DESC
      LIMIT 6
    `;
    return result.rows
      .map((r) => ({
        month: r.month as string,
        netIncome: parseFloat(String(r.net_income)),
      }))
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Fetch same-month-prior-year net income for YoY comparison.
 * Finds the latest non-December income statement month, then looks up
 * the same calendar month one year earlier.
 */
async function fetchPriorYearSameMonthNI(): Promise<number | null> {
  try {
    const latestResult = await sql`
      SELECT period_end_date
      FROM income_statement_snapshots
      WHERE EXTRACT(MONTH FROM period_end_date) != 12
      ORDER BY period_end_date DESC
      LIMIT 1
    `;
    if (latestResult.rows.length === 0) return null;

    const latestDate = new Date(latestResult.rows[0].period_end_date as string);
    const priorYear = latestDate.getFullYear() - 1;
    const sameMonth = latestDate.getMonth() + 1; // 1-indexed for SQL

    const result = await sql`
      SELECT net_income::numeric AS net_income
      FROM income_statement_snapshots
      WHERE EXTRACT(YEAR FROM period_end_date) = ${priorYear}
        AND EXTRACT(MONTH FROM period_end_date) = ${sameMonth}
      ORDER BY period_end_date DESC
      LIMIT 1
    `;
    if (result.rows.length === 0) return null;

    return parseFloat(String(result.rows[0].net_income));
  } catch {
    return null;
  }
}
