import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import {
  parseArAging,
  parseBalanceSheet,
  parseIncomeStatement,
  detectReportType,
} from "../../../lib/financial-parsers";
import type {
  ArAgingResult,
  BalanceSheetResult,
  IncomeStatementResult,
  ReportType,
} from "../../../lib/financial-parsers";
import { parseBorrowingBase, isBorrowingBase } from "../../../lib/pdf-parsers";
import type { BorrowingBaseResult } from "../../../lib/pdf-parsers";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for large AR reports

function detectVariant(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("post aje")) return "post_ajes";
  if (lower.includes("close out")) return "close_out";
  return "standard";
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function storeArAging(
  result: ArAgingResult,
  filename: string,
  variant: string
): Promise<{ snapshotId: string }> {
  const reportDate = formatDate(result.reportDate);
  const generatedDate = formatDate(result.generatedDate);

  // Idempotent: delete existing snapshot for same date + variant
  await sql`
    DELETE FROM ar_aging_snapshots
    WHERE report_date = ${reportDate} AND COALESCE(variant, 'standard') = ${variant}
  `;

  const snapshot = await sql`
    INSERT INTO ar_aging_snapshots (
      report_date, generated_date, source_filename, variant,
      total_amount, total_current, total_over_30, total_over_60,
      total_over_90, total_over_120, total_retainage, customer_count
    ) VALUES (
      ${reportDate}, ${generatedDate}, ${filename}, ${variant},
      ${result.totals.total}, ${result.totals.current}, ${result.totals.over30},
      ${result.totals.over60}, ${result.totals.over90}, ${result.totals.over120},
      ${result.totals.retainage}, ${result.customers.length}
    ) RETURNING id
  `;

  const snapshotId = snapshot.rows[0].id as string;

  for (const c of result.customers) {
    await sql`
      INSERT INTO ar_aging_entries (
        snapshot_id, customer_name, customer_code, customer_phone,
        total_amount, current_amount, over_30, over_60, over_90, over_120, retainage
      ) VALUES (
        ${snapshotId}, ${c.name}, ${c.code}, ${c.phone},
        ${c.total}, ${c.current}, ${c.over30}, ${c.over60},
        ${c.over90}, ${c.over120}, ${c.retainage}
      )
    `;
  }

  return { snapshotId };
}

async function storeBalanceSheet(
  result: BalanceSheetResult,
  filename: string,
  variant: string
): Promise<{ snapshotId: string }> {
  const reportDate = formatDate(result.reportDate);

  await sql`
    DELETE FROM balance_sheet_snapshots
    WHERE report_date = ${reportDate} AND COALESCE(variant, 'standard') = ${variant}
  `;

  const accountCount = result.entries.filter((e) => !e.isSubtotal).length;

  const snapshot = await sql`
    INSERT INTO balance_sheet_snapshots (
      report_date, source_filename, variant,
      total_assets, total_liabilities, total_equity, net_income,
      ar_balance, ar_retainage, costs_in_excess, billings_in_excess,
      account_count
    ) VALUES (
      ${reportDate}, ${filename}, ${variant},
      ${result.totals.totalAssets}, ${result.totals.totalLiabilities},
      ${result.totals.totalEquity}, ${result.totals.netIncome},
      ${result.reconciliationAccounts.ar}, ${result.reconciliationAccounts.arRetainage},
      ${result.reconciliationAccounts.costsInExcess}, ${result.reconciliationAccounts.billingsInExcess},
      ${accountCount}
    ) RETURNING id
  `;

  const snapshotId = snapshot.rows[0].id as string;

  for (const e of result.entries) {
    await sql`
      INSERT INTO balance_sheet_entries (
        snapshot_id, account_number, account_name, amount,
        section, is_subtotal, line_order
      ) VALUES (
        ${snapshotId}, ${e.accountNumber}, ${e.accountName}, ${e.amount},
        ${e.section}, ${e.isSubtotal}, ${e.lineOrder}
      )
    `;
  }

  return { snapshotId };
}

async function storeIncomeStatement(
  result: IncomeStatementResult,
  filename: string,
  variant: string
): Promise<{ snapshotId: string }> {
  const periodEndDate = formatDate(result.periodEndDate);

  await sql`
    DELETE FROM income_statement_snapshots
    WHERE period_end_date = ${periodEndDate} AND COALESCE(variant, 'standard') = ${variant}
  `;

  const accountCount = result.entries.filter((e) => !e.isSubtotal).length;

  const snapshot = await sql`
    INSERT INTO income_statement_snapshots (
      period_end_date, source_filename, variant,
      total_income, total_cost_of_sales, gross_margin,
      total_expenses, net_income, account_count
    ) VALUES (
      ${periodEndDate}, ${filename}, ${variant},
      ${result.totals.totalIncome.balance}, ${result.totals.totalCostOfSales.balance},
      ${result.totals.grossMargin.balance}, ${result.totals.totalExpenses.balance},
      ${result.totals.netIncome.balance}, ${accountCount}
    ) RETURNING id
  `;

  const snapshotId = snapshot.rows[0].id as string;

  for (const e of result.entries) {
    await sql`
      INSERT INTO income_statement_entries (
        snapshot_id, account_number, account_name,
        current_activity, current_balance,
        section, is_subtotal, line_order
      ) VALUES (
        ${snapshotId}, ${e.accountNumber}, ${e.accountName},
        ${e.currentActivity}, ${e.currentBalance},
        ${e.section}, ${e.isSubtotal}, ${e.lineOrder}
      )
    `;
  }

  return { snapshotId };
}

