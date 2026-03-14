import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

function dateLabel(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface ChartData {
  month: string;
  revenue: number;
  netIncome: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <p className="text-neutral-400 text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="tabular-nums" style={{ color: entry.color }}>
          {entry.name}: ${Math.abs(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

interface Props {
  snapshots: PlSnapshot[];
}

export default function RevenueTrendChart({ snapshots }: Props) {
  const chartData: ChartData[] = snapshots.map((s) => ({
    month: dateLabel(s.period_end_date),
    revenue: num(s.total_income),
    netIncome: num(s.net_income),
  }));

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5 fin-no-print-chart">
      <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
        Revenue & Net Income Trend
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#737373", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 12 }}
              axisLine={{ stroke: "#404040" }}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="netIncome" name="Net Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Net Income
        </span>
      </div>
    </div>
  );
}
