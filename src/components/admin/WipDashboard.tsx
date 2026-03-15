import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  X,
  Scale,
  Printer,
} from "lucide-react";
import WipJobTable, { type WipSnapshot } from "./WipJobTable";
import { computeWipAlerts, alertDismissKey, isGliJob, type AlertFlag } from "@/lib/wip-alerts";
import WipCostReconciliation from "./WipCostReconciliation";

// ── Types ──────────────────────────────────────────────

interface WipMonth {
  year: number;
  month: number;
  job_count: number;
}

interface PmSummary {
  projectManager: string;
  jobCount: number;
  totalBacklog: number;
  avgMargin: number | null;
  totalProfit: number;
  totalRevisedContract: number;
}

interface WipApiResponse {
  snapshots: WipSnapshot[];
  totals: {
    revised_contract: number;
    backlog_revenue: number;
    earned_revenue: number;
    gross_profit: number;
    gross_margin_pct: number;
    job_count: number;
  } | null;
  pmSummary: PmSummary[];
  priorYearEndSnapshots: WipSnapshot[] | null;
}

// ── Constants ──────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type DashboardTab = "wip" | "reconciliation";

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

// ── Snapshot Normalizer ─────────────────────────────────
// PostgreSQL returns numeric/decimal columns as strings (e.g. "21953963.00").
// The + operator concatenates strings instead of adding, producing NaN.
// Convert all numeric fields to actual numbers on load.

const NUMERIC_FIELDS: (keyof WipSnapshot)[] = [
  "contract_amount", "change_orders", "pending_change_orders", "revised_contract",
  "original_estimate", "estimate_changes", "pending_co_estimates", "revised_estimate",
  "gross_profit", "gross_margin_pct", "pct_complete", "earned_revenue",
  "costs_to_date", "gross_profit_to_date", "backlog_revenue", "costs_to_complete",
  "backlog_profit", "billings_to_date", "revenue_billing_excess", "invoicing_remaining",
  "revenue_excess", "billings_excess",
];

function normalizeSnapshot(raw: WipSnapshot): WipSnapshot {
  const snap = { ...raw };
  for (const field of NUMERIC_FIELDS) {
    const val = snap[field];
    if (val === null || val === undefined) {
      (snap as Record<string, unknown>)[field] = null;
    } else {
      (snap as Record<string, unknown>)[field] = Number(val);
    }
  }
  return snap;
}

// ── Component ──────────────────────────────────────────

