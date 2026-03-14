import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface JobCost {
  jobNumber: string;
  description: string | null;
  pm: string | null;
  customer: string | null;
  invoiceCost: number;
  invoiceTax: number;
  invoiceLineItems: number;
  firstInvoice: string | null;
  lastInvoice: string | null;
  wipCostsToDate: number | null;
  variance: number;
  variancePct: number | null;
  status: "match" | "over" | "under" | "invoice_only" | "wip_only";
}

interface PmBreakdown {
  pm: string;
  invoiceCost: number;
  wipCost: number;
  variance: number;
}

interface CostSummary {
  totalJobs: number;
  totalInvoiceCost: number;
  totalWipCost: number;
  variance: number;
  jobsWithInvoicesOnly: number;
  jobsWithWipOnly: number;
}

interface CostsResponse {
  month: string;
  summary: CostSummary;
  jobs: JobCost[];
  pmBreakdown: PmBreakdown[];
}

interface NewCostJob {
  jobNumber: string;
  description: string | null;
  pm: string | null;
  invoiceCount: number;
  lineItemCount: number;
  totalCost: number;
  totalTax: number;
  firstInvoice: string | null;
  lastInvoice: string | null;
  firstEntered: string | null;
  lastEntered: string | null;
}

interface NewCostsResponse {
  since: string;
  summary: {
    jobCount: number;
    totalInvoices: number;
    totalNewCost: number;
  };
  jobs: NewCostJob[];
}

interface InvoiceRow {
  id: number;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_item_count: number;
}

// ── Constants ──────────────────────────────────────────

const PM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GG: { bg: "bg-blue-950/40", text: "text-blue-400", border: "border-blue-800/50" },
  RG: { bg: "bg-emerald-950/40", text: "text-emerald-400", border: "border-emerald-800/50" },
  MD: { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-800/50" },
  SB: { bg: "bg-purple-950/40", text: "text-purple-400", border: "border-purple-800/50" },
};

const STATUS_BADGES: Record<string, { label: string; className: string; dot: string }> = {
  match: { label: "Matched", className: "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50", dot: "bg-emerald-400" },
  over: { label: "Partial", className: "bg-amber-900/40 text-amber-400 border border-amber-800/50", dot: "bg-amber-400" },
  under: { label: "Partial", className: "bg-amber-900/40 text-amber-400 border border-amber-800/50", dot: "bg-amber-400" },
  invoice_only: { label: "Unreconciled", className: "bg-red-900/40 text-red-400 border border-red-800/50", dot: "bg-red-400" },
  wip_only: { label: "Unreconciled", className: "bg-red-900/40 text-red-400 border border-red-800/50", dot: "bg-red-400" },
};

type SortField = "variance" | "invoiceCost" | "wipCostsToDate" | "jobNumber";
type SubTab = "comparison" | "new-costs";

// ── Formatters ─────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyCompactFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function fmtCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyFmt.format(val);
}

function fmtCompact(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return currencyCompactFmt.format(val);
}

// ── Component ──────────────────────────────────────────

interface WipCostReconciliationProps {
  month: string; // YYYY-MM
}

