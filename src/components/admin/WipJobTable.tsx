import { useState, useMemo, useCallback, Fragment } from "react";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Eye,
  EyeOff,
  ChevronRight,
  Download,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

export interface WipSnapshot {
  id: number;
  snapshot_year: number;
  snapshot_month: number;
  job_number: string;
  description: string | null;
  project_manager: string | null;
  is_hidden_in_source: boolean;
  contract_amount: number | null;
  change_orders: number | null;
  pending_change_orders: number | null;
  revised_contract: number | null;
  original_estimate: number | null;
  estimate_changes: number | null;
  pending_co_estimates: number | null;
  revised_estimate: number | null;
  gross_profit: number | null;
  gross_margin_pct: number | null;
  pct_complete: number | null;
  earned_revenue: number | null;
  costs_to_date: number | null;
  gross_profit_to_date: number | null;
  backlog_revenue: number | null;
  costs_to_complete: number | null;
  backlog_profit: number | null;
  billings_to_date: number | null;
  revenue_billing_excess: number | null;
  invoicing_remaining: number | null;
  revenue_excess: number | null;
  billings_excess: number | null;
}

interface WipJobTableProps {
  jobs: WipSnapshot[];
  mode: "admin" | "pm";
  currentPmCode?: string;
  onJobClick?: (job: WipSnapshot) => void;
}

type SortField = keyof WipSnapshot;
type SortDirection = "asc" | "desc";

// ── Formatters ─────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function fmtCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyFmt.format(val);
}

function fmtPct(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

// ── PM Colors ──────────────────────────────────────────

const PM_CODES = ["GG", "RG", "MD", "SB"] as const;

// ── Column Definitions ─────────────────────────────────

interface ColumnDef {
  key: SortField;
  label: string;
  width: string;
  format: "string" | "currency" | "percentage" | "pct-bar" | "currency-color";
  adminOnly?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "job_number", label: "Job #", width: "w-[100px]", format: "string" },
  { key: "description", label: "Description", width: "flex-1 min-w-[180px]", format: "string" },
  { key: "project_manager", label: "PM", width: "w-[50px]", format: "string" },
  { key: "pct_complete", label: "% Complete", width: "w-[100px]", format: "pct-bar" },
  { key: "revised_contract", label: "Revised Contract", width: "w-[130px]", format: "currency" },
  { key: "earned_revenue", label: "Earned Revenue", width: "w-[130px]", format: "currency" },
  { key: "backlog_revenue", label: "Backlog", width: "w-[130px]", format: "currency" },
  { key: "gross_profit", label: "Gross Profit", width: "w-[120px]", format: "currency-color", adminOnly: true },
  { key: "gross_margin_pct", label: "Margin %", width: "w-[80px]", format: "percentage", adminOnly: true },
  { key: "revenue_billing_excess", label: "Over/Under", width: "w-[120px]", format: "currency-color", adminOnly: true },
];

// ── Component ──────────────────────────────────────────

