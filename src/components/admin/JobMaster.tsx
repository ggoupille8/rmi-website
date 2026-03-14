import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Save,
  X,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface JobMasterRecord {
  id: number;
  job_number: string;
  year: number;
  description: string | null;
  customer_id: number | null;
  customer_name_raw: string | null;
  contract_type: string | null;
  tax_status: string;
  tax_exemption_type: string | null;
  general_contractor: string | null;
  project_manager: string | null;
  is_hidden: boolean;
  po_number: string | null;
  timing: string | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasMore: boolean;
}

interface TaxBreakdown {
  taxable: number;
  exempt: number;
  mixed: number;
  unknown: number;
}

interface Stats {
  totalJobs: number;
  byYear: Record<string, number>;
  byTaxStatus: Record<string, number>;
  byPM: Record<string, number>;
  byContractType: Record<string, number>;
  needsClassification: number;
}

// ── Constants ──────────────────────────────────────────

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021];
const PMS = ["GG", "MD", "RG", "SB"];

const TAX_STATUS_OPTIONS = [
  { value: "", label: "All Tax Status" },
  { value: "taxable", label: "Taxable" },
  { value: "exempt", label: "Exempt" },
  { value: "mixed", label: "Mixed" },
  { value: "unknown", label: "Unknown" },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "LS", label: "Lump Sum" },
  { value: "TM", label: "T&M" },
  { value: "TM NTE", label: "TM NTE" },
  { value: "NTE", label: "NTE" },
];

const EXEMPTION_TYPES = [
  { value: "", label: "Select exemption type…" },
  { value: "nonprofit_hospital", label: "Nonprofit Hospital" },
  { value: "church_sanctuary", label: "Church Sanctuary" },
  { value: "pollution_control", label: "Pollution Control" },
  { value: "data_center", label: "Data Center" },
  { value: "nonprofit_housing", label: "Nonprofit Housing" },
  { value: "indian_tribe", label: "Indian Tribe" },
  { value: "enterprise_zone", label: "Enterprise Zone" },
  { value: "industrial_processing", label: "Industrial Processing" },
  { value: "out_of_state", label: "Out of State" },
  { value: "brownfield", label: "Brownfield" },
  { value: "other", label: "Other" },
];

const VALID_SORT_COLS = [
  "job_number",
  "year",
  "description",
  "customer_name_raw",
  "contract_type",
  "tax_status",
  "general_contractor",
  "project_manager",
] as const;

const TAX_BADGE_STYLES: Record<string, string> = {
  taxable: "bg-red-500/15 text-red-400",
  exempt: "bg-green-500/15 text-green-400",
  mixed: "bg-amber-500/15 text-amber-400",
  unknown: "bg-white/10 text-slate-400",
};

const TAX_BADGE_LABELS: Record<string, string> = {
  taxable: "Taxable",
  exempt: "Exempt",
  mixed: "Mixed",
  unknown: "Unknown",
};

// ── Component ──────────────────────────────────────────

