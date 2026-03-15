import { useState, useEffect } from "react";
import {
  Loader2, AlertCircle, TrendingUp, TrendingDown,
  CheckCircle, Clock, Database, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AnnualData {
  year: number;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  grossMargin: number;
  netIncome: number;
  netMargin: number;
  priorYear: { revenue: number | null; grossProfit: number | null; netIncome: number | null } | null;
}

interface YtdData {
  year: number;
  month: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
  priorYearSameMonth: { revenue: number; grossProfit: number; netIncome: number } | null;
}

interface ArAgingData {
  date: string;
  totalAR: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  retainage: number;
}

interface BorrowingBaseData {
  date: string;
  eligibleAR: number;
  totalBase: number;
  advanceRate: number;
  amountBorrowed: number;
  excessAvailability: number;
}

interface TrendPoint {
  month: string;
  revenue: number;
  netIncome: number;
}

interface ReconciliationData {
  matches: number;
  total: number;
  latestDate: string | null;
}

interface DataFreshness {
  latestIS: string | null;
  latestBS: string | null;
  latestAR: string | null;
  latestBBC: string | null;
  latestWIP: string | null;
}

interface OverviewResponse {
  annual: AnnualData | null;
  ytd: YtdData | null;
  arAging: ArAgingData | null;
  borrowingBase: BorrowingBaseData | null;
  revenueTrend: TrendPoint[];
  reconciliation: ReconciliationData;
  dataFreshness: DataFreshness;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmtCompact(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    const m = Math.abs(val / 1_000_000);
    const str = "$" + m.toFixed(1) + "M";
    return val < 0 ? `(${str})` : str;
  }
  if (abs >= 1_000) {
    const k = Math.abs(val / 1_000);
    const str = "$" + k.toFixed(0) + "K";
    return val < 0 ? `(${str})` : str;
  }
  const formatted = "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return val < 0 ? `(${formatted})` : formatted;
}

function fmtFull(val: number): string {
  const abs = Math.abs(val);
  const formatted = "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return val < 0 ? `(${formatted})` : formatted;
}

function pctChange(current: number, prior: number | null): { pct: string; positive: boolean } | null {
  if (prior === null || prior === 0) return null;
  const change = ((current - prior) / Math.abs(prior)) * 100;
  return { pct: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, positive: change >= 0 };
}

function dateLabel(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-neutral-400 text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-neutral-200 font-medium tabular-nums">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: {fmtFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function FinancialOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/financials?action=overview")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((d: OverviewResponse) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <OverviewSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { annual, ytd, arAging, borrowingBase, revenueTrend, reconciliation, dataFreshness } = data;

  return (
    <div className="space-y-8">
      {/* Annual KPI Cards */}
      {annual ? (
        <div>
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
            FY {annual.year} Annual Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Annual Revenue"
              value={fmtCompact(annual.revenue)}
              fullValue={fmtFull(annual.revenue)}
              change={pctChange(annual.revenue, annual.priorYear?.revenue ?? null)}
              accent="blue"
            />
            <KPICard
              label="Gross Profit"
              value={fmtCompact(annual.grossProfit)}
              fullValue={fmtFull(annual.grossProfit)}
              change={pctChange(annual.grossProfit, annual.priorYear?.grossProfit ?? null)}
              accent="emerald"
              subValue={`${annual.grossMargin.toFixed(1)}% margin`}
            />
            <KPICard
              label="Net Income"
              value={fmtCompact(annual.netIncome)}
              fullValue={fmtFull(annual.netIncome)}
              change={pctChange(annual.netIncome, annual.priorYear?.netIncome ?? null)}
              accent={annual.netIncome >= 0 ? "emerald" : "red"}
              subValue={`${annual.netMargin.toFixed(1)}% net margin`}
            />
            {ytd ? (
              <YTDCard ytd={ytd} />
            ) : (
              <KPICard
                label="YTD"
                value="--"
                fullValue="No YTD data"
                accent="neutral"
                subValue="Awaiting January data"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
          <Database size={28} className="mx-auto mb-2 text-neutral-600" />
          <p className="text-neutral-400 text-sm">No year-end financial data available</p>
          <p className="text-neutral-600 text-xs mt-1">Upload December Income Statement PDFs</p>
        </div>
      )}

      {/* Cash & Receivables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AR Aging Breakdown */}
        {arAging ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">AR Aging Breakdown</h3>
              <span className="text-xs text-neutral-600">{dateLabel(arAging.date)}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-50 tabular-nums mb-4">{fmtFull(arAging.totalAR)}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { bucket: "Current", amount: arAging.current, fill: "#22c55e" },
                    { bucket: "30 Day", amount: arAging.days30, fill: "#eab308" },
                    { bucket: "60 Day", amount: arAging.days60, fill: "#f97316" },
                    { bucket: "90+ Day", amount: arAging.days90Plus, fill: "#ef4444" },
                    { bucket: "Retainage", amount: Math.abs(arAging.retainage), fill: "#8b5cf6" },
                  ]}
                  margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="bucket" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtCompact(v)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <EmptyCard title="AR Aging" message="No AR aging data available" />
        )}

        {/* Borrowing Base */}
        {borrowingBase ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Borrowing Base</h3>
              <span className="text-xs text-neutral-600">{dateLabel(borrowingBase.date)}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-50 tabular-nums mb-1">{fmtFull(borrowingBase.totalBase)}</p>
            <p className="text-xs text-neutral-500 mb-5">Total Borrowing Base</p>

            {/* Capacity bar */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Utilized</span>
                  <span>{borrowingBase.totalBase > 0
                    ? `${((borrowingBase.amountBorrowed / borrowingBase.totalBase) * 100).toFixed(0)}%`
                    : "0%"}
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${borrowingBase.totalBase > 0
                        ? Math.min((borrowingBase.amountBorrowed / borrowingBase.totalBase) * 100, 100)
                        : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-neutral-500">Eligible AR</p>
                  <p className="text-sm font-medium text-neutral-200 tabular-nums">{fmtFull(borrowingBase.eligibleAR)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Advance Rate</p>
                  <p className="text-sm font-medium text-neutral-200 tabular-nums">{borrowingBase.advanceRate.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Amount Borrowed</p>
                  <p className="text-sm font-medium text-neutral-200 tabular-nums">{fmtFull(borrowingBase.amountBorrowed)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Excess Availability</p>
                  <p className="text-sm font-medium text-emerald-400 tabular-nums">{fmtFull(borrowingBase.excessAvailability)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyCard title="Borrowing Base" message="No borrowing base data available" />
        )}
      </div>

      {/* Trend Charts Row */}
      {revenueTrend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Revenue Trend</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtCompact(v)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={{ r: 4, fill: "#3b82f6", stroke: "#1e1e1e", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profitability Trend */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Profitability Trend</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtCompact(v)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="netIncome"
                    name="Net Income"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#profitGrad)"
                    dot={{ r: 4, fill: "#22c55e", stroke: "#1e1e1e", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reconciliation Status */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            {reconciliation.total > 0 && reconciliation.matches === reconciliation.total ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-amber-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-200">Reconciliation Status</p>
              {reconciliation.total > 0 ? (
                <p className={`text-sm ${reconciliation.matches === reconciliation.total ? "text-emerald-400" : "text-amber-400"}`}>
                  {reconciliation.matches}/{reconciliation.total} Matches
                </p>
              ) : (
                <p className="text-sm text-neutral-500">No reconciliation data</p>
              )}
              {reconciliation.latestDate && (
                <p className="text-xs text-neutral-600 mt-0.5">Latest: {dateLabel(reconciliation.latestDate)}</p>
              )}
            </div>
            <ArrowRight size={16} className="text-neutral-600 shrink-0" />
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">Data Freshness</p>
              <p className="text-xs text-neutral-500">Latest imported data</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {[
              { label: "Income Statement", val: dataFreshness.latestIS },
              { label: "Balance Sheet", val: dataFreshness.latestBS },
              { label: "AR Aging", val: dataFreshness.latestAR },
              { label: "Borrowing Base", val: dataFreshness.latestBBC },
              { label: "WIP", val: dataFreshness.latestWIP },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between py-1">
                <span className="text-neutral-500">{label}</span>
                <span className={val ? "text-neutral-300" : "text-neutral-700"}>{val ?? "None"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────

type Accent = "blue" | "emerald" | "red" | "neutral";

interface KPICardProps {
  label: string;
  value: string;
  fullValue: string;
  change?: { pct: string; positive: boolean } | null;
  accent: Accent;
  subValue?: string;
}

function KPICard({ label, value, fullValue, change, accent, subValue }: KPICardProps) {
  const borderColor: Record<Accent, string> = {
    blue: "border-l-blue-500",
    emerald: "border-l-emerald-500",
    red: "border-l-red-500",
    neutral: "border-l-neutral-600",
  };

  return (
    <div className={`bg-neutral-900 border border-neutral-800 ${borderColor[accent]} border-l-2 rounded-xl p-5`}>
      <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-2xl font-bold text-neutral-50 tabular-nums tracking-tight mt-1.5" title={fullValue}>
        {value}
      </p>
      {subValue && <p className="text-sm text-neutral-400 mt-1">{subValue}</p>}
      {change && (
        <div className="flex items-center gap-1.5 mt-2">
          {change.positive ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-sm font-medium ${change.positive ? "text-emerald-400" : "text-red-400"}`}>
            {change.pct}
          </span>
          <span className="text-xs text-neutral-600">vs prior year</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// YTD Card
// ─────────────────────────────────────────────

interface YTDCardProps {
  ytd: YtdData;
}

function YTDCard({ ytd }: YTDCardProps) {
  const revenueChange = ytd.priorYearSameMonth
    ? pctChange(ytd.revenue, ytd.priorYearSameMonth.revenue)
    : null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 border-l-2 border-l-amber-500 rounded-xl p-5">
      <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
        YTD {ytd.year} ({ytd.month})
      </p>
      <p className="text-2xl font-bold text-neutral-50 tabular-nums tracking-tight mt-1.5">
        {fmtCompact(ytd.revenue)}
      </p>
      <p className="text-sm text-neutral-400 mt-1">
        Net: {fmtCompact(ytd.netIncome)}
      </p>
      {revenueChange && (
        <div className="flex items-center gap-1.5 mt-2">
          {revenueChange.positive ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-sm font-medium ${revenueChange.positive ? "text-emerald-400" : "text-red-400"}`}>
            {revenueChange.pct}
          </span>
          <span className="text-xs text-neutral-600">vs {ytd.month} {ytd.year - 1}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty Card
// ─────────────────────────────────────────────

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex items-center justify-center">
      <div className="text-center">
        <Database size={24} className="mx-auto mb-2 text-neutral-600" />
        <p className="text-sm text-neutral-400">{title}</p>
        <p className="text-xs text-neutral-600 mt-1">{message}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-4 w-48 bg-neutral-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
              <div className="h-3 w-24 bg-neutral-800 rounded animate-pulse" />
              <div className="h-7 w-28 bg-neutral-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse mb-4" />
            <div className="h-48 bg-neutral-800/50 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    </div>
  );
}
