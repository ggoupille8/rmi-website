import { useState, useEffect, useCallback } from "react";
import PmHeader from "./PmHeader";

interface PmDashboardProps {
  pmCode: string;
  pmName: string;
}

interface OwnJob {
  job_number: string;
  description: string | null;
  project_manager: string;
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

interface OtherJob {
  job_number: string;
  description: string | null;
  project_manager: string;
  pct_complete: number | null;
  revised_contract: number | null;
  backlog_revenue: number | null;
}

type DisplayJob = (OwnJob | OtherJob) & { _isOwn: boolean };

interface CompanyTotals {
  total_revised_contract: number | null;
  total_backlog_revenue: number | null;
  total_earned_revenue: number | null;
  total_gross_profit: number | null;
  [key: string]: unknown;
}

interface AvailableMonth {
  year: number;
  month: number;
}

interface WipData {
  currentPm: string;
  year: number;
  month: number;
  ownJobs: OwnJob[];
  otherJobs: OtherJob[];
  companyTotals: CompanyTotals | null;
  availableMonths: AvailableMonth[];
}

// ── Invoice / Financial Types ─────────────────────────

interface TopJob {
  job_number: string;
  description: string | null;
  total_cost: number;
  invoice_count: number;
}

interface JobNeedingClassification {
  job_number: string;
  description: string | null;
  tax_status: string;
}

interface CostDeltaJob {
  job_number: string;
  description: string | null;
  invoice_cost: number;
  wip_costs_to_date: number | null;
  variance: number;
  status: string;
}

interface InvoiceData {
  currentPm: string;
  year: number;
  month: number;
  costSummary: {
    totalCostThisMonth: number;
    totalCostLastMonth: number;
    totalInvoiceCount: number;
    topJobsBySpend: TopJob[];
  };
  taxSummary: {
    taxable: number;
    exempt: number;
    mixed: number;
    unknown: number;
    jobsNeedingClassification: JobNeedingClassification[];
  };
  costDelta: CostDeltaJob[];
}

// ── Constants ─────────────────────────────────────────

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TAX_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  taxable: { bg: "bg-red-500/15", text: "text-red-400", label: "Taxable" },
  exempt: { bg: "bg-green-500/15", text: "text-green-400", label: "Exempt" },
  mixed: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Mixed" },
  unknown: { bg: "bg-white/10", text: "text-neutral-400", label: "Unknown" },
};

const DELTA_BADGE: Record<string, { label: string; className: string }> = {
  match: { label: "Match", className: "bg-emerald-900/40 text-emerald-400" },
  over: { label: "Over", className: "bg-amber-900/40 text-amber-400" },
  under: { label: "Under", className: "bg-red-900/40 text-red-400" },
  invoice_only: { label: "Invoice Only", className: "bg-neutral-700/40 text-neutral-400" },
  wip_only: { label: "WIP Only", className: "bg-neutral-700/40 text-neutral-400" },
};

// ── Formatters ────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "\u2014";
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "\u2014";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "\u2014";
  return `${(value * 100).toFixed(1)}%`;
}

function isOwnJob(job: DisplayJob): job is OwnJob & { _isOwn: true } {
  return job._isOwn;
}

// ── Main Component ────────────────────────────────────

