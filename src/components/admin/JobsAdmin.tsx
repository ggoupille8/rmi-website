import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface JobFlag {
  id: number;
  flag_type: string;
  message: string;
  resolved: boolean;
}

interface Job {
  id: number;
  job_number: string;
  year: number;
  description: string | null;
  customer_name: string | null;
  job_type: string | null;
  section: string | null;
  contract_value: string | null;
  timing: string | null;
  close_date: string | null;
  po_number: string | null;
  taxable: string | null;
  general_contractor: string | null;
  project_manager: string | null;
  status: string;
  is_hidden: boolean;
  has_folder: boolean;
  folder_name: string | null;
  source_row: number;
  source_sheet: string;
  synced_at: string;
  created_at: string;
  flags: JobFlag[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

interface Summary {
  total: number;
  open: number;
  closed: number;
  written_up: number;
  tm: number;
  ls: number;
}

interface SyncEntry {
  id: number;
  sync_type: string;
  jobs_total: number;
  jobs_created: number;
  jobs_updated: number;
  jobs_unchanged: number;
  errors: string | null;
  duration_ms: number;
  status: string;
  created_at: string;
}

interface StatsData {
  by_year: { year: number; count: number }[];
  by_status: { status: string; count: number }[];
  by_pm: { pm: string; count: number }[];
  by_type: { type: string; count: number }[];
}

// ── Helpers ────────────────────────────────────────────

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021];
const PMS = ["GG", "MD", "RG", "SB"];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "written_up", label: "Written Up" },
];
const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "TM", label: "T&M" },
  { value: "LS", label: "Lump Sum" },
];

function formatCurrency(val: string | null): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const statusRowColor: Record<string, string> = {
  closed: "border-l-2 border-l-red-500/60 bg-red-500/[0.04]",
  written_up: "border-l-2 border-l-green-500/60 bg-green-500/[0.04]",
  open: "border-l-2 border-l-transparent",
};

// ── Component ──────────────────────────────────────────

