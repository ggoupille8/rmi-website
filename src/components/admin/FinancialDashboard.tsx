import { useState, useEffect, useCallback } from "react";
import { Upload, BarChart3, GitCompare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import FinancialUpload from "./FinancialUpload";
import ReconciliationMatrix from "./ReconciliationMatrix";

type Tab = "upload" | "reports" | "reconciliation";

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
}

interface MonthsData {
  arAging: SnapshotRow[];
  balanceSheet: SnapshotRow[];
  incomeStatement: SnapshotRow[];
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

function fmtInt(val: string | number | null | undefined): string {
  const n = num(val);
  const abs = Math.abs(n);
  const formatted = "$" + abs.toLocaleString();
  return n < 0 ? `(${formatted})` : formatted;
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function FinancialDashboard() {
  const [tab, setTab] = useState<Tab>("upload");
  const [months, setMonths] = useState<MonthsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchMonths = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/financials")
      .then((r) => r.json())
      .then((d) => {
        setMonths(d);
        // Auto-select the most recent date
        const allDates = [
          ...d.arAging.map((s: SnapshotRow) => s.report_date),
          ...d.balanceSheet.map((s: SnapshotRow) => s.report_date),
          ...d.incomeStatement.map((s: SnapshotRow) => s.period_end_date),
        ].filter(Boolean) as string[];
        const unique = [...new Set(allDates)].sort().reverse();
        if (unique.length > 0 && !selectedDate) setSelectedDate(unique[0]);
      })
      .catch(() => setMonths({ arAging: [], balanceSheet: [], incomeStatement: [] }))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);

  // Collect unique dates for the month selector
  const allDates = months
    ? [
        ...months.arAging.map((s) => s.report_date),
        ...months.balanceSheet.map((s) => s.report_date),
        ...months.incomeStatement.map((s) => s.period_end_date),
      ].filter(Boolean) as string[]
    : [];
  const uniqueDates = [...new Set(allDates)].sort().reverse();

  const tabs: { key: Tab; label: string; icon: typeof Upload }[] = [
    { key: "upload", label: "Upload", icon: Upload },
    { key: "reports", label: "Reports", icon: BarChart3 },
    { key: "reconciliation", label: "Reconciliation", icon: GitCompare },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-neutral-800/50 rounded-lg border border-neutral-700/50 w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 border border-transparent"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Month selector (for reports and reconciliation tabs) */}
      {tab !== "upload" && uniqueDates.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-400">Month:</label>
          <select
            value={selectedDate ?? ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {uniqueDates.map((d) => (
              <option key={d} value={d}>{dateLabel(d)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="space-y-6">
          <FinancialUpload onUploadComplete={fetchMonths} />

          {/* Upload history */}
          {months && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300">Import History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-700">
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Variant</th>
                      <th className="pb-2 pr-4 font-medium">File</th>
                      <th className="pb-2 pr-4 font-medium text-right">Records</th>
                      <th className="pb-2 font-medium">Imported</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {[
                      ...months.arAging.map((s) => ({ ...s, type: "AR Aging", date: s.report_date, records: s.customer_count })),
                      ...months.balanceSheet.map((s) => ({ ...s, type: "Balance Sheet", date: s.report_date, records: s.account_count })),
                      ...months.incomeStatement.map((s) => ({ ...s, type: "Income Statement", date: s.period_end_date, records: s.account_count })),
                    ]
                      .sort((a, b) => (b.imported_at ?? "").localeCompare(a.imported_at ?? ""))
                      .map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-800/30">
                          <td className="py-2 pr-4 text-neutral-200">{row.date ? dateLabel(row.date) : "—"}</td>
                          <td className="py-2 pr-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              row.type === "AR Aging" ? "bg-blue-500/15 text-blue-400" :
                              row.type === "Balance Sheet" ? "bg-emerald-500/15 text-emerald-400" :
                              "bg-amber-500/15 text-amber-400"
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-neutral-400 text-xs">{row.variant ?? "standard"}</td>
                          <td className="py-2 pr-4 text-neutral-400 text-xs truncate max-w-[200px]">{row.source_filename}</td>
                          <td className="py-2 pr-4 text-right text-neutral-200 tabular-nums">{row.records ?? "—"}</td>
                          <td className="py-2 text-neutral-500 text-xs">
                            {row.imported_at ? new Date(row.imported_at).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports tab */}
      {tab === "reports" && selectedDate && (
        <ReportsView reportDate={selectedDate} />
      )}

      {/* Reconciliation tab */}
      {tab === "reconciliation" && (
        <ReconciliationMatrix reportDate={selectedDate} />
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-neutral-400">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Reports sub-view
// ─────────────────────────────────────────────

function ReportsView({ reportDate }: { reportDate: string }) {
  const [arData, setArData] = useState<{ snapshot: ArSnapshot; entries: ArEntry[] } | null>(null);
  const [bsData, setBsData] = useState<{ snapshot: BsSnapshot; entries: BsEntry[] } | null>(null);
  const [isData, setIsData] = useState<{ snapshot: IsSnapshot; entries: IsEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const [arOpen, setArOpen] = useState(true);
  const [bsOpen, setBsOpen] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  const [arSort, setArSort] = useState<{ col: string; asc: boolean }>({ col: "customer_name", asc: true });

  useEffect(() => {
    setLoading(true);
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
    }).finally(() => setLoading(false));
  }, [reportDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-neutral-400">
        <Loader2 size={18} className="animate-spin" />
        Loading reports...
      </div>
    );
  }

  // AR Aging sorting
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

  return (
    <div className="space-y-6">
      {/* AR Aging */}
      <CollapsibleSection
        title="AR Aging"
        open={arOpen}
        onToggle={() => setArOpen(!arOpen)}
        badge={arData ? `${arData.snapshot.customer_count} customers` : null}
        color="blue"
      >
        {arData ? (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total AR" value={fmt(arData.snapshot.total_amount)} />
              <KPI label="Current" value={fmt(arData.snapshot.total_current)} />
              <KPI label="Retainage" value={fmt(arData.snapshot.total_retainage)} />
              <KPI label="90+ Days" value={
                fmt(sortedArEntries.reduce((s, e) => s + num(e.over_90) + num(e.over_120), 0))
              } warn />
            </div>

            {/* Customer table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-400 border-b border-neutral-700">
                    {[
                      { key: "customer_name", label: "Customer" },
                      { key: "total_amount", label: "Total" },
                      { key: "current_amount", label: "Current" },
                      { key: "over_30", label: ">30" },
                      { key: "over_60", label: ">60" },
                      { key: "over_90", label: ">90" },
                      { key: "over_120", label: ">120" },
                      { key: "retainage", label: "Retainage" },
                    ].map((h) => (
                      <th
                        key={h.key}
                        onClick={() => toggleArSort(h.key)}
                        className={`pb-2 pr-3 font-medium cursor-pointer hover:text-neutral-200 ${
                          h.key !== "customer_name" ? "text-right" : ""
                        }`}
                      >
                        {h.label}
                        {arSort.col === h.key && (arSort.asc ? " \u25B2" : " \u25BC")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {sortedArEntries.map((e, i) => {
                    const pastDue = num(e.over_90) + num(e.over_120);
                    return (
                      <tr key={i} className={`hover:bg-neutral-800/30 ${pastDue > 0 ? "text-amber-200" : ""}`}>
                        <td className="py-1.5 pr-3 text-neutral-200">
                          {e.customer_name}
                          {e.customer_code && <span className="text-neutral-500 text-xs ml-1">({e.customer_code})</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(e.total_amount)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(e.current_amount)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(e.over_30)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(e.over_60)}</td>
                        <td className={`py-1.5 pr-3 text-right tabular-nums ${num(e.over_90) > 0 ? "text-red-400" : ""}`}>
                          {fmt(e.over_90)}
                        </td>
                        <td className={`py-1.5 pr-3 text-right tabular-nums ${num(e.over_120) > 0 ? "text-red-400" : ""}`}>
                          {fmt(e.over_120)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(e.retainage)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm py-4">No AR Aging data for this month</p>
        )}
      </CollapsibleSection>

      {/* Balance Sheet */}
      <CollapsibleSection
        title="Balance Sheet"
        open={bsOpen}
        onToggle={() => setBsOpen(!bsOpen)}
        badge={bsData ? `${bsData.entries.filter((e) => !e.is_subtotal).length} accounts` : null}
        color="emerald"
      >
        {bsData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total Assets" value={fmt(bsData.snapshot.total_assets)} />
              <KPI label="Total Liabilities" value={fmt(bsData.snapshot.total_liabilities)} />
              <KPI label="Equity" value={fmt(bsData.snapshot.total_equity)} />
              <KPI label="Net Income" value={fmt(bsData.snapshot.net_income)} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-400 border-b border-neutral-700">
                    <th className="pb-2 pr-4 font-medium">Account</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {bsData.entries.map((e, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-neutral-800/30 ${e.is_subtotal ? "font-semibold" : ""}`}
                    >
                      <td className="py-1.5 pr-4 text-neutral-500 text-xs tabular-nums">
                        {e.account_number ?? ""}
                      </td>
                      <td className={`py-1.5 pr-4 ${e.is_subtotal ? "text-neutral-100" : "text-neutral-300"}`}>
                        {e.is_subtotal ? "" : "\u00A0\u00A0"}{e.account_name}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-neutral-200">
                        {fmt(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm py-4">No Balance Sheet data for this month</p>
        )}
      </CollapsibleSection>

      {/* Income Statement */}
      <CollapsibleSection
        title="Income Statement"
        open={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={isData ? `${isData.entries.filter((e) => !e.is_subtotal).length} accounts` : null}
        color="amber"
      >
        {isData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPI label="Revenue" value={fmtInt(isData.snapshot.total_income)} />
              <KPI label="COGS" value={fmtInt(isData.snapshot.total_cost_of_sales)} />
              <KPI label="Gross Margin" value={fmtInt(isData.snapshot.gross_margin)} />
              <KPI label="Expenses" value={fmtInt(isData.snapshot.total_expenses)} />
              <KPI label="Net Income" value={fmtInt(isData.snapshot.net_income)} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-400 border-b border-neutral-700">
                    <th className="pb-2 pr-4 font-medium">Account</th>
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 font-medium text-right">Activity</th>
                    <th className="pb-2 font-medium text-right">Balance (YTD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {isData.entries.map((e, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-neutral-800/30 ${e.is_subtotal ? "font-semibold" : ""}`}
                    >
                      <td className="py-1.5 pr-4 text-neutral-500 text-xs tabular-nums">
                        {e.account_number ?? ""}
                      </td>
                      <td className={`py-1.5 pr-4 ${e.is_subtotal ? "text-neutral-100" : "text-neutral-300"}`}>
                        {e.is_subtotal ? "" : "\u00A0\u00A0"}{e.account_name}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-neutral-200">
                        {e.current_activity !== null ? fmtInt(e.current_activity) : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-neutral-200">
                        {e.current_balance !== null ? fmtInt(e.current_balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm py-4">No Income Statement data for this month</p>
        )}
      </CollapsibleSection>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function CollapsibleSection({
  title,
  open,
  onToggle,
  badge,
  color,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge: string | null;
  color: "blue" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const borderColor = {
    blue: "border-blue-500/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
  }[color];

  const badgeColor = {
    blue: "bg-blue-500/15 text-blue-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
  }[color];

  return (
    <div className={`border ${borderColor} rounded-lg bg-neutral-900/50`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
          {badge && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function KPI({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30">
      <p className="text-xs text-neutral-400 mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${warn ? "text-red-400" : "text-neutral-100"}`}>
        {value}
      </p>
    </div>
  );
}
