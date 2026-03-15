/**
 * WIP Alert Engine — Construction Industry Logic
 *
 * RMI uses the percentage-of-completion (WIP) method. Key principles:
 * - Over-billing (billing ahead of completion) is NORMAL and good cash management
 * - Under-billing (completing work without invoicing) is a cash flow risk
 * - GLI (Great Lakes Insulation Supply) always appears over-billed by design — excluded
 * - "Bill and ship" jobs (0% complete, positive profit) are done — excluded
 * - Negative margin on small jobs (<$5K) is noise — excluded
 *
 * Alert severities:
 * - RED: Requires immediate attention (cost overruns, unbilled completed work, real losses)
 * - ORANGE: Worth monitoring (thin margins, moderate over-billing)
 * - YELLOW: Informational (cash flow timing, stale jobs)
 */

import type { WipSnapshot } from "@components/admin/WipJobTable";

// ── Types ──────────────────────────────────────────────

export interface AlertFlag {
  category: "over-billed" | "under-billed" | "negative-margin" | "stale";
  severity: "red" | "orange" | "yellow";
  job_number: string;
  description: string | null;
  project_manager: string | null;
  reason: string;
  metric: {
    key: string;
    value: number;
    threshold: number;
  };
  // Legacy fields retained for WipDashboard / WipJobTable rendering
  metric_label: string;
  metric_value: number;
  contract_amount?: number;
  earned_amount?: number;
  pct_over?: number;
}

// ── Dollar Formatter (for reason strings) ───────────────

function fmtDollar(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString("en-US");
}

// ── GLI Detection ────────────────────────────────────────
// GLI (Great Lakes Insulation / Fab Shop) jobs invoice on material shipment
// while WIP % complete tracks the overall contract, making them always appear
// "over-billed". Exclude them from alerts entirely.

export function isGliJob(job: WipSnapshot): boolean {
  if (job.job_number.endsWith("-0215")) return true;
  if (job.description?.toLowerCase().includes("great lakes insulation")) return true;
  return false;
}

// ── Alert Computation ──────────────────────────────────

export function computeWipAlerts(
  jobs: WipSnapshot[],
  priorSnapshots?: WipSnapshot[][],
): AlertFlag[] {
  const flags: AlertFlag[] = [];
  if (!jobs) return flags;

  for (const job of jobs) {
    checkOverBilled(job, flags);
    checkUnderBilled(job, flags);
    checkNegativeMargin(job, flags);

    if (priorSnapshots && priorSnapshots.length >= 3) {
      checkStale(job, priorSnapshots, flags);
    }
  }

  // Sort: RED first, then orange, then yellow — within severity by absolute dollar amount
  const severityOrder: Record<string, number> = { red: 0, orange: 1, yellow: 2 };
  flags.sort((a, b) => {
    const aOrder = severityOrder[a.severity] ?? 9;
    const bOrder = severityOrder[b.severity] ?? 9;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return Math.abs(b.metric_value) - Math.abs(a.metric_value);
  });

  return flags;
}

/** Stable key for dismissing an alert — includes metric_value so it reappears if numbers change */
export function alertDismissKey(alert: AlertFlag): string {
  return `${alert.job_number}:${alert.category}:${Math.round(alert.metric_value)}`;
}

// ── Over-Billing Check ──────────────────────────────────
// Over-billing = earned revenue exceeds revised contract.
// This is NORMAL for WIP contractors — only alert on actual problems.

