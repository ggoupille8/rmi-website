import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { parseWipExcel } from "../../../lib/wip-parser";
import type { WipSnapshot, WipSnapshotTotal } from "../../../lib/wip-parser";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB — WIP files can be large

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls"]);

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
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
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No file provided. Use multipart/form-data with a 'file' field.", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate extension
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed: .xlsx, .xls`, code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1), code: "BAD_REQUEST"}MB. Maximum: 50MB.`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parseResult = parseWipExcel(buffer, file.name);

    if (parseResult.snapshots.length === 0 && parseResult.errors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse any job data from the file",
          parseErrors: parseResult.errors,
          code: "BAD_REQUEST",
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Upsert snapshots
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const upsertErrors: string[] = [];

    for (const snap of parseResult.snapshots) {
      try {
        const result = await upsertSnapshot(snap, file.name);
        if (result === "created") created++;
        else if (result === "updated") updated++;
        else unchanged++;
      } catch (err) {
        const msg = `Job ${snap.jobNumber} (${snap.sourceTab} row ${snap.sourceRow}): ${err instanceof Error ? err.message : "Unknown error"}`;
        upsertErrors.push(msg);
      }
    }

    // Upsert totals
    let totalsUpserted = 0;
    for (const total of parseResult.totals) {
      try {
        await upsertTotal(total);
        totalsUpserted++;
      } catch (err) {
        const msg = `Totals ${total.snapshotYear}-${total.snapshotMonth}: ${err instanceof Error ? err.message : "Unknown error"}`;
        upsertErrors.push(msg);
      }
    }

    const durationMs = Date.now() - startTime;
    const allErrors = [...parseResult.errors, ...upsertErrors];

    // Log to sync_log
    await sql`
      INSERT INTO sync_log (sync_type, source_file, jobs_total, jobs_created, jobs_updated, jobs_unchanged, errors, duration_ms, status)
      VALUES (
        'wip-upload',
        ${file.name},
        ${parseResult.snapshots.length},
        ${created},
        ${updated},
        ${unchanged},
        ${allErrors.length > 0 ? JSON.stringify(allErrors) : null},
        ${durationMs},
        ${upsertErrors.length > 0 ? "partial" : "success"}
      )
    `;

    return new Response(
      JSON.stringify({
        success: true,
        fileName: file.name,
        snapshots: {
          total: parseResult.snapshots.length,
          created,
          updated,
          unchanged,
        },
        totals: {
          months: totalsUpserted,
        },
        errors: allErrors,
        durationMs,
      }),
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error("WIP upload error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: "Upload processing failed", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/**
 * Upsert a single WIP snapshot row.
 * Returns 'created', 'updated', or 'unchanged'.
 */
async function upsertSnapshot(snap: WipSnapshot, sourceFile: string): Promise<"created" | "updated" | "unchanged"> {
  // Check if row exists
  const existing = await sql`
    SELECT id, contract_amount, revised_contract, pct_complete, earned_revenue, costs_to_date
    FROM wip_snapshots
    WHERE snapshot_year = ${snap.snapshotYear}
      AND snapshot_month = ${snap.snapshotMonth}
      AND job_number = ${snap.jobNumber}
  `;

  if (existing.rows.length === 0) {
    // Insert new row
    await sql`
      INSERT INTO wip_snapshots (
        snapshot_date, snapshot_year, snapshot_month, job_number, description,
        project_manager, is_hidden_in_source,
        contract_amount, change_orders, pending_change_orders, revised_contract,
        original_estimate, estimate_changes, pending_co_estimates, revised_estimate,
        gross_profit, gross_margin_pct, pct_complete,
        earned_revenue, costs_to_date, gross_profit_to_date,
        backlog_revenue, costs_to_complete, backlog_profit,
        billings_to_date, revenue_billing_excess, invoicing_remaining,
        revenue_excess, billings_excess,
        source_file, source_tab, source_row
      ) VALUES (
        ${snap.snapshotDate.toISOString().split("T")[0]},
        ${snap.snapshotYear}, ${snap.snapshotMonth}, ${snap.jobNumber}, ${snap.description},
        ${snap.projectManager}, ${snap.isHiddenInSource},
        ${snap.contractAmount}, ${snap.changeOrders}, ${snap.pendingChangeOrders}, ${snap.revisedContract},
        ${snap.originalEstimate}, ${snap.estimateChanges}, ${snap.pendingCoEstimates}, ${snap.revisedEstimate},
        ${snap.grossProfit}, ${snap.grossMarginPct}, ${snap.pctComplete},
        ${snap.earnedRevenue}, ${snap.costsToDate}, ${snap.grossProfitToDate},
        ${snap.backlogRevenue}, ${snap.costsToComplete}, ${snap.backlogProfit},
        ${snap.billingsToDate}, ${snap.revenueBillingExcess}, ${snap.invoicingRemaining},
        ${snap.revenueExcess}, ${snap.billingsExcess},
        ${sourceFile}, ${snap.sourceTab}, ${snap.sourceRow}
      )
    `;
    return "created";
  }

  // Check if data changed (compare key financial fields)
  const row = existing.rows[0];
  const sameData =
    Number(row.contract_amount) === snap.contractAmount &&
    Number(row.revised_contract) === snap.revisedContract &&
    Number(row.pct_complete) === snap.pctComplete &&
    Number(row.earned_revenue) === snap.earnedRevenue &&
    Number(row.costs_to_date) === snap.costsToDate;

  if (sameData) {
    return "unchanged";
  }

  // Update existing row
  await sql`
    UPDATE wip_snapshots SET
      description = ${snap.description},
      project_manager = ${snap.projectManager},
      is_hidden_in_source = ${snap.isHiddenInSource},
      contract_amount = ${snap.contractAmount},
      change_orders = ${snap.changeOrders},
      pending_change_orders = ${snap.pendingChangeOrders},
      revised_contract = ${snap.revisedContract},
      original_estimate = ${snap.originalEstimate},
      estimate_changes = ${snap.estimateChanges},
      pending_co_estimates = ${snap.pendingCoEstimates},
      revised_estimate = ${snap.revisedEstimate},
      gross_profit = ${snap.grossProfit},
      gross_margin_pct = ${snap.grossMarginPct},
      pct_complete = ${snap.pctComplete},
      earned_revenue = ${snap.earnedRevenue},
      costs_to_date = ${snap.costsToDate},
      gross_profit_to_date = ${snap.grossProfitToDate},
      backlog_revenue = ${snap.backlogRevenue},
      costs_to_complete = ${snap.costsToComplete},
      backlog_profit = ${snap.backlogProfit},
      billings_to_date = ${snap.billingsToDate},
      revenue_billing_excess = ${snap.revenueBillingExcess},
      invoicing_remaining = ${snap.invoicingRemaining},
      revenue_excess = ${snap.revenueExcess},
      billings_excess = ${snap.billingsExcess},
      source_file = ${sourceFile},
      source_tab = ${snap.sourceTab},
      source_row = ${snap.sourceRow},
      imported_at = NOW()
    WHERE snapshot_year = ${snap.snapshotYear}
      AND snapshot_month = ${snap.snapshotMonth}
      AND job_number = ${snap.jobNumber}
  `;
  return "updated";
}

/**
 * Upsert a WIP snapshot totals row.
 */
async function upsertTotal(total: WipSnapshotTotal): Promise<void> {
  await sql`
    INSERT INTO wip_snapshot_totals (
      snapshot_year, snapshot_month,
      contract_amount, change_orders, pending_change_orders, revised_contract,
      original_estimate, estimate_changes, revised_estimate,
      gross_profit, earned_revenue, costs_to_date, gross_profit_to_date,
      backlog_revenue, costs_to_complete, backlog_profit,
      billings_to_date, revenue_billing_excess, invoicing_remaining,
      revenue_excess, billings_excess, job_count
    ) VALUES (
      ${total.snapshotYear}, ${total.snapshotMonth},
      ${total.contractAmount}, ${total.changeOrders}, ${total.pendingChangeOrders}, ${total.revisedContract},
      ${total.originalEstimate}, ${total.estimateChanges}, ${total.revisedEstimate},
      ${total.grossProfit}, ${total.earnedRevenue}, ${total.costsToDate}, ${total.grossProfitToDate},
      ${total.backlogRevenue}, ${total.costsToComplete}, ${total.backlogProfit},
      ${total.billingsToDate}, ${total.revenueBillingExcess}, ${total.invoicingRemaining},
      ${total.revenueExcess}, ${total.billingsExcess}, ${total.jobCount}
    )
    ON CONFLICT (snapshot_year, snapshot_month) DO UPDATE SET
      contract_amount = EXCLUDED.contract_amount,
      change_orders = EXCLUDED.change_orders,
      pending_change_orders = EXCLUDED.pending_change_orders,
      revised_contract = EXCLUDED.revised_contract,
      original_estimate = EXCLUDED.original_estimate,
      estimate_changes = EXCLUDED.estimate_changes,
      revised_estimate = EXCLUDED.revised_estimate,
      gross_profit = EXCLUDED.gross_profit,
      earned_revenue = EXCLUDED.earned_revenue,
      costs_to_date = EXCLUDED.costs_to_date,
      gross_profit_to_date = EXCLUDED.gross_profit_to_date,
      backlog_revenue = EXCLUDED.backlog_revenue,
      costs_to_complete = EXCLUDED.costs_to_complete,
      backlog_profit = EXCLUDED.backlog_profit,
      billings_to_date = EXCLUDED.billings_to_date,
      revenue_billing_excess = EXCLUDED.revenue_billing_excess,
      invoicing_remaining = EXCLUDED.invoicing_remaining,
      revenue_excess = EXCLUDED.revenue_excess,
      billings_excess = EXCLUDED.billings_excess,
      job_count = EXCLUDED.job_count,
      imported_at = NOW()
  `;
}
