import { useState, useEffect } from "react";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, FileText } from "lucide-react";
import ProfitLossReport from "./ProfitLossReport";
import BalanceSheetReport from "./BalanceSheetReport";

interface AnnualIS {
  period_end_date: string;
  total_income: string;
  total_cost_of_sales: string;
  gross_margin: string;
  total_expenses: string;
  net_income: string;
}

interface AnnualBS {
  report_date: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  net_income: string;
  ar_balance: string;
  ar_retainage: string;
  costs_in_excess: string;
  billings_in_excess: string;
}

interface BsEntry {
  account_number: string | null;
  account_name: string;
  amount: string;
  section: string;
  is_subtotal: boolean;
}

interface OverviewData {
  currentYear: AnnualIS | null;
  priorYear: AnnualIS | null;
  balanceSheet: AnnualBS | null;
  balanceSheetEntries: BsEntry[];
}

function num(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "number" ? val : parseFloat(val) || 0;
}

function fmtLarge(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    const millions = Math.abs(val / 1_000_000);
    const str = "$" + millions.toFixed(1) + "M";
    return val < 0 ? `(${str})` : str;
  }
  if (abs >= 1_000) {
    const thousands = Math.abs(val / 1_000);
    const str = "$" + thousands.toFixed(0) + "K";
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

export default function FinancialOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/financials?action=annual_overview")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((d: OverviewData) => setData(d))
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

  const hasAnnualData = !!data?.currentYear;
  const revenue = hasAnnualData ? num(data.currentYear!.total_income) : 0;
  const grossProfit = hasAnnualData ? num(data.currentYear!.gross_margin) : 0;
  const netIncome = hasAnnualData ? num(data.currentYear!.net_income) : 0;

  const prevRevenue = data?.priorYear ? num(data.priorYear.total_income) : null;
  const prevGrossProfit = data?.priorYear ? num(data.priorYear.gross_margin) : null;
  const prevNetIncome = data?.priorYear ? num(data.priorYear.net_income) : null;

  const currentYear = hasAnnualData
    ? new Date(data.currentYear!.period_end_date.split("T")[0] + "T00:00:00").getFullYear()
    : new Date().getFullYear();
  const priorYear = data?.priorYear
    ? new Date(data.priorYear.period_end_date.split("T")[0] + "T00:00:00").getFullYear()
    : currentYear - 1;

  function yoyChange(current: number, prior: number | null): { pct: string; positive: boolean } | null {
    if (prior === null || prior === 0) return null;
    const change = ((current - prior) / Math.abs(prior)) * 100;
    return { pct: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`, positive: change >= 0 };
  }

  return (
    <div className="space-y-8">
      {/* Annual Hero KPIs */}
      {hasAnnualData ? (
        <div>
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
            FY {currentYear} Annual Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HeroKPI
              label="Annual Revenue"
              value={fmtLarge(revenue)}
              fullValue={fmtFull(revenue)}
              change={yoyChange(revenue, prevRevenue)}
              priorYear={priorYear}
              accent="blue"
            />
            <HeroKPI
              label="Gross Profit"
              value={fmtLarge(grossProfit)}
              fullValue={fmtFull(grossProfit)}
              change={yoyChange(grossProfit, prevGrossProfit)}
              priorYear={priorYear}
              accent="emerald"
              subValue={revenue > 0 ? `${((grossProfit / revenue) * 100).toFixed(1)}% margin` : undefined}
            />
            <HeroKPI
              label="Net Income"
              value={fmtLarge(netIncome)}
              fullValue={fmtFull(netIncome)}
              change={yoyChange(netIncome, prevNetIncome)}
              priorYear={priorYear}
              accent={netIncome >= 0 ? "emerald" : "red"}
              subValue={revenue > 0 ? `${((netIncome / revenue) * 100).toFixed(1)}% net margin` : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
          <FileText size={28} className="mx-auto mb-2 text-neutral-600" />
          <p className="text-neutral-400 text-sm">No year-end financial data available</p>
          <p className="text-neutral-600 text-xs mt-1">Upload December Income Statement &amp; Balance Sheet PDFs</p>
        </div>
      )}

      {/* P&L Summary (self-fetching, includes revenue trend chart) */}
      <ProfitLossReport />

      {/* Balance Sheet */}
      {data?.balanceSheet && data.balanceSheetEntries.length > 0 && (
        <BalanceSheetReport
          snapshot={data.balanceSheet}
          entries={data.balanceSheetEntries}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Hero KPI Card
// ─────────────────────────────────────────────

type Accent = "blue" | "emerald" | "red";

interface HeroKPIProps {
  label: string;
  value: string;
  fullValue: string;
  change: { pct: string; positive: boolean } | null;
  priorYear: number;
  accent: Accent;
  subValue?: string;
}

function HeroKPI({ label, value, fullValue, change, priorYear, accent, subValue }: HeroKPIProps) {
  const borderColor: Record<Accent, string> = {
    blue: "border-l-blue-500",
    emerald: "border-l-emerald-500",
    red: "border-l-red-500",
  };

  return (
    <div
      className={`bg-neutral-900 border border-neutral-800 ${borderColor[accent]} border-l-2 rounded-xl p-6`}
    >
      <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">{label}</p>
      <p
        className="text-3xl font-bold text-neutral-50 tabular-nums tracking-tight mt-2"
        title={fullValue}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-sm text-neutral-400 mt-1">{subValue}</p>
      )}
      {change && (
        <div className="flex items-center gap-1.5 mt-3">
          {change.positive ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-sm font-medium ${change.positive ? "text-emerald-400" : "text-red-400"}`}>
            {change.pct}
          </span>
          <span className="text-xs text-neutral-600">vs {priorYear}</span>
        </div>
      )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-3">
              <div className="h-3 w-24 bg-neutral-800 rounded animate-pulse" />
              <div className="h-8 w-32 bg-neutral-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    </div>
  );
}