export default function WipJobTable({ jobs, mode, currentPmCode, onJobClick }: WipJobTableProps) {
  const [sortField, setSortField] = useState<SortField>("job_number");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [pmFilter, setPmFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "complete">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  // Clean up on unmount is handled by React

  const visibleColumns = useMemo(
    () => COLUMNS.filter((col) => mode === "admin" || !col.adminOnly),
    [mode]
  );

  // ── Filtering ────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // PM filter
      if (pmFilter !== "All" && job.project_manager !== pmFilter) return false;

      // Status filter
      if (statusFilter === "active" && job.pct_complete !== null && job.pct_complete >= 1.0) return false;
      if (statusFilter === "complete" && (job.pct_complete === null || job.pct_complete < 1.0)) return false;

      // Hidden filter
      if (!showHidden && job.is_hidden_in_source) return false;

      // Search filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matchJob = job.job_number.toLowerCase().includes(q);
        const matchDesc = job.description?.toLowerCase().includes(q) ?? false;
        if (!matchJob && !matchDesc) return false;
      }

      return true;
    });
  }, [jobs, pmFilter, statusFilter, showHidden, debouncedSearch]);

  // ── Sorting ──────────────────────────────────────────
  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
    return sorted;
  }, [filteredJobs, sortField, sortDir]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const toggleRow = useCallback((jobNumber: string) => {
    setExpandedRow((prev) => (prev === jobNumber ? null : jobNumber));
  }, []);

  // ── CSV Export ─────────────────────────────────────────
  const exportCsv = useCallback(() => {
    const csvColumns: { key: keyof WipSnapshot; label: string }[] = [
      { key: "job_number", label: "Job #" },
      { key: "description", label: "Description" },
      { key: "project_manager", label: "PM" },
      { key: "pct_complete", label: "% Complete" },
      { key: "revised_contract", label: "Revised Contract" },
      { key: "earned_revenue", label: "Earned Revenue" },
      { key: "backlog_revenue", label: "Backlog" },
      { key: "gross_profit", label: "Gross Profit" },
      { key: "gross_margin_pct", label: "Margin %" },
      { key: "revenue_billing_excess", label: "Over/Under" },
    ];

    const header = csvColumns.map((c) => c.label).join(",");
    const rows = sortedJobs.map((job) =>
      csvColumns
        .map((col) => {
          const val = job[col.key];
          if (val === null || val === undefined) return "";
          if (col.key === "pct_complete" || col.key === "gross_margin_pct") {
            return ((val as number) * 100).toFixed(1);
          }
          if (typeof val === "number") return val.toFixed(2);
          const str = String(val);
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wip-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedJobs]);

  // ── Row Styling ──────────────────────────────────────
  const getRowClass = (job: WipSnapshot, index: number): string => {
    if (job.gross_profit !== null && job.gross_profit < 0) {
      return "bg-red-900/20 hover:bg-red-900/30";
    }
    if (job.pct_complete !== null && job.pct_complete >= 1.0) {
      return "bg-green-900/10 hover:bg-green-900/20";
    }
    const stripe = index % 2 === 0 ? "bg-neutral-800/50" : "";
    return `${stripe} hover:bg-neutral-800/60`;
  };

  // ── Cell Rendering ───────────────────────────────────
  const renderCell = (job: WipSnapshot, col: ColumnDef): React.ReactNode => {
    const val = job[col.key];

    // PM mode: show "—" for other PMs' restricted financial fields
    if (mode === "pm" && col.adminOnly && job.project_manager !== currentPmCode) {
      return <span className="text-neutral-600">—</span>;
    }

    switch (col.format) {
      case "string":
        if (col.key === "description") {
          return (
            <span className="truncate block max-w-[300px]" title={String(val ?? "")}>
              {val ?? "—"}
            </span>
          );
        }
        return <span>{val ?? "—"}</span>;

      case "currency":
        return <span className="tabular-nums">{fmtCurrency(val as number | null)}</span>;

      case "currency-color": {
        const num = val as number | null;
        const color =
          num === null
            ? "text-neutral-500"
            : num < 0
              ? "text-red-400"
              : num > 0
                ? "text-emerald-400"
                : "text-neutral-300";
        return <span className={`tabular-nums ${color}`}>{fmtCurrency(num)}</span>;
      }

      case "percentage": {
        const num = val as number | null;
        const color =
          num === null
            ? "text-neutral-500"
            : num < 0
              ? "text-red-400"
              : "text-neutral-300";
        return <span className={`tabular-nums ${color}`}>{fmtPct(num)}</span>;
      }

      case "pct-bar": {
        const pct = val as number | null;
        if (pct === null) return <span className="text-neutral-500">—</span>;
        const displayPct = Math.min(pct * 100, 100);
        const barColor = pct > 1.0 ? "bg-amber-500" : "bg-emerald-500";
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${displayPct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-[42px] text-right">
              {(pct * 100).toFixed(0)}%
            </span>
          </div>
        );
      }

      default:
        return <span>{String(val ?? "—")}</span>;
    }
  };

  // ── Expanded Detail ──────────────────────────────────
  const renderExpandedDetail = (job: WipSnapshot) => (
    <tr className="bg-neutral-900/80">
      <td colSpan={visibleColumns.length} className="px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
          <DetailGroup title="Contract">
            <DetailRow label="Contract Amount" value={fmtCurrency(job.contract_amount)} />
            <DetailRow label="Change Orders" value={fmtCurrency(job.change_orders)} />
            <DetailRow label="Pending COs" value={fmtCurrency(job.pending_change_orders)} />
            <DetailRow label="Revised Contract" value={fmtCurrency(job.revised_contract)} highlight />
          </DetailGroup>

          <DetailGroup title="Estimates">
            <DetailRow label="Original Estimate" value={fmtCurrency(job.original_estimate)} />
            <DetailRow label="Estimate Changes" value={fmtCurrency(job.estimate_changes)} />
            <DetailRow label="Pending CO Est." value={fmtCurrency(job.pending_co_estimates)} />
            <DetailRow label="Revised Estimate" value={fmtCurrency(job.revised_estimate)} highlight />
          </DetailGroup>

          <DetailGroup title="Profitability">
            <DetailRow label="Gross Profit" value={fmtCurrency(job.gross_profit)} />
            <DetailRow label="Gross Margin" value={fmtPct(job.gross_margin_pct)} />
            <DetailRow label="% Complete" value={fmtPct(job.pct_complete)} />
            <DetailRow label="Earned Revenue" value={fmtCurrency(job.earned_revenue)} highlight />
          </DetailGroup>

          <DetailGroup title="Backlog & Billing">
            <DetailRow label="Costs to Date" value={fmtCurrency(job.costs_to_date)} />
            <DetailRow label="GP to Date" value={fmtCurrency(job.gross_profit_to_date)} />
            <DetailRow label="Backlog Revenue" value={fmtCurrency(job.backlog_revenue)} />
            <DetailRow label="Costs to Complete" value={fmtCurrency(job.costs_to_complete)} />
            <DetailRow label="Backlog Profit" value={fmtCurrency(job.backlog_profit)} />
            <DetailRow label="Billings to Date" value={fmtCurrency(job.billings_to_date)} />
            <DetailRow label="Revenue Excess" value={fmtCurrency(job.revenue_excess)} />
            <DetailRow label="Billings Excess" value={fmtCurrency(job.billings_excess)} />
            <DetailRow label="Invoicing Left" value={fmtCurrency(job.invoicing_remaining)} />
          </DetailGroup>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-3">
      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="wip-no-print flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search job # or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
          />
        </div>

        {/* PM Filter Dropdown */}
        <select
          value={pmFilter}
          onChange={(e) => setPmFilter(e.target.value)}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 cursor-pointer"
        >
          <option value="All">All PMs</option>
          {PM_CODES.map((pm) => (
            <option key={pm} value={pm}>{pm}</option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "complete")}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="complete">Complete</option>
        </select>

        {/* Hidden Toggle */}
        <button
          type="button"
          onClick={() => setShowHidden(!showHidden)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
            showHidden
              ? "bg-neutral-800 border-neutral-700 text-neutral-300"
              : "bg-neutral-800/50 border-neutral-700/50 text-neutral-500"
          }`}
        >
          {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          Hidden
        </button>

        {/* Export CSV */}
        {mode === "admin" && (
          <button
            type="button"
            onClick={exportCsv}
            disabled={sortedJobs.length === 0}
            className="wip-no-print flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-750 hover:border-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
        )}
      </div>

      {/* ── Job Count ────────────────────────────────── */}
      <div className="wip-no-print text-xs text-neutral-500">
        Showing {sortedJobs.length} of {jobs.length} jobs
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-900 border-b border-neutral-800">
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`${col.width} px-3 py-2.5 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer select-none hover:text-neutral-200 transition-colors`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp size={12} className="text-primary-400" />
                      ) : (
                        <ChevronDown size={12} className="text-primary-400" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-800/50">
            {sortedJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="text-center py-12 text-neutral-500"
                >
                  No jobs match your filters.
                </td>
              </tr>
            ) : (
              sortedJobs.map((job, i) => (
                <Fragment key={job.job_number}>
                  <tr
                    onClick={() => {
                      toggleRow(job.job_number);
                      onJobClick?.(job);
                    }}
                    className={`cursor-pointer transition-colors ${getRowClass(job, i)}`}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`${col.width} px-3 py-2 text-neutral-300 whitespace-nowrap`}
                      >
                        <div className="flex items-center gap-1">
                          {col.key === "job_number" && (
                            <ChevronRight
                              size={12}
                              className={`text-neutral-600 transition-transform ${
                                expandedRow === job.job_number ? "rotate-90" : ""
                              }`}
                            />
                          )}
                          {renderCell(job, col)}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {expandedRow === job.job_number && renderExpandedDetail(job)}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Detail Sub-components ────────────────────────────────

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className={`tabular-nums ${highlight ? "text-neutral-100 font-medium" : "text-neutral-300"}`}>
        {value}
      </span>
    </div>
  );
}
