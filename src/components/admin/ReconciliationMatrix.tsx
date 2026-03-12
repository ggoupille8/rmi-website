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
  if (val === null || val === undefined) return "—";
  return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
      <div className="text-center py-12 text-neutral-500">
        Select a month to view reconciliation
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-neutral-400">
        <Loader2 size={20} className="animate-spin" />
        Loading reconciliation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
        <p className="text-red-400 mb-3">{error}</p>
        {reportDate && (
          <button
            onClick={() => fetchReconciliation(reportDate)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const tieOuts = data.tieOuts || [];
  const matchCount = tieOuts.filter((t) => t.status === "match").length;
  const varianceCount = tieOuts.filter((t) => t.status === "variance").length;
  const missingCount = tieOuts.filter((t) => t.status === "missing_data").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {matchCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">
            <CheckCircle size={14} /> {matchCount} Match{matchCount !== 1 ? "es" : ""}
          </span>
        )}
        {varianceCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
            <AlertCircle size={14} /> {varianceCount} Variance{varianceCount !== 1 ? "s" : ""}
          </span>
        )}
        {missingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-500/15 text-neutral-400 border border-neutral-500/20">
            <HelpCircle size={14} /> {missingCount} Missing
          </span>
        )}
      </div>

      {/* Data sources */}
      <div className="flex gap-4 flex-wrap text-xs text-neutral-500">
        {data.dataSources.arAging && <span>AR: {data.dataSources.arAging.filename}</span>}
        {data.dataSources.balanceSheet && <span>BS: {data.dataSources.balanceSheet.filename}</span>}
        {data.dataSources.incomeStatement && <span>IS: {data.dataSources.incomeStatement.filename}</span>}
        {data.dataSources.wip && <span>WIP: {data.dataSources.wip.month}/{data.dataSources.wip.year}</span>}
      </div>

      {/* Tie-out table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-700">
              <th className="pb-2 pr-4 font-medium">Tie-Out</th>
              <th className="pb-2 pr-4 font-medium">Source A</th>
              <th className="pb-2 pr-4 font-medium text-right">Value</th>
              <th className="pb-2 pr-4 font-medium">Source B</th>
              <th className="pb-2 pr-4 font-medium text-right">Value</th>
              <th className="pb-2 pr-4 font-medium text-right">Variance</th>
              <th className="pb-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {tieOuts.map((t, i) => (
              <tr key={i} className="hover:bg-neutral-800/30">
                <td className="py-2.5 pr-4 text-neutral-200 font-medium">{t.description}</td>
                <td className="py-2.5 pr-4 text-neutral-400 text-xs">{t.sourceA.name}</td>
                <td className="py-2.5 pr-4 text-right text-neutral-200 tabular-nums">{fmt(t.sourceA.value)}</td>
                <td className="py-2.5 pr-4 text-neutral-400 text-xs">{t.sourceB.name}</td>
                <td className="py-2.5 pr-4 text-right text-neutral-200 tabular-nums">{fmt(t.sourceB.value)}</td>
                <td className={`py-2.5 pr-4 text-right tabular-nums ${
                  t.status === "variance" ? "text-red-400" : "text-neutral-400"
                }`}>
                  {t.variance !== null ? fmt(t.variance) : "—"}
                </td>
                <td className="py-2.5 text-center">
                  {t.status === "match" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400">
                      <CheckCircle size={12} /> Match
                    </span>
                  )}
                  {t.status === "variance" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">
                      <AlertCircle size={12} /> Variance
                    </span>
                  )}
                  {t.status === "missing_data" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-500/15 text-neutral-500">
                      <HelpCircle size={12} /> Missing
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