function checkOverBilled(job: WipSnapshot, flags: AlertFlag[]): void {
  // GLI jobs always appear over-billed — never alert
  if (isGliJob(job)) return;

  // Need revenue_excess and revised_contract to evaluate
  if (
    job.revenue_excess === null ||
    job.revised_contract === null ||
    job.revised_contract <= 0
  ) return;

  // Not actually over-billed
  if (job.revenue_excess <= 0) return;

  const pctOver = (job.revenue_excess / job.revised_contract) * 100;

  // Only flag if over-billed >10%
  if (pctOver <= 10) return;

  // Bill-and-ship: 0% complete AND positive gross profit → SKIP
  // Made money, WIP not updated. Not a problem.
  if (
    (job.pct_complete === null || job.pct_complete === 0) &&
    job.gross_profit !== null &&
    job.gross_profit > 0
  ) {
    return;
  }

  // Calculate gross margin
  const margin =
    job.gross_profit !== null && job.revised_contract > 0
      ? (job.gross_profit / job.revised_contract) * 100
      : 0;

  // Profitable job (margin >20%) → SKIP (just needs contract revision on next WIP)
  if (margin > 20) return;

  // Margin 5%-20% → ORANGE (worth watching, might need a change order)
  if (margin >= 5) {
    flags.push({
      category: "over-billed",
      severity: "orange",
      job_number: job.job_number,
      description: job.description,
      project_manager: job.project_manager,
      reason: `Over-billed by $${fmtDollar(job.revenue_excess)} but margin is ${margin.toFixed(1)}% — likely needs contract revision`,
      metric: { key: "pctOver", value: pctOver, threshold: 10 },
      metric_label: "Revenue Excess",
      metric_value: job.revenue_excess,
      contract_amount: job.revised_contract,
      earned_amount: job.earned_revenue ?? undefined,
      pct_over: Math.round(pctOver),
    });
    return;
  }

  // Margin <5% or negative → RED (real cost overrun)
  flags.push({
    category: "over-billed",
    severity: "red",
    job_number: job.job_number,
    description: job.description,
    project_manager: job.project_manager,
    reason: `Over-billed by $${fmtDollar(job.revenue_excess)} with only ${margin.toFixed(1)}% margin — potential cost overrun, review change orders`,
    metric: { key: "pctOver", value: pctOver, threshold: 10 },
    metric_label: "Revenue Excess",
    metric_value: job.revenue_excess,
    contract_amount: job.revised_contract,
    earned_amount: job.earned_revenue ?? undefined,
    pct_over: Math.round(pctOver),
  });
}

// ── Under-Billing Check ─────────────────────────────────
// Under-billing = work done but not invoiced. Cash flow risk.

function checkUnderBilled(job: WipSnapshot, flags: AlertFlag[]): void {
  if (
    job.pct_complete === null ||
    job.revised_contract === null ||
    job.revised_contract <= 0 ||
    job.billings_to_date === null
  ) return;

  // 100% complete with >$10K unbilled → RED (revenue at risk)
  if (job.pct_complete >= 1.0) {
    const unbilled = job.revised_contract - job.billings_to_date;
    if (unbilled > 10_000) {
      flags.push({
        category: "under-billed",
        severity: "red",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        reason: `Job complete with $${fmtDollar(unbilled)} unbilled — invoice immediately`,
        metric: { key: "unbilled", value: unbilled, threshold: 10_000 },
        metric_label: "Unbilled Amount",
        metric_value: -unbilled,
      });
    }
    return; // Don't double-flag a completed job
  }

  // >75% complete but billed <50% of contract → YELLOW (cash flow risk)
  if (job.pct_complete > 0.75) {
    const pctBilled = job.billings_to_date / job.revised_contract;
    if (pctBilled < 0.50) {
      const pctComplete = Math.round(job.pct_complete * 100);
      const pctBilledRound = Math.round(pctBilled * 100);
      flags.push({
        category: "under-billed",
        severity: "yellow",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        reason: `Job is ${pctComplete}% complete but only ${pctBilledRound}% billed — send invoices`,
        metric: { key: "pctBilled", value: pctBilled * 100, threshold: 50 },
        metric_label: "Billings Deficit",
        metric_value: job.billings_to_date - job.revised_contract * job.pct_complete,
      });
    }
  }
}

// ── Negative Margin Check ───────────────────────────────
// Real losses on significant jobs.
// Note: -02XX and -03XX job suffixes are typically T&M (time & material) jobs.

