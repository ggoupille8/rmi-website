import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

interface BlacklistEntry {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  expires_at: string | null;
  auto_banned: boolean;
  submission_count: number;
  metadata: Record<string, unknown> | null;
}

interface BlacklistStats {
  totalBlocked: number;
  autoBanned: number;
  manualBanned: number;
  totalAttempts: number;
}

export default function IPBlacklist() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [stats, setStats] = useState<BlacklistStats>({
    totalBlocked: 0,
    autoBanned: 0,
    manualBanned: 0,
    totalAttempts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Block form state
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  const fetchBlacklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/blacklist");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as {
        ok: boolean;
        entries: BlacklistEntry[];
        stats: BlacklistStats;
      };
      if (data.ok) {
        setEntries(data.entries);
        setStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockIp.trim() || !blockReason.trim()) return;
    try {
      setBlocking(true);
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: blockIp.trim(), reason: blockReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to block IP");
      setBlockIp("");
      setBlockReason("");
      setShowBlockForm(false);
      await fetchBlacklist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block IP");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Unblock ${ip}?`)) return;
    try {
      const res = await fetch(
        `/api/admin/blacklist?ip=${encodeURIComponent(ip)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to unblock");
      await fetchBlacklist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock IP");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.totalBlocked}</div>
          <div className="text-xs text-neutral-400 mt-1">Total Blocked</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.autoBanned}</div>
          <div className="text-xs text-neutral-400 mt-1">Auto-Banned</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.manualBanned}</div>
          <div className="text-xs text-neutral-400 mt-1">Manual Blocks</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-400">{stats.totalAttempts}</div>
          <div className="text-xs text-neutral-400 mt-1">Blocked Attempts</div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowBlockForm(!showBlockForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Block IP
        </button>
        <button
          type="button"
          onClick={() => fetchBlacklist()}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Block Form */}
      {showBlockForm && (
        <form
          onSubmit={handleBlock}
          className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="block-ip"
                className="block text-sm font-medium text-neutral-300 mb-1"
              >
                IP Address
              </label>
              <input
                id="block-ip"
                type="text"
                value={blockIp}
                onChange={(e) => setBlockIp(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white text-sm focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label
                htmlFor="block-reason"
                className="block text-sm font-medium text-neutral-300 mb-1"
              >
                Reason
              </label>
              <input
                id="block-reason"
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Spam submissions"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-white text-sm focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={blocking}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {blocking ? "Blocking..." : "Block IP"}
            </button>
            <button
              type="button"
              onClick={() => setShowBlockForm(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">
                  IP Address
                </th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">
                  Reason
                </th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">
                  Blocked
                </th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">
                  Expires
                </th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">
                  Attempts
                </th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    <Shield size={24} className="mx-auto mb-2 text-neutral-600" />
                    No blocked IPs
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 ${
                      isExpired(entry.expires_at) ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-white font-mono text-xs">
                      {entry.ip_address}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 max-w-[200px] truncate">
                      {entry.reason}
                    </td>
                    <td className="px-4 py-3">
                      {entry.auto_banned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300 border border-red-800">
                          Auto
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-800">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {formatDate(entry.blocked_at)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {entry.expires_at
                        ? isExpired(entry.expires_at)
                          ? "Expired"
                          : formatDate(entry.expires_at)
                        : "Permanent"}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-300 font-mono">
                      {entry.submission_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleUnblock(entry.ip_address)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        title="Unblock this IP"
                      >
                        <Trash2 size={14} />
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
