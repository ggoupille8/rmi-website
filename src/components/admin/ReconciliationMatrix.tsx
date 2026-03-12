import { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertCircle, HelpCircle, Loader2, RefreshCw } from "lucide-react";

interface TieOut {
  description: string;
  sourceA: { name: string; value: number | null };
  sourceB: { name: string; value: number | null };
  variance: number | null;
  status: "match" | "variance" | "missing_data";
}

interface ReconciliationData {
  reportDate: string;
  tieOuts: TieOut[];
  dataSources: {
    arAging: { date: string; filename: string } | null;
    balanceSheet: { date: string; filename: string } | null;
    incomeStatement: { date: string; filename: string } | null;
    wip: { year: number; month: number } | null;
  };
}

function fmt(val: number | null): string {
  if (val === null || val === undefined) return "--";
  const abs = Math.abs(val);
  const formatted = "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val < 0 ? `(${formatted})` : formatted;
}

const MATCH_THRESHOLD = 5.0;

// ─────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────

function ReconciliationSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full border-4 border-neutral-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 w-56 bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-b border-neutral-800/50">
                {[0, 1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-neutral-800 rounded animate-pulse" style={{ width: `${50 + (j * 7) % 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Health Score Ring
// ─────────────────────────────────────────────

function HealthScoreRing({ matched, total }: { matched: number; total: number }) {
  const pct = total > 0 ? (matched / total) * 100 : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const ringColor = pct === 100
    ? "stroke-emerald-400"
    : pct >= 60
    ? "stroke-amber-400"
    : "stroke-red-400";

  const textColor = pct === 100
    ? "text-emerald-400"
    : pct >= 60
    ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          strokeWidth="5"
          className="stroke-neutral-800"
        />
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${ringColor} transition-all duration-700`}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textColor}`}>
        {matched}/{total}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ReconciliationMatrix({ reportDate }: { reportDate: string | null }) {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReconciliation = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/financials?action=reconciliation&reportDate=${date}`);
      if (!r.ok) throw new Error(`Server error: ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reconciliation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!reportDate) return;
    fetchReconciliation(reportDate);
  }, [reportDate, fetchReconciliation]);

  if (!reportDate) {
    return (
      <div className="text-center py-12 text-neutral-500 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
        <HelpCircle size={28} className="mx-auto mb-2 text-neutral-600" />
        <p className="text-sm">Select a month to view reconciliation</p>
      </div>
    );
  }

  if (loading) return <ReconciliationSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
        <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button
          onClick={() => fetchReconciliation(reportDate)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const tieOuts = data.tieOuts || [];
  const matchCount = tieOuts.filter((t) => t.status === "match").length;
  const varianceCount = tieOuts.filter((t) => t.status === "variance").length;
  const missingCount = tieOuts.filter((t) => t.status === "missing_data").length;
  const scorableCount = tieOuts.filter((t) => t.status !== "missing_data").length;
  void scorableCount;

  return (
    <div className="space-y-5">
      {/* Health score card */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center gap-5">
          <HealthScoreRing matched={matchCount} total={tieOuts.length} />
          <div>
            <h3 className="text-neutral-100 font-semibold">
              {matchCount === tieOuts.length
                ? "All tie-outs match"
                : `${matchCount} of ${tieOuts.length} tie-outs match`}
            </h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              {varianceCount > 0 && (
                <span className="text-amber-400">{varianceCount} variance{varianceCount !== 1 ? "s" : ""}</span>
              )}
              {varianceCount > 0 && missingCount > 0 && <span className="text-neutral-600"> / </span>}
              {missingCount > 0 && (
                <span className="text-neutral-400">{missingCount} missing data</span>
              )}
              {varianceCount === 0 && missingCount === 0 && matchCount > 0 && (
                <span className="text-emerald-400">Clean reconciliation</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Data sources */}
      <div className="flex gap-3 flex-wrap">
        {data.dataSources.arAging && (
          <SourceBadge label="AR Aging" filename={data.dataSources.arAging.filename} color="blue" />
        )}
        {data.dataSources.balanceSheet && (
          <SourceBadge label="Balance Sheet" filename={data.dataSources.balanceSheet.filename} color="emerald" />
        )}
        {data.dataSources.incomeStatement && (
          <SourceBadge label="Income Stmt" filename={data.dataSources.incomeStatement.filename} color="amber" />
        )}
        {data.dataSources.wip && (
          <SourceBadge label="WIP" filename={`${data.dataSources.wip.month}/${data.dataSources.wip.year}`} color="purple" />
        )}
      </div>

      {/* Tie-out table */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-4 py-3 font-medium">Tie-Out</th>
                <th className="px-4 py-3 font-medium">Source A</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium">Source B</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {tieOuts.map((t, i) => {
                const rowBg = t.status === "match"
                  ? "bg-emerald-950/10 border-b border-emerald-900/20"
                  : t.status === "variance"
                  ? "bg-red-950/15 border-b border-red-900/20"
                  : "bg-neutral-800/20 border-b border-neutral-800/50";

                return (
                  <tr key={i} className={`${rowBg} hover:brightness-110 transition-all`}>
                    <td className="px-4 py-3 text-neutral-200 font-medium">{t.description}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">{t.sourceA.name}</td>
                    <td className="px-4 py-3 text-right text-neutral-200 tabular-nums">{fmt(t.sourceA.value)}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">{t.sourceB.name}</td>
                    <td className="px-4 py-3 text-right text-neutral-200 tabular-nums">{fmt(t.sourceB.value)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${
                      t.status === "variance" ? "text-red-400 font-semibold" : "text-neutral-500"
                    }`}>
                      {t.variance !== null ? fmt(t.variance) : "--"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status === "match" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={12} /> Match
                        </span>
                      )}
                      {t.status === "variance" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                          <AlertCircle size={12} /> Variance
                        </span>
                      )}
                      {t.status === "missing_data" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-500/15 text-neutral-400 border border-neutral-500/20">
                          <HelpCircle size={12} /> No Data
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Threshold footnote */}
        <div className="px-4 py-2.5 border-t border-neutral-800/50 bg-neutral-900/30">
          <p className="text-[11px] text-neutral-600">
            Match threshold: &le;${MATCH_THRESHOLD.toFixed(2)} variance is treated as a match
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SourceBadge({ label, filename, color }: { label: string; filename: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${colors[color] ?? colors.blue}`}>
      <span className="font-medium">{label}:</span>
      <span className="text-neutral-400 truncate max-w-[150px]" title={filename}>{filename}</span>
    </span>
  );
}
