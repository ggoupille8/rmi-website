import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  Users,
  MousePointerClick,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Settings,
} from "lucide-react";

interface OverviewData {
  pageViews: number;
  users: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  newUsers: number;
}

interface TopPage {
  path: string;
  views: number;
  users: number;
}

interface Referrer {
  source: string;
  sessions: number;
  users: number;
}

interface Device {
  device: string;
  sessions: number;
}

interface DailyPoint {
  date: string;
  views: number;
  users: number;
}

interface AnalyticsResponse {
  configured: boolean;
  days?: number;
  overview?: OverviewData;
  topPages?: TopPage[];
  referrers?: Referrer[];
  devices?: Device[];
  daily?: DailyPoint[];
  error?: string;
}

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  const m = parseInt(yyyymmdd.slice(4, 6), 10);
  const d = parseInt(yyyymmdd.slice(6, 8), 10);
  return `${m}/${d}`;
}

// --- Skeleton components ---

function SkeletonCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="h-3 w-20 bg-neutral-800 rounded mb-3" />
      <div className="h-7 w-16 bg-neutral-800 rounded" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="h-4 w-32 bg-neutral-800 rounded mb-4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 mb-3">
          <div className="h-3 flex-1 bg-neutral-800 rounded" />
          <div className="h-3 w-12 bg-neutral-800 rounded" />
          <div className="h-3 w-12 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
      <div className="h-4 w-40 bg-neutral-800 rounded mb-4" />
      <div className="h-48 bg-neutral-800 rounded" />
    </div>
  );
}

// --- Chart components (inline SVG, no external libraries) ---

function DailyTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-sm">
        No data available
      </div>
    );
  }

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const chartW = 800;
  const chartH = 200;
  const padL = 45;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const points = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * plotW;
    const y = padT + plotH - (d.views / maxViews) * plotH;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${padT + plotH} ${points.map((p) => `L ${p.x},${p.y}`).join(" ")} L ${points[points.length - 1].x},${padT + plotH} Z`;

  // Y-axis gridlines
  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round((maxViews / gridLines) * i)
  );

  // X-axis labels (show ~6 evenly spaced)
  const labelCount = Math.min(6, data.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1))
  );

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {gridValues.map((val, i) => {
        const y = padT + plotH - (val / maxViews) * plotH;
        return (
          <g key={i}>
            <line
              x1={padL}
              y1={y}
              x2={chartW - padR}
              y2={y}
              stroke="#404040"
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
            <text
              x={padL - 6}
              y={y + 3}
              textAnchor="end"
              fill="#737373"
              fontSize={10}
            >
              {formatNumber(val)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGradient)" />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={data.length <= 14 ? 3 : 1.5}
          fill="#3b82f6"
        />
      ))}

      {/* X-axis labels */}
      {labelIndices.map((idx) => (
        <text
          key={idx}
          x={points[idx].x}
          y={chartH - 5}
          textAnchor="middle"
          fill="#737373"
          fontSize={10}
        >
          {formatDate(data[idx].date)}
        </text>
      ))}
    </svg>
  );
}

function DeviceChart({ data }: { data: Device[] }) {
  const total = data.reduce((sum, d) => sum + d.sessions, 0) || 1;

  const deviceColors: Record<string, string> = {
    desktop: "#3b82f6",
    mobile: "#22c55e",
    tablet: "#f59e0b",
  };

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = ((d.sessions / total) * 100).toFixed(1);
        const color = deviceColors[d.device.toLowerCase()] || "#737373";
        return (
          <div key={d.device}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-neutral-300 capitalize">{d.device}</span>
              <span className="text-neutral-400">
                {pct}% ({d.sessions.toLocaleString()})
              </span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Not Configured state ---

function NotConfiguredCard() {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <Settings size={20} className="text-neutral-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-neutral-100 mb-1">
            GA4 Analytics Not Configured
          </h3>
          <p className="text-sm text-neutral-400">
            Set up Google Analytics 4 Data API access to view traffic analytics
            here.
          </p>
        </div>
      </div>

      <div className="bg-neutral-800/50 rounded-md p-4 text-sm text-neutral-300 space-y-3">
        <p className="font-medium text-neutral-200">Setup steps:</p>
        <ol className="list-decimal list-inside space-y-2 text-neutral-400">
          <li>
            Create a Google Cloud service account with GA4 Data API enabled
          </li>
          <li>
            Grant the service account <strong>Viewer</strong> access to your GA4
            property
          </li>
          <li>Get the numeric Property ID from GA4 Admin &gt; Property Settings</li>
          <li>
            Add these environment variables in Vercel:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>
                <code className="text-primary-400">GA4_PROPERTY_ID</code>
              </li>
              <li>
                <code className="text-primary-400">GA4_CLIENT_EMAIL</code>
              </li>
              <li>
                <code className="text-primary-400">GA4_PRIVATE_KEY</code>
              </li>
            </ul>
          </li>
          <li>Redeploy the application</li>
        </ol>
      </div>
    </div>
  );
}

// --- Error state ---

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-300 mb-1">
            Failed to load analytics
          </p>
          <p className="text-sm text-red-400/80">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    </div>
  );
}

// --- Main component ---

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok && res.status !== 200) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: AnalyticsResponse = await res.json();
      if (json.error && json.configured !== false) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Not configured
  if (!loading && data && data.configured === false) {
    return <NotConfiguredCard />;
  }

  // Error state
  if (!loading && error) {
    return <ErrorCard message={error} onRetry={fetchData} />;
  }

  const overview = data?.overview;
  const statCards = overview
    ? [
        {
          label: "Page Views",
          value: formatNumber(overview.pageViews),
          icon: Eye,
        },
        {
          label: "Unique Visitors",
          value: formatNumber(overview.users),
          icon: Users,
        },
        {
          label: "Sessions",
          value: formatNumber(overview.sessions),
          icon: MousePointerClick,
        },
        {
          label: "Bounce Rate",
          value: `${(overview.bounceRate * 100).toFixed(1)}%`,
          icon: TrendingDown,
        },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                days === range.days
                  ? "bg-neutral-700 text-neutral-100 font-medium"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !statCards
          ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <div
                key={card.label}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {card.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-neutral-100">
                  {card.value}
                </p>
              </div>
            ))}
      </div>

      {/* Secondary stats row */}
      {!loading && overview && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Avg. Session Duration
            </span>
            <p className="text-lg font-semibold text-neutral-200 mt-1">
              {formatDuration(overview.avgSessionDuration)}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              New Users
            </span>
            <p className="text-lg font-semibold text-neutral-200 mt-1">
              {formatNumber(overview.newUsers)}
            </p>
          </div>
        </div>
      )}

      {/* Daily trend chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-4">
          Daily Page Views
        </h3>
        {loading ? (
          <div className="h-48 bg-neutral-800 rounded animate-pulse" />
        ) : (
          <DailyTrendChart data={data?.daily || []} />
        )}
      </div>

      {/* Two-column: Top Pages + Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Top Pages
          </h3>
          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-right py-2 pl-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topPages || []).map((page, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                    >
                      <td className="py-2 pr-4 text-neutral-300 font-mono text-xs truncate max-w-[200px]">
                        {page.path}
                      </td>
                      <td className="py-2 px-2 text-right text-neutral-400 tabular-nums">
                        {page.views.toLocaleString()}
                      </td>
                      <td className="py-2 pl-2 text-right text-neutral-400 tabular-nums">
                        {page.users.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(data?.topPages || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-neutral-500"
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-300 mb-3">
            Traffic Sources
          </h3>
          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="text-right py-2 pl-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Users
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.referrers || []).map((ref, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                    >
                      <td className="py-2 pr-4 text-neutral-300 truncate max-w-[200px]">
                        {ref.source}
                      </td>
                      <td className="py-2 px-2 text-right text-neutral-400 tabular-nums">
                        {ref.sessions.toLocaleString()}
                      </td>
                      <td className="py-2 pl-2 text-right text-neutral-400 tabular-nums">
                        {ref.users.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(data?.referrers || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-neutral-500"
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Device breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-neutral-300 mb-4">
          Device Breakdown
        </h3>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-neutral-800 rounded mb-2" />
                <div className="h-2 bg-neutral-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <DeviceChart data={data?.devices || []} />
        )}
      </div>
    </div>
  );
}
