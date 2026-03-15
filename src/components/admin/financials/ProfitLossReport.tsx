import { useState, useEffect } from "react";
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Minus, Printer } from "lucide-react";
import RevenueTrendChart from "./RevenueTrendChart";

interface PlSnapshot {
  period_end_date: string;
  total_income: string;
  total_cost_of_sales: string;
  gross_margin: string;
  total_expenses: string;
  net_income: string;
}

function num(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "number" ? val : parseFloat(val) || 0;
}

function fmt(val: number): string {
  const abs = Math.abs(val);
  const formatted =
    "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return val < 0 ? `(${formatted})` : formatted;
}

function pct(current: number, previous: number): { value: number; label: string } | null {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return { value: change, label: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` };
}

function dateLabel(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  if (d.getMonth() === 11) return `FY ${d.getFullYear()}`;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function dateLabelLong(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  if (d.getMonth() === 11) return `FY ${d.getFullYear()}`;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface ChangeIndicatorProps {
  change: { value: number; label: string } | null;
}

function ChangeIndicator({ change }: ChangeIndicatorProps) {
  if (!change) return <span className="text-xs text-neutral-600">--</span>;
  const isPositive = change.value > 0;
  const isNegative = change.value < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-neutral-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {change.label}
    </span>
  );
}

/** For expense/COGS lines, a decrease is good (green) and an increase is bad (red) */
function ChangeIndicatorInverse({ change }: ChangeIndicatorProps) {
  if (!change) return <span className="text-xs text-neutral-600">--</span>;
  const isPositive = change.value > 0;
  const isNegative = change.value < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  // Inverse: increase in cost = red, decrease = green
  const color = isNegative ? "text-emerald-400" : isPositive ? "text-red-400" : "text-neutral-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {change.label}
    </span>
  );
}

export default function ProfitLossReport() {
  const [snapshots, setSnapshots] = useState<PlSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/financials?action=pl_summary&months=6")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((d: { snapshots: PlSnapshot[] }) => {
        setSnapshots(d.snapshots ?? []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load P&L data");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
        <AlertCircle size={28} className="mx-auto mb-2 text-neutral-600" />
        <p className="text-neutral-400 text-sm">No Income Statement data available</p>
        <p className="text-neutral-600 text-xs mt-1">Upload Income Statement PDFs on the Upload tab</p>
      </div>
    );
  }

  // Snapshots come DESC, reverse for chronological display in chart
  const chronological = [...snapshots].reverse();
  const current = snapshots[0];
  const previous = snapshots.length > 1 ? snapshots[1] : null;

  const revenue = num(current.total_income);
  const cogs = num(current.total_cost_of_sales);
  const grossProfit = num(current.gross_margin);
  const opex = num(current.total_expenses);
  const netIncome = num(current.net_income);

  const prevRevenue = previous ? num(previous.total_income) : 0;
  const prevCogs = previous ? num(previous.total_cost_of_sales) : 0;
  const prevGross = previous ? num(previous.gross_margin) : 0;
  const prevOpex = previous ? num(previous.total_expenses) : 0;
  const prevNet = previous ? num(previous.net_income) : 0;

  const grossMarginPct = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPct = revenue !== 0 ? (netIncome / revenue) * 100 : 0;

  const lineItems: {
    label: string;
    current: number;
    previous: number;
    inverse?: boolean;
    bold?: boolean;
    borderTop?: boolean;
  }[] = [
    { label: "Revenue", current: revenue, previous: prevRevenue },
    { label: "Cost of Goods Sold", current: cogs, previous: prevCogs, inverse: true },
    { label: "Gross Profit", current: grossProfit, previous: prevGross, bold: true, borderTop: true },
    { label: "Operating Expenses", current: opex, previous: prevOpex, inverse: true },
    { label: "Net Income", current: netIncome, previous: prevNet, bold: true, borderTop: true },
  ];

  return (
    <div className="fin-print-area space-y-6">
      {/* Print header (hidden on screen) */}
      <div className="fin-print-header hidden">
        <h1>Profit & Loss Summary</h1>
        <p>{dateLabelLong(current.period_end_date)}</p>
      </div>

      {/* Header with print button */}
      <div className="flex items-center justify-between fin-no-print">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
          P&L Summary - {dateLabelLong(current.period_end_date)}
        </h3>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          <Printer size={12} />
          Print
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <PlKpi label="Revenue" value={fmt(revenue)} change={pct(revenue, prevRevenue)} />
        <PlKpi label="COGS" value={fmt(cogs)} change={pct(cogs, prevCogs)} inverse />
        <PlKpi
          label="Gross Margin"
          value={`${grossMarginPct.toFixed(1)}%`}
          subValue={fmt(grossProfit)}
          change={pct(grossProfit, prevGross)}
        />
        <PlKpi label="OpEx" value={fmt(opex)} change={pct(opex, prevOpex)} inverse />
        <PlKpi
          label="Net Income"
          value={fmt(netIncome)}
          subValue={`${netMarginPct.toFixed(1)}% margin`}
          change={pct(netIncome, prevNet)}
          warn={netIncome < 0}
        />
      </div>

      {/* P&L Table with MoM comparison */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-4 py-3 font-medium">Line Item</th>
                <th className="px-4 py-3 font-medium text-right">
                  {dateLabel(current.period_end_date)}
                </th>
                {previous && (
                  <th className="px-4 py-3 font-medium text-right">
                    {dateLabel(previous.period_end_date)}
                  </th>
                )}
                <th className="px-4 py-3 font-medium text-right">Change</th>
                <th className="px-4 py-3 font-medium text-right">MoM %</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const change = previous ? pct(item.current, item.previous) : null;
                const diff = previous ? item.current - item.previous : 0;
                return (
                  <tr
                    key={item.label}
                    className={`transition-colors hover:bg-neutral-800/20 ${
                      item.bold ? "bg-neutral-800/40 border-y border-neutral-700/50" : "border-b border-neutral-800/30"
                    } ${item.borderTop ? "border-t border-neutral-700/50" : ""}`}
                  >
                    <td
                      className={`px-4 py-2.5 ${
                        item.bold ? "text-neutral-100 font-semibold" : "text-neutral-300"
                      }`}
                    >
                      {item.label}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        item.bold ? "text-neutral-100 font-semibold" : item.current < 0 ? "text-red-400" : "text-neutral-200"
                      }`}
                    >
                      {fmt(item.current)}
                    </td>
                    {previous && (
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-400">
                        {fmt(item.previous)}
                      </td>
                    )}
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums text-sm ${
                        diff > 0 ? (item.inverse ? "text-red-400" : "text-emerald-400") : diff < 0 ? (item.inverse ? "text-emerald-400" : "text-red-400") : "text-neutral-500"
                      }`}
                    >
                      {previous ? fmt(diff) : "--"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {item.inverse ? (
                        <ChangeIndicatorInverse change={change} />
                      ) : (
                        <ChangeIndicator change={change} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      {chronological.length >= 2 && (
        <RevenueTrendChart snapshots={chronological} />
      )}
    </div>
  );
}

function PlKpi({
  label,
  value,
  subValue,
  change,
  warn,
  inverse,
}: {
  label: string;
  value: string;
  subValue?: string;
  change: { value: number; label: string } | null;
  warn?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${warn ? "text-red-400" : "text-neutral-100"}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-neutral-500 mt-0.5">{subValue}</p>
      )}
      <div className="mt-1.5">
        {inverse ? <ChangeIndicatorInverse change={change} /> : <ChangeIndicator change={change} />}
      </div>
    </div>
  );
}
