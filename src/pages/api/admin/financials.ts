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

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
    status: 401,
    headers: { ...SECURITY_HEADERS, "WWW-Authenticate": 'Bearer realm="admin"' },
  });
}

function dbError(): Response {
  return new Response(JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }), {
    status: 500,
    headers: SECURITY_HEADERS,
  });
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!isAdminAuthorized(request)) return unauthorized();
  if (!getPostgresEnv()) return dbError();

  try {
    const action = url.searchParams.get("action");

    if (action === "reconciliation") {
      return handleReconciliation(url);
    }

    if (action === "snapshots") {
      return handleSnapshots(url);
    }

    if (action === "detail") {
      return handleDetail(url);
    }

    if (action === "borrowing_base") {
      return handleBorrowingBase();
    }

    if (action === "coverage") {
      return handleCoverage();
    }

    if (action === "annual_overview") {
      return handleAnnualOverview();
    }

    if (action === "overview") {
      return handleOverview();
    }

    if (action === "pl_summary") {
      const limit = parseInt(url.searchParams.get("months") ?? "6", 10);
      const cap = Math.min(Math.max(limit, 1), 24);
      const result = await sql`
        SELECT period_end_date, total_income, total_cost_of_sales,
               gross_margin, total_expenses, net_income
        FROM income_statement_snapshots
        WHERE EXTRACT(MONTH FROM period_end_date) != 12
        ORDER BY period_end_date DESC
        LIMIT ${cap}
      `;
      return new Response(
        JSON.stringify({ snapshots: result.rows }),
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // Default: return list of available months across all report types
    return handleMonths();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[financials] Error:", message);
    return new Response(JSON.stringify({ error: message, code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

async function handleMonths(): Promise<Response> {
  // Get all unique month/year combinations across all report types
  const arDates = await sql`
    SELECT DISTINCT report_date, variant, customer_count, total_amount, imported_at, source_filename
    FROM ar_aging_snapshots ORDER BY report_date DESC
  `;
  const bsDates = await sql`
    SELECT DISTINCT report_date, variant, account_count, total_assets, imported_at, source_filename
    FROM balance_sheet_snapshots ORDER BY report_date DESC
  `;
  const isDates = await sql`
    SELECT DISTINCT period_end_date as report_date, variant, account_count, net_income, imported_at, source_filename
    FROM income_statement_snapshots ORDER BY period_end_date DESC
  `;

  let bbcDates = { rows: [] as Record<string, unknown>[] };
  try {
    bbcDates = await sql`
      SELECT report_date, total_borrowing_base, excess_availability,
        imported_at, source_file AS source_filename,
        CASE
          WHEN report_date IS NULL
            OR (gross_ar IS NULL AND eligible_ar IS NULL AND ar_availability IS NULL)
            THEN false
          WHEN total_borrowing_base IS NOT NULL THEN true
          ELSE false
        END AS validation_passed
      FROM borrowing_base ORDER BY report_date DESC
    `;
  } catch {
    // Table may not exist yet
  }

  return new Response(
    JSON.stringify({
      arAging: arDates.rows,
      balanceSheet: bsDates.rows,
      incomeStatement: isDates.rows,
      borrowingBase: bbcDates.rows,
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

async function handleBorrowingBase(): Promise<Response> {
  const result = await sql`
    SELECT id, report_date, gross_ar, ar_over_90, eligible_ar,
           ar_advance_rate, ar_availability,
           gross_inventory, inventory_advance_rate, inventory_availability,
           total_borrowing_base, amount_borrowed, excess_availability,
           source_file, imported_at
    FROM borrowing_base
    ORDER BY report_date ASC
  `;

  return new Response(
    JSON.stringify({ records: result.rows }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

async function handleSnapshots(url: URL): Promise<Response> {
  const type = url.searchParams.get("type");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (type === "ar_aging") {
    const result = startDate && endDate
      ? await sql`SELECT * FROM ar_aging_snapshots WHERE report_date >= ${startDate} AND report_date <= ${endDate} ORDER BY report_date DESC`
      : await sql`SELECT * FROM ar_aging_snapshots ORDER BY report_date DESC`;
    return new Response(JSON.stringify({ snapshots: result.rows }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  }

  if (type === "balance_sheet") {
    const result = startDate && endDate
      ? await sql`SELECT * FROM balance_sheet_snapshots WHERE report_date >= ${startDate} AND report_date <= ${endDate} ORDER BY report_date DESC`
      : await sql`SELECT * FROM balance_sheet_snapshots ORDER BY report_date DESC`;
    return new Response(JSON.stringify({ snapshots: result.rows }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  }

  if (type === "income_statement") {
    const result = startDate && endDate
      ? await sql`SELECT * FROM income_statement_snapshots WHERE period_end_date >= ${startDate} AND period_end_date <= ${endDate} ORDER BY period_end_date DESC`
      : await sql`SELECT * FROM income_statement_snapshots ORDER BY period_end_date DESC`;
    return new Response(JSON.stringify({ snapshots: result.rows }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  }

  return new Response(
    JSON.stringify({ error: "type parameter required (ar_aging, balance_sheet, income_statement)", code: "BAD_REQUEST" }),
    { status: 400, headers: SECURITY_HEADERS }
  );
}

async function handleDetail(url: URL): Promise<Response> {
  const type = url.searchParams.get("type");
  const snapshotId = url.searchParams.get("snapshotId");
  const reportDate = url.searchParams.get("reportDate");

  if (type === "ar_aging") {
    let snapshot;
    if (snapshotId) {
      snapshot = await sql`SELECT * FROM ar_aging_snapshots WHERE id = ${snapshotId}`;
    } else if (reportDate) {
      snapshot = await sql`SELECT * FROM ar_aging_snapshots WHERE report_date = ${reportDate} ORDER BY imported_at DESC LIMIT 1`;
    } else {
      return new Response(JSON.stringify({ error: "snapshotId or reportDate required", code: "BAD_REQUEST" }), {
        status: 400, headers: SECURITY_HEADERS,
      });
    }
    if (snapshot.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Snapshot not found", code: "BAD_REQUEST" }), {
        status: 404, headers: SECURITY_HEADERS,
      });
    }
    const entries = await sql`
      SELECT * FROM ar_aging_entries WHERE snapshot_id = ${snapshot.rows[0].id}
      ORDER BY customer_name
    `;
    return new Response(JSON.stringify({ snapshot: snapshot.rows[0], entries: entries.rows }), {
      status: 200, headers: SECURITY_HEADERS,
    });
  }

  if (type === "balance_sheet") {
    let snapshot;
    if (snapshotId) {
      snapshot = await sql`SELECT * FROM balance_sheet_snapshots WHERE id = ${snapshotId}`;
    } else if (reportDate) {
      snapshot = await sql`SELECT * FROM balance_sheet_snapshots WHERE report_date = ${reportDate} ORDER BY imported_at DESC LIMIT 1`;
    } else {
      return new Response(JSON.stringify({ error: "snapshotId or reportDate required", code: "BAD_REQUEST" }), {
        status: 400, headers: SECURITY_HEADERS,
      });
    }
    if (snapshot.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Snapshot not found", code: "BAD_REQUEST" }), {
        status: 404, headers: SECURITY_HEADERS,
      });
    }
    const entries = await sql`
      SELECT * FROM balance_sheet_entries WHERE snapshot_id = ${snapshot.rows[0].id}
      ORDER BY line_order
    `;
    return new Response(JSON.stringify({ snapshot: snapshot.rows[0], entries: entries.rows }), {
      status: 200, headers: SECURITY_HEADERS,
    });
  }

  if (type === "income_statement") {
    let snapshot;
    if (snapshotId) {
      snapshot = await sql`SELECT * FROM income_statement_snapshots WHERE id = ${snapshotId}`;
    } else if (reportDate) {
      snapshot = await sql`SELECT * FROM income_statement_snapshots WHERE period_end_date = ${reportDate} ORDER BY imported_at DESC LIMIT 1`;
    } else {
      return new Response(JSON.stringify({ error: "snapshotId or reportDate required", code: "BAD_REQUEST" }), {
        status: 400, headers: SECURITY_HEADERS,
      });
    }
    if (snapshot.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Snapshot not found", code: "BAD_REQUEST" }), {
        status: 404, headers: SECURITY_HEADERS,
      });
    }
    const entries = await sql`
      SELECT * FROM income_statement_entries WHERE snapshot_id = ${snapshot.rows[0].id}
      ORDER BY line_order
    `;
    return new Response(JSON.stringify({ snapshot: snapshot.rows[0], entries: entries.rows }), {
      status: 200, headers: SECURITY_HEADERS,
    });
  }

  return new Response(
    JSON.stringify({ error: "type parameter required (ar_aging, balance_sheet, income_statement)", code: "INTERNAL_ERROR" }),
    { status: 400, headers: SECURITY_HEADERS }
  );
}

async function handleReconciliation(url: URL): Promise<Response> {
  const reportDate = url.searchParams.get("reportDate");
  if (!reportDate) {
    return new Response(
      JSON.stringify({ error: "reportDate parameter required (YYYY-MM-DD)", code: "BAD_REQUEST" }),
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // Fetch the latest snapshot for each report type for the given date
  const arSnap = await sql`
    SELECT * FROM ar_aging_snapshots
    WHERE report_date = ${reportDate}
    ORDER BY imported_at DESC LIMIT 1
  `;
  const bsSnap = await sql`
    SELECT * FROM balance_sheet_snapshots
    WHERE report_date = ${reportDate}
    ORDER BY imported_at DESC LIMIT 1
  `;
  const isSnap = await sql`
    SELECT * FROM income_statement_snapshots
    WHERE period_end_date = ${reportDate}
    ORDER BY imported_at DESC LIMIT 1
  `;

  // Get WIP data for same month (if available)
  const dateParts = reportDate.split("-");
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);

  // Get the WIP totals for this month from the wip_snapshot_totals table
  const wipData = await sql`
    SELECT revenue_excess, billings_excess
    FROM wip_snapshot_totals
    WHERE snapshot_year = ${year} AND snapshot_month = ${month}
    LIMIT 1
  `.catch(() => ({ rows: [] }));

  const ar = arSnap.rows[0] ?? null;
  const bs = bsSnap.rows[0] ?? null;
  const is_ = isSnap.rows[0] ?? null;
  const wip = wipData.rows[0] ?? null;

  const THRESHOLD = 5.0; // $5 match threshold

  interface TieOut {
    description: string;
    sourceA: { name: string; value: number | null };
    sourceB: { name: string; value: number | null };
    variance: number | null;
    status: "match" | "variance" | "missing_data";
  }

  function tieOut(
    desc: string,
    aName: string,
    aVal: number | null,
    bName: string,
    bVal: number | null
  ): TieOut {
    if (aVal === null || aVal === undefined || bVal === null || bVal === undefined) {
      return {
        description: desc,
        sourceA: { name: aName, value: aVal ?? null },
        sourceB: { name: bName, value: bVal ?? null },
        variance: null,
        status: "missing_data",
      };
    }
    const variance = Math.round((aVal - bVal) * 100) / 100;
    return {
      description: desc,
      sourceA: { name: aName, value: aVal },
      sourceB: { name: bName, value: bVal },
      variance,
      status: Math.abs(variance) <= THRESHOLD ? "match" : "variance",
    };
  }

  const tieOuts: TieOut[] = [
    tieOut(
      "AR Balance",
      "AR Aging Total",
      ar ? parseFloat(ar.total_amount) : null,
      "BS 1-1100 (Accounts Receivable)",
      bs ? parseFloat(bs.ar_balance) : null
    ),
    tieOut(
      "AR Retainage",
      "|AR Aging Retainage|",
      ar ? Math.abs(parseFloat(ar.total_retainage)) : null,
      "BS 1-1110 (AR Retainage)",
      bs ? parseFloat(bs.ar_retainage) : null
    ),
    tieOut(
      "Revenue in Excess (CIE)",
      "WIP Revenue in Excess",
      wip ? parseFloat(wip.revenue_excess) : null,
      "BS 1-1500 (Costs in Excess)",
      bs ? parseFloat(bs.costs_in_excess) : null
    ),
    tieOut(
      "Billings in Excess (BIE)",
      "WIP Billings in Excess",
      wip ? Math.abs(parseFloat(wip.billings_excess)) : null,
      "BS 1-2200 (Billings in Excess)",
      bs ? parseFloat(bs.billings_in_excess) : null
    ),
    tieOut(
      "Net Income",
      "IS Net Income",
      is_ ? parseFloat(is_.net_income) : null,
      "BS Net Income",
      bs ? parseFloat(bs.net_income) : null
    ),
  ];

  return new Response(
    JSON.stringify({
      reportDate,
      tieOuts,
      dataSources: {
        arAging: ar ? { date: ar.report_date, filename: ar.source_filename } : null,
        balanceSheet: bs ? { date: bs.report_date, filename: bs.source_filename } : null,
        incomeStatement: is_ ? { date: is_.period_end_date, filename: is_.source_filename } : null,
        wip: wip ? { year, month } : null,
      },
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

async function handleCoverage(): Promise<Response> {
  const [isResult, bsResult, arResult, bbcResult, wipResult] = await Promise.all([
    sql`SELECT to_char(period_end_date, 'YYYY-MM') AS month FROM income_statement_snapshots GROUP BY 1 ORDER BY 1`,
    sql`SELECT to_char(report_date, 'YYYY-MM') AS month FROM balance_sheet_snapshots GROUP BY 1 ORDER BY 1`,
    sql`SELECT to_char(report_date, 'YYYY-MM') AS month FROM ar_aging_snapshots GROUP BY 1 ORDER BY 1`,
    sql`SELECT to_char(report_date, 'YYYY-MM') AS month FROM borrowing_base GROUP BY 1 ORDER BY 1`.catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
    sql`SELECT snapshot_year || '-' || lpad(snapshot_month::text, 2, '0') AS month FROM wip_snapshot_totals GROUP BY 1 ORDER BY 1`.catch(() => ({ rows: [] as Record<string, unknown>[], rowCount: 0 })),
  ]);

  const [isCount, bsCount, arCount, bbcCount, wipCount] = await Promise.all([
    sql`SELECT count(*) AS cnt FROM income_statement_snapshots`,
    sql`SELECT count(*) AS cnt FROM balance_sheet_snapshots`,
    sql`SELECT count(*) AS cnt FROM ar_aging_snapshots`,
    sql`SELECT count(*) AS cnt FROM borrowing_base`.catch(() => ({ rows: [{ cnt: 0 }] })),
    sql`SELECT count(*) AS cnt FROM wip_snapshot_totals`.catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const toMonths = (rows: Record<string, unknown>[]) => rows.map((r) => r.month as string);

  const isMonths = toMonths(isResult.rows);
  const bsMonths = toMonths(bsResult.rows);
  const arMonths = toMonths(arResult.rows);
  const bbcMonths = toMonths(bbcResult.rows);
  const wipMonths = toMonths(wipResult.rows);

  const allMonths = [...new Set([...isMonths, ...bsMonths, ...arMonths, ...bbcMonths, ...wipMonths])].sort();

  const coverage: Record<string, Record<string, boolean>> = {};
  let completeMonths = 0;
  for (const m of allMonths) {
    const c = {
      IS: isMonths.includes(m),
      BS: bsMonths.includes(m),
      AR: arMonths.includes(m),
      BBC: bbcMonths.includes(m),
      WIP: wipMonths.includes(m),
    };
    coverage[m] = c;
    if (c.IS && c.BS && c.AR && c.BBC && c.WIP) completeMonths++;
  }

  return new Response(
    JSON.stringify({
      months: allMonths,
      coverage,
      totals: {
        IS: Number(isCount.rows[0].cnt),
        BS: Number(bsCount.rows[0].cnt),
        AR: Number(arCount.rows[0].cnt),
        BBC: Number(bbcCount.rows[0].cnt),
        WIP: Number(wipCount.rows[0].cnt),
      },
      completeMonths,
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

async function handleAnnualOverview(): Promise<Response> {
  // Year-end income statement snapshots (standard variant) for YoY comparison
  const isResult = await sql`
    SELECT period_end_date, total_income, total_cost_of_sales,
           gross_margin, total_expenses, net_income
    FROM income_statement_snapshots
    WHERE variant = 'standard'
      AND EXTRACT(MONTH FROM period_end_date) = 12
    ORDER BY period_end_date DESC
    LIMIT 2
  `;

  // Year-end balance sheet snapshot (standard variant) with detail entries
  const bsResult = await sql`
    SELECT id, report_date, total_assets, total_liabilities, total_equity, net_income,
           ar_balance, ar_retainage, costs_in_excess, billings_in_excess
    FROM balance_sheet_snapshots
    WHERE variant = 'standard'
      AND EXTRACT(MONTH FROM report_date) = 12
    ORDER BY report_date DESC
    LIMIT 1
  `;

  let bsEntries: Record<string, unknown>[] = [];
  if (bsResult.rows.length > 0) {
    const entriesResult = await sql`
      SELECT account_number, account_name, amount, section, is_subtotal, line_order
      FROM balance_sheet_entries
      WHERE snapshot_id = ${bsResult.rows[0].id}
      ORDER BY line_order
    `;
    bsEntries = entriesResult.rows;
  }

  const bsRow = bsResult.rows[0];
  const bsResponse = bsRow
    ? {
        report_date: bsRow.report_date,
        total_assets: bsRow.total_assets,
        total_liabilities: bsRow.total_liabilities,
        total_equity: bsRow.total_equity,
        net_income: bsRow.net_income,
        ar_balance: bsRow.ar_balance,
        ar_retainage: bsRow.ar_retainage,
        costs_in_excess: bsRow.costs_in_excess,
        billings_in_excess: bsRow.billings_in_excess,
      }
    : null;

  return new Response(
    JSON.stringify({
      currentYear: isResult.rows[0] ?? null,
      priorYear: isResult.rows.length > 1 ? isResult.rows[1] : null,
      balanceSheet: bsResponse,
      balanceSheetEntries: bsEntries,
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}

async function handleOverview(): Promise<Response> {
  const isYearEnd = await sql`
    SELECT period_end_date, total_income, total_cost_of_sales,
           gross_margin, total_expenses, net_income
    FROM income_statement_snapshots
    WHERE variant = 'standard'
      AND EXTRACT(MONTH FROM period_end_date) = 12
    ORDER BY period_end_date DESC
    LIMIT 2
  `;

  const currentIS = isYearEnd.rows[0] ?? null;
  const priorIS = isYearEnd.rows.length > 1 ? isYearEnd.rows[1] : null;

  const revenue = currentIS ? parseFloat(String(currentIS.total_income)) : 0;
  const grossProfit = currentIS ? parseFloat(String(currentIS.gross_margin)) : 0;
  const netIncome = currentIS ? parseFloat(String(currentIS.net_income)) : 0;
  const costOfSales = currentIS ? parseFloat(String(currentIS.total_cost_of_sales)) : 0;
  const currentYear = currentIS
    ? new Date(String(currentIS.period_end_date).split("T")[0] + "T00:00:00").getFullYear()
    : new Date().getFullYear();

  const priorRevenue = priorIS ? parseFloat(String(priorIS.total_income)) : null;
  const priorGrossProfit = priorIS ? parseFloat(String(priorIS.gross_margin)) : null;
  const priorNetIncome = priorIS ? parseFloat(String(priorIS.net_income)) : null;

  const isJanResult = await sql`
    SELECT period_end_date, total_income, total_cost_of_sales,
           gross_margin, total_expenses, net_income
    FROM income_statement_snapshots
    WHERE variant = 'standard'
      AND EXTRACT(MONTH FROM period_end_date) = 1
    ORDER BY period_end_date DESC
    LIMIT 2
  `;
  const ytdCurrent = isJanResult.rows[0] ?? null;
  const ytdPrior = isJanResult.rows.length > 1 ? isJanResult.rows[1] : null;

  const arResult = await sql`
    SELECT report_date, total_amount, total_current, total_over_30,
           total_over_60, total_over_90, total_over_120, total_retainage
    FROM ar_aging_snapshots
    ORDER BY report_date DESC
    LIMIT 1
  `;
  const arRow = arResult.rows[0] ?? null;

  let bbcRow: Record<string, unknown> | null = null;
  try {
    const bbcResult = await sql`
      SELECT report_date, eligible_ar, total_borrowing_base,
             ar_advance_rate, amount_borrowed, excess_availability
      FROM borrowing_base
      ORDER BY report_date DESC
      LIMIT 1
    `;
    bbcRow = bbcResult.rows[0] ?? null;
  } catch {
    // Table may not exist yet
  }

  const trendResult = await sql`
    SELECT period_end_date, total_income, net_income
    FROM income_statement_snapshots
    WHERE variant = 'standard'
      AND EXTRACT(MONTH FROM period_end_date) != 12
    ORDER BY period_end_date ASC
  `;

  const reconResult = await sql`
    SELECT a.report_date,
           ABS(CAST(a.total_amount AS NUMERIC) - CAST(b.ar_balance AS NUMERIC)) AS variance
    FROM ar_aging_snapshots a
    JOIN balance_sheet_snapshots b ON a.report_date = b.report_date
    ORDER BY a.report_date DESC
  `;
  const reconRows = reconResult.rows;
  const reconMatches = reconRows.filter((r) => parseFloat(String(r.variance)) <= 5).length;
  const reconTotal = reconRows.length;
  const reconLatest = reconRows.length > 0 ? String(reconRows[0].report_date) : null;

  const [latestIS, latestBS, latestAR, latestBBC, latestWIP] = await Promise.all([
    sql`SELECT MAX(period_end_date) AS d FROM income_statement_snapshots`.then((r) => r.rows[0]?.d ?? null),
    sql`SELECT MAX(report_date) AS d FROM balance_sheet_snapshots`.then((r) => r.rows[0]?.d ?? null),
    sql`SELECT MAX(report_date) AS d FROM ar_aging_snapshots`.then((r) => r.rows[0]?.d ?? null),
    sql`SELECT MAX(report_date) AS d FROM borrowing_base`.then((r) => r.rows[0]?.d ?? null).catch(() => null),
    sql`SELECT MAX(snapshot_year || '-' || lpad(snapshot_month::text, 2, '0')) AS d FROM wip_snapshot_totals`.then((r) => r.rows[0]?.d ?? null).catch(() => null),
  ]);

  const monthLabel = (d: unknown) => {
    if (!d) return null;
    const s = String(d);
    const dateOnly = s.includes("T") ? s.split("T")[0] : s;
    const dt = new Date(dateOnly + "T00:00:00");
    if (isNaN(dt.getTime())) return s;
    return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  void costOfSales;

  return new Response(
    JSON.stringify({
      annual: currentIS ? {
        year: currentYear,
        revenue,
        costOfSales,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netIncome,
        netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
        priorYear: priorIS ? { revenue: priorRevenue, grossProfit: priorGrossProfit, netIncome: priorNetIncome } : null,
      } : null,
      ytd: ytdCurrent ? {
        year: new Date(String(ytdCurrent.period_end_date).split("T")[0] + "T00:00:00").getFullYear(),
        month: new Date(String(ytdCurrent.period_end_date).split("T")[0] + "T00:00:00").toLocaleDateString("en-US", { month: "long" }),
        revenue: parseFloat(String(ytdCurrent.total_income)),
        grossProfit: parseFloat(String(ytdCurrent.gross_margin)),
        netIncome: parseFloat(String(ytdCurrent.net_income)),
        priorYearSameMonth: ytdPrior ? {
          revenue: parseFloat(String(ytdPrior.total_income)),
          grossProfit: parseFloat(String(ytdPrior.gross_margin)),
          netIncome: parseFloat(String(ytdPrior.net_income)),
        } : null,
      } : null,
      arAging: arRow ? {
        date: String(arRow.report_date),
        totalAR: parseFloat(String(arRow.total_amount)),
        current: parseFloat(String(arRow.total_current)),
        days30: parseFloat(String(arRow.total_over_30)),
        days60: parseFloat(String(arRow.total_over_60)),
        days90: parseFloat(String(arRow.total_over_90)),
        days90Plus: parseFloat(String(arRow.total_over_90)) + parseFloat(String(arRow.total_over_120)),
        retainage: parseFloat(String(arRow.total_retainage)),
      } : null,
      borrowingBase: bbcRow ? {
        date: String(bbcRow.report_date),
        eligibleAR: parseFloat(String(bbcRow.eligible_ar)),
        totalBase: parseFloat(String(bbcRow.total_borrowing_base)),
        advanceRate: parseFloat(String(bbcRow.ar_advance_rate)) * 100,
        amountBorrowed: parseFloat(String(bbcRow.amount_borrowed ?? "0")),
        excessAvailability: parseFloat(String(bbcRow.excess_availability ?? "0")),
      } : null,
      revenueTrend: trendResult.rows.map((r) => {
        const d = String(r.period_end_date).split("T")[0];
        const dt = new Date(d + "T00:00:00");
        return {
          month: dt.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          revenue: parseFloat(String(r.total_income)),
          netIncome: parseFloat(String(r.net_income)),
        };
      }),
      reconciliation: { matches: reconMatches, total: reconTotal, latestDate: reconLatest },
      dataFreshness: {
        latestIS: monthLabel(latestIS),
        latestBS: monthLabel(latestBS),
        latestAR: monthLabel(latestAR),
        latestBBC: monthLabel(latestBBC),
        latestWIP: monthLabel(latestWIP),
      },
    }),
    { status: 200, headers: SECURITY_HEADERS }
  );
}
