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

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

export default function PmDashboard({ pmCode, pmName }: PmDashboardProps) {
  const [data, setData] = useState<WipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pmFilter, setPmFilter] = useState<string>("");
  const [sortCol, setSortCol] = useState("job_number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    // PM filter
    if (pmFilter) {
      combined = combined.filter((j) => j.project_manager === pmFilter);
    }

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      combined = combined.filter(
        (j) =>
          j.job_number.toLowerCase().includes(term) ||
          (j.description?.toLowerCase().includes(term) ?? false)
      );
    }

    // Sort
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

  // PM summary stats (from own jobs)
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
    return {
      totalJobs: jobs.length,
      totalRevised,
      totalBacklog,
      totalEarned,
      avgMargin,
    };
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
              value={
                selectedYear && selectedMonth
                  ? `${selectedYear}-${selectedMonth}`
                  : ""
              }
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
            <KpiCard
              label="Total Revised Contract"
              value={formatCurrency(Number(data.companyTotals.total_revised_contract))}
              subtitle="Company Total"
            />
            <KpiCard
              label="Total Backlog"
              value={formatCurrency(Number(data.companyTotals.total_backlog_revenue))}
              subtitle="Company Total"
            />
            <KpiCard
              label="Total Earned Revenue"
              value={formatCurrency(Number(data.companyTotals.total_earned_revenue))}
              subtitle="Company Total"
            />
            <KpiCard
              label="Total Gross Profit"
              value={formatCurrency(Number(data.companyTotals.total_gross_profit))}
              subtitle="Company Total"
            />
          </div>
        )}

        {/* My Jobs Summary */}
        {pmSummary && (
          <div className="mb-6 p-4 bg-blue-600/10 border border-blue-600/20 rounded-lg">
            <h2 className="text-sm font-semibold text-blue-400 mb-3">
              Your Jobs — {pmName}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Total Jobs</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {pmSummary.totalJobs}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Revised Contract</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {formatCurrency(pmSummary.totalRevised)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Backlog</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {formatCurrency(pmSummary.totalBacklog)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Earned Revenue</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {formatCurrency(pmSummary.totalEarned)}
                </p>
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

        {/* Filters */}
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

        {/* Job Table */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-neutral-500">Loading WIP data...</div>
          </div>
        ) : data ? (
          <div className="overflow-x-auto border border-neutral-800 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <Th onClick={() => handleSort("job_number")}>
                    Job #{sortIndicator("job_number")}
                  </Th>
                  <Th onClick={() => handleSort("description")}>
                    Description{sortIndicator("description")}
                  </Th>
                  <Th onClick={() => handleSort("project_manager")}>
                    PM{sortIndicator("project_manager")}
                  </Th>
                  <Th onClick={() => handleSort("pct_complete")} align="right">
                    % Complete{sortIndicator("pct_complete")}
                  </Th>
                  <Th onClick={() => handleSort("revised_contract")} align="right">
                    Revised Contract{sortIndicator("revised_contract")}
                  </Th>
                  <Th onClick={() => handleSort("backlog_revenue")} align="right">
                    Backlog{sortIndicator("backlog_revenue")}
                  </Th>
                </tr>
              </thead>
              <tbody>
                {allJobs.map((job) => {
                  const own = job._isOwn;
                  const expanded = expandedRow === job.job_number && own;
                  return (
                    <JobRow
                      key={job.job_number}
                      job={job}
                      own={own}
                      expanded={expanded}
                      onClick={() => handleRowClick(job)}
                    />
                  );
                })}
                {allJobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No jobs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-neutral-100">{value}</p>
      <p className="text-[10px] text-neutral-600 mt-1">{subtitle}</p>
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
          own
            ? "hover:bg-neutral-800/50 cursor-pointer"
            : "opacity-60 cursor-default"
        } ${expanded ? "bg-neutral-800/30" : ""}`}
      >
        <td className="px-4 py-3 font-mono text-xs text-neutral-200 whitespace-nowrap">
          {job.job_number}
          {!own && (
            <span className="ml-1.5 text-neutral-600" title="Restricted view">
              &#128274;
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-neutral-300 max-w-[280px] truncate">
          {job.description || "\u2014"}
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ${
              own
                ? "text-blue-400 bg-blue-400/10"
                : "text-neutral-400 bg-neutral-800"
            }`}
          >
            {job.project_manager}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs text-neutral-300">
          {job.pct_complete != null ? formatPct(Number(job.pct_complete)) : "\u2014"}
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs">
          <span className={own ? "text-neutral-200" : "text-neutral-300"}>
            {job.revised_contract != null
              ? formatCurrencyFull(Number(job.revised_contract))
              : "\u2014"}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs">
          <span className={own ? "text-neutral-200" : "text-neutral-300"}>
            {job.backlog_revenue != null
              ? formatCurrencyFull(Number(job.backlog_revenue))
              : "\u2014"}
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
      {/* Contract section */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Contract
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Contract Amount" value={formatCurrencyFull(Number(job.contract_amount))} />
          <DetailItem label="Change Orders" value={formatCurrencyFull(Number(job.change_orders))} />
          <DetailItem label="Pending COs" value={formatCurrencyFull(Number(job.pending_change_orders))} />
          <DetailItem label="Revised Contract" value={formatCurrencyFull(Number(job.revised_contract))} />
        </div>
      </div>
      {/* Estimate section */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Estimate
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Original Estimate" value={formatCurrencyFull(Number(job.original_estimate))} />
          <DetailItem label="Estimate Changes" value={formatCurrencyFull(Number(job.estimate_changes))} />
          <DetailItem label="Pending CO Estimates" value={formatCurrencyFull(Number(job.pending_co_estimates))} />
          <DetailItem label="Revised Estimate" value={formatCurrencyFull(Number(job.revised_estimate))} />
        </div>
      </div>
      {/* Profitability section */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Profitability
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Gross Profit" value={formatCurrencyFull(Number(job.gross_profit))} />
          <DetailItem label="Gross Margin" value={formatPct(Number(job.gross_margin_pct))} />
          <DetailItem label="% Complete" value={formatPct(Number(job.pct_complete))} />
          <DetailItem label="Earned Revenue" value={formatCurrencyFull(Number(job.earned_revenue))} />
        </div>
      </div>
      {/* To Date section */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          To Date
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <DetailItem label="Costs to Date" value={formatCurrencyFull(Number(job.costs_to_date))} />
          <DetailItem label="Gross Profit to Date" value={formatCurrencyFull(Number(job.gross_profit_to_date))} />
          <DetailItem label="Billings to Date" value={formatCurrencyFull(Number(job.billings_to_date))} />
          <DetailItem label="Revenue/Billing Excess" value={formatCurrencyFull(Number(job.revenue_billing_excess))} />
        </div>
      </div>
      {/* Backlog section */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
          Backlog
        </h4>
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