async function storeBorrowingBase(
  result: BorrowingBaseResult,
  filename: string
): Promise<{ recordId: string }> {
  const reportDate = result.reportDate;

  // Idempotent: delete existing record for same date
  await sql`DELETE FROM borrowing_base WHERE report_date = ${reportDate}`;

  const record = await sql`
    INSERT INTO borrowing_base (
      report_date, gross_ar, ar_over_90, eligible_ar,
      ar_advance_rate, ar_availability,
      gross_inventory, inventory_advance_rate, inventory_availability,
      total_borrowing_base, amount_borrowed, excess_availability,
      raw_data, source_file
    ) VALUES (
      ${reportDate}, ${result.grossAr}, ${result.arOver90}, ${result.eligibleAr},
      ${result.arAdvanceRate}, ${result.arAvailability},
      ${result.grossInventory}, ${result.inventoryAdvanceRate}, ${result.inventoryAvailability},
      ${result.totalBorrowingBase}, ${result.amountBorrowed}, ${result.excessAvailability},
      ${JSON.stringify(result.validation)}, ${filename}
    ) RETURNING id
  `;

  return { recordId: record.rows[0].id as string };
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...SECURITY_HEADERS, "WWW-Authenticate": 'Bearer realm="admin"' },
    });
  }

  const env = getPostgresEnv();
  if (!env) {
    return new Response(JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const reportTypeParam = formData.get("reportType") as string | null;
    const variantParam = formData.get("variant") as string | null;

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No file provided. Use multipart/form-data with a 'file' field.", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 50MB.`, code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const filename = file.name;
    const reportType = (reportTypeParam as ReportType) ?? detectReportType(filename);

    if (!reportType) {
      return new Response(
        JSON.stringify({
          error: `Could not detect report type from filename "${filename, code: "BAD_REQUEST"}". Specify reportType parameter (ar_aging, balance_sheet, income_statement, borrowing_base).`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const variant = variantParam ?? detectVariant(filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    let result: { snapshotId: string; summary: Record<string, unknown> };

    if (reportType === "ar_aging") {
      const parsed = await parseArAging(buffer);
      const { snapshotId } = await storeArAging(parsed, filename, variant);
      result = {
        snapshotId,
        summary: {
          reportType: "ar_aging",
          reportDate: formatDate(parsed.reportDate),
          customerCount: parsed.customers.length,
          total: parsed.totals.total,
          retainage: parsed.totals.retainage,
          validation: parsed.validation,
        },
      };
    } else if (reportType === "balance_sheet") {
      const parsed = await parseBalanceSheet(buffer);
      const { snapshotId } = await storeBalanceSheet(parsed, filename, variant);
      result = {
        snapshotId,
        summary: {
          reportType: "balance_sheet",
          reportDate: formatDate(parsed.reportDate),
          accountCount: parsed.entries.filter((e) => !e.isSubtotal).length,
          totalAssets: parsed.totals.totalAssets,
          totalLiabilitiesAndEquity: parsed.totals.totalLiabilitiesAndEquity,
          validation: parsed.validation,
          reconciliationAccounts: parsed.reconciliationAccounts,
        },
      };
    } else if (reportType === "income_statement") {
      const parsed = await parseIncomeStatement(buffer);
      const { snapshotId } = await storeIncomeStatement(parsed, filename, variant);
      result = {
        snapshotId,
        summary: {
          reportType: "income_statement",
          periodEndDate: formatDate(parsed.periodEndDate),
          accountCount: parsed.entries.filter((e) => !e.isSubtotal).length,
          totals: parsed.totals,
          validation: parsed.validation,
        },
      };
    } else if (reportType === "borrowing_base") {
      const parsed = await parseBorrowingBase(buffer);
      const { recordId } = await storeBorrowingBase(parsed, filename);
      result = {
        snapshotId: recordId,
        summary: {
          reportType: "borrowing_base",
          reportDate: parsed.reportDate,
          totalBorrowingBase: parsed.totalBorrowingBase,
          amountBorrowed: parsed.amountBorrowed,
          excessAvailability: parsed.excessAvailability,
          validation: parsed.validation,
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: `Invalid report type: ${reportType}`, code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[financial-upload] Error:", message);
    return new Response(
      JSON.stringify({ error: `Parse/import failed: ${message}`, code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
