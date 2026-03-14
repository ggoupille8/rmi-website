import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserPlus,
  FileText,
  Upload,
  Briefcase,
  Building2,
  RefreshCw,
} from "lucide-react";

interface ActivityEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  user: string;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  status_change: "Status Change",
  create: "Created",
  update: "Updated",
  import: "Imported",
  tax_status_change: "Tax Status",
  bulk_tax_update: "Bulk Update",
};

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  client: "Client",
  invoice: "Invoice",
  financial: "Financial",
  job: "Job",
};

const ENTITY_ICONS: Record<string, typeof Activity> = {
  lead: UserPlus,
  client: Building2,
  invoice: FileText,
  financial: Upload,
  job: Briefcase,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/15 text-green-400",
  status_change: "bg-blue-500/15 text-blue-400",
  update: "bg-amber-500/15 text-amber-400",
  import: "bg-purple-500/15 text-purple-400",
  tax_status_change: "bg-cyan-500/15 text-cyan-400",
  bulk_tax_update: "bg-orange-500/15 text-orange-400",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + "m ago";
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return diffHrs + "h ago";
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return diffDays + "d ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function descriptionFor(entry: ActivityEntry): string {
  const d = entry.details;
  switch (entry.action) {
    case "status_change":
      return `${d.name ?? "Lead"} → ${d.new_status ?? "unknown"}`;
    case "create":
      if (entry.entity_type === "client") return `${d.name ?? "Client"} (${d.domain ?? ""})`;
      if (entry.entity_type === "invoice") return `#${d.invoice_number ?? ""} - Job ${d.job_number ?? ""}`;
      return entry.entity_id;
    case "update":
      return `${d.name ?? "Item"} updated`;
    case "import":
      return `${d.report_type ?? "report"}: ${d.filename ?? ""}`;
    case "tax_status_change":
      return `Job ${d.job_number ?? entry.entity_id} → ${d.new_status ?? ""}`;
    case "bulk_tax_update":
      return `${d.count ?? 0} jobs → ${d.new_status ?? ""}`;
    default:
      return entry.entity_id || entry.action;
  }
}

const PER_PAGE = 25;

export default function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: "full" });
      params.set("limit", String(PER_PAGE));
      params.set("offset", String((page - 1) * PER_PAGE));
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entity_type", entityFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/activity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("Activity fetch error:", err);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-primary-400" />
          <h1 className="text-xl font-semibold text-neutral-100">Activity Log</h1>
          <span className="text-sm text-neutral-500">{total} entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showFilters
                ? "border-primary-500 bg-primary-500/10 text-primary-400"
                : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
          <button
            type="button"
            onClick={() => { setPage(1); fetchData(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-neutral-700 text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200"
            >
              <option value="">All actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="status_change">Status Change</option>
              <option value="import">Imported</option>
              <option value="tax_status_change">Tax Status</option>
              <option value="bulk_tax_update">Bulk Update</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">Entity</label>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200"
            >
              <option value="">All entities</option>
              <option value="lead">Leads</option>
              <option value="client">Clients</option>
              <option value="invoice">Invoices</option>
              <option value="financial">Financials</option>
              <option value="job">Jobs</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-200"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Activity size={32} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-neutral-400">No activity entries found</p>
          <p className="text-sm text-neutral-600 mt-1">Actions will appear here as you use the admin panel</p>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-2.5 font-medium text-neutral-400">Time</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-400">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-400">Entity</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-400">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-400">User</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const Icon = ENTITY_ICONS[entry.entity_type] ?? Activity;
                const actionColor = ACTION_COLORS[entry.action] ?? "bg-neutral-500/15 text-neutral-400";
                return (
                  <tr key={entry.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap">
                      {formatTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${actionColor}`}>
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-neutral-300">
                        <Icon size={14} className="text-neutral-500" />
                        {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-200 max-w-xs truncate">
                      {descriptionFor(entry)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{entry.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-neutral-700 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-neutral-700 text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