export default function PmDashboard({ pmCode, pmName }: PmDashboardProps) {
  const [data, setData] = useState<WipData | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pmFilter, setPmFilter] = useState<string>("");
  const [sortCol, setSortCol] = useState("job_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"wip" | "financials">("wip");

  const currentMonth = data
    ? `${MONTH_NAMES[data.month]} ${data.year}`
    : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedYear != null && selectedMonth != null) {
        params.set("year", String(selectedYear));
        params.set("month", String(selectedMonth));
      }

      const res = await fetch(`/api/pm/wip?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/pm";
          return;
        }
        const errData = await res.json().catch(() => ({ error: "Failed to load data" }));
        throw new Error(errData.error || "Failed to load data");
      }
      const json: WipData = await res.json();
      setData(json);
      if (selectedYear == null) {
        setSelectedYear(json.year);
        setSelectedMonth(json.month);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchInvoiceData = useCallback(async () => {
    setInvoiceLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear != null && selectedMonth != null) {
        params.set("year", String(selectedYear));
        params.set("month", String(selectedMonth));
      }

      const res = await fetch(`/api/pm/invoices?${params}`);
      if (!res.ok) {
        if (res.status === 401) return;
        setInvoiceData(null);
        return;
      }
      const json: InvoiceData = await res.json();
      setInvoiceData(json);
    } catch {
      setInvoiceData(null);
    } finally {
      setInvoiceLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
    fetchInvoiceData();
  }, [fetchData, fetchInvoiceData]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Combine own + other jobs into a single sorted/filtered list
  const allJobs: DisplayJob[] = (() => {
    if (!data) return [];
    const own: DisplayJob[] = data.ownJobs.map((j) => ({ ...j, _isOwn: true }));
    const other: DisplayJob[] = data.otherJobs.map((j) => ({ ...j, _isOwn: false }));
    let combined = [...own, ...other];

    if (pmFilter) {
      combined = combined.filter((j) => j.project_manager === pmFilter);
    }

    if (search) {
      const term = search.toLowerCase();
      combined = combined.filter(
        (j) =>
          j.job_number.toLowerCase().includes(term) ||
          (j.description?.toLowerCase().includes(term) ?? false)
      );
    }

    combined.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sortCol) {
        case "job_number":
          aVal = a.job_number;
          bVal = b.job_number;
          break;
        case "description":
          aVal = a.description ?? "";
          bVal = b.description ?? "";
          break;
        case "project_manager":
          aVal = a.project_manager;
          bVal = b.project_manager;
          break;
        case "pct_complete":
          aVal = a.pct_complete ?? 0;
          bVal = b.pct_complete ?? 0;
          break;
        case "revised_contract":
          aVal = (a as OwnJob).revised_contract ?? 0;
          bVal = (b as OwnJob).revised_contract ?? 0;
          break;
        case "backlog_revenue":
          aVal = (isOwnJob(a) ? a.backlog_revenue : (a as OtherJob).backlog_revenue) ?? 0;
          bVal = (isOwnJob(b) ? b.backlog_revenue : (b as OtherJob).backlog_revenue) ?? 0;
          break;
        default:
          aVal = a.job_number;
          bVal = b.job_number;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return combined;
  })();

  const pmSummary = (() => {
    if (!data) return null;
    const jobs = data.ownJobs;
    const totalRevised = jobs.reduce((s, j) => s + (Number(j.revised_contract) || 0), 0);
    const totalBacklog = jobs.reduce((s, j) => s + (Number(j.backlog_revenue) || 0), 0);
    const totalEarned = jobs.reduce((s, j) => s + (Number(j.earned_revenue) || 0), 0);
    const margins = jobs
      .map((j) => Number(j.gross_margin_pct))
      .filter((m) => !isNaN(m) && m !== 0);
    const avgMargin = margins.length > 0
      ? margins.reduce((s, m) => s + m, 0) / margins.length
      : null;
    return { totalJobs: jobs.length, totalRevised, totalBacklog, totalEarned, avgMargin };
  })();

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortOrder("asc");
    }
  }

  function handleRowClick(job: DisplayJob) {
    if (!job._isOwn) return;
    setExpandedRow(expandedRow === job.job_number ? null : job.job_number);
  }

  function handleMonthChange(value: string) {
    const [y, m] = value.split("-").map(Number);
    if (y && m) {
      setSelectedYear(y);
      setSelectedMonth(m);
    }
  }

  const sortIndicator = (col: string) => {
    if (sortCol !== col) return null;
    return sortOrder === "asc" ? " \u2191" : " \u2193";
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <PmHeader pmCode={pmCode} pmName={pmName} currentMonth={currentMonth} />

      <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-md text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Month selector */}
        {data && data.availableMonths.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <label className="text-xs text-neutral-500">Period:</label>
            <select
              value={selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth}` : ""}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              {data.availableMonths.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {MONTH_NAMES[m.month]} {m.year}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Company KPI Cards */}
        {data && data.companyTotals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total Revised Contract" value={formatCurrency(Number(data.companyTotals.total_revised_contract))} subtitle="Company Total" />
            <KpiCard label="Total Backlog" value={formatCurrency(Number(data.companyTotals.total_backlog_revenue))} subtitle="Company Total" />
            <KpiCard label="Total Earned Revenue" value={formatCurrency(Number(data.companyTotals.total_earned_revenue))} subtitle="Company Total" />
            <KpiCard label="Total Gross Profit" value={formatCurrency(Number(data.companyTotals.total_gross_profit))} subtitle="Company Total" />
          </div>
        )}

        {/* My Jobs Summary */}
        {pmSummary && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
            <h2 className="text-sm font-semibold text-blue-400 mb-3">Your Jobs — {pmName}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Total Jobs</p>
                <p className="text-lg font-semibold text-neutral-100">{pmSummary.totalJobs}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Revised Contract</p>
                <p className="text-lg font-semibold text-neutral-100">{formatCurrency(pmSummary.totalRevised)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Backlog</p>
                <p className="text-lg font-semibold text-neutral-100">{formatCurrency(pmSummary.totalBacklog)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Earned Revenue</p>
                <p className="text-lg font-semibold text-neutral-100">{formatCurrency(pmSummary.totalEarned)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Avg Margin</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {pmSummary.avgMargin != null ? formatPct(pmSummary.avgMargin) : "\u2014"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("wip")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "wip"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            WIP Snapshot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financials")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "financials"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Financials
          </button>
        </div>

        {/* ── WIP Tab ──────────────────────────────────── */}
        {activeTab === "wip" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
              <select
                value={pmFilter}
                onChange={(e) => setPmFilter(e.target.value)}
                className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="">All PMs</option>
                <option value="GG">GG</option>
                <option value="RG">RG</option>
                <option value="MD">MD</option>
                <option value="SB">SB</option>
              </select>
              <span className="text-xs text-neutral-500 ml-auto">
                {allJobs.length} job{allJobs.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading && !data ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-neutral-500">Loading WIP data...</div>
              </div>
            ) : data ? (
              <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <Th onClick={() => handleSort("job_number")}>Job #{sortIndicator("job_number")}</Th>
                      <Th onClick={() => handleSort("description")}>Description{sortIndicator("description")}</Th>
                      <Th onClick={() => handleSort("project_manager")}>PM{sortIndicator("project_manager")}</Th>
                      <Th onClick={() => handleSort("pct_complete")} align="right">% Complete{sortIndicator("pct_complete")}</Th>
                      <Th onClick={() => handleSort("revised_contract")} align="right">Revised Contract{sortIndicator("revised_contract")}</Th>
                      <Th onClick={() => handleSort("backlog_revenue")} align="right">Backlog{sortIndicator("backlog_revenue")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {allJobs.map((job) => {
                      const own = job._isOwn;
                      const expanded = expandedRow === job.job_number && own;
                      return (
                        <JobRow key={job.job_number} job={job} own={own} expanded={expanded} onClick={() => handleRowClick(job)} />
                      );
                    })}
                    {allJobs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No jobs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}

        {/* ── Financials Tab ───────────────────────────── */}
        {activeTab === "financials" && (
          <FinancialsPanel
            invoiceData={invoiceData}
            invoiceLoading={invoiceLoading}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Financials Panel
   ══════════════════════════════════════════════════════ */

function FinancialsPanel({
  invoiceData,
  invoiceLoading,
  selectedMonth,
  selectedYear,
}: {
  invoiceData: InvoiceData | null;
  invoiceLoading: boolean;
  selectedMonth: number | null;
  selectedYear: number | null;
}) {
  if (invoiceLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 animate-pulse">
              <div className="h-3 w-20 bg-neutral-800 rounded mb-3" />
              <div className="h-7 w-24 bg-neutral-800 rounded mb-2" />
              <div className="h-3 w-32 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 animate-pulse">
          <div className="h-4 w-40 bg-neutral-800 rounded mb-4" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3 bg-neutral-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">No financial data available for this period.</p>
        <p className="text-xs text-neutral-600 mt-1">Invoice data will appear once invoices have been entered.</p>
      </div>
    );
  }

  const { costSummary, taxSummary, costDelta } = invoiceData;
  const monthLabel = selectedMonth && selectedYear
    ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    : "";

  const costChange = costSummary.totalCostThisMonth - costSummary.totalCostLastMonth;
  const costChangePct = costSummary.totalCostLastMonth > 0
    ? ((costChange / costSummary.totalCostLastMonth) * 100).toFixed(0)
    : null;

  const totalTaxJobs = taxSummary.taxable + taxSummary.exempt + taxSummary.mixed + taxSummary.unknown;

  const deltaJobsWithIssues = costDelta.filter(
    (j) => j.status !== "match" && j.status !== "wip_only"
  );

  return (
    <div className="space-y-6">
      {/* ── My Job Costs ───────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">My Job Costs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassKpiCard
            label="Invoice Costs"
            sublabel={monthLabel}
            value={formatCurrency(costSummary.totalCostThisMonth)}
            detail={formatCurrencyFull(costSummary.totalCostThisMonth)}
            accent="text-blue-400"
            accentBg="bg-blue-950/40"
            badge={`${costSummary.totalInvoiceCount} invoice${costSummary.totalInvoiceCount !== 1 ? "s" : ""}`}
          />
          <GlassKpiCard
            label="Last Month"
            value={formatCurrency(costSummary.totalCostLastMonth)}
            detail={formatCurrencyFull(costSummary.totalCostLastMonth)}
            accent="text-neutral-400"
            accentBg="bg-neutral-800/40"
          />
          <GlassKpiCard
            label="Month-over-Month"
            value={costChange === 0 ? "No change" : `${costChange > 0 ? "+" : ""}${formatCurrency(costChange)}`}
            detail={costChangePct !== null ? `${costChange > 0 ? "+" : ""}${costChangePct}%` : undefined}
            accent={costChange > 0 ? "text-amber-400" : costChange < 0 ? "text-emerald-400" : "text-neutral-400"}
            accentBg={costChange > 0 ? "bg-amber-950/40" : costChange < 0 ? "bg-emerald-950/40" : "bg-neutral-800/40"}
          />
        </div>

        {costSummary.topJobsBySpend.length > 0 && (
          <div className="mt-4 bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Highest Spend Jobs</span>
            </div>
            <div className="divide-y divide-neutral-800/50">
              {costSummary.topJobsBySpend.map((job) => (
                <div key={job.job_number} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-xs text-neutral-200 w-20 shrink-0">{job.job_number}</span>
                  <span className="text-xs text-neutral-400 truncate flex-1 min-w-0">{job.description ?? "\u2014"}</span>
                  <span className="text-xs text-neutral-500 shrink-0">{job.invoice_count} inv</span>
                  <span className="text-xs font-mono text-neutral-200 tabular-nums shrink-0 text-right w-24">{formatCurrencyFull(job.total_cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tax Status Summary ─────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Tax Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TaxStatusCard label="Taxable" count={taxSummary.taxable} total={totalTaxJobs} color="text-red-400" bg="bg-red-500/15" />
          <TaxStatusCard label="Exempt" count={taxSummary.exempt} total={totalTaxJobs} color="text-green-400" bg="bg-green-500/15" />
          <TaxStatusCard label="Mixed" count={taxSummary.mixed} total={totalTaxJobs} color="text-amber-400" bg="bg-amber-500/15" />
          <TaxStatusCard label="Unknown" count={taxSummary.unknown} total={totalTaxJobs} color="text-neutral-400" bg="bg-white/10" />
        </div>

        {taxSummary.jobsNeedingClassification.length > 0 && (
          <div className="mt-3 bg-amber-950/15 border border-amber-900/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-sm">&#9888;</span>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Jobs Needing Tax Classification</span>
            </div>
            <div className="space-y-1.5">
              {taxSummary.jobsNeedingClassification.map((job) => {
                const badge = TAX_BADGE[job.tax_status] ?? TAX_BADGE.unknown;
                return (
                  <div key={job.job_number} className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-neutral-200 w-20 shrink-0">{job.job_number}</span>
                    <span className="text-neutral-400 truncate flex-1 min-w-0">{job.description ?? "\u2014"}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${badge.bg} ${badge.text}`}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Cost vs WIP Delta ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Cost vs WIP Delta</h3>
          {deltaJobsWithIssues.length > 0 && (
            <span className="text-[10px] font-medium text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
              {deltaJobsWithIssues.length} job{deltaJobsWithIssues.length !== 1 ? "s" : ""} with variance
            </span>
          )}
        </div>

        {costDelta.length === 0 ? (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-8 text-center">
            <p className="text-sm text-neutral-500">No cost comparison data available.</p>
            <p className="text-xs text-neutral-600 mt-1">Data appears once invoices are entered against your jobs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-800 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-900/50 text-xs text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Job</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-right">Invoice Cost</th>
                  <th className="px-4 py-3 text-right">WIP Cost</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {costDelta.map((job) => {
                  const badge = DELTA_BADGE[job.status] ?? DELTA_BADGE.match;
                  return (
                    <tr key={job.job_number} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-neutral-200 whitespace-nowrap">{job.job_number}</td>
                      <td className="px-4 py-2.5 text-neutral-400 text-xs max-w-[200px] truncate hidden md:table-cell">{job.description ?? "\u2014"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-neutral-200 tabular-nums">
                        {job.invoice_cost > 0 ? formatCurrencyFull(job.invoice_cost) : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-neutral-200 tabular-nums">
                        {job.wip_costs_to_date !== null ? formatCurrencyFull(job.wip_costs_to_date) : "\u2014"}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums font-medium ${
                        job.variance > 0 ? "text-amber-400" : job.variance < 0 ? "text-red-400" : "text-emerald-400"
                      }`}>
                        {formatCurrencyFull(job.variance)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-neutral-100">{value}</p>
      <p className="text-[10px] text-neutral-600 mt-1">{subtitle}</p>
    </div>
  );
}

function GlassKpiCard({
  label,
  sublabel,
  value,
  detail,
  accent,
  accentBg,
  badge,
}: {
  label: string;
  sublabel?: string;
  value: string;
  detail?: string;
  accent: string;
  accentBg: string;
  badge?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${accentBg}`} />
          <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
        </div>
        {badge && (
          <span className="text-[10px] font-medium text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <div className={`text-2xl font-bold ${accent} tabular-nums`}>{value}</div>
      {detail && <div className="text-xs mt-1 text-neutral-500">{detail}</div>}
      {sublabel && !detail && <div className="text-xs mt-1 text-neutral-600">{sublabel}</div>}
    </div>
  );
}

function TaxStatusCard({
  label,
  count,
  total,
  color,
  bg,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  bg: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${bg} ${color}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{count}</div>
      <div className="text-xs text-neutral-600 mt-1">{pct}% of {total} job{total !== 1 ? "s" : ""}</div>
      <div className="mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  align = "left",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer select-none hover:text-neutral-200 transition-colors whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function JobRow({
  job,
  own,
  expanded,
  onClick,
}: {
  job: DisplayJob;
  own: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <tr
        onClick={onClick}
        className={`border-b border-neutral-800/50 transition-colors ${
          own ? "hover:bg-neutral-800/50 cursor-pointer" : "opacity-60 cursor-default"
        } ${expanded ? "bg-neutral-800/30" : ""}`}
      >
        <td className="px-4 py-3 font-mono text-xs text-neutral-200 whitespace-nowrap">
          {job.job_number}
          {!own && <span className="ml-1.5 text-neutral-600" title="Restricted view">&#128274;</span>}
        </td>
        <td className="px-4 py-3 text-neutral-300 max-w-[280px] truncate">{job.description || "\u2014"}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${own ? "text-blue-400 bg-blue-400/10" : "text-neutral-400 bg-neutral-800"}`}>
            {job.project_manager}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs text-neutral-300">
          {job.pct_complete != null ? formatPct(Number(job.pct_complete)) : "\u2014"}
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs">
          <span className={own ? "text-neutral-200" : "text-neutral-300"}>
            {job.revised_contract != null ? formatCurrencyFull(Number(job.revised_contract)) : "\u2014"}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs">
          <span className={own ? "text-neutral-200" : "text-neutral-300"}>
            {job.backlog_revenue != null ? formatCurrencyFull(Number(job.backlog_revenue)) : "\u2014"}
          </span>
        </td>
      </tr>
      {expanded && own && (
        <tr className="bg-neutral-900/50">
          <td colSpan={6} className="px-6 py-4">
            <JobDetail job={job as OwnJob} />
          </td>
        </tr>
      )}
    </>
  );
}

function JobDetail({ job }: { job: OwnJob }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Contract</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Contract Amount" value={formatCurrencyFull(Number(job.contract_amount))} />
          <DetailItem label="Change Orders" value={formatCurrencyFull(Number(job.change_orders))} />
          <DetailItem label="Pending COs" value={formatCurrencyFull(Number(job.pending_change_orders))} />
          <DetailItem label="Revised Contract" value={formatCurrencyFull(Number(job.revised_contract))} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Estimate</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Original Estimate" value={formatCurrencyFull(Number(job.original_estimate))} />
          <DetailItem label="Estimate Changes" value={formatCurrencyFull(Number(job.estimate_changes))} />
          <DetailItem label="Pending CO Estimates" value={formatCurrencyFull(Number(job.pending_co_estimates))} />
          <DetailItem label="Revised Estimate" value={formatCurrencyFull(Number(job.revised_estimate))} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Profitability</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Gross Profit" value={formatCurrencyFull(Number(job.gross_profit))} />
          <DetailItem label="Gross Margin" value={formatPct(Number(job.gross_margin_pct))} />
          <DetailItem label="% Complete" value={formatPct(Number(job.pct_complete))} />
          <DetailItem label="Earned Revenue" value={formatCurrencyFull(Number(job.earned_revenue))} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">To Date</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Costs to Date" value={formatCurrencyFull(Number(job.costs_to_date))} />
          <DetailItem label="Gross Profit to Date" value={formatCurrencyFull(Number(job.gross_profit_to_date))} />
          <DetailItem label="Billings to Date" value={formatCurrencyFull(Number(job.billings_to_date))} />
          <DetailItem label="Revenue/Billing Excess" value={formatCurrencyFull(Number(job.revenue_billing_excess))} />
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Backlog</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Backlog Revenue" value={formatCurrencyFull(Number(job.backlog_revenue))} />
          <DetailItem label="Costs to Complete" value={formatCurrencyFull(Number(job.costs_to_complete))} />
          <DetailItem label="Backlog Profit" value={formatCurrencyFull(Number(job.backlog_profit))} />
          <DetailItem label="Invoicing Remaining" value={formatCurrencyFull(Number(job.invoicing_remaining))} />
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500 mb-0.5">{label}</p>
      <p className="text-neutral-200">{value}</p>
    </div>
  );
}
