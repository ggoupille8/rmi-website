import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  slot: string;
  action: string;
  previous_blob_url: string | null;
  previous_filename: string | null;
  new_blob_url: string | null;
  new_filename: string | null;
  performed_by: string;
  performed_at: string;
  notes: string | null;
}

// Human-readable slot names
function humanizeSlot(slot: string): string {
  if (slot.startsWith("hero-")) {
    const num = slot.replace("hero-", "");
    return `Hero Slide ${num}`;
  }
  if (slot.startsWith("project-")) {
    const name = slot
      .replace("project-", "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return name;
  }
  if (slot.startsWith("service-")) {
    const parts = slot.replace("service-", "").split("-");
    const num = parts.pop();
    const name = parts
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${name} #${num}`;
  }
  return slot;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionBadgeClass(action: string): string {
  switch (action) {
    case "upload":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "revert":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "delete":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "restore":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:
      return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "upload":
      return "Upload";
    case "revert":
      return "Revert";
    case "delete":
      return "Delete";
    case "restore":
      return "Restore";
    default:
      return action;
  }
}

const PAGE_SIZE = 20;

export default function MediaAuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async (pageOffset: number) => {
    try {
      setError("");
      setLoading(true);
      const res = await fetch(
        `/api/admin/media-audit?limit=${PAGE_SIZE}&offset=${pageOffset}`
      );
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const data = (await res.json()) as {
        logs: AuditEntry[];
        total: number;
      };
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(offset);
  }, [fetchLogs, offset]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (logs.length === 0 && total === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500 text-sm">No audit log entries yet.</p>
        <p className="text-neutral-600 text-xs mt-1">
          Changes to media slots will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-neutral-500">
          {total} {total === 1 ? "entry" : "entries"} total
        </p>
        {loading && (
          <Loader2 size={14} className="animate-spin text-neutral-500" />
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700/50 bg-neutral-800/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Slot
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Action
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Previous
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                New
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {logs.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-neutral-800/30 transition-colors"
              >
                {/* Date */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="text-neutral-300 text-xs"
                    title={new Date(entry.performed_at).toLocaleString()}
                  >
                    {formatRelativeTime(entry.performed_at)}
                  </span>
                </td>

                {/* Slot */}
                <td className="px-4 py-3">
                  <span className="text-neutral-200 text-xs font-medium">
                    {humanizeSlot(entry.slot)}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${actionBadgeClass(entry.action)}`}
                  >
                    {actionLabel(entry.action)}
                  </span>
                  {entry.notes && (
                    <p className="text-[10px] text-neutral-500 mt-0.5 max-w-[160px] truncate">
                      {entry.notes}
                    </p>
                  )}
                </td>

                {/* Previous thumbnail */}
                <td className="px-4 py-3 text-center">
                  {entry.previous_blob_url ? (
                    <img
                      src={entry.previous_blob_url}
                      alt="Previous"
                      className="inline-block w-12 h-12 rounded object-cover border border-neutral-700"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-neutral-600 text-xs">&mdash;</span>
                  )}
                </td>

                {/* New thumbnail */}
                <td className="px-4 py-3 text-center">
                  {entry.new_blob_url ? (
                    <img
                      src={entry.new_blob_url}
                      alt="New"
                      className="inline-block w-12 h-12 rounded object-cover border border-neutral-700"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-neutral-600 text-xs">&mdash;</span>
                  )}
                </td>

                {/* Performed by */}
                <td className="px-4 py-3">
                  <span className="text-neutral-400 text-xs">
                    {entry.performed_by}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <span className="text-xs text-neutral-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setOffset(Math.min((totalPages - 1) * PAGE_SIZE, offset + PAGE_SIZE))
            }
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
