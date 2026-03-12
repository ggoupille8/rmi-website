import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import WipJobTable, { type WipSnapshot } from "./WipJobTable";

// ── Types ──────────────────────────────────────────────

interface WipMonth {
  year: number;
  month: number;
  job_count: number;
}

interface PmSummary {
  pm_code: string;
  job_count: number;
  total_backlog: number;
  total_earned: number;
  total_profit: number;
  avg_margin: number;
}

interface WipApiResponse {
  jobs: WipSnapshot[];
  totals: {
    revised_contract: number;
    backlog_revenue: number;
    earned_revenue: number;
    gross_profit: number;
    gross_margin_pct: number;
    job_count: number;
  };
  pm_summary: PmSummary[];
}

interface AlertFlag {
  type: "negative-profit" | "over-run" | "under-billed" | "over-billed";
  severity: "critical" | "warning";
  job_number: string;
  description: string | null;
  project_manager: string | null;
  metric_label: string;
  metric_value: number;
}

// ── Constants ──────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GG: { bg: "bg-blue-950/40", text: "text-blue-400", border: "border-blue-800/50" },
  RG: { bg: "bg-emerald-950/40", text: "text-emerald-400", border: "border-emerald-800/50" },
  MD: { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-800/50" },
  SB: { bg: "bg-purple-950/40", text: "text-purple-400", border: "border-purple-800/50" },
};

const PM_NAMES: Record<string, string> = {
  GG: "Graham Goupille",
  RG: "Rich Goupille",
  MD: "Mark Donnal",
  SB: "Scott Brown",
};

// ── Formatters ─────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyCompactFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function fmtCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyFmt.format(val);
}

function fmtCompact(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyCompactFmt.format(val);
}

