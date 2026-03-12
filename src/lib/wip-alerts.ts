import type { WipSnapshot } from "@components/admin/WipJobTable";

// ── Types ──────────────────────────────────────────────

export interface AlertFlag {
  type: "negative-profit" | "over-run" | "under-billed" | "over-billed";
  severity: "red" | "yellow";
  job_number: string;
  description: string | null;
  project_manager: string | null;
  metric_label: string;
  metric_value: number;
}

// ── Alert Computation ──────────────────────────────────

export function computeWipAlerts(jobs: WipSnapshot[]): AlertFlag[] {
  const flags: AlertFlag[] = [];
  if (!jobs) return flags;

  for (const job of jobs) {
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

    // Over-billed: exceeds 5% of revised contract AND dollar amount > $5K
    if (
      job.revenue_excess !== null &&
      job.revenue_excess > 5_000 &&
      job.revised_contract !== null &&
      job.revised_contract > 0 &&
      job.revenue_excess / job.revised_contract > 0.05
    ) {
      flags.push({
        type: "over-billed",
        severity: job.revenue_excess > 20_000 ? "red" : "yellow",
        job_number: job.job_number,
        description: job.description,
        project_manager: job.project_manager,
        metric_label: "Revenue Excess",
        metric_value: job.revenue_excess,
      });
    }
  }

  // Sort: RED first, then by absolute dollar amount descending
  flags.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "red" ? -1 : 1;
    }
    return Math.abs(b.metric_value) - Math.abs(a.metric_value);
  });

  return flags;
}

/** Stable key for dismissing an alert — includes metric_value so it reappears if numbers change */
export function alertDismissKey(alert: AlertFlag): string {
  return `${alert.job_number}:${alert.type}:${Math.round(alert.metric_value)}`;
}