export default function WipCostReconciliation({ month }: WipCostReconciliationProps) {
  const [data, setData] = useState<CostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-tab state
  const [subTab, setSubTab] = useState<SubTab>("comparison");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sort
  const [sortField, setSortField] = useState<SortField>("variance");
  const [sortAsc, setSortAsc] = useState(false);

  // Expanded rows for invoice detail
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [jobInvoices, setJobInvoices] = useState<Map<string, InvoiceRow[]>>(new Map());

  // New costs state
  const [sinceDate, setSinceDate] = useState(() => {
    // Default to first of selected month
    return `${month}-01`;
  });
  const [newCostsData, setNewCostsData] = useState<NewCostsResponse | null>(null);
  const [newCostsLoading, setNewCostsLoading] = useState(false);

  // ── Fetch cost comparison data ─────────────────────
  useEffect(() => {
    async function loadCosts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/wip-costs?month=${month}`);
        if (!res.ok) throw new Error(`Failed to load costs: ${res.status}`);
        const json: CostsResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cost data");
      } finally {
        setLoading(false);
      }
    }
    loadCosts();
    setSinceDate(`${month}-01`);
  }, [month]);

  // ── Toggle expanded row ────────────────────────────
  const toggleExpand = useCallback(async (jobNumber: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobNumber)) {
        next.delete(jobNumber);
      } else {
        next.add(jobNumber);
      }
      return next;
    });

    // Fetch invoices if not already loaded
    if (!jobInvoices.has(jobNumber)) {
      try {
        const res = await fetch(`/api/admin/invoices?job=${encodeURIComponent(jobNumber)}`);
        if (res.ok) {
          const json = await res.json();
          setJobInvoices((prev) => {
            const next = new Map(prev);
            next.set(jobNumber, json.invoices ?? []);
            return next;
          });
        }
      } catch {
        // Silent fail — row just won't show invoices
      }
    }
  }, [jobInvoices]);

  // ── Fetch new costs ────────────────────────────────
  const loadNewCosts = useCallback(async () => {
    if (!sinceDate) return;
    setNewCostsLoading(true);
    try {
      const res = await fetch(`/api/admin/wip-costs-new?since=${sinceDate}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json: NewCostsResponse = await res.json();
      setNewCostsData(json);
    } catch {
      // Silent — just clear data
      setNewCostsData(null);
    } finally {
      setNewCostsLoading(false);
    }
  }, [sinceDate]);

  // ── Filtered & sorted jobs ─────────────────────────
  const filteredJobs = useMemo(() => {
    if (!data) return [];
    let jobs = [...data.jobs];

    // Search filter (job number, description, customer, and vendor names from loaded invoices)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      jobs = jobs.filter((j) => {
        if (j.jobNumber.toLowerCase().includes(term)) return true;
        if (j.description?.toLowerCase().includes(term)) return true;
        if (j.customer?.toLowerCase().includes(term)) return true;
        // Also search vendor names in loaded invoices
        const invoices = jobInvoices.get(j.jobNumber);
        if (invoices?.some((inv) => inv.vendor_name.toLowerCase().includes(term))) return true;
        return false;
      });
    }

    // PM filter
    if (pmFilter !== "all") {
      jobs = jobs.filter((j) => (j.pm ?? "Unknown") === pmFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      jobs = jobs.filter((j) => j.status === statusFilter);
    }

    // Sort
    jobs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "variance":
          cmp = Math.abs(b.variance) - Math.abs(a.variance);
          break;
        case "invoiceCost":
          cmp = b.invoiceCost - a.invoiceCost;
          break;
        case "wipCostsToDate":
          cmp = (b.wipCostsToDate ?? 0) - (a.wipCostsToDate ?? 0);
          break;
        case "jobNumber":
          cmp = a.jobNumber.localeCompare(b.jobNumber);
          break;
      }
      return sortAsc ? -cmp : cmp;
    });

    return jobs;
  }, [data, searchTerm, pmFilter, statusFilter, sortField, sortAsc, jobInvoices]);

  // ── Unique PMs for filter ──────────────────────────
  const uniquePms = useMemo(() => {
    if (!data) return [];
    const pms = new Set(data.jobs.map((j) => j.pm ?? "Unknown"));
    return Array.from(pms).sort();
  }, [data]);

  // ── Sort handler ───────────────────────────────────
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortAsc(!sortAsc);
      } else {
        setSortField(field);
        setSortAsc(false);
      }
    },
    [sortField, sortAsc]
  );

  // ── CSV export ─────────────────────────────────────
  const exportCsv = useCallback(() => {
    if (!filteredJobs.length) return;
    const headers = ["Job", "Description", "PM", "Invoice Cost", "WIP Cost", "Variance", "Variance %", "Status"];
    const rows = filteredJobs.map((j) => [
      j.jobNumber,
      j.description ?? "",
      j.pm ?? "",
      j.invoiceCost.toFixed(2),
      j.wipCostsToDate?.toFixed(2) ?? "",
      j.variance.toFixed(2),
      j.variancePct?.toFixed(1) ?? "",
      j.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wip-cost-reconciliation-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredJobs, month]);

  // ── Render ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={20} className="animate-spin text-neutral-500" />
        <span className="ml-2 text-neutral-500">Loading cost data…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
        <p className="text-neutral-400">{error ?? "No data available"}</p>
        <p className="text-sm text-neutral-600 mt-1">
          Make sure invoices have been entered for this month.
        </p>
      </div>
    );
  }

  const { summary, pmBreakdown } = data;
  const needsUpdateCount = data.jobs.filter((j) => j.status !== "match" && j.status !== "wip_only").length;

  // Reconciliation breakdown
  const matchedJobs = data.jobs.filter((j) => j.status === "match");
  const partialJobs = data.jobs.filter((j) => j.status === "over" || j.status === "under");
  const unreconciledJobs = data.jobs.filter((j) => j.status === "invoice_only" || j.status === "wip_only");
  const reconciledAmount = matchedJobs.reduce((sum, j) => sum + j.invoiceCost, 0);
  const partialAmount = partialJobs.reduce((sum, j) => sum + j.invoiceCost, 0);
  const unreconciledAmount = unreconciledJobs.reduce((sum, j) => sum + j.invoiceCost, 0);
  const totalTracked = reconciledAmount + partialAmount + unreconciledAmount;
  const reconciledPct = totalTracked > 0 ? (reconciledAmount / totalTracked) * 100 : 0;
  const partialPct = totalTracked > 0 ? (partialAmount / totalTracked) * 100 : 0;
  const unreconciledPct = totalTracked > 0 ? (unreconciledAmount / totalTracked) * 100 : 0;

  // Largest PM variance
  const largestPmGap = pmBreakdown.length > 0
    ? pmBreakdown.reduce((max, pm) => (Math.abs(pm.variance) > Math.abs(max.variance) ? pm : max), pmBreakdown[0])
    : null;

  return (
    <div className="space-y-6" style={{ animation: "fadeIn 0.3s ease-out" }}>
      {/* ── Reconciliation Header ─────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
            Reconciliation Status
          </h3>
          <span className="text-xs text-neutral-500">
            {summary.totalJobs} jobs &middot; {fmtCurrency(totalTracked)} tracked
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-neutral-800 overflow-hidden flex mb-4">
          {reconciledPct > 0 && (
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${reconciledPct}%` }}
              title={`Matched: ${fmtCurrency(reconciledAmount)}`}
            />
          )}
          {partialPct > 0 && (
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${partialPct}%` }}
              title={`Partial: ${fmtCurrency(partialAmount)}`}
            />
          )}
          {unreconciledPct > 0 && (
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${unreconciledPct}%` }}
              title={`Unreconciled: ${fmtCurrency(unreconciledAmount)}`}
            />
          )}
        </div>

        {/* Legend row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <div>
              <div className="text-xs text-neutral-500">Matched</div>
              <div className="text-sm font-semibold text-emerald-400 tabular-nums">
                {fmtCurrency(reconciledAmount)}
              </div>
              <div className="text-[10px] text-neutral-600">
                {matchedJobs.length} jobs &middot; {reconciledPct.toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <div>
              <div className="text-xs text-neutral-500">Partial</div>
              <div className="text-sm font-semibold text-amber-400 tabular-nums">
                {fmtCurrency(partialAmount)}
              </div>
              <div className="text-[10px] text-neutral-600">
                {partialJobs.length} jobs &middot; {partialPct.toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-red-400" />
            <div>
              <div className="text-xs text-neutral-500">Unreconciled</div>
              <div className="text-sm font-semibold text-red-400 tabular-nums">
                {fmtCurrency(unreconciledAmount)}
              </div>
              <div className="text-[10px] text-neutral-600">
                {unreconciledJobs.length} jobs &middot; {unreconciledPct.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<DollarSign size={18} />}
          label="Invoice Costs"
          value={fmtCompact(summary.totalInvoiceCost)}
          detail={fmtCurrency(summary.totalInvoiceCost)}
          accent="text-blue-400"
          accentBg="bg-blue-950/40"
        />
        <SummaryCard
          icon={<DollarSign size={18} />}
          label="WIP Costs"
          value={fmtCompact(summary.totalWipCost)}
          detail={fmtCurrency(summary.totalWipCost)}
          accent="text-emerald-400"
          accentBg="bg-emerald-950/40"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          label="Variance"
          value={fmtCompact(summary.variance)}
          detail={fmtCurrency(summary.variance)}
          accent={summary.variance > 0 ? "text-amber-400" : summary.variance < 0 ? "text-red-400" : "text-emerald-400"}
          accentBg={summary.variance > 0 ? "bg-amber-950/40" : summary.variance < 0 ? "bg-red-950/40" : "bg-emerald-950/40"}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} />}
          label="Jobs Needing Update"
          value={String(needsUpdateCount)}
          detail={`of ${summary.totalJobs} total`}
          accent={needsUpdateCount > 0 ? "text-amber-400" : "text-emerald-400"}
          accentBg={needsUpdateCount > 0 ? "bg-amber-950/40" : "bg-emerald-950/40"}
        />
      </div>

      {/* ── PM Comparison Cards ──────────────────────── */}
      {pmBreakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
            PM Comparison
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {pmBreakdown.map((pm) => {
              const colors = PM_COLORS[pm.pm] ?? {
                bg: "bg-neutral-800",
                text: "text-neutral-300",
                border: "border-neutral-700",
              };
              const isLargest = largestPmGap?.pm === pm.pm && Math.abs(pm.variance) > 100;

              return (
                <div
                  key={pm.pm}
                  className={`${
                    isLargest
                      ? "bg-amber-950/25 border border-amber-600/50"
                      : `${colors.bg} border ${colors.border}`
                  } rounded-lg p-4 space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${isLargest ? "text-amber-400" : colors.text}`}>
                      {pm.pm}
                    </span>
                    {isLargest && (
                      <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">
                        Largest Gap
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-neutral-500">Invoice</div>
                    <div className="text-neutral-200 text-right tabular-nums">{fmtCompact(pm.invoiceCost)}</div>
                    <div className="text-neutral-500">WIP</div>
                    <div className="text-neutral-200 text-right tabular-nums">{fmtCompact(pm.wipCost)}</div>
                    <div className="text-neutral-500">Variance</div>
                    <div
                      className={`text-right tabular-nums ${
                        pm.variance > 0 ? "text-amber-400" : pm.variance < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {fmtCurrency(pm.variance)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sub-Tabs ─────────────────────────────────── */}
      <div className="flex gap-4 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setSubTab("comparison")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "comparison"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          Cost Comparison
        </button>
        <button
          type="button"
          onClick={() => setSubTab("new-costs")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === "new-costs"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          New Costs Since…
        </button>
      </div>

      {/* ── Cost Comparison Tab ──────────────────────── */}
      {subTab === "comparison" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search job #, customer, vendor…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-primary-600"
              />
            </div>
            <select
              value={pmFilter}
              onChange={(e) => setPmFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-primary-600"
            >
              <option value="all">All PMs</option>
              {uniquePms.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-primary-600"
            >
              <option value="all">All Statuses</option>
              <option value="match">Matched</option>
              <option value="over">Partial (Over)</option>
              <option value="under">Partial (Under)</option>
              <option value="invoice_only">Unreconciled (Invoice Only)</option>
              <option value="wip_only">Unreconciled (WIP Only)</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
            >
              <Download size={14} />
              CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-900 text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="p-3 text-left w-8" />
                  <th
                    className="p-3 text-left cursor-pointer hover:text-neutral-300"
                    onClick={() => handleSort("jobNumber")}
                  >
                    Job {sortField === "jobNumber" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">PM</th>
                  <th
                    className="p-3 text-right cursor-pointer hover:text-neutral-300"
                    onClick={() => handleSort("invoiceCost")}
                  >
                    Invoice Cost {sortField === "invoiceCost" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th
                    className="p-3 text-right cursor-pointer hover:text-neutral-300"
                    onClick={() => handleSort("wipCostsToDate")}
                  >
                    WIP Cost {sortField === "wipCostsToDate" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th
                    className="p-3 text-right cursor-pointer hover:text-neutral-300"
                    onClick={() => handleSort("variance")}
                  >
                    Variance {sortField === "variance" && (sortAsc ? "↑" : "↓")}
                  </th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredJobs.map((job) => {
                  const expanded = expandedJobs.has(job.jobNumber);
                  const invoices = jobInvoices.get(job.jobNumber);
                  const badge = STATUS_BADGES[job.status];

                  return (
                    <JobRow
                      key={job.jobNumber}
                      job={job}
                      expanded={expanded}
                      invoices={invoices}
                      badge={badge}
                      onToggle={() => toggleExpand(job.jobNumber)}
                    />
                  );
                })}
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-500">
                      No jobs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-neutral-600">
            Showing {filteredJobs.length} of {data.jobs.length} jobs
          </div>
        </div>
      )}

      {/* ── New Costs Tab ────────────────────────────── */}
      {subTab === "new-costs" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-neutral-500" />
              <span className="text-sm text-neutral-400">Since:</span>
              <input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-primary-600"
              />
            </div>
            <button
              type="button"
              onClick={loadNewCosts}
              disabled={newCostsLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {newCostsLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Load
            </button>
          </div>

          {newCostsData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <SummaryCard
                  icon={<DollarSign size={18} />}
                  label="Total New Costs"
                  value={fmtCompact(newCostsData.summary.totalNewCost)}
                  detail={fmtCurrency(newCostsData.summary.totalNewCost)}
                  accent="text-blue-400"
                  accentBg="bg-blue-950/40"
                />
                <SummaryCard
                  icon={<TrendingUp size={18} />}
                  label="Invoices"
                  value={String(newCostsData.summary.totalInvoices)}
                  accent="text-emerald-400"
                  accentBg="bg-emerald-950/40"
                />
                <SummaryCard
                  icon={<AlertTriangle size={18} />}
                  label="Jobs Affected"
                  value={String(newCostsData.summary.jobCount)}
                  accent="text-amber-400"
                  accentBg="bg-amber-950/40"
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-900 text-neutral-500 text-xs uppercase tracking-wider">
                      <th className="p-3 text-left">Job</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">PM</th>
                      <th className="p-3 text-right">Cost</th>
                      <th className="p-3 text-right">Invoices</th>
                      <th className="p-3 text-left">Date Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {newCostsData.jobs.map((job) => (
                      <tr key={job.jobNumber} className="hover:bg-neutral-800/50">
                        <td className="p-3 font-mono text-neutral-200">{job.jobNumber}</td>
                        <td className="p-3 text-neutral-400 max-w-[200px] truncate">{job.description ?? "—"}</td>
                        <td className="p-3">
                          {job.pm ? (
                            <span className={`text-xs font-medium ${PM_COLORS[job.pm]?.text ?? "text-neutral-300"}`}>
                              {job.pm}
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right tabular-nums text-neutral-200">{fmtCurrency(job.totalCost)}</td>
                        <td className="p-3 text-right tabular-nums text-neutral-400">{job.invoiceCount}</td>
                        <td className="p-3 text-neutral-500 text-xs">
                          {job.firstInvoice === job.lastInvoice
                            ? job.firstInvoice
                            : `${job.firstInvoice} → ${job.lastInvoice}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!newCostsData && !newCostsLoading && (
            <div className="text-center py-8 text-neutral-500">
              Select a date and click Load to see new costs.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Job Row Sub-component ──────────────────────────────

function JobRow({
  job,
  expanded,
  invoices,
  badge,
  onToggle,
}: {
  job: JobCost;
  expanded: boolean;
  invoices: InvoiceRow[] | undefined;
  badge: { label: string; className: string; dot: string };
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-neutral-800/50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="p-3">
          {expanded ? (
            <ChevronDown size={14} className="text-neutral-500" />
          ) : (
            <ChevronRight size={14} className="text-neutral-500" />
          )}
        </td>
        <td className="p-3 font-mono text-neutral-200">{job.jobNumber}</td>
        <td className="p-3 text-neutral-400 max-w-[200px] truncate">{job.description ?? "—"}</td>
        <td className="p-3">
          {job.pm ? (
            <span className={`text-xs font-medium ${PM_COLORS[job.pm]?.text ?? "text-neutral-300"}`}>
              {job.pm}
            </span>
          ) : (
            <span className="text-neutral-600">—</span>
          )}
        </td>
        <td className="p-3 text-right tabular-nums text-neutral-200">{fmtCurrency(job.invoiceCost)}</td>
        <td className="p-3 text-right tabular-nums text-neutral-200">
          {job.wipCostsToDate !== null ? fmtCurrency(job.wipCostsToDate) : "—"}
        </td>
        <td
          className={`p-3 text-right tabular-nums font-medium ${
            job.variance > 0 ? "text-amber-400" : job.variance < 0 ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {fmtCurrency(job.variance)}
          {job.variancePct !== null && (
            <span className="text-neutral-600 text-xs ml-1">({job.variancePct}%)</span>
          )}
        </td>
        <td className="p-3 text-center">
          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-neutral-900/50 px-6 py-3">
            {invoices ? (
              invoices.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                    Invoices ({invoices.length})
                  </div>
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-4 text-xs text-neutral-400 py-1"
                    >
                      <span className="text-neutral-500 w-20">{inv.invoice_date}</span>
                      <span className="text-neutral-300 w-32 truncate">{inv.vendor_name}</span>
                      <span className="text-neutral-500 w-24">#{inv.invoice_number}</span>
                      <span className="text-neutral-200 tabular-nums w-24 text-right">{fmtCurrency(inv.subtotal)}</span>
                      <span className="text-neutral-500 tabular-nums w-20 text-right">tax: {fmtCurrency(inv.tax_amount)}</span>
                      <span className="text-neutral-200 tabular-nums w-24 text-right font-medium">{fmtCurrency(inv.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-neutral-600">No invoices found for this job.</span>
              )
            ) : (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <RefreshCw size={12} className="animate-spin" />
                Loading invoices…
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Summary Card Sub-component ─────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  detail,
  accent,
  accentBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  accent: string;
  accentBg: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${accentBg}`}>
          <span className={accent}>{icon}</span>
        </div>
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent} tabular-nums`}>{value}</div>
      {detail && <div className="text-xs mt-1 text-neutral-500">{detail}</div>}
    </div>
  );
}