export default function JobsAdmin() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50, pages: 0, hasMore: false });
  const [summary, setSummary] = useState<Summary>({ total: 0, open: 0, closed: 0, written_up: 0, tm: 0, ls: 0 });
  const [stats, setStats] = useState<StatsData | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ recent_syncs: SyncEntry[]; unresolved_flags: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState<number>(2026);
  const [status, setStatus] = useState("");
  const [pm, setPm] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("job_number");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // UI state
  const [expandedJob, setExpandedJob] = useState<number | null>(null);
  const [showFlags, setShowFlags] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [year, status, pm, type, searchDebounced]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("page", String(page));
      params.set("limit", "50");
      params.set("sort", sort);
      params.set("order", order);
      if (status) params.set("status", status);
      if (pm) params.set("pm", pm);
      if (type) params.set("type", type);
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await fetch(`/api/admin/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setPagination(data.pagination ?? { total: 0, page: 1, limit: 50, pages: 0, hasMore: false });
      setSummary(data.summary ?? { total: 0, open: 0, closed: 0, written_up: 0, tm: 0, ls: 0 });
    } catch {
      setJobs([]);
    }
    setLoading(false);
  }, [year, page, sort, order, status, pm, type, searchDebounced]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Fetch global stats + sync status once
  useEffect(() => {
    fetch("/api/jobs/stats")
      .then((r) => r.json())
      .then((d: StatsData) => setStats(d))
      .catch(() => {});
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((d: { recent_syncs: SyncEntry[]; unresolved_flags: number }) => setSyncStatus(d))
      .catch(() => {});
  }, []);

  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(col);
      setOrder("desc");
    }
  };

  const handleResolveFlag = async (flagId: number) => {
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flag_id: flagId }),
    });
    if (res.ok) fetchJobs();
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return order === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const lastSync = syncStatus?.recent_syncs?.[0];
  const allFlags = jobs.flatMap((j) => j.flags.map((f) => ({ ...f, job_number: j.job_number })));
  const totalAllTime = stats?.by_year?.reduce((s, y) => s + y.count, 0) ?? 0;

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100">Job Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">
          Synced from RMI Job W.I.P. spreadsheet
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard label="All Time" value={totalAllTime} />
        <StatCard label="Open" value={summary.open} color="text-blue-400" />
        <StatCard label="Closed" value={summary.closed} color="text-red-400" />
        <StatCard label="Written Up" value={summary.written_up} color="text-green-400" />
        <StatCard label="T&M" value={summary.tm} />
        <StatCard label="Lump Sum" value={summary.ls} />
        <StatCard
          label="Flags"
          value={syncStatus?.unresolved_flags ?? 0}
          color={syncStatus?.unresolved_flags ? "text-amber-400" : undefined}
        />
      </div>

      {/* Sync Status */}
      {lastSync && (
        <div className="flex items-center gap-3 mb-5 text-xs text-slate-500">
          <Clock size={14} />
          <span>
            Last sync: {timeAgo(lastSync.created_at)} &middot;{" "}
            {lastSync.jobs_total} jobs ({lastSync.jobs_created} new, {lastSync.jobs_updated} updated)
            &middot; {lastSync.duration_ms}ms
            {lastSync.status === "failed" && (
              <span className="text-red-400 ml-1">FAILED</span>
            )}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Year tabs */}
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                year === y
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* PM */}
        <select
          value={pm}
          onChange={(e) => setPm(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          <option value="">All PMs</option>
          {PMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Type */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job #, description, customer, PO…"
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs bg-white/5 border border-white/[0.08] text-slate-200 outline-none placeholder:text-slate-600 focus:border-primary-500/40"
          />
        </div>

        {/* Flags toggle */}
        <button
          type="button"
          onClick={() => setShowFlags(!showFlags)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showFlags
              ? "bg-amber-500/20 text-amber-400"
              : "bg-white/5 border border-white/[0.08] text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle size={14} />
          Flags ({syncStatus?.unresolved_flags ?? 0})
        </button>
      </div>

      {/* Flags Panel */}
      {showFlags && allFlags.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-400">Unresolved Flags</h3>
            <button type="button" onClick={() => setShowFlags(false)} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allFlags.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono text-[10px]">
                    {f.flag_type}
                  </span>
                  {f.job_number && <span className="text-slate-400 font-mono">{f.job_number}</span>}
                  <span className="text-slate-500">{f.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleResolveFlag(f.id)}
                  className="text-green-400/70 hover:text-green-400 transition-colors ml-3 shrink-0"
                  title="Resolve flag"
                >
                  <CheckCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500 text-left">
              {[
                { key: "job_number", label: "Job #" },
                { key: "description", label: "Description" },
                { key: "customer_name", label: "Customer" },
                { key: "job_type", label: "Type" },
                { key: "contract_value", label: "Value" },
                { key: "po_number", label: "PO" },
                { key: "general_contractor", label: "GC" },
                { key: "project_manager", label: "PM" },
                { key: "status", label: "Status" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 font-medium cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label} <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No jobs found for the selected filters.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  expanded={expandedJob === job.id}
                  onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  onResolveFlag={handleResolveFlag}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
          <span>
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    page === p
                      ? "bg-primary-600/20 text-primary-400"
                      : "hover:bg-white/[0.06] text-slate-500"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={!pagination.hasMore}
              className="p-1.5 rounded hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color ?? "text-slate-200"}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-400",
    closed: "bg-red-500/15 text-red-400",
    written_up: "bg-green-500/15 text-green-400",
  };
  const labels: Record<string, string> = {
    open: "Open",
    closed: "Closed",
    written_up: "Written Up",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${styles[status] ?? "bg-white/10 text-slate-400"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function JobRow({
  job,
  expanded,
  onToggle,
  onResolveFlag,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  onResolveFlag: (id: number) => void;
}) {
  const hasFlags = job.flags.length > 0;
  return (
    <>
      <tr
        className={`border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors ${statusRowColor[job.status] ?? ""}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
          {job.job_number}
          {hasFlags && (
            <AlertTriangle size={12} className="inline ml-1.5 text-amber-400" />
          )}
        </td>
        <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{job.description ?? "—"}</td>
        <td className="px-3 py-2 text-slate-400 max-w-[150px] truncate">{job.customer_name ?? "—"}</td>
        <td className="px-3 py-2 text-slate-500">{job.job_type ?? "—"}</td>
        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{formatCurrency(job.contract_value)}</td>
        <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{job.po_number ?? "—"}</td>
        <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{job.general_contractor ?? "—"}</td>
        <td className="px-3 py-2 text-slate-400 font-mono">{job.project_manager ?? "—"}</td>
        <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={9} className="px-4 py-3 bg-white/[0.02]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Detail label="Section" value={job.section} />
              <Detail label="Timing" value={job.timing} />
              <Detail label="Close Date" value={job.close_date} />
              <Detail label="Taxable" value={job.taxable} />
              <Detail label="Source" value={`Sheet ${job.source_sheet}, Row ${job.source_row}`} />
              <Detail label="Synced" value={job.synced_at ? timeAgo(job.synced_at) : "—"} />
              <Detail label="Has Folder" value={job.has_folder ? "Yes" : "No"} />
              {job.folder_name && <Detail label="Folder" value={job.folder_name} />}
            </div>
            {hasFlags && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-2">Flags</div>
                {job.flags.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono text-[10px]">
                      {f.flag_type}
                    </span>
                    <span className="text-slate-500">{f.message}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onResolveFlag(f.id); }}
                      className="text-green-400/70 hover:text-green-400 ml-auto"
                      title="Resolve"
                    >
                      <CheckCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div>
      <div className="text-slate-400 mt-0.5">{value ?? "—"}</div>
    </div>
  );
}
