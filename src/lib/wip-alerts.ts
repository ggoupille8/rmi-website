import type { WipSnapshot } from "@components/admin/WipJobTable";

// ── Types ──────────────────────────────────────────────

export interface AlertFlag {
  type: "negative-profit" | "over-run" | "under-billed" | "over-billed";
  severity: "red" | "orange" | "yellow";
  job_number: string;
  description: string | null;
  project_manager: string | null;
  metric_label: string;
  metric_value: number;
  /** Over-billed only: revised contract amount */
  contract_amount?: number;
  /** Over-billed only: earned revenue amount */
  earned_amount?: number;
  /** Over-billed only: percentage over contract (e.g. 67 means 67% over) */
  pct_over?: number;
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

export function computeWipAlerts(jobs: WipSnapshot[]): AlertFlag[] {
  const flags: AlertFlag[] = [];
  if (!jobs) return flags;

  // Filter out GLI fab shop jobs — different billing pattern, always looks over-billed
  const alertableJobs = jobs.filter((j) => !isGliJob(j));

  for (const job of alertableJobs) {
    // Negative gross profit — only for active (not 100% complete) jobs
    if (
      job.gross_profit !== null &&
      job.gross_profit < 0 &&
      (job.pct_complete === null || job.pct_complete < 1.0)
    ) {
      flags.push({
        type: "negative-profit",
        severity: Math.abs(job.gross_profit) > 50_000 ? "red" : "yellow",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        metric_label: "Gross Profit",
        metric_value: job.gross_profit,
      });
    }

    // Over-run: >100% complete with negative backlog
    if (
      job.pct_complete !== null &&
      job.pct_complete > 1.0 &&
      job.backlog_revenue !== null &&
      job.backlog_revenue < 0
    ) {
      flags.push({
        type: "over-run",
        severity: "yellow",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        metric_label: "Backlog",
        metric_value: job.backlog_revenue,
      });
    }

    // Under-billed by >$10K
    if (job.billings_excess !== null && job.billings_excess < -10_000) {
      flags.push({
        type: "under-billed",
        severity: "yellow",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        metric_label: "Billings Excess",
        metric_value: job.billings_excess,
      });
    }

    // Over-billed: earned revenue exceeds revised contract by >10%
    if (
      job.revenue_excess !== null &&
      job.revenue_excess > 5_000 &&
      job.revised_contract !== null &&
      job.revised_contract > 0 &&
      job.revenue_excess / job.revised_contract > 0.10
    ) {
      const pctOver = (job.revenue_excess / job.revised_contract) * 100;
      flags.push({
        type: "over-billed",
        severity: pctOver >= 50 ? "red" : "orange",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        metric_label: "Revenue Excess",
        metric_value: job.revenue_excess,
        contract_amount: job.revised_contract,
        earned_amount: job.earned_revenue ?? undefined,
        pct_over: Math.round(pctOver),
      });
    }
  }

  // Sort: RED first, then orange, then yellow — within severity by absolute dollar amount descending
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
  return `${alert.job_number}:${alert.type}:${Math.round(alert.metric_value)}`;
}