function fmtPct(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

// ── Component ──────────────────────────────────────────

export default function WipDashboard() {
  const [months, setMonths] = useState<WipMonth[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [jobs, setJobs] = useState<WipSnapshot[]>([]);
  const [totals, setTotals] = useState<WipApiResponse["totals"] | null>(null);
  const [pmSummary, setPmSummary] = useState<PmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // ── Fetch available months ───────────────────────────
  useEffect(() => {
    async function loadMonths() {
      try {
        const res = await fetch("/api/admin/wip-months");
        if (!res.ok) throw new Error(`Failed to load months: ${res.status}`);
        const data: WipMonth[] = await res.json();
        setMonths(data);
        if (data.length > 0) {
          const latest = data[0];
          setSelectedYear(latest.year);
          setSelectedMonth(latest.month);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load months");
      }
    }
    loadMonths();
  }, []);

  // ── Fetch WIP data for selected month ────────────────
  useEffect(() => {
    if (selectedYear === null || selectedMonth === null) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/wip?year=${selectedYear}&month=${selectedMonth}`
        );
        if (!res.ok) throw new Error(`Failed to load WIP data: ${res.status}`);
        const data: WipApiResponse = await res.json();
        setJobs(data.jobs);
        setTotals(data.totals);
        setPmSummary(data.pm_summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedYear, selectedMonth]);

  // ── Computed: KPIs from jobs ─────────────────────────
  const kpis = useMemo(() => {
    if (!totals) {
      // Compute from jobs as fallback
      const activeJobs = jobs.filter((j) => j.pct_complete === null || j.pct_complete < 1.0);
      const completedJobs = jobs.filter((j) => j.pct_complete !== null && j.pct_complete >= 1.0);
      const overBilled = jobs.filter((j) => j.billings_excess !== null && j.billings_excess < 0);
      const negativeMargin = jobs.filter((j) => j.gross_profit !== null && j.gross_profit < 0);

      const sumField = (field: keyof WipSnapshot) =>
        jobs.reduce((sum, j) => sum + ((j[field] as number) ?? 0), 0);

      const totalRevised = sumField("revised_contract");
      const totalBacklog = sumField("backlog_revenue");
      const totalEarned = sumField("earned_revenue");
      const totalProfit = sumField("gross_profit");
      const marginPct = totalRevised > 0 ? totalProfit / totalRevised : 0;

      return {
        revisedContract: totalRevised,
        backlog: totalBacklog,
        earnedRevenue: totalEarned,
        grossProfit: totalProfit,
        marginPct,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        overBilled: overBilled.length,
        negativeMargin: negativeMargin.length,
      };
    }

    const activeJobs = jobs.filter((j) => j.pct_complete === null || j.pct_complete < 1.0);
    const completedJobs = jobs.filter((j) => j.pct_complete !== null && j.pct_complete >= 1.0);
    const overBilled = jobs.filter((j) => j.billings_excess !== null && j.billings_excess < 0);
    const negativeMargin = jobs.filter((j) => j.gross_profit !== null && j.gross_profit < 0);

    return {
      revisedContract: totals.revised_contract,
      backlog: totals.backlog_revenue,
      earnedRevenue: totals.earned_revenue,
      grossProfit: totals.gross_profit,
      marginPct: totals.gross_margin_pct,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      overBilled: overBilled.length,
      negativeMargin: negativeMargin.length,
    };
  }, [jobs, totals]);

  // ── Computed: Alert Flags ────────────────────────────
  const alerts = useMemo((): AlertFlag[] => {
    const flags: AlertFlag[] = [];

    for (const job of jobs) {
      // Negative gross profit
      if (job.gross_profit !== null && job.gross_profit < 0) {
        flags.push({
          type: "negative-profit",
          severity: "critical",
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
          severity: "critical",
          job_number: job.job_number,
          description: job.description,
          project_manager: job.project_manager,
          metric_label: "Backlog",
          metric_value: job.backlog_revenue,
        });
      }

      // Under-billed by >$10K
      if (job.billings_excess !== null && job.billings_excess < -10000) {
        flags.push({
          type: "under-billed",
          severity: "warning",
          job_number: job.job_number,
          description: job.description,
          project_manager: job.project_manager,
          metric_label: "Billings Excess",
          metric_value: job.billings_excess,
        });
      }

      // Over-billed by >$10K
      if (job.revenue_excess !== null && job.revenue_excess > 10000) {
        flags.push({
          type: "over-billed",
          severity: "warning",
          job_number: job.job_number,
          description: job.description,
          project_manager: job.project_manager,
          metric_label: "Revenue Excess",
          metric_value: job.revenue_excess,
        });
      }
    }

    return flags;
  }, [jobs]);

  const selectMonth = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setShowMonthDropdown(false);
  }, []);

  // ── Render ───────────────────────────────────────────

  if (error && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertCircle size={40} className="mx-auto text-red-400" />
          <p className="text-neutral-300">{error}</p>
          <p className="text-sm text-neutral-500">
            Make sure the WIP database migration has been run and data has been imported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Month Selector + Header ────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 hover:bg-neutral-750 hover:border-neutral-600 transition-colors"
          >
            <BarChart3 size={16} className="text-primary-400" />
            <span className="font-medium">
              {selectedMonth !== null && selectedYear !== null
                ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                : "Select Month"}
            </span>
            <ChevronDown size={14} className="text-neutral-500" />
          </button>

          {showMonthDropdown && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-[300px] overflow-y-auto min-w-[200px]">
              {months.map((m) => (
                <button
                  key={`${m.year}-${m.month}`}
                  type="button"
                  onClick={() => selectMonth(m.year, m.month)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-700 transition-colors ${
                    m.year === selectedYear && m.month === selectedMonth
                      ? "bg-primary-600/15 text-primary-400"
                      : "text-neutral-300"
                  }`}
                >
                  <span className="font-medium">{MONTH_NAMES[m.month - 1]} {m.year}</span>
                  <span className="ml-2 text-neutral-500">({m.job_count} jobs)</span>
                </button>
              ))}
              {months.length === 0 && (
                <div className="px-4 py-3 text-sm text-neutral-500">No months available</div>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <RefreshCw size={14} className="animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {/* ── Primary KPI Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Total Revised Contract"
          value={fmtCompact(kpis.revisedContract)}
          detail={fmtCurrency(kpis.revisedContract)}
          accent="text-blue-400"
          accentBg="bg-blue-950/40"
        />
        <KpiCard
          icon={<TrendingUp size={18} />}
          label="Total Backlog"
          value={fmtCompact(kpis.backlog)}
          detail={fmtCurrency(kpis.backlog)}
          accent="text-amber-400"
          accentBg="bg-amber-950/40"
        />
        <KpiCard
          icon={<BarChart3 size={18} />}
          label="Earned Revenue"
          value={fmtCompact(kpis.earnedRevenue)}
          detail={fmtCurrency(kpis.earnedRevenue)}
          accent="text-emerald-400"
          accentBg="bg-emerald-950/40"
        />
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Gross Profit"
          value={fmtCompact(kpis.grossProfit)}
          detail={`${fmtPct(kpis.marginPct)} margin`}
          accent={kpis.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}
          accentBg={kpis.grossProfit >= 0 ? "bg-emerald-950/40" : "bg-red-950/40"}
        />
      </div>

      {/* ── Secondary KPI Cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Briefcase size={18} />}
          label="Active Jobs"
          value={String(kpis.activeJobs)}
          accent="text-blue-400"
          accentBg="bg-blue-950/40"
        />
        <KpiCard
          icon={<CheckCircle size={18} />}
          label="Completed Jobs"
          value={String(kpis.completedJobs)}
          accent="text-emerald-400"
          accentBg="bg-emerald-950/40"
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          label="Over-Billed Jobs"
          value={String(kpis.overBilled)}
          accent="text-amber-400"
          accentBg="bg-amber-950/40"
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          label="Negative Margin Jobs"
          value={String(kpis.negativeMargin)}
          accent="text-red-400"
          accentBg="bg-red-950/40"
        />
      </div>

      {/* ── PM Performance Summary ─────────────────────── */}
      {pmSummary.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
            PM Performance
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {pmSummary.map((pm) => {
              const colors = PM_COLORS[pm.pm_code] ?? {
                bg: "bg-neutral-800",
                text: "text-neutral-300",
                border: "border-neutral-700",
              };
              return (
                <div
                  key={pm.pm_code}
                  className={`${colors.bg} border ${colors.border} rounded-lg p-4 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${colors.text}`}>
                      {pm.pm_code}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {PM_NAMES[pm.pm_code] ?? pm.pm_code}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-neutral-500">Jobs</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {pm.job_count}
                    </div>
                    <div className="text-neutral-500">Backlog</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {fmtCompact(pm.total_backlog)}
                    </div>
                    <div className="text-neutral-500">Earned</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {fmtCompact(pm.total_earned)}
                    </div>
                    <div className="text-neutral-500">Avg Margin</div>
                    <div
                      className={`text-right tabular-nums ${
                        pm.avg_margin < 0 ? "text-red-400" : "text-neutral-200"
                      }`}
                    >
                      {fmtPct(pm.avg_margin)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alert Flags ────────────────────────────────── */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
            Alerts ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alerts.map((alert, i) => (
              <div
                key={`${alert.job_number}-${alert.type}-${i}`}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-red-950/20 border-red-900/40"
                    : "bg-amber-950/20 border-amber-900/40"
                }`}
              >
                <AlertTriangle
                  size={16}
                  className={`mt-0.5 shrink-0 ${
                    alert.severity === "critical" ? "text-red-400" : "text-amber-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-neutral-200">{alert.job_number}</span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-neutral-400 truncate">
                      {alert.description ?? "No description"}
                    </span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-neutral-500">{alert.project_manager}</span>
                  </div>
                  <div className="text-xs mt-0.5">
                    <span className="text-neutral-500">{alert.metric_label}: </span>
                    <span
                      className={
                        alert.severity === "critical" ? "text-red-400" : "text-amber-400"
                      }
                    >
                      {fmtCurrency(alert.metric_value)}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    alert.type === "negative-profit"
                      ? "bg-red-900/40 text-red-400"
                      : alert.type === "over-run"
                        ? "bg-red-900/40 text-red-400"
                        : alert.type === "under-billed"
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-amber-900/40 text-amber-400"
                  }`}
                >
                  {alert.type.replace("-", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Job Table ──────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
          All Jobs
        </h3>
        <WipJobTable jobs={jobs} mode="admin" />
      </div>
    </div>
  );
}

// ── KPI Card Sub-component ─────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  detail,
  accent,
  accentBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  accent: string;
  accentBg: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${accentBg}`}>
          <span className={accent}>{icon}</span>
        </div>
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent} tabular-nums`}>{value}</div>
      {detail && <div className="text-xs text-neutral-500 mt-1">{detail}</div>}
    </div>
  );
}
