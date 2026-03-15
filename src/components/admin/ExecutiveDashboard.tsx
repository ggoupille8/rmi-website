import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  FileText,
  CheckCircle,
  Upload,
  ArrowRight,
  Minus,
  Inbox,
  Clock,
} from "lucide-react";
import { computeWipAlerts } from "@/lib/wip-alerts";
import type { WipSnapshot } from "./WipJobTable";
import Sparkline from "./Sparkline";

// ── Types ──────────────────────────────────────────────

interface LeadStats {
  total: number;
  newCount: number;
  contactedCount: number;
  archivedCount: number;
  thisWeek: number;
  lastWeek: number;
}

interface RecentLead {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

interface WipSummary {
  totalBacklog: number;
  earnedRevenue: number;
  activeJobs: number;
  redAlertCount: number;
  monthLabel: string;
}

interface FinancialSummary {
  arTotal: number | null;
  netIncome: number | null;
  reconMatches: number;
  reconTotal: number;
  arDate: string | null;
  isDate: string | null;
}

interface ActivityEvent {
  event_type: string;
  description: string;
  event_time: string;
  link: string;
}

interface JobStats {
  totalJobs: number;
  needsTaxClassification: number;
  openJobs: number;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  thisMonthCount: number;
}

interface TrendData {
  leads: { month: string; count: number }[];
  wip: { month: string; backlog: number; earned: number }[];
  financials: { month: string; ar: number | null; netIncome: number | null }[];
}

interface Props {
  leadStats: LeadStats;
  recentLeads: RecentLead[];
  jobStats?: JobStats;
  invoiceStats?: InvoiceStats;
}

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

function fmtCompact(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyCompactFmt.format(val);
}

function fmtCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyFmt.format(val);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Snapshot Normalizer ────────────────────────────────

const WIP_NUMERIC_KEYS = [
  "gross_profit", "pct_complete", "backlog_revenue", "billings_excess",
  "revenue_excess", "revised_contract", "earned_revenue", "gross_profit_to_date",
  "contract_amount", "change_orders", "pending_change_orders",
  "original_estimate", "estimate_changes", "pending_co_estimates", "revised_estimate",
  "gross_margin_pct", "costs_to_date", "costs_to_complete",
  "backlog_profit", "billings_to_date", "revenue_billing_excess", "invoicing_remaining",
] as const;

function normalizeSnapshot(raw: WipSnapshot): WipSnapshot {
  const snap = { ...raw };
  for (const key of WIP_NUMERIC_KEYS) {
    const val = (snap as Record<string, unknown>)[key];
    (snap as Record<string, unknown>)[key] =
      val === null || val === undefined ? null : Number(val);
  }
  return snap;
}

// ── Skeleton Components ────────────────────────────────

interface SkeletonLineProps {
  width?: string;
  height?: string;
}

function SkeletonLine({ width = "w-full", height = "h-4" }: SkeletonLineProps) {
  return <div className={`${width} ${height} bg-neutral-700/50 rounded animate-pulse`} />;
}

function SkeletonKpi() {
  return (
    <div className="space-y-2">
      <SkeletonLine width="w-24" height="h-3" />
      <SkeletonLine width="w-32" height="h-8" />
      <SkeletonLine width="w-20" height="h-3" />
    </div>
  );
}

function WipSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonLine width="w-28" height="h-3" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
        <SkeletonKpi />
      </div>
    </div>
  );
}

function SparklineSkeleton({ width = 72, height = 28 }: { width?: number; height?: number }) {
  return (
    <div
      className="bg-neutral-700/30 rounded animate-pulse"
      style={{ width, height }}
    />
  );
}

function FinancialSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonKpi />
      <SkeletonKpi />
      <div className="space-y-2">
        <SkeletonLine width="w-16" height="h-8" />
        <SkeletonLine width="w-36" height="h-3" />
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────

function statusBadge(status: string): string {
  switch (status) {
    case "new": return "bg-primary-500/20 text-primary-400";
    case "contacted": return "bg-green-500/20 text-green-400";
    case "archived": return "bg-neutral-600/20 text-neutral-400";
    default: return "bg-neutral-600/20 text-neutral-400";
  }
}