function checkNegativeMargin(job: WipSnapshot, flags: AlertFlag[]): void {
  if (job.gross_profit === null || job.revised_contract === null) return;

  const margin =
    job.revised_contract > 0
      ? (job.gross_profit / job.revised_contract) * 100
      : 0;

  // Negative gross profit on small jobs (<=$5K) → SKIP (noise)
  if (job.gross_profit < 0 && job.revised_contract <= 5_000) return;

  // Negative gross profit on jobs >$5K
  if (job.gross_profit < 0 && job.revised_contract > 5_000) {
    // Tiny losses (>= -$2K) are noise — ORANGE, not RED
    // Early-stage jobs (<25% complete) have front-loaded costs — ORANGE, not RED
    // Only flag RED when loss > $2K AND (pct_complete >= 25% OR job is 100% complete)
    const isSmallLoss = job.gross_profit >= -2_000;
    const isEarlyStage =
      job.pct_complete !== null &&
      job.pct_complete < 0.25 &&
      job.pct_complete < 1.0;

    if (isSmallLoss || isEarlyStage) {
      flags.push({
        category: "negative-margin",
        severity: "orange",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        reason: isEarlyStage
          ? `Negative margin (${margin.toFixed(1)}%) at ${Math.round((job.pct_complete ?? 0) * 100)}% complete — early-stage, monitor costs`
          : `Negative margin (${margin.toFixed(1)}%) but loss only $${fmtDollar(job.gross_profit)} — monitor`,
        metric: { key: "margin", value: margin, threshold: 0 },
        metric_label: "Gross Profit",
        metric_value: job.gross_profit,
      });
    } else {
      flags.push({
        category: "negative-margin",
        severity: "red",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        reason: `Negative margin (${margin.toFixed(1)}%) on $${fmtDollar(job.revised_contract)} job — cost overrun`,
        metric: { key: "margin", value: margin, threshold: 0 },
        metric_label: "Gross Profit",
        metric_value: job.gross_profit,
      });
    }
    return;
  }

  // Margin <5% on jobs >$25K → ORANGE (trending toward a loss)
  if (margin < 5 && margin >= 0 && job.revised_contract > 25_000) {
    flags.push({
      category: "negative-margin",
      severity: "orange",
      job_number: job.job_number,
      description: job.description,
      project_manager: job.project_manager,
      reason: `Only ${margin.toFixed(1)}% margin on $${fmtDollar(job.revised_contract)} job — monitor costs`,
      metric: { key: "margin", value: margin, threshold: 5 },
      metric_label: "Gross Profit",
      metric_value: job.gross_profit,
    });
  }
}

// ── Stale Job Check ─────────────────────────────────────
// No progress for 3+ consecutive WIP months — might be abandoned.

function checkStale(
  job: WipSnapshot,
  priorSnapshots: WipSnapshot[][],
  flags: AlertFlag[],
): void {
  // Only check active jobs with meaningful contracts
  if (job.pct_complete === null || job.pct_complete >= 1.0) return;
  if (job.revised_contract === null || job.revised_contract <= 10_000) return;

  // Check if pct_complete hasn't changed for the last 3 consecutive months
  // priorSnapshots[0] = most recent prior month, [1] = month before that, etc.
  let staleMonths = 0;
  for (const monthJobs of priorSnapshots.slice(0, 3)) {
    const priorJob = monthJobs.find((j) => j.job_number === job.job_number);
    if (priorJob && priorJob.pct_complete === job.pct_complete) {
      staleMonths++;
    } else {
      break; // Must be consecutive
    }
  }

  if (staleMonths >= 3) {
    flags.push({
      category: "stale",
      severity: "yellow",
      job_number: job.job_number,
      description: job.description,
      project_manager: job.project_manager,
      reason: `No progress in ${staleMonths} months — verify job status`,
      metric: { key: "staleMonths", value: staleMonths, threshold: 3 },
      metric_label: "Months Stale",
      metric_value: staleMonths,
    });
  }
}
