import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import {
  Upload, BarChart3, GitCompare, ChevronDown, Loader2,
  AlertCircle, RefreshCw, FileText, Calendar, CheckCircle, AlertTriangle,
  XCircle, RotateCcw, Landmark,
} from "lucide-react";
import FinancialUpload from "./FinancialUpload";
import ReconciliationMatrix from "./ReconciliationMatrix";
import ProfitLossReport from "./financials/ProfitLossReport";
import BalanceSheetReport from "./financials/BalanceSheetReport";
import BorrowingBaseTrend from "./financials/BorrowingBaseTrend";
import DataCoverage from "./financials/DataCoverage";

type Tab = "upload" | "reports" | "reconciliation" | "borrowing_base";
type ReportSubTab = "ar_aging" | "balance_sheet" | "income_statement";

interface SnapshotRow {
  report_date?: string;
  period_end_date?: string;
  variant: string | null;
  source_filename: string;
  imported_at: string;
  customer_count?: number;
  account_count?: number;
  total_amount?: string;
  total_assets?: string;
  net_income?: string;
  validation_passed?: boolean;
}

interface MonthsData {
  arAging: SnapshotRow[];
  balanceSheet: SnapshotRow[];
  incomeStatement: SnapshotRow[];
  borrowingBase: SnapshotRow[];
}

// AR Aging detail types
interface ArEntry {
  customer_name: string;
  customer_code: string | null;
  total_amount: string;
  current_amount: string;
  over_30: string;
  over_60: string;
  over_90: string;
  over_120: string;
  retainage: string;
  total_past_due: string;
}

interface ArSnapshot {
  report_date: string;
  total_amount: string;
  total_current: string;
  total_retainage: string;
  customer_count: number;
}

// BS detail types
interface BsEntry {
  account_number: string | null;
  account_name: string;
  amount: string;
  section: string;
  is_subtotal: boolean;
}