// ── Activity Icon ──────────────────────────────────────

interface ActivityIconProps {
  type: string;
}

function ActivityIcon({ type }: ActivityIconProps) {
  switch (type) {
    case "lead":
      return (
        <div className="p-1.5 rounded bg-blue-950/60">
          <UserPlus size={14} className="text-blue-400" />
        </div>
      );
    case "wip_upload":
      return (
        <div className="p-1.5 rounded bg-amber-950/60">
          <Upload size={14} className="text-amber-400" />
        </div>
      );
    case "financial_import":
      return (
        <div className="p-1.5 rounded bg-emerald-950/60">
          <FileText size={14} className="text-emerald-400" />
        </div>
      );
    default:
      return (
        <div className="p-1.5 rounded bg-neutral-800">
          <Minus size={14} className="text-neutral-500" />
        </div>
      );
  }
}

// ── Main Component ─────────────────────────────────────

export default function ExecutiveDashboard({ leadStats, recentLeads, jobStats, invoiceStats }: Props) {
  const [wip, setWip] = useState<WipSummary | null>(null);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [wipLoading, setWipLoading] = useState(true);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [wipError, setWipError] = useState<string | null>(null);
  const [financialsError, setFinancialsError] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);

  // ── Fetch Sparkline Trends ──────────────────────────
  useEffect(() => {
    fetch("/api/admin/dashboard-trends")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TrendData | null) => { if (d) setTrends(d); })
      .catch(() => {});
  }, []);

  // ── Fetch WIP Summary ─────────────────────────────────
  useEffect(() => {
    async function loadWip() {
      try {
        // Get latest available month
        const monthsRes = await fetch("/api/admin/wip-months");
        if (!monthsRes.ok) throw new Error("Failed to load WIP months");
        const months: { year: number; month: number }[] = await monthsRes.json();
        if (months.length === 0) {
          setWip(null);
          setWipLoading(false);
          return;
        }

        const latest = months[0];
        const MONTH_NAMES = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];

        // Fetch WIP data for latest month
        const wipRes = await fetch(
          `/api/admin/wip?year=${latest.year}&month=${latest.month}`
        );
        if (!wipRes.ok) throw new Error("Failed to load WIP data");
        const data: {
          snapshots: WipSnapshot[];
          totals: {
            backlog_revenue: number;
            earned_revenue: number;
            job_count: number;
          } | null;
        } = await wipRes.json();

        const snapshots = (data.snapshots ?? []).map(normalizeSnapshot);
        const alerts = computeWipAlerts(snapshots);
        const redAlerts = alerts.filter((a) => a.severity === "red");

        // Count active jobs from snapshots
        const activeJobs = snapshots.filter(
          (j) => j.pct_complete === null || j.pct_complete < 1.0
        ).length;

        // Sum backlog and earned revenue from snapshots (more accurate than totals)
        const totalBacklog = snapshots.reduce(
          (sum, j) => sum + ((j.backlog_revenue as number) ?? 0),
          0
        );
        const earnedRevenue = snapshots.reduce(
          (sum, j) => sum + ((j.earned_revenue as number) ?? 0),
          0
        );

        setWip({
          totalBacklog,
          earnedRevenue,
          activeJobs,
          redAlertCount: redAlerts.length,
          monthLabel: `${MONTH_NAMES[latest.month - 1]} ${latest.year}`,
        });
      } catch (err) {
        setWipError(err instanceof Error ? err.message : "Failed to load WIP");
      } finally {
        setWipLoading(false);
      }
    }
    loadWip();
  }, []);

  // ── Fetch Financial Summary ───────────────────────────
  useEffect(() => {
    async function loadFinancials() {
      try {
        const res = await fetch("/api/admin/financials");
        if (!res.ok) throw new Error("Failed to load financials");
        const data: {
          arAging: { report_date: string; total_amount: string }[];
          balanceSheet: { report_date: string; total_assets: string; net_income: string }[];
          incomeStatement: { report_date: string; net_income: string }[];
        } = await res.json();

        const latestAr = data.arAging?.[0] ?? null;
        const latestIs = data.incomeStatement?.[0] ?? null;
        const latestBs = data.balanceSheet?.[0] ?? null;

        let reconMatches = 0;
        let reconTotal = 5;

        // Fetch reconciliation if we have a balance sheet date
        if (latestBs) {
          try {
            const reconRes = await fetch(
              `/api/admin/financials?action=reconciliation&reportDate=${latestBs.report_date}`
            );
            if (reconRes.ok) {
              const reconData: {
                tieOuts: { status: string }[];
              } = await reconRes.json();
              reconTotal = reconData.tieOuts.length;
              reconMatches = reconData.tieOuts.filter(
                (t) => t.status === "match"
              ).length;
            }
          } catch { /* reconciliation fetch failed — show 0/5 */ }
        }

        setFinancials({
          arTotal: latestAr ? parseFloat(latestAr.total_amount) : null,
          netIncome: latestIs ? parseFloat(latestIs.net_income) : null,
          reconMatches,
          reconTotal,
          arDate: latestAr?.report_date ?? null,
          isDate: latestIs?.report_date ?? null,
        });
      } catch (err) {
        setFinancialsError(
          err instanceof Error ? err.message : "Failed to load financials"
        );
      } finally {
        setFinancialsLoading(false);
      }
    }
    loadFinancials();
  }, []);

  // ── Fetch Activity Feed ───────────────────────────────
  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch("/api/admin/activity");
        if (!res.ok) throw new Error("Failed to load activity");
        const data: { events: ActivityEvent[] } = await res.json();
        setActivity(data.events);
      } catch {
        setActivity([]);
      } finally {
        setActivityLoading(false);
      }
    }
    loadActivity();
  }, []);

  // ── Lead Pipeline Computed Values ─────────────────────
  const pipelineTotal =
    leadStats.newCount + leadStats.contactedCount + leadStats.archivedCount;
  const newPct = pipelineTotal > 0 ? (leadStats.newCount / pipelineTotal) * 100 : 0;
  const contactedPct =
    pipelineTotal > 0 ? (leadStats.contactedCount / pipelineTotal) * 100 : 0;
  const archivedPct =
    pipelineTotal > 0 ? (leadStats.archivedCount / pipelineTotal) * 100 : 0;

  const trendUp = leadStats.thisWeek > leadStats.lastWeek;
  const trendDown = leadStats.thisWeek < leadStats.lastWeek;

  // Reconciliation color
  const reconColor = useMemo(() => {
    if (!financials) return "text-neutral-400";
    if (financials.reconMatches === financials.reconTotal) return "text-emerald-400";
    if (financials.reconMatches >= 3) return "text-amber-400";
    return "text-red-400";
  }, [financials]);

  const leadSparkData = trends && trends.leads.length >= 1 ? trends.leads.map((l) => l.count) : null;
  const wipBacklogData = trends && trends.wip.length >= 1 ? trends.wip.map((w) => w.backlog) : null;
  const wipEarnedData = trends && trends.wip.length >= 1 ? trends.wip.map((w) => w.earned) : null;
  const arSparkData = trends ? trends.financials.filter((f) => f.ar !== null).map((f) => f.ar as number) : null;
  const niSparkData = trends ? trends.financials.filter((f) => f.netIncome !== null).map((f) => f.netIncome as number) : null;

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── Three-Column Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── LEFT: Lead Pipeline ─────────────────────── */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-800/50 hover:shadow-[0_8px_24px_-6px_rgba(59,130,246,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-950/40">
                <Users size={16} className="text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                Lead Pipeline
              </h2>
            </div>
            <a
              href="/admin/leads"
              className="text-xs text-neutral-500 hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </a>
          </div>

          {leadStats.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox size={28} className="text-neutral-600 mb-3" />
              <p className="text-sm text-neutral-400">No active leads</p>
              <p className="text-xs text-neutral-600 mt-1">
                New submissions will appear here
              </p>
              <a
                href="/#contact"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                View contact form
              </a>
            </div>
          ) : (
            <>
              {/* Big number: Total */}
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-neutral-100 tabular-nums">
                    {leadStats.total}
                  </p>
                  <div className="flex flex-col items-end">
                    {leadSparkData ? (
                      <Sparkline data={leadSparkData} color="#60a5fa" width={72} height={28} />
                    ) : !trends ? (
                      <SparklineSkeleton />
                    ) : null}
                    {leadSparkData && <span className="text-[9px] text-neutral-600 mt-0.5">6 mo</span>}
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-1">Total Active Leads</p>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div>
                  <p className="text-lg font-bold text-primary-400 tabular-nums">
                    {leadStats.newCount}
                  </p>
                  <p className="text-[11px] text-neutral-500">New</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400 tabular-nums">
                    {leadStats.contactedCount}
                  </p>
                  <p className="text-[11px] text-neutral-500">Contacted</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-neutral-400 tabular-nums">
                    {leadStats.archivedCount}
                  </p>
                  <p className="text-[11px] text-neutral-500">Archived</p>
                </div>
              </div>

              {/* Pipeline bar */}
              <div className="mb-4">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-700/50">
                  {pipelineTotal > 0 ? (
                    <>
                      <div style={{ width: `${newPct}%` }} className="bg-primary-500" />
                      <div style={{ width: `${contactedPct}%` }} className="bg-green-500" />
                      <div style={{ width: `${archivedPct}%` }} className="bg-neutral-600" />
                    </>
                  ) : (
                    <div className="w-full bg-neutral-700" />
                  )}
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">This week:</span>
                <span className="font-semibold text-neutral-200 tabular-nums">
                  {leadStats.thisWeek}
                </span>
                {trendUp && (
                  <span className="flex items-center gap-0.5 text-green-400 text-xs">
                    <TrendingUp size={12} /> vs last
                  </span>
                )}
                {trendDown && (
                  <span className="flex items-center gap-0.5 text-red-400 text-xs">
                    <TrendingDown size={12} /> vs last
                  </span>
                )}
                {!trendUp && !trendDown && (
                  <span className="text-neutral-500 text-xs">same as last</span>
                )}
              </div>

              {/* Action required badge */}
              {leadStats.newCount > 0 && (
                <a
                  href="/admin/leads?status=new"
                  className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 border border-primary-700/30 text-primary-400 text-xs font-medium rounded-md transition-colors"
                >
                  <UserPlus size={12} />
                  {leadStats.newCount} {leadStats.newCount === 1 ? "lead needs" : "leads need"} follow-up
                </a>
              )}
            </>
          )}
        </div>

        {/* ── CENTER: WIP Summary ─────────────────────── */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-800/50 hover:shadow-[0_8px_24px_-6px_rgba(217,119,6,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-950/40">
                <Briefcase size={16} className="text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                WIP Summary
              </h2>
            </div>
            <a
              href="/admin/wip"
              className="text-xs text-neutral-500 hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              Details <ArrowRight size={12} />
            </a>
          </div>

          {wipLoading ? (
            <WipSkeleton />
          ) : wipError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">WIP data unavailable</p>
            </div>
          ) : !wip ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Briefcase size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">No WIP data imported yet</p>
              <a
                href="/admin/wip"
                className="mt-2 text-xs text-primary-400 hover:text-primary-300"
              >
                Upload WIP report
              </a>
            </div>
          ) : (
            <>
              {/* Month label */}
              <p className="text-[11px] text-neutral-500 mb-4">
                Snapshot: {wip.monthLabel}
              </p>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                {/* Total Backlog */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-amber-400 tabular-nums">
                      {fmtCompact(wip.totalBacklog)}
                    </p>
                    {wipBacklogData ? (
                      <Sparkline data={wipBacklogData} color="#fbbf24" width={48} height={20} />
                    ) : !trends ? (
                      <SparklineSkeleton width={48} height={20} />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Total Backlog</p>
                  <p className="text-[10px] text-neutral-600">{fmtCurrency(wip.totalBacklog)}</p>
                </div>

                {/* Earned Revenue */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {fmtCompact(wip.earnedRevenue)}
                    </p>
                    {wipEarnedData ? (
                      <Sparkline data={wipEarnedData} color="#34d399" width={48} height={20} />
                    ) : !trends ? (
                      <SparklineSkeleton width={48} height={20} />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Earned Revenue</p>
                  <p className="text-[10px] text-neutral-600">{fmtCurrency(wip.earnedRevenue)}</p>
                </div>

                {/* Active Jobs */}
                <div>
                  <p className="text-2xl font-bold text-neutral-100 tabular-nums">
                    {wip.activeJobs}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Active Jobs</p>
                </div>

                {/* RED Alerts */}
                <div>
                  {wip.redAlertCount > 0 ? (
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 -mx-3 -my-1.5 rounded-md border border-red-800/40"
                      style={{ animation: "red-alert-pulse 2s ease-in-out infinite" }}
                    >
                      <p className="text-2xl font-bold tabular-nums text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]">
                        {wip.redAlertCount}
                      </p>
                      <AlertTriangle size={16} className="text-red-400 drop-shadow-[0_0_4px_rgba(248,113,113,0.5)]" />
                    </span>
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-neutral-400">
                      {wip.redAlertCount}
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-500 mt-0.5">RED Alerts</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Financial Health ─────────────────── */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-800/50 hover:shadow-[0_8px_24px_-6px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-950/40">
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
                Financial Health
              </h2>
            </div>
            <a
              href="/admin/financials"
              className="text-xs text-neutral-500 hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              Details <ArrowRight size={12} />
            </a>
          </div>

          {financialsLoading ? (
            <FinancialSkeleton />
          ) : financialsError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">Financial data unavailable</p>
            </div>
          ) : !financials || (financials.arTotal === null && financials.netIncome === null) ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">No financial data imported yet</p>
              <a
                href="/admin/financials"
                className="mt-2 text-xs text-primary-400 hover:text-primary-300"
              >
                Upload financial reports
              </a>
            </div>
          ) : (
            <div className="space-y-5">
              {/* AR Total */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-blue-400 tabular-nums">
                    {fmtCompact(financials.arTotal)}
                  </p>
                  {arSparkData && arSparkData.length >= 1 ? (
                    <Sparkline data={arSparkData} color="#60a5fa" width={56} height={22} />
                  ) : !trends ? (
                    <SparklineSkeleton width={56} height={22} />
                  ) : null}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-neutral-500">Accounts Receivable</p>
                  {financials.arDate && (
                    <span className="text-[10px] text-neutral-600">
                      as of {formatShortDate(financials.arDate)}
                    </span>
                  )}
                </div>
                {financials.arTotal !== null && (
                  <p className="text-[10px] text-neutral-600">{fmtCurrency(financials.arTotal)}</p>
                )}
              </div>

              {/* Net Income */}
              <div>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      financials.netIncome !== null && financials.netIncome >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {fmtCompact(financials.netIncome)}
                  </p>
                  {niSparkData && niSparkData.length >= 1 ? (
                    <Sparkline
                      data={niSparkData}
                      color={financials.netIncome !== null && financials.netIncome >= 0 ? "#34d399" : "#f87171"}
                      width={56}
                      height={22}
                    />
                  ) : !trends ? (
                    <SparklineSkeleton width={56} height={22} />
                  ) : null}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-neutral-500">Net Income</p>
                  {financials.isDate && (
                    <span className="text-[10px] text-neutral-600">
                      as of {formatShortDate(financials.isDate)}
                    </span>
                  )}
                </div>
                {financials.netIncome !== null && (
                  <p className="text-[10px] text-neutral-600">{fmtCurrency(financials.netIncome)}</p>
                )}
              </div>

              {/* Reconciliation Health */}
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold tabular-nums ${reconColor}`}>
                    {financials.reconMatches}/{financials.reconTotal}
                  </p>
                  {financials.reconMatches === financials.reconTotal ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : financials.reconMatches >= 3 ? (
                    <AlertTriangle size={16} className="text-amber-400" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-400" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Reconciliation Matches
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Jobs & Invoices Summary ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jobs Card */}
        <a
          href="/admin/jobs"
          className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">Jobs</h3>
            <ArrowRight size={14} className="ml-auto text-neutral-600 group-hover:text-neutral-400 transition-colors" />
          </div>
          {(jobStats?.totalJobs ?? 0) === 0 ? (
            <div className="flex items-center gap-3 py-1">
              <Briefcase size={20} className="text-neutral-600" />
              <p className="text-sm text-neutral-500">No jobs synced yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-lg font-bold text-neutral-100">{jobStats?.totalJobs ?? 0}</p>
                <p className="text-[11px] text-neutral-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-100">{jobStats?.openJobs ?? 0}</p>
                <p className="text-[11px] text-neutral-500">Open</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-400">{jobStats?.needsTaxClassification ?? 0}</p>
                <p className="text-[11px] text-neutral-500">Needs Tax Class.</p>
              </div>
            </div>
          )}
        </a>

        {/* Invoices Card */}
        <a
          href="/admin/invoices"
          className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">Invoices</h3>
            <ArrowRight size={14} className="ml-auto text-neutral-600 group-hover:text-neutral-400 transition-colors" />
          </div>
          {(invoiceStats?.totalInvoices ?? 0) === 0 ? (
            <div className="flex items-center gap-3 py-1">
              <FileText size={20} className="text-neutral-600" />
              <div>
                <p className="text-sm text-neutral-500">No invoices entered yet</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">Import invoices to track billing</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-lg font-bold text-neutral-100">{invoiceStats?.totalInvoices ?? 0}</p>
                <p className="text-[11px] text-neutral-500">Total Entered</p>
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-100">{fmtCompact(invoiceStats?.totalAmount ?? 0)}</p>
                <p className="text-[11px] text-neutral-500">Total Amount</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{invoiceStats?.thisMonthCount ?? 0}</p>
                <p className="text-[11px] text-neutral-500">This Month</p>
              </div>
            </div>
          )}
        </a>
      </div>

      {/* ── Bottom Row: Recent Activity + Recent Leads ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity Feed */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonLine width="w-8" height="h-8" />
                  <div className="flex-1 space-y-1">
                    <SkeletonLine width="w-3/4" height="h-3" />
                    <SkeletonLine width="w-20" height="h-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">No recent activity</p>
              <p className="text-xs text-neutral-600 mt-1">
                Actions like lead updates and imports will show here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {activity.map((event, idx) => (
                <a
                  key={idx}
                  href={event.link}
                  className="flex items-center gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-neutral-700/30 transition-colors group"
                >
                  <ActivityIcon type={event.event_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-300 truncate group-hover:text-neutral-100 transition-colors">
                      {event.description}
                    </p>
                  </div>
                  <span className="text-[11px] text-neutral-600 whitespace-nowrap tabular-nums">
                    {timeAgo(event.event_time)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads Mini-Table */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
              Recent Leads
            </h2>
            <a
              href="/admin/leads"
              className="text-xs text-neutral-500 hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </a>
          </div>
          {recentLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700/50">
                    <th className="text-left text-[11px] font-medium text-neutral-500 uppercase tracking-wider pb-2">
                      Name
                    </th>
                    <th className="text-left text-[11px] font-medium text-neutral-500 uppercase tracking-wider pb-2 hidden sm:table-cell">
                      Email
                    </th>
                    <th className="text-left text-[11px] font-medium text-neutral-500 uppercase tracking-wider pb-2">
                      Status
                    </th>
                    <th className="text-right text-[11px] font-medium text-neutral-500 uppercase tracking-wider pb-2">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-neutral-700/30 last:border-0"
                    >
                      <td className="py-2 text-sm text-neutral-200">{lead.name}</td>
                      <td className="py-2 text-sm text-neutral-400 hidden sm:table-cell">
                        {lead.email}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full ${statusBadge(lead.status)}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm text-neutral-500 text-right tabular-nums">
                        {timeAgo(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={24} className="text-neutral-600 mb-2" />
              <p className="text-sm text-neutral-500">No leads yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Leads from the contact form will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
