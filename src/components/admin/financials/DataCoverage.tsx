import { useState, useEffect } from "react";
import { Database, ChevronDown } from "lucide-react";

interface CoverageData {
  months: string[];
  coverage: Record<string, Record<string, boolean>>;
  totals: Record<string, number>;
  completeMonths: number;
}

const REPORT_TYPES = ["IS", "BS", "AR", "BBC", "WIP"] as const;

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function yearOf(ym: string): string {
  return ym.split("-")[0];
}

export default function DataCoverage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/financials?action=coverage")
      .then((r) => {
        if (!r.ok) throw new Error();
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

  const sortedMonths = [...data.months].sort().reverse();

  const yearGroups: Record<string, string[]> = {};
  for (const m of sortedMonths) {
    const y = yearOf(m);
    if (!yearGroups[y]) yearGroups[y] = [];
    yearGroups[y].push(m);
  }
  const years = Object.keys(yearGroups).sort().reverse();

  const summaryParts: string[] = [];
  if (data.completeMonths > 0) {
    summaryParts.push(`${data.completeMonths} complete`);
  }
  for (const t of REPORT_TYPES) {
    if (data.totals[t] > 0) summaryParts.push(`${t}: ${data.totals[t]}`);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full group"
      >
        <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <Database size={14} />
          Data Coverage
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {summaryParts.join(" | ")}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-3 py-2.5 text-left font-medium w-28">Month</th>
                {REPORT_TYPES.map((t) => (
                  <th key={t} className="px-3 py-2.5 text-center font-medium w-16">{t}</th>
                ))}
                <th className="px-3 py-2.5 text-right font-medium w-12" />
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <YearGroup
                  key={year}
                  year={year}
                  months={yearGroups[year]}
                  coverage={data.coverage}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface YearGroupProps {
  year: string;
  months: string[];
  coverage: Record<string, Record<string, boolean>>;
}

function YearGroup({ year, months, coverage }: YearGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const completeInYear = months.filter((m) =>
    REPORT_TYPES.every((t) => coverage[m]?.[t])
  ).length;

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className="border-t border-neutral-700/50 bg-neutral-800/30 cursor-pointer hover:bg-neutral-800/50 transition-colors"
      >
        <td colSpan={7} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              {year}
            </span>
            <span className="text-xs text-neutral-600">
              {months.length} month{months.length !== 1 ? "s" : ""}
              {completeInYear > 0 && (
                <span className="text-emerald-500 ml-1">
                  ({completeInYear} complete)
                </span>
              )}
            </span>
          </div>
        </td>
      </tr>

      {expanded && months.map((m) => {
        const c = coverage[m] ?? {};
        const count = REPORT_TYPES.filter((t) => c[t]).length;
        const isComplete = count === REPORT_TYPES.length;

        return (
          <tr
            key={m}
            className={`hover:bg-neutral-800/30 transition-colors ${isComplete ? "bg-emerald-500/5" : ""}`}
          >
            <td className="px-3 py-1.5">
              <span className={isComplete ? "text-emerald-300" : "text-neutral-300"}>
                {monthLabel(m)}
              </span>
            </td>
            {REPORT_TYPES.map((t) => (
              <td key={t} className="px-3 py-1.5 text-center">
                {c[t] ? (
                  <span className="text-emerald-400 text-sm" title={`${t} data present`}>&#9679;</span>
                ) : (
                  <span className="text-neutral-700 text-sm" title={`${t} data missing`}>&#9675;</span>
                )}
              </td>
            ))}
            <td className="px-3 py-1.5 text-right">
              {isComplete && (
                <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">
                  Complete
                </span>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
