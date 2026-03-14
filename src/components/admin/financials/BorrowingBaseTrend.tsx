import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { AlertCircle, Landmark, Loader2 } from "lucide-react";

interface BbcRow {
  id: number;
  report_date: string;
  gross_ar: string;
  ar_over_90: string;
  eligible_ar: string;
  ar_advance_rate: string;
  ar_availability: string;
  gross_inventory: string;
  inventory_advance_rate: string;
  inventory_availability: string;
  total_borrowing_base: string;
  amount_borrowed: string;
  excess_availability: string;
  source_file: string;
  imported_at: string;
}

interface ChartPoint {
  month: string;
  eligibleAr: number;
  totalBase: number;
}

interface TableRow {
  month: string;
  eligibleAr: number;
  ineligibleAr: number;
  totalBase: number;
  advanceRate: number;
}

function num(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  return typeof val === "number" ? val : parseFloat(val) || 0;
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const formatted = "$" + abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${formatted})` : formatted;
}

function pct(val: number): string {
  return (val * 100).toFixed(1) + "%";
}

function dateLabel(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
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

export default function BorrowingBaseTrend() {
  const [data, setData] = useState<BbcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/financials?action=borrowing_base")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d.records ?? []))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-neutral-500" />
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

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
        <Landmark size={28} className="mx-auto mb-2 text-neutral-600" />
        <p className="text-neutral-400 text-sm">No Borrowing Base data imported yet</p>
        <p className="text-neutral-600 text-xs mt-1">Upload BBC PDFs on the Upload tab</p>
      </div>
    );
  }

  const chartData: ChartPoint[] = data.map((row) => ({
    month: dateLabel(row.report_date),
    eligibleAr: num(row.eligible_ar),
    totalBase: num(row.total_borrowing_base),
  }));

  const tableRows: TableRow[] = [...data].reverse().map((row) => {
    const grossAr = num(row.gross_ar);
    const eligibleAr = num(row.eligible_ar);
    return {
      month: dateLabel(row.report_date),
      eligibleAr,
      ineligibleAr: grossAr - eligibleAr,
      totalBase: num(row.total_borrowing_base),
      advanceRate: num(row.ar_advance_rate),
    };
  });

  return (
    <div className="space-y-5">
      {/* Line chart */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Borrowing Base Trend
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : `$${(v / 1_000).toFixed(0)}k`
                }
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="plainline"
                wrapperStyle={{ fontSize: 12, color: "#737373", paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="eligibleAr"
                name="Eligible AR"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="totalBase"
                name="Total Borrowing Base"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium text-right">Eligible AR</th>
                <th className="px-4 py-3 font-medium text-right">Ineligible AR</th>
                <th className="px-4 py-3 font-medium text-right">Borrowing Base</th>
                <th className="px-4 py-3 font-medium text-right">Advance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {tableRows.map((row) => (
                <tr key={row.month} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-neutral-200 font-medium">{row.month}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
                    {fmt(row.eligibleAr)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
                    {fmt(row.ineligibleAr)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-neutral-100">
                    {fmt(row.totalBase)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-300">
                    {pct(row.advanceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