export default function JobMaster() {
  // Data state
  const [jobs, setJobs] = useState<JobMasterRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
    hasMore: false,
  });
  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown>({
    taxable: 0,
    exempt: 0,
    mixed: 0,
    unknown: 0,
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState<number>(2026);
  const [pm, setPm] = useState("");
  const [taxFilter, setTaxFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("job_number");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // UI state
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    tax_status: string;
    tax_exemption_type: string;
    project_manager: string;
    contract_type: string;
  }>({ tax_status: "", tax_exemption_type: "", project_manager: "", contract_type: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkTaxStatus, setBulkTaxStatus] = useState("");
  const [bulkExemptionType, setBulkExemptionType] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [year, pm, taxFilter, typeFilter, searchDebounced]);

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
      if (pm) params.set("pm", pm);
      if (taxFilter) params.set("tax", taxFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (searchDebounced) params.set("q", searchDebounced);

      const res = await fetch(`/api/admin/jobs-master?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as {
        jobs: JobMasterRecord[];
        pagination: Pagination;
        taxBreakdown: TaxBreakdown;
      };
      setJobs(data.jobs ?? []);
      setPagination(
        data.pagination ?? { total: 0, page: 1, limit: 50, pages: 0, hasMore: false },
      );
      setTaxBreakdown(
        data.taxBreakdown ?? { taxable: 0, exempt: 0, mixed: 0, unknown: 0 },
      );
    } catch {
      setJobs([]);
    }
    setLoading(false);
  }, [year, page, sort, order, pm, taxFilter, typeFilter, searchDebounced]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Fetch global stats once
  useEffect(() => {
    fetch("/api/admin/jobs-master?action=stats")
      .then((r) => r.json())
      .then((d: Stats) => setStats(d))
      .catch(() => {});
  }, []);

  // Sort handler
  const handleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(col);
      setOrder("desc");
    }
  };

  // Sort indicator — active column shows colored arrow, inactive sortable columns show hint on hover
  const SortIcon = ({ col, sortable }: { col: string; sortable: boolean }) => {
    if (!sortable) return null;
    if (sort === col) {
      return order === "asc" ? (
        <ChevronUp size={14} className="text-primary-400" />
      ) : (
        <ChevronDown size={14} className="text-primary-400" />
      );
    }
    return (
      <ChevronDown
        size={12}
        className="text-slate-600 opacity-0 group-hover/th:opacity-100 transition-opacity"
      />
    );
  };

  // Inline edit handlers
  const startEdit = (job: JobMasterRecord) => {
    setEditingJobId(job.id);
    setEditForm({
      tax_status: job.tax_status,
      tax_exemption_type: job.tax_exemption_type ?? "",
      project_manager: job.project_manager ?? "",
      contract_type: job.contract_type ?? "",
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingJobId(null);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editingJobId) return;
    setSaving(true);
    setSaveError(null);

    try {
      const body: Record<string, unknown> = { id: editingJobId };

      // Find original job to detect changes
      const original = jobs.find((j) => j.id === editingJobId);
      if (!original) return;

      if (editForm.tax_status !== original.tax_status) {
        body.tax_status = editForm.tax_status;
      }
      if (editForm.tax_exemption_type !== (original.tax_exemption_type ?? "")) {
        body.tax_exemption_type = editForm.tax_exemption_type || null;
      }
      if (editForm.project_manager !== (original.project_manager ?? "")) {
        body.project_manager = editForm.project_manager || null;
      }
      if (editForm.contract_type !== (original.contract_type ?? "")) {
        body.contract_type = editForm.contract_type || null;
      }

      // Only call API if something changed
      if (Object.keys(body).length <= 1) {
        cancelEdit();
        return;
      }

      const res = await fetch("/api/admin/jobs-master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = (await res
          .json()
          .catch(() => ({ error: "Update failed" }))) as { error?: string };
        throw new Error(errData.error ?? "Update failed");
      }

      const data = (await res.json()) as { job: JobMasterRecord };
      // Update job in local state
      setJobs((prev) =>
        prev.map((j) => (j.id === editingJobId ? { ...j, ...data.job } : j)),
      );
      setEditingJobId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // Bulk selection handlers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const handleBulkClassify = async () => {
    if (selectedIds.size === 0 || !bulkTaxStatus) return;
    setBulkSaving(true);

    try {
      const body: Record<string, unknown> = {
        jobIds: Array.from(selectedIds),
        taxStatus: bulkTaxStatus,
      };
      if (bulkTaxStatus === "exempt" && bulkExemptionType) {
        body.taxExemptionType = bulkExemptionType;
      }

      const res = await fetch("/api/admin/jobs-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Bulk classify failed");

      // Refresh data
      setSelectedIds(new Set());
      setShowBulkForm(false);
      setBulkTaxStatus("");
      setBulkExemptionType("");
      await fetchJobs();

      // Refresh stats
      fetch("/api/admin/jobs-master?action=stats")
        .then((r) => r.json())
        .then((d: Stats) => setStats(d))
        .catch(() => {});
    } catch {
      // Error handled by UI
    } finally {
      setBulkSaving(false);
    }
  };

  // Computed
  const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  return (
    <div className="max-w-[1400px]">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Jobs" value={stats?.totalJobs ?? 0} />
        <StatCard
          label="Taxable"
          value={stats?.byTaxStatus?.taxable ?? 0}
          color="text-red-400"
          dotColor="bg-red-400"
        />
        <StatCard
          label="Exempt"
          value={stats?.byTaxStatus?.exempt ?? 0}
          color="text-green-400"
          dotColor="bg-green-400"
        />
        <StatCard
          label="Mixed"
          value={stats?.byTaxStatus?.mixed ?? 0}
          color="text-amber-400"
          dotColor="bg-amber-400"
        />
        <StatCard
          label="Unknown"
          value={stats?.byTaxStatus?.unknown ?? 0}
          color="text-slate-400"
          dotColor="bg-slate-400"
        />
        <StatCard label="This Year" value={stats?.byYear?.[String(year)] ?? 0} />
      </div>

      {/* Needs Classification Alert */}
      {(stats?.needsClassification ?? 0) > 0 && (
        <div className="flex items-center gap-2 mb-5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-400">
          <AlertTriangle size={14} />
          <span className="font-medium">
            {stats?.needsClassification} jobs need tax classification
          </span>
          <button
            type="button"
            onClick={() => {
              setTaxFilter("unknown");
              setPage(1);
            }}
            className="ml-auto inline-flex items-center gap-1.5 underline hover:text-amber-300 transition-colors"
          >
            Show unknown jobs
            <span className="no-underline inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold leading-none tabular-nums">
              {stats?.needsClassification ?? 0}
            </span>
          </button>
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

        {/* PM */}
        <select
          value={pm}
          onChange={(e) => setPm(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          <option value="">All PMs</option>
          {PMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Tax Status */}
        <select
          value={taxFilter}
          onChange={(e) => setTaxFilter(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          {TAX_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Contract Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
        >
          {CONTRACT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job #, description, customer, GC…"
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-xs bg-white/5 border border-white/[0.08] text-slate-200 outline-none placeholder:text-slate-600 focus:border-primary-500/40"
          />
        </div>
      </div>

      {/* Bulk Classify Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 rounded-lg border border-primary-500/20 bg-primary-500/[0.06] px-4 py-2.5 text-xs">
          <span className="text-primary-400 font-medium">
            {selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""} selected
          </span>

          {!showBulkForm ? (
            <button
              type="button"
              onClick={() => setShowBulkForm(true)}
              className="ml-auto px-3 py-1 rounded bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors"
            >
              Set Tax Status
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={bulkTaxStatus}
                onChange={(e) => {
                  setBulkTaxStatus(e.target.value);
                  if (e.target.value !== "exempt") setBulkExemptionType("");
                }}
                className="text-xs rounded px-2 py-1 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
              >
                <option value="">Tax status…</option>
                <option value="taxable">Taxable</option>
                <option value="exempt">Exempt</option>
                <option value="mixed">Mixed</option>
                <option value="unknown">Unknown</option>
              </select>

              {bulkTaxStatus === "exempt" && (
                <select
                  value={bulkExemptionType}
                  onChange={(e) => setBulkExemptionType(e.target.value)}
                  className="text-xs rounded px-2 py-1 bg-white/5 border border-white/[0.08] text-slate-300 outline-none"
                >
                  {EXEMPTION_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>
                      {et.label}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleBulkClassify}
                disabled={!bulkTaxStatus || bulkSaving}
                className="px-3 py-1 rounded bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors disabled:opacity-40 disabled:cursor-default flex items-center gap-1.5"
              >
                {bulkSaving && <Loader2 size={12} className="animate-spin" />}
                Apply
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBulkForm(false);
                  setBulkTaxStatus("");
                  setBulkExemptionType("");
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedIds(new Set());
              setShowBulkForm(false);
            }}
            className="text-slate-500 hover:text-slate-300 text-xs underline ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500 text-left">
              {/* Checkbox column */}
              <th className="px-3 py-2.5 w-8">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-slate-500 hover:text-slate-300"
                >
                  {allSelected ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                </button>
              </th>
              {(
                [
                  { key: "job_number", label: "Job #" },
                  { key: "description", label: "Description" },
                  { key: "customer_name_raw", label: "Customer" },
                  { key: "contract_type", label: "Type" },
                  { key: "tax_status", label: "Tax Status" },
                  { key: "tax_exemption_type", label: "Exemption" },
                  { key: "project_manager", label: "PM" },
                  { key: "general_contractor", label: "GC" },
                  { key: "year", label: "Year" },
                ] as const
              ).map((col) => {
                const isSortable = VALID_SORT_COLS.includes(
                  col.key as (typeof VALID_SORT_COLS)[number],
                );
                return (
                  <th
                    key={col.key}
                    className={`group/th px-3 py-2.5 font-medium select-none whitespace-nowrap ${
                      isSortable
                        ? "cursor-pointer hover:text-slate-300 transition-colors"
                        : ""
                    }`}
                    onClick={() => {
                      if (isSortable) handleSort(col.key);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}{" "}
                      <SortIcon col={col.key} sortable={isSortable} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  <Loader2
                    size={20}
                    className="animate-spin inline-block mr-2"
                  />
                  Loading…
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No jobs found for the selected filters.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isEditing={editingJobId === job.id}
                  isSelected={selectedIds.has(job.id)}
                  editForm={editForm}
                  saving={saving}
                  saveError={editingJobId === job.id ? saveError : null}
                  onToggleSelect={() => toggleSelect(job.id)}
                  onStartEdit={() => startEdit(job)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onEditFormChange={setEditForm}
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
            Showing {(page - 1) * 50 + 1}–
            {Math.min(page * 50, pagination.total)} of {pagination.total}
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
            {generatePageNumbers(page, pagination.pages).map((p, i) =>
              p === -1 ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-600">
                  …
                </span>
              ) : (
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
              ),
            )}
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

// ── Helpers ────────────────────────────────────────────

function generatePageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: number[] = [1];
  if (current > 3) pages.push(-1); // ellipsis

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(-1); // ellipsis
  if (pages[pages.length - 1] !== total) pages.push(total);

  return pages;
}

function formatExemptionType(type: string | null): string {
  if (!type) return "—";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Sub-components ─────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  dotColor,
}: {
  label: string;
  value: number;
  color?: string;
  dotColor?: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        {dotColor && (
          <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
        )}
        {label}
      </div>
      <div className={`text-lg font-bold ${color ?? "text-slate-200"}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TaxBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
        TAX_BADGE_STYLES[status] ?? "bg-white/10 text-slate-400"
      }`}
    >
      {status === "unknown" && <AlertTriangle size={10} />}
      {TAX_BADGE_LABELS[status] ?? status}
    </span>
  );
}

function JobRow({
  job,
  isEditing,
  isSelected,
  editForm,
  saving,
  saveError,
  onToggleSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
}: {
  job: JobMasterRecord;
  isEditing: boolean;
  isSelected: boolean;
  editForm: {
    tax_status: string;
    tax_exemption_type: string;
    project_manager: string;
    contract_type: string;
  };
  saving: boolean;
  saveError: string | null;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditFormChange: (form: {
    tax_status: string;
    tax_exemption_type: string;
    project_manager: string;
    contract_type: string;
  }) => void;
}) {
  const hiddenClass = job.is_hidden ? "opacity-50" : "";

  return (
    <>
      <tr
        className={`border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors ${hiddenClass} ${
          isSelected ? "bg-primary-500/[0.06]" : ""
        }`}
        onClick={() => {
          if (!isEditing) onStartEdit();
        }}
      >
        {/* Checkbox */}
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="text-slate-500 hover:text-slate-300"
          >
            {isSelected ? (
              <CheckSquare size={14} className="text-primary-400" />
            ) : (
              <Square size={14} />
            )}
          </button>
        </td>

        <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
          {job.job_number}
          {job.is_hidden && (
            <span className="ml-1.5 text-[10px] text-slate-600">(hidden)</span>
          )}
        </td>
        <td className="px-3 py-2 max-w-[200px] truncate">
          {job.description ? (
            <span className="text-slate-400">{job.description}</span>
          ) : (
            <span className="text-slate-600 italic">No description</span>
          )}
        </td>
        <td className="px-3 py-2 max-w-[150px] truncate">
          {job.customer_name_raw ? (
            <span className="text-slate-400">{job.customer_name_raw}</span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-slate-500">{job.contract_type ?? "—"}</td>
        <td className="px-3 py-2">
          <TaxBadge status={job.tax_status} />
        </td>
        <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">
          {formatExemptionType(job.tax_exemption_type)}
        </td>
        <td className="px-3 py-2 text-slate-400 font-mono">
          {job.project_manager ?? "—"}
        </td>
        <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">
          {job.general_contractor ?? "—"}
        </td>
        <td className="px-3 py-2 text-slate-500">{job.year}</td>
      </tr>

      {/* Inline edit panel */}
      {isEditing && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={10} className="px-4 py-3 bg-white/[0.02]">
            <div className="flex flex-wrap items-end gap-4">
              {/* Tax Status */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                  Tax Status
                </label>
                <select
                  value={editForm.tax_status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    onEditFormChange({
                      ...editForm,
                      tax_status: newStatus,
                      tax_exemption_type:
                        newStatus === "taxable"
                          ? ""
                          : editForm.tax_exemption_type,
                    });
                  }}
                  className="text-xs rounded px-2 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none focus:border-primary-500/40"
                >
                  <option value="taxable">Taxable</option>
                  <option value="exempt">Exempt</option>
                  <option value="mixed">Mixed</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Exemption Type (only if exempt) */}
              {editForm.tax_status === "exempt" && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                    Exemption Type
                  </label>
                  <select
                    value={editForm.tax_exemption_type}
                    onChange={(e) =>
                      onEditFormChange({
                        ...editForm,
                        tax_exemption_type: e.target.value,
                      })
                    }
                    className="text-xs rounded px-2 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none focus:border-primary-500/40"
                  >
                    {EXEMPTION_TYPES.map((et) => (
                      <option key={et.value} value={et.value}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PM */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                  PM
                </label>
                <select
                  value={editForm.project_manager}
                  onChange={(e) =>
                    onEditFormChange({
                      ...editForm,
                      project_manager: e.target.value,
                    })
                  }
                  className="text-xs rounded px-2 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">—</option>
                  {PMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Type */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                  Contract Type
                </label>
                <select
                  value={editForm.contract_type}
                  onChange={(e) =>
                    onEditFormChange({
                      ...editForm,
                      contract_type: e.target.value,
                    })
                  }
                  className="text-xs rounded px-2 py-1.5 bg-white/5 border border-white/[0.08] text-slate-300 outline-none focus:border-primary-500/40"
                >
                  <option value="">—</option>
                  <option value="LS">Lump Sum</option>
                  <option value="TM">T&M</option>
                  <option value="TM NTE">TM NTE</option>
                  <option value="NTE">NTE</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                {saveError && (
                  <span className="text-red-400 text-xs">{saveError}</span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEdit();
                  }}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveEdit();
                  }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-primary-600 text-white font-medium hover:bg-primary-500 transition-colors disabled:opacity-40 disabled:cursor-default"
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
