import { useState, useEffect } from "react";
import { Database, CheckCircle, XCircle } from "lucide-react";

interface CoverageData {
  months: string[];
  coverage: Record<string, Record<string, boolean>>;
  totals: Record<string, number>;
  completeMonths: number;
}

const REPORT_TYPES = ["IS", "BS", "AR", "BBC", "WIP"] as const;

const TYPE_LABELS: Record<string, string> = {
  IS: "Income Statement",
  BS: "Balance Sheet",
  AR: "AR Aging",
  BBC: "Borrowing Base",
  WIP: "WIP",
};

const TYPE_COLORS: Record<string, string> = {
  IS: "bg-amber-500",
  BS: "bg-emerald-500",
  AR: "bg-blue-500",
  BBC: "bg-purple-500",
  WIP: "bg-cyan-500",
};

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function DataCoverage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/financials?action=coverage")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: CoverageData) => setData(d))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load coverage");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 text-sm text-red-400">
        Failed to load data coverage: {error}
      </div>
    );
  }

  if (!data || data.months.length === 0) {
    return null;
  }

  const totalRecords = Object.values(data.totals).reduce((s, n) => s + n, 0);

  // Build summary parts
  const summaryParts: string[] = [];
  if (data.completeMonths > 0) {
    summaryParts.push(`${data.completeMonths} complete month${data.completeMonths !== 1 ? "s" : ""}`);
  }
  if (data.totals.BBC > 0) summaryParts.push(`${data.totals.BBC} BBC records`);
  if (data.totals.WIP > 0) summaryParts.push(`${data.totals.WIP} WIP snapshots`);
  const isBsCount = data.totals.IS + data.totals.BS;
  if (isBsCount > 0) summaryParts.push(`${isBsCount} IS/BS snapshots`);
  if (data.totals.AR > 0) summaryParts.push(`${data.totals.AR} AR snapshots`);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <Database size={14} />
          Data Coverage
        </h3>
        <span className="text-xs text-neutral-500">
          {totalRecords} total records across {data.months.length} months
        </span>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-3 py-2.5 font-medium sticky left-0 bg-neutral-900/90 backdrop-blur-sm z-10">
                  Type
                </th>
                {data.months.map((m) => {
                  const allPresent = REPORT_TYPES.every((t) => data.coverage[m]?.[t]);
                  return (
                    <th
                      key={m}
                      className={`px-2 py-2.5 font-medium text-center whitespace-nowrap ${
                        allPresent ? "text-emerald-500" : ""
                      }`}
                    >
                      {monthLabel(m)}
                    </th>
                  );
                })}
                <th className="px-3 py-2.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {REPORT_TYPES.map((type) => {
                const typeMonthCount = data.months.filter(
                  (m) => data.coverage[m]?.[type]
                ).length;
                return (
                  <tr key={type} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-neutral-900/90 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[type]}`} />
                        <span className="text-neutral-200 font-medium">{type}</span>
                        <span className="text-neutral-600 text-xs hidden sm:inline">
                          {TYPE_LABELS[type]}
                        </span>
                      </div>
                    </td>
                    {data.months.map((m) => {
                      const present = data.coverage[m]?.[type] ?? false;
                      return (
                        <td key={m} className="px-2 py-2 text-center">
                          {present ? (
                            <span className={`inline-block w-5 h-5 rounded ${TYPE_COLORS[type]}/20 flex items-center justify-center mx-auto`}>
                              <CheckCircle size={13} className={`${TYPE_COLORS[type].replace("bg-", "text-")}`} />
                            </span>
                          ) : (
                            <span className="inline-block w-5 h-5 rounded bg-neutral-800/50 flex items-center justify-center mx-auto">
                              <XCircle size={13} className="text-neutral-700" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-300 font-medium">
                      {typeMonthCount}/{data.months.length}
                    </td>
                  </tr>
                );
              })}
              {/* Completeness row */}
              <tr className="border-t border-neutral-700/50 bg-neutral-800/20">
                <td className="px-3 py-2 sticky left-0 bg-neutral-800/40 backdrop-blur-sm z-10">
                  <span className="text-neutral-400 font-medium text-xs uppercase tracking-wider">
                    Complete
                  </span>
                </td>
                {data.months.map((m) => {
                  const count = REPORT_TYPES.filter(
                    (t) => data.coverage[m]?.[t]
                  ).length;
                  const allPresent = count === REPORT_TYPES.length;
                  return (
                    <td key={m} className="px-2 py-2 text-center">
                      <span
                        className={`inline-block text-xs font-bold tabular-nums ${
                          allPresent
                            ? "text-emerald-400"
                            : count >= 3
                            ? "text-amber-400"
                            : count > 0
                            ? "text-red-400"
                            : "text-neutral-700"
                        }`}
                      >
                        {count}/5
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right">
                  <span className={`text-xs font-bold tabular-nums ${
                    data.completeMonths > 0 ? "text-emerald-400" : "text-neutral-500"
                  }`}>
                    {data.completeMonths}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary line */}
      <p className="text-xs text-neutral-500 px-1">
        {summaryParts.join(", ")}.
      </p>
    </div>
  );
}
