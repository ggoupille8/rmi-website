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

    if (action === "pl_summary") {
      const limit = parseInt(url.searchParams.get("months") ?? "6", 10);
      const cap = Math.min(Math.max(limit, 1), 24);
      const result = await sql`
        SELECT period_end_date, total_income, total_cost_of_sales,
               gross_margin, total_expenses, net_income
        FROM income_statement_snapshots
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
      SELECT report_date, total_borrowing_base, excess_availability, imported_at, source_file as source_filename
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