interface BsSnapshot {
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

// IS detail types
interface IsEntry {
  account_number: string | null;
  account_name: string;
  current_activity: string | null;
  current_balance: string | null;
  section: string;
  is_subtotal: boolean;
}

interface IsSnapshot {
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

function fmt(val: string | number | null | undefined): string {
  const n = num(val);
  const abs = Math.abs(n);
  const formatted = "$" + abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${formatted})` : formatted;
}


function dateLabel(dateStr: string): string {
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const d = new Date(dateOnly + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function snapshotDate(row: SnapshotRow): string | undefined {
  return row.report_date || row.period_end_date;
}

function importedAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────
// Loading Skeletons
// ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[80, 60, 70, 55, 45, 65].map((w, i) => (
        <td key={i} className="py-2.5 pr-4">
          <div className="h-4 bg-neutral-800 rounded animate-pulse" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonKPI() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
      <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
      <div className="h-6 w-24 bg-neutral-800 rounded animate-pulse" />
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <SkeletonKPI key={i} />)}
      </div>
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              {[0, 1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-28 bg-neutral-800 rounded animate-pulse" />
      <div className="space-y-0">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-neutral-800/50">
            <div className="h-4 w-20 bg-neutral-800 rounded animate-pulse" />
            <div className="h-5 w-24 bg-neutral-800 rounded-full animate-pulse" />
            <div className="h-4 w-32 bg-neutral-800 rounded animate-pulse flex-1" />
            <div className="h-4 w-12 bg-neutral-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────

export default function FinancialDashboard() {
  const [tab, setTab] = useState<Tab>("upload");
  const [months, setMonths] = useState<MonthsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const fetchMonths = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/financials")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setMonths(d);
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          const allDates = [
            ...(d.arAging || []).map((s: SnapshotRow) => snapshotDate(s)),
            ...(d.balanceSheet || []).map((s: SnapshotRow) => snapshotDate(s)),
            ...(d.incomeStatement || []).map((s: SnapshotRow) => snapshotDate(s)),
            ...(d.borrowingBase || []).map((s: SnapshotRow) => snapshotDate(s)),
          ]
            .filter(Boolean)
            .map((dt: string) => dt.includes("T") ? dt.split("T")[0] : dt);
          const unique = [...new Set(allDates)].sort().reverse();
          if (unique.length > 0) setSelectedDate(unique[0]);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load financial data");
        setMonths({ arAging: [], balanceSheet: [], incomeStatement: [], borrowingBase: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);

  const allDates = months
    ? [
        ...months.arAging.map((s) => snapshotDate(s)),
        ...months.balanceSheet.map((s) => snapshotDate(s)),
        ...months.incomeStatement.map((s) => snapshotDate(s)),
        ...(months.borrowingBase || []).map((s) => snapshotDate(s)),
      ]
      .filter(Boolean)
      .map((d) => (d as string).includes("T") ? (d as string).split("T")[0] : d) as string[]
    : [];
  const uniqueDates = [...new Set(allDates)].sort().reverse();

  const tabs: { key: Tab; label: string; icon: typeof Upload }[] = [
    { key: "upload", label: "Upload", icon: Upload },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "borrowing_base", label: "Borrowing Base", icon: Landmark },
    { key: "reconciliation", label: "Reconciliation", icon: GitCompare },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <TabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {/* Month selector (for reports and reconciliation tabs) */}
      {tab !== "upload" && tab !== "borrowing_base" && uniqueDates.length > 0 && (
        <MonthSelector
          dates={uniqueDates}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="space-y-6">
          <FinancialUpload onUploadComplete={fetchMonths} />

          {loading && <HistorySkeleton />}

          {!loading && months && months.arAging.length === 0 && months.balanceSheet.length === 0 && months.incomeStatement.length === 0 && (months.borrowingBase || []).length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              <FileText size={24} className="mx-auto mb-2 text-neutral-600" />
              <p className="text-sm">No reports imported yet. Drop PDF files above to get started.</p>
            </div>
          )}

          {!loading && months && (months.arAging.length > 0 || months.balanceSheet.length > 0 || months.incomeStatement.length > 0 || (months.borrowingBase || []).length > 0) && (
            <ImportHistory months={months} onReimport={fetchMonths} />
          )}

          {!loading && <DataCoverage />}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/20 border border-red-900/40">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button
            onClick={fetchMonths}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Reports tab */}
      {tab === "reports" && loading && <ReportSkeleton />}
      {tab === "reports" && !loading && selectedDate && (
        <ReportsView reportDate={selectedDate} />
      )}
      {tab === "reports" && !loading && !selectedDate && (
        <div className="text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-neutral-400">No financial reports imported yet.</p>
          <p className="text-sm text-neutral-500 mt-1">Upload PDFs on the Upload tab to get started.</p>
        </div>
      )}

      {/* Borrowing Base tab */}
      {tab === "borrowing_base" && (
        <BorrowingBaseTrend />
      )}

      {/* Reconciliation tab */}
      {tab === "reconciliation" && (
        <ReconciliationMatrix reportDate={selectedDate} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Import History Table
// ─────────────────────────────────────────────

interface HistoryRow extends SnapshotRow {
  type: string;
  date: string | undefined;
  records: number | undefined;
}

interface ImportHistoryProps {
  months: MonthsData;
  onReimport: () => void;
}

function ImportHistory({ months, onReimport }: ImportHistoryProps) {
  const [reimporting, setReimporting] = useState<number | null>(null);

  const rows: HistoryRow[] = [
    ...months.arAging.map((s) => ({ ...s, type: "AR Aging", date: snapshotDate(s), records: s.customer_count })),
    ...months.balanceSheet.map((s) => ({ ...s, type: "Balance Sheet", date: snapshotDate(s), records: s.account_count })),
    ...months.incomeStatement.map((s) => ({ ...s, type: "Income Statement", date: snapshotDate(s), records: s.account_count })),
    ...(months.borrowingBase || []).map((s) => ({ ...s, type: "Borrowing Base", date: snapshotDate(s), records: 1 })),
  ].sort((a, b) => (b.imported_at ?? "").localeCompare(a.imported_at ?? ""));

  async function handleReimport(row: HistoryRow, index: number) {
    setReimporting(index);
    try {
      const res = await fetch("/api/admin/financial-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reimport: true,
          source_filename: row.source_filename,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, string>).error ?? `HTTP ${res.status}`);
      }
      onReimport();
    } catch {
      // Re-import failed silently - the upload tab will show current state
    } finally {
      setReimporting(null);
    }
  }

  function validationIcon(row: HistoryRow) {
    if (row.validation_passed === true) {
      return (
        <span title="Validation passed" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
          <CheckCircle size={14} className="text-emerald-400" />
        </span>
      );
    }
    if (row.validation_passed === false) {
      return (
        <span title="Validation failed" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10">
          <XCircle size={14} className="text-red-400" />
        </span>
      );
    }
    if (row.records && row.records > 0) {
      return (
        <span title="Data imported — not validated" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10">
          <AlertTriangle size={14} className="text-amber-400" />
        </span>
      );
    }
    return <span className="text-neutral-600">--</span>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Import History</h3>
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium text-right">Records</th>
                <th className="px-4 py-3 font-medium text-center">Valid</th>
                <th className="px-4 py-3 font-medium">Imported</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {rows.map((row, i) => (
                <tr key={i} className={`transition-colors hover:bg-neutral-800/40 ${i % 2 === 1 ? "bg-neutral-800/15" : ""}`}>
                  <td className="px-4 py-2.5 text-neutral-200 font-medium">
                    {row.date ? dateLabel(row.date) : "--"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      row.type === "AR Aging"
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                        : row.type === "Balance Sheet"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : row.type === "Borrowing Base"
                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-400 text-xs truncate max-w-[200px]" title={row.source_filename}>
                    {row.source_filename}
                  </td>
                  <td className="px-4 py-2.5 text-right text-neutral-200 tabular-nums">
                    {row.records ?? "--"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {validationIcon(row)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {row.imported_at ? (
                      <ImportedTimeCell importedAt={row.imported_at} />
                    ) : (
                      <span className="text-neutral-600">--</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleReimport(row, i)}
                      disabled={reimporting !== null}
                      title="Re-import this report"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 border border-transparent hover:border-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {reimporting === i ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RotateCcw size={12} />
                      )}
                      Re-import
                    </button>
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

// ─────────────────────────────────────────────
// Reports sub-view
// ─────────────────────────────────────────────

const reportCache = new Map<string, { ar: unknown; bs: unknown; is: unknown }>();

interface ReportsViewProps {
  reportDate: string;
}

function ReportsView({ reportDate }: ReportsViewProps) {
  const [arData, setArData] = useState<{ snapshot: ArSnapshot; entries: ArEntry[] } | null>(null);
  const [bsData, setBsData] = useState<{ snapshot: BsSnapshot; entries: BsEntry[] } | null>(null);
  const [isData, setIsData] = useState<{ snapshot: IsSnapshot; entries: IsEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<ReportSubTab>("ar_aging");

  const [arSort, setArSort] = useState<{ col: string; asc: boolean }>({ col: "total_amount", asc: false });

  useEffect(() => {
    const cached = reportCache.get(reportDate);
    if (cached) {
      setArData(cached.ar as typeof arData);
      setBsData(cached.bs as typeof bsData);
      setIsData(cached.is as typeof isData);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    Promise.all([
      fetch(`/api/admin/financials?action=detail&type=ar_aging&reportDate=${reportDate}`)
        .then((r) => r.json()).then((d) => d.error ? null : d).catch(() => null),
      fetch(`/api/admin/financials?action=detail&type=balance_sheet&reportDate=${reportDate}`)
        .then((r) => r.json()).then((d) => d.error ? null : d).catch(() => null),
      fetch(`/api/admin/financials?action=detail&type=income_statement&reportDate=${reportDate}`)
        .then((r) => r.json()).then((d) => d.error ? null : d).catch(() => null),
    ]).then(([ar, bs, is]) => {
      setArData(ar);
      setBsData(bs);
      setIsData(is);
      reportCache.set(reportDate, { ar, bs, is });
      if (!ar && !bs && !is) setFetchError("No report data found for this month");
    }).catch(() => {
      setFetchError("Failed to load reports");
    }).finally(() => setLoading(false));
  }, [reportDate]);

  if (loading) return <ReportSkeleton />;

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-400">{fetchError}</p>
      </div>
    );
  }

  const sortedArEntries = arData
    ? [...arData.entries].sort((a, b) => {
        const col = arSort.col as keyof ArEntry;
        const aVal = col === "customer_name" ? a[col] : num(a[col]);
        const bVal = col === "customer_name" ? b[col] : num(b[col]);
        if (typeof aVal === "string" && typeof bVal === "string") {
          return arSort.asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return arSort.asc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      })
    : [];

  function toggleArSort(col: string) {
    setArSort((prev) => ({
      col,
      asc: prev.col === col ? !prev.asc : col === "customer_name",
    }));
  }

  const reportSubTabs: { key: ReportSubTab; label: string; color: string; hasData: boolean }[] = [
    { key: "ar_aging", label: "AR Aging", color: "blue", hasData: !!arData },
    { key: "balance_sheet", label: "Balance Sheet", color: "emerald", hasData: !!bsData },
    { key: "income_statement", label: "Income Statement", color: "amber", hasData: !!isData },
  ];

  const activeTabColor = reportSubTabs.find((t) => t.key === subTab)?.color ?? "blue";
  const activeColors: Record<string, string> = {
    blue: "border-blue-500/40 text-blue-400 bg-blue-600/10",
    emerald: "border-emerald-500/40 text-emerald-400 bg-emerald-600/10",
    amber: "border-amber-500/40 text-amber-400 bg-amber-600/10",
  };
  const dotColors: Record<string, string> = {
    blue: "bg-blue-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
  };
  void activeTabColor; // used for styling context

  return (
    <div className="space-y-5">
      {/* Report sub-tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {reportSubTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
              subTab === t.key
                ? activeColors[t.color]
                : "border-neutral-700/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 hover:border-neutral-600"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              subTab === t.key ? dotColors[t.color] : t.hasData ? "bg-neutral-500" : "bg-neutral-700"
            }`} />
            {t.label}
            {!t.hasData && <span className="text-[10px] text-neutral-600">(none)</span>}
          </button>
        ))}
      </div>

      {/* AR Aging view */}
      {subTab === "ar_aging" && (
        arData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total AR" value={fmt(arData.snapshot.total_amount)} />
              <KPI label="Current" value={fmt(arData.snapshot.total_current)} />
              <KPI label="Retainage" value={fmt(arData.snapshot.total_retainage)} />
              <KPI
                label="90+ Days"
                value={fmt(sortedArEntries.reduce((s, e) => s + num(e.over_90) + num(e.over_120), 0))}
                warn
              />
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-800">
                      {[
                        { key: "customer_name", label: "Customer", align: "left" },
                        { key: "total_amount", label: "Total", align: "right" },
                        { key: "current_amount", label: "Current", align: "right" },
                        { key: "over_30", label: ">30", align: "right" },
                        { key: "over_60", label: ">60", align: "right" },
                        { key: "over_90", label: ">90", align: "right" },
                        { key: "over_120", label: ">120", align: "right" },
                        { key: "retainage", label: "Retainage", align: "right" },
                      ].map((h) => (
                        <th
                          key={h.key}
                          onClick={() => toggleArSort(h.key)}
                          className={`px-4 py-3 font-medium cursor-pointer hover:text-neutral-300 transition-colors ${
                            h.align === "right" ? "text-right" : ""
                          } ${arSort.col === h.key ? "text-blue-400" : ""}`}
                        >
                          {h.label}
                          {arSort.col === h.key && (
                            <span className="ml-1">{arSort.asc ? "\u25B2" : "\u25BC"}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {sortedArEntries.map((e, i) => {
                      const pastDue90 = num(e.over_90) + num(e.over_120);
                      const isOverdue = pastDue90 > 0;
                      return (
                        <tr
                          key={i}
                          className={`transition-colors ${
                            isOverdue
                              ? "bg-red-950/15 hover:bg-red-950/25"
                              : "hover:bg-neutral-800/30"
                          }`}
                        >
                          <td className="px-4 py-2 text-neutral-200 font-medium">
                            {e.customer_name}
                            {e.customer_code && (
                              <span className="text-neutral-600 text-xs ml-1.5">({e.customer_code})</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-neutral-100">
                            {fmt(e.total_amount)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-neutral-300">
                            {fmt(e.current_amount)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-neutral-300">
                            {fmt(e.over_30)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-neutral-300">
                            {fmt(e.over_60)}
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                            num(e.over_90) > 0 ? "text-red-400" : "text-neutral-300"
                          }`}>
                            {fmt(e.over_90)}
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                            num(e.over_120) > 0 ? "text-red-400" : "text-neutral-300"
                          }`}>
                            {fmt(e.over_120)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-neutral-300">
                            {fmt(e.retainage)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <EmptyReportState type="AR Aging" />
        )
      )}

      {/* Balance Sheet view */}
      {subTab === "balance_sheet" && (
        bsData ? (
          <BalanceSheetReport snapshot={bsData.snapshot} entries={bsData.entries} />
        ) : (
          <EmptyReportState type="Balance Sheet" />
        )
      )}

      {/* Income Statement / P&L view */}
      {subTab === "income_statement" && (
        <ProfitLossReport />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface EmptyReportStateProps {
  type: string;
}

function EmptyReportState({ type }: EmptyReportStateProps) {
  return (
    <div className="text-center py-12 bg-neutral-900/30 border border-neutral-800/50 rounded-lg">
      <FileText size={28} className="mx-auto mb-2 text-neutral-600" />
      <p className="text-neutral-400 text-sm">No {type} data for this month</p>
      <p className="text-neutral-600 text-xs mt-1">Upload a PDF on the Upload tab</p>
    </div>
  );
}

interface KPIProps {
  label: string;
  value: string;
  warn?: boolean;
}

function KPI({ label, value, warn }: KPIProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${warn ? "text-red-400" : "text-neutral-100"}`}>
        {value}
      </p>
    </div>
  );
}

interface MonthSelectorProps {
  dates: string[];
  selected: string | null;
  onSelect: (d: string) => void;
}

function MonthSelector({
  dates,
  selected,
  onSelect,
}: MonthSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 hover:bg-neutral-750 hover:border-neutral-600 transition-colors"
      >
        <Calendar size={16} className="text-blue-400" />
        <span className="font-medium">
          {selected ? dateLabel(selected) : "Select Month"}
        </span>
        <ChevronDown size={14} className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-30 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-[300px] overflow-y-auto min-w-[200px]">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { onSelect(d); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  d === selected
                    ? "bg-blue-600/15 text-blue-400 font-medium"
                    : "text-neutral-300"
                }`}
              >
                {dateLabel(d)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Imported Time with Tooltip
// ─────────────────────────────────────────────

interface ImportedTimeCellProps {
  importedAt: string;
}

function ImportedTimeCell({ importedAt }: ImportedTimeCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const fullDate = new Date(importedAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <span
      className="relative text-neutral-500 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {importedAgo(importedAt)}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-neutral-200 bg-neutral-700 border border-neutral-600 rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none">
          {fullDate}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-700" />
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────
// Animated Tab Bar
// ─────────────────────────────────────────────

interface TabBarProps {
  tabs: { key: Tab; label: string; icon: typeof Upload }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function TabBar({
  tabs,
  activeTab,
  onTabChange,
}: TabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<Tab, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = tabRefs.current.get(activeTab);
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="relative flex gap-1 p-1 bg-neutral-800/50 rounded-lg border border-neutral-700/50 w-fit"
    >
      {/* Sliding underline indicator */}
      <div
        className="absolute bottom-0 h-0.5 bg-blue-400 rounded-full transition-all duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            ref={(el) => { if (el) tabRefs.current.set(t.key, el); }}
            onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-blue-600/20 text-blue-400"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50"
            }`}
          >
            <Icon size={16} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