export default function WipDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("wip");
  const [months, setMonths] = useState<WipMonth[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [jobs, setJobs] = useState<WipSnapshot[]>([]);
  const [, setTotals] = useState<WipApiResponse["totals"] | null>(null);
  const [pmSummary, setPmSummary] = useState<PmSummary[]>([]);
  const [priorYearEndSnapshots, setPriorYearEndSnapshots] = useState<WipSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [excludeGLI, setExcludeGLI] = useState(false);

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
        setJobs((data.snapshots ?? []).map(normalizeSnapshot));
        setTotals(data.totals);
        setPmSummary(data.pmSummary ?? []);
        setPriorYearEndSnapshots(
          data.priorYearEndSnapshots
            ? data.priorYearEndSnapshots.map(normalizeSnapshot)
            : null
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedYear, selectedMonth]);

  // ── Computed: Effective jobs (with GLI exclusion) ─────
  const effectiveJobs = useMemo(() => {
    const safeJobs = jobs || [];
    if (!excludeGLI) return safeJobs;
    return safeJobs.filter((j) => !isGliJob(j));
  }, [jobs, excludeGLI]);

  // ── Computed: Prior year map for YTD ──────────────────
  const priorYearMap = useMemo(() => {
    if (!priorYearEndSnapshots) return null;
    const map = new Map<string, WipSnapshot>();
    for (const snap of priorYearEndSnapshots) {
      map.set(snap.job_number, snap);
    }
    return map;
  }, [priorYearEndSnapshots]);

  const hasYtdData = priorYearMap !== null;

  // ── Computed: KPIs from effective jobs ─────────────────
  const kpis = useMemo(() => {
    const activeJobs = effectiveJobs.filter((j) => j.pct_complete === null || j.pct_complete < 1.0);
    const completedJobs = effectiveJobs.filter((j) => j.pct_complete !== null && j.pct_complete >= 1.0);
    const overBilled = effectiveJobs.filter((j) => j.billings_excess !== null && j.billings_excess < 0);
    const negativeMargin = effectiveJobs.filter((j) => j.gross_profit !== null && j.gross_profit < 0);

    const sumField = (field: keyof WipSnapshot) =>
      effectiveJobs.reduce((sum, j) => sum + ((j[field] as number) ?? 0), 0);

    // Current snapshot values (point-in-time)
    const totalRevised = sumField("revised_contract");
    const totalBacklog = sumField("backlog_revenue");

    // YTD or current snapshot for revenue/profit
    let earnedRevenue: number;
    let grossProfit: number;

    if (priorYearMap) {
      // YTD = current cumulative values minus prior year end values
      earnedRevenue = 0;
      grossProfit = 0;
      for (const job of effectiveJobs) {
        const prior = priorYearMap.get(job.job_number);
        earnedRevenue += (job.earned_revenue ?? 0) - (prior?.earned_revenue ?? 0);
        grossProfit += (job.gross_profit_to_date ?? 0) - (prior?.gross_profit_to_date ?? 0);
      }
    } else {
      // No prior year data — use current snapshot
      earnedRevenue = sumField("earned_revenue");
      grossProfit = sumField("gross_profit");
    }

    const marginPct = earnedRevenue > 0 ? grossProfit / earnedRevenue : 0;

    return {
      revisedContract: totalRevised,
      backlog: totalBacklog,
      earnedRevenue,
      grossProfit,
      marginPct,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      overBilled: overBilled.length,
      negativeMargin: negativeMargin.length,
    };
  }, [effectiveJobs, priorYearMap]);

  // ── Computed: PM Summary (recomputed when GLI excluded) ─
  const effectivePmSummary = useMemo((): PmSummary[] => {
    if (!excludeGLI) return pmSummary;

    const pmMap = new Map<string, {
      jobCount: number;
      totalBacklog: number;
      totalProfit: number;
      totalRevisedContract: number;
      margins: number[];
    }>();

    for (const job of effectiveJobs) {
      const pm = job.project_manager ?? "??";
      const existing = pmMap.get(pm) ?? {
        jobCount: 0,
        totalBacklog: 0,
        totalProfit: 0,
        totalRevisedContract: 0,
        margins: [],
      };
      existing.jobCount++;
      existing.totalBacklog += job.backlog_revenue ?? 0;
      existing.totalProfit += job.gross_profit ?? 0;
      existing.totalRevisedContract += job.revised_contract ?? 0;
      if (job.gross_margin_pct !== null) existing.margins.push(job.gross_margin_pct);
      pmMap.set(pm, existing);
    }

    return Array.from(pmMap.entries())
      .map(([pm, data]) => ({
        projectManager: pm,
        jobCount: data.jobCount,
        totalBacklog: data.totalBacklog,
        avgMargin: data.margins.length > 0
          ? data.margins.reduce((a, b) => a + b, 0) / data.margins.length
          : null,
        totalProfit: data.totalProfit,
        totalRevisedContract: data.totalRevisedContract,
      }))
      .sort((a, b) => a.projectManager.localeCompare(b.projectManager));
  }, [effectiveJobs, excludeGLI, pmSummary]);

  // ── Computed: Alert Flags ────────────────────────────
  const alerts = useMemo(() => computeWipAlerts(effectiveJobs), [effectiveJobs]);

  // ── Dismiss State ──────────────────────────────────
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedYear === null || selectedMonth === null) return;
    try {
      const stored = localStorage.getItem(
        `wip-dismissed-alerts-${selectedYear}-${selectedMonth}`
      );
      if (stored) {
        setDismissedKeys(new Set(JSON.parse(stored) as string[]));
      } else {
        setDismissedKeys(new Set());
      }
    } catch {
      setDismissedKeys(new Set());
    }
  }, [selectedYear, selectedMonth]);

  const dismissAlert = useCallback(
    (alert: AlertFlag) => {
      const key = alertDismissKey(alert);
      setDismissedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        if (selectedYear !== null && selectedMonth !== null) {
          localStorage.setItem(
            `wip-dismissed-alerts-${selectedYear}-${selectedMonth}`,
            JSON.stringify([...next])
          );
        }
        return next;
      });
    },
    [selectedYear, selectedMonth]
  );

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedKeys.has(alertDismissKey(a))),
    [alerts, dismissedKeys]
  );

  const dismissedCount = alerts.length - visibleAlerts.length;

  const [alertsExpanded, setAlertsExpanded] = useState(false);

  // ── Computed: Grouped alerts by type ─────────────────
  const alertGroups = useMemo(() => {
    const groups: Record<string, AlertFlag[]> = {};
    for (const a of visibleAlerts) {
      const label = a.category;
      if (!groups[label]) groups[label] = [];
      groups[label].push(a);
    }
    return groups;
  }, [visibleAlerts]);

  const alertSeveritySummary = useMemo(() => {
    const red = visibleAlerts.filter((a) => a.severity === "red").length;
    const orange = visibleAlerts.filter((a) => a.severity === "orange").length;
    const yellow = visibleAlerts.filter((a) => a.severity === "yellow").length;
    const parts: string[] = [];
    if (red > 0) parts.push(`${red} Red`);
    if (orange > 0) parts.push(`${orange} Orange`);
    if (yellow > 0) parts.push(`${yellow} Yellow`);
    return parts.join(", ");
  }, [visibleAlerts]);

  const dismissAllYellow = useCallback(() => {
    const yellowAlerts = visibleAlerts.filter((a) => a.severity === "yellow");
    if (yellowAlerts.length === 0) return;
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      for (const a of yellowAlerts) {
        next.add(alertDismissKey(a));
      }
      if (selectedYear !== null && selectedMonth !== null) {
        localStorage.setItem(
          `wip-dismissed-alerts-${selectedYear}-${selectedMonth}`,
          JSON.stringify([...next])
        );
      }
      return next;
    });
  }, [visibleAlerts, selectedYear, selectedMonth]);

  const ALERT_TYPE_LABELS: Record<string, string> = {
    "negative-margin": "Negative Margin",
    "over-billed": "Over-Billed",
    "under-billed": "Under-Billed",
    "stale": "Stale Jobs",
  };

  // ── Computed: Enhanced PM Metrics ─────────────────────
  const enhancedPmMetrics = useMemo(() => {
    if (!effectiveJobs || effectiveJobs.length === 0 || selectedYear === null) return {};

    const yearPrefix = `${selectedYear.toString().slice(-2)}-`;

    const metrics: Record<string, {
      newSalesCount: number;
      newSalesValue: number;
      completedCount: number;
      totalJobs: number;
      backlogExclGli: number;
      gliExcluded: boolean;
    }> = {};

    for (const job of effectiveJobs) {
      const pm = job.project_manager ?? "??";
      if (!metrics[pm]) {
        metrics[pm] = {
          newSalesCount: 0,
          newSalesValue: 0,
          completedCount: 0,
          totalJobs: 0,
          backlogExclGli: 0,
          gliExcluded: false,
        };
      }

      const m = metrics[pm];
      const gli = isGliJob(job);

      m.totalJobs++;

      if (job.job_number?.startsWith(yearPrefix)) {
        m.newSalesCount++;
        m.newSalesValue += job.revised_contract ?? 0;
      }

      if (job.pct_complete !== null && job.pct_complete >= 1.0) {
        m.completedCount++;
      }

      if (!gli) {
        m.backlogExclGli += job.backlog_revenue ?? 0;
      } else {
        m.gliExcluded = true;
      }
    }

    return metrics;
  }, [effectiveJobs, selectedYear]);

  // PM with lowest backlog (excl. GLI) — pipeline warning
  const lowestBacklogPm = useMemo(() => {
    const entries = Object.entries(enhancedPmMetrics);
    if (entries.length < 2) return null;

    let lowest: string | null = null;
    let lowestVal = Infinity;

    for (const [pm, m] of entries) {
      if (m.backlogExclGli < lowestVal) {
        lowestVal = m.backlogExclGli;
        lowest = pm;
      }
    }

    return lowest;
  }, [enhancedPmMetrics]);

  const anyGliExcluded = useMemo(
    () => Object.values(enhancedPmMetrics).some((m) => m.gliExcluded),
    [enhancedPmMetrics]
  );

  const selectMonth = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setShowMonthDropdown(false);
  }, []);

  const kpiTimeLabel = hasYtdData ? "YTD" : "Current Snapshot";

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Margin % coloring: green >30%, yellow 20-30%, red <20%
  const marginColor = useMemo(() => {
    const pct = kpis.marginPct * 100;
    if (pct > 30) return "text-emerald-400";
    if (pct >= 20) return "text-amber-400";
    return "text-red-400";
  }, [kpis.marginPct]);

  // ── Computed: Period label + annualized projections ────
  const periodLabel = useMemo(() => {
    if (!hasYtdData || selectedMonth === null || selectedYear === null) return null;
    if (selectedMonth === 1) return `Jan ${selectedYear}`;
    return `Jan\u2013${SHORT_MONTHS[selectedMonth - 1]} ${selectedYear}`;
  }, [hasYtdData, selectedMonth, selectedYear]);

  const monthCount = hasYtdData && selectedMonth !== null ? selectedMonth : null;

  const annualizedRevenue = useMemo(() => {
    if (monthCount === null || monthCount === 0 || monthCount >= 12) return null;
    return kpis.earnedRevenue * (12 / monthCount);
  }, [kpis.earnedRevenue, monthCount]);

  const annualizedProfit = useMemo(() => {
    if (monthCount === null || monthCount === 0 || monthCount >= 12) return null;
    return kpis.grossProfit * (12 / monthCount);
  }, [kpis.grossProfit, monthCount]);

  // ── Computed: month string for reconciliation tab ─────
  const monthParam = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return "";
    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  }, [selectedYear, selectedMonth]);

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
    <div className="wip-print-area space-y-6 overflow-hidden">
      {/* ── Print Header (hidden on screen) ──────────────── */}
      <div className="wip-print-header hidden">
        <h1>RMI — WIP Report</h1>
        <p>
          {selectedMonth !== null && selectedYear !== null
            ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
            : ""}
          {excludeGLI ? " (excl. GLI)" : ""}
        </p>
      </div>

      {/* ── Month Selector + Controls ────────────────────── */}
      <div className="wip-no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Month Selector */}
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

          {/* GLI Exclusion Toggle */}
          {activeTab === "wip" && (
            <button
              type="button"
              onClick={() => setExcludeGLI(!excludeGLI)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                excludeGLI
                  ? "bg-primary-600/15 border-primary-700/50 text-primary-300"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-300 hover:border-neutral-600"
              }`}
            >
              <div
                className={`relative w-8 h-[18px] rounded-full transition-colors ${
                  excludeGLI ? "bg-primary-600" : "bg-neutral-600"
                }`}
              >
                <div
                  className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-transform ${
                    excludeGLI ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </div>
              Exclude GLI (Fab Shop)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <RefreshCw size={14} className="animate-spin" />
              Loading…
            </div>
          )}
          {activeTab === "wip" && !loading && jobs.length > 0 && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750 hover:border-neutral-600 transition-colors"
            >
              <Printer size={14} />
              Print Report
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Selector ────────────────────────────────── */}
      <div className="wip-no-print flex gap-1 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveTab("wip")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "wip"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <BarChart3 size={15} />
          WIP Dashboard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reconciliation")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "reconciliation"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Scale size={15} />
          Cost Reconciliation
        </button>
      </div>

      {/* ── Reconciliation Tab ──────────────────────────── */}
      {activeTab === "reconciliation" && monthParam && (
        <WipCostReconciliation month={monthParam} />
      )}

      {/* ── WIP Tab ─────────────────────────────────────── */}
      {activeTab === "wip" && (<>

      {/* ── Loading Skeleton ──────────────────────────── */}
      {loading && jobs.length === 0 && <LoadingSkeleton />}

      {/* ── Content (hidden during initial load) ─────── */}
      {!(loading && jobs.length === 0) && (<>

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
          badge={kpiTimeLabel}
          subBadge={periodLabel ?? undefined}
          extraDetail={annualizedRevenue !== null ? `${fmtCompact(annualizedRevenue)} annualized` : undefined}
        />
        <KpiCard
          icon={<DollarSign size={18} />}
          label="Gross Profit"
          value={fmtCompact(kpis.grossProfit)}
          detail={`${fmtPct(kpis.marginPct)} margin`}
          detailColor={marginColor}
          accent={kpis.grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}
          accentBg={kpis.grossProfit >= 0 ? "bg-emerald-950/40" : "bg-red-950/40"}
          badge={kpiTimeLabel}
          subBadge={periodLabel ?? undefined}
          extraDetail={annualizedProfit !== null ? `${fmtCompact(annualizedProfit)} annualized` : undefined}
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
      {effectivePmSummary.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
            PM Performance
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {effectivePmSummary.map((pm) => {
              const pmCode = pm.projectManager ?? "??";
              const colors = PM_COLORS[pmCode] ?? {
                bg: "bg-neutral-800",
                text: "text-neutral-300",
                border: "border-neutral-700",
              };
              const extra = enhancedPmMetrics[pmCode];
              const isLowestBacklog = pmCode === lowestBacklogPm;

              return (
                <div
                  key={pmCode}
                  className={`${
                    isLowestBacklog
                      ? "bg-yellow-950/25 border border-yellow-600/50"
                      : `${colors.bg} border ${colors.border}`
                  } rounded-lg p-4 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${isLowestBacklog ? "text-yellow-400" : colors.text}`}>
                      {pmCode}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {PM_NAMES[pmCode] ?? pmCode}
                    </span>
                  </div>
                  {isLowestBacklog && (
                    <div className="text-[10px] font-medium text-yellow-500 uppercase tracking-wider">
                      Pipeline Warning — Lowest Backlog{anyGliExcluded ? " (excl. GLI)" : ""}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-neutral-500">Jobs</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {pm.jobCount}
                    </div>
                    <div className="text-neutral-500">Backlog</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {fmtCompact(pm.totalBacklog)}
                    </div>
                    <div className="text-neutral-500">Profit</div>
                    <div className="text-neutral-200 text-right tabular-nums">
                      {fmtCompact(pm.totalProfit)}
                    </div>
                    <div className="text-neutral-500">Avg Margin</div>
                    <div
                      className={`text-right tabular-nums ${
                        pm.avgMargin !== null && pm.avgMargin < 0 ? "text-red-400" : "text-neutral-200"
                      }`}
                    >
                      {fmtPct(pm.avgMargin)}
                    </div>
                    {extra && (
                      <>
                        <div className="col-span-2 border-t border-neutral-800 mt-1 pt-1" />
                        <div className="text-neutral-500">New Sales YTD</div>
                        <div className="text-neutral-200 text-right tabular-nums">
                          {extra.newSalesCount} &middot; {fmtCompact(extra.newSalesValue)}
                        </div>
                        <div className="text-neutral-500">Completion</div>
                        <div className="text-neutral-200 text-right tabular-nums">
                          {extra.completedCount}/{extra.totalJobs}
                        </div>
                        {extra.gliExcluded && (
                          <div className="col-span-2 text-[10px] text-neutral-600 italic mt-1">
                            (excl. GLI)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alert Flags ────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="wip-no-print border border-neutral-800 rounded-lg overflow-hidden">
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => setAlertsExpanded(!alertsExpanded)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900 hover:bg-neutral-800/80 transition-colors text-left"
          >
            <ChevronRight
              size={16}
              className={`text-neutral-500 transition-transform ${alertsExpanded ? "rotate-90" : ""}`}
            />
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-sm font-medium text-neutral-300">
              Alerts
            </span>
            {visibleAlerts.length > 0 && (
              <span className="text-sm text-neutral-500">
                — {alertSeveritySummary}
              </span>
            )}
            {dismissedCount > 0 && (
              <span className="text-xs text-neutral-600 ml-auto">
                {dismissedCount} dismissed
              </span>
            )}
          </button>

          {/* Expanded content */}
          {alertsExpanded && (
            <div className="border-t border-neutral-800 px-4 py-3 space-y-4">
              {visibleAlerts.length > 0 ? (
                <>
                  {/* Dismiss All Yellow button */}
                  {visibleAlerts.some((a) => a.severity === "yellow") && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={dismissAllYellow}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-900/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 transition-colors"
                      >
                        Dismiss All Yellow
                      </button>
                    </div>
                  )}

                  {/* Grouped alerts */}
                  {Object.entries(alertGroups).map(([type, groupAlerts]) => (
                    <div key={type}>
                      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                        {ALERT_TYPE_LABELS[type] ?? type} ({groupAlerts.length})
                      </h4>
                      <div className="space-y-1.5">
                        {groupAlerts.map((alert, i) => {
                          const sev =
                            alert.severity === "red"
                              ? { bg: "bg-red-950/20", border: "border-red-900/40", icon: "text-red-400", val: "text-red-400", badge: "bg-red-900/40 text-red-400", label: "RED" }
                              : alert.severity === "orange"
                                ? { bg: "bg-orange-950/20", border: "border-orange-900/40", icon: "text-orange-400", val: "text-orange-400", badge: "bg-orange-900/40 text-orange-400", label: "ORANGE" }
                                : { bg: "bg-amber-950/15", border: "border-amber-900/30", icon: "text-amber-400", val: "text-amber-400", badge: "bg-amber-900/40 text-amber-400", label: "YELLOW" };
                          return (
                          <div
                            key={`${alert.job_number}-${alert.category}-${i}`}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border ${sev.bg} ${sev.border}`}
                          >
                            <AlertTriangle
                              size={14}
                              className={`mt-0.5 shrink-0 ${sev.icon}`}
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
                              {alert.category === "over-billed" && alert.contract_amount !== undefined ? (
                                <div className="text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <span>
                                    <span className="text-neutral-500">Contract: </span>
                                    <span className="text-neutral-300">{fmtCurrency(alert.contract_amount)}</span>
                                  </span>
                                  <span>
                                    <span className="text-neutral-500">Earned: </span>
                                    <span className="text-neutral-300">{fmtCurrency(alert.earned_amount ?? null)}</span>
                                  </span>
                                  <span>
                                    <span className="text-neutral-500">Over: </span>
                                    <span className={sev.val}>
                                      {fmtCurrency(alert.metric_value)} ({alert.pct_over}%)
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <div className="text-xs mt-0.5">
                                  <span className="text-neutral-500">{alert.metric_label}: </span>
                                  <span className={sev.val}>
                                    {fmtCurrency(alert.metric_value)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span
                              className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${sev.badge}`}
                            >
                              {sev.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => dismissAlert(alert)}
                              className="shrink-0 p-1 rounded hover:bg-neutral-700/50 text-neutral-600 hover:text-neutral-400 transition-colors"
                              title="Dismiss alert"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-neutral-600">
                  All alerts dismissed for this snapshot.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Job Table ──────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
          All Jobs
        </h3>
        <WipJobTable jobs={effectiveJobs} mode="admin" alerts={alerts} />
      </div>

      </>)}
      </>)}
    </div>
  );
}

// ── KPI Card Sub-component ─────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  detail,
  detailColor,
  accent,
  accentBg,
  badge,
  subBadge,
  extraDetail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  detailColor?: string;
  accent: string;
  accentBg: string;
  badge?: string;
  subBadge?: string;
  extraDetail?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${accentBg}`}>
          <span className={accent}>{icon}</span>
        </div>
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
        {badge && (
          <div className="ml-auto text-right">
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-600/20 text-primary-400">
              {badge}
            </span>
            {subBadge && (
              <div className="text-[10px] text-neutral-500 mt-0.5">{subBadge}</div>
            )}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${accent} tabular-nums`}>{value}</div>
      {detail && <div className={`text-xs mt-1 ${detailColor ?? "text-neutral-500"}`}>{detail}</div>}
      {extraDetail && <div className="text-[10px] mt-0.5 text-neutral-600">{extraDetail}</div>}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded bg-neutral-800" />
        <div className="h-3 w-24 rounded bg-neutral-800" />
      </div>
      <div className="h-7 w-20 rounded bg-neutral-800 mb-2" />
      <div className="h-3 w-16 rounded bg-neutral-800" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-neutral-800 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 rounded bg-neutral-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
