import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Target,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Settings,
} from "lucide-react";

// --- Data interfaces ---

interface OverviewData {
  users: number;
  engaged: number;
  avgDuration: number;
  engagementRate: number;
  sessions: number;
  newUsers: number;
}

interface CityRow {
  city: string;
  region: string;
  users: number;
  engaged: number;
}

interface ScreenResRow {
  resolution: string;
  users: number;
}

interface BrowserOSRow {
  browser: string;
  os: string;
  users: number;
}

interface SourceMediumRow {
  source: string;
  sessions: number;
  engaged: number;
  engagementRate: number;
  avgDuration: number;
}

interface HourlyRow {
  hour: string;
  users: number;
  engaged: number;
}

interface DayOfWeekRow {
  day: number;
  users: number;
  engaged: number;
}

interface ReferrerRow {
  url: string;
  sessions: number;
}

interface Device {
  device: string;
  sessions: number;
}

interface DailyPoint {
  date: string;
  engaged: number;
  users: number;
}

interface AnalyticsResponse {
  configured: boolean;
  days?: number;
  overview?: OverviewData;
  cities?: CityRow[];
  screenResolutions?: ScreenResRow[];
  browserOS?: BrowserOSRow[];
  sourceMedium?: SourceMediumRow[];
  hourly?: HourlyRow[];
  dayOfWeek?: DayOfWeekRow[];
  referrers?: ReferrerRow[];
  devices?: Device[];
  daily?: DailyPoint[];
  error?: string;
}

const DATE_RANGES = [
  { label: "1d", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// --- Formatters ---

function formatDuration(seconds: number | undefined | null): string {
  const s = seconds ?? 0;
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}m ${secs}s`;
}

function formatNumber(n: number | undefined | null): string {
  const val = n ?? 0;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function formatPercent(rate: number | undefined | null): string {
  return `${((rate ?? 0) * 100).toFixed(1)}%`;
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  const m = parseInt(yyyymmdd.slice(4, 6), 10);
  const d = parseInt(yyyymmdd.slice(6, 8), 10);
  return `${m}/${d}`;
}

function engagementColor(rate: number | undefined | null): string {
  const r = rate ?? 0;
  if (r >= 0.3) return "text-green-400";
  if (r >= 0.1) return "text-yellow-400";
  return "text-red-400";
}

function engagementBg(rate: number | undefined | null): string {
  const r = rate ?? 0;
  if (r >= 0.3) return "bg-green-400/10";
  if (r >= 0.1) return "bg-yellow-400/10";
  return "bg-red-400/10";
}

const MICHIGAN_KEYWORDS = ["michigan", "mi"];

function isMichiganCity(region: string): boolean {
  const lower = region.toLowerCase();
  return MICHIGAN_KEYWORDS.some((kw) => lower.includes(kw));
}

function truncateUrl(url: string, maxLen: number): string {
  if (url.length <= maxLen) return url;
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname + parsed.search;
    const remaining = maxLen - domain.length - 3;
    if (remaining > 0 && path.length > remaining) {
      return `${domain}${path.slice(0, remaining)}...`;
    }
    return `${domain}${path}`;
  } catch {
    return url.slice(0, maxLen) + "...";
  }
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

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
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
    <div className="animate-pulse">
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

  const maxVal = Math.max(...data.map((d) => d.engaged), 1);
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
    const y = padT + plotH - (d.engaged / maxVal) * plotH;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${padT + plotH} ${points.map((p) => `L ${p.x},${p.y}`).join(" ")} L ${points[points.length - 1].x},${padT + plotH} Z`;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) =>
    Math.round((maxVal / gridLines) * i)
  );

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
      {gridValues.map((val, i) => {
        const y = padT + plotH - (val / maxVal) * plotH;
        return (
          <g key={i}>
            <line
              x1={padL} y1={y} x2={chartW - padR} y2={y}
              stroke="#404040" strokeWidth={0.5} strokeDasharray="4,4"
            />
            <text x={padL - 6} y={y + 3} textAnchor="end" fill="#737373" fontSize={10}>
              {formatNumber(val)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#engagedGradient)" />
      <defs>
        <linearGradient id="engagedGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polyline
        points={polyline} fill="none" stroke="#22c55e"
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={data.length <= 14 ? 3 : 1.5} fill="#22c55e" />
      ))}
      {labelIndices.map((idx) => (
        <text key={idx} x={points[idx].x} y={chartH - 5} textAnchor="middle" fill="#737373" fontSize={10}>
          {formatDate(data[idx].date)}
        </text>
      ))}
    </svg>
  );
}

function HourlyChart({ data }: { data: HourlyRow[] }) {
  // Fill in missing hours
  const hourMap = new Map(data.map((d) => [parseInt(d.hour, 10), d]));
  const allHours = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    users: hourMap.get(i)?.users || 0,
    engaged: hourMap.get(i)?.engaged || 0,
  }));

  const maxEngaged = Math.max(...allHours.map((h) => h.engaged), 1);
  const barW = 28;
  const gap = 4;
  const chartW = 24 * (barW + gap);
  const chartH = 120;
  const padT = 10;
  const padB = 24;
  const plotH = chartH - padT - padB;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {allHours.map((h) => {
        const x = h.hour * (barW + gap);
        const ratio = h.engaged / maxEngaged;
        const barH = Math.max(ratio * plotH, 1);
        const opacity = Math.max(ratio * 0.8 + 0.2, 0.15);
        const isBusinessHour = h.hour >= 8 && h.hour <= 17;
        return (
          <g key={h.hour}>
            <rect
              x={x} y={padT + plotH - barH}
              width={barW} height={barH}
              rx={2}
              fill={isBusinessHour ? "#3b82f6" : "#6b7280"}
              opacity={opacity}
            />
            <text
              x={x + barW / 2} y={chartH - 4}
              textAnchor="middle" fill="#737373" fontSize={9}
            >
              {h.hour === 0 ? "12a" : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? "12p" : `${h.hour - 12}p`}
            </text>
            {h.engaged > 0 && (
              <text
                x={x + barW / 2} y={padT + plotH - barH - 3}
                textAnchor="middle" fill="#a3a3a3" fontSize={8}
              >
                {h.engaged}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DayOfWeekRow({ data }: { data: DayOfWeekRow[] }) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMap = new Map(data.map((d) => [d.day, d]));
  const allDays = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    name: dayNames[i],
    users: dayMap.get(i)?.users || 0,
    engaged: dayMap.get(i)?.engaged || 0,
  }));

  const maxEngaged = Math.max(...allDays.map((d) => d.engaged), 1);

  return (
    <div className="flex gap-2">
      {allDays.map((d) => {
        const ratio = d.engaged / maxEngaged;
        const isWeekday = d.day >= 1 && d.day <= 5;
        const bgOpacity = Math.max(ratio * 0.6, 0.05);
        return (
          <div
            key={d.day}
            className="flex-1 text-center rounded-md py-2 px-1"
            style={{
              backgroundColor: isWeekday
                ? `rgba(59, 130, 246, ${bgOpacity})`
                : `rgba(107, 114, 128, ${bgOpacity})`,
            }}
          >
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{d.name}</div>
            <div className="text-sm font-semibold text-neutral-200 mt-0.5">{d.engaged}</div>
            <div className="text-[10px] text-neutral-500">{d.users} total</div>
          </div>
        );
      })}
    </div>
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
                {pct}% ({(d.sessions ?? 0).toLocaleString()})
              </span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
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
            Set up Google Analytics 4 Data API access to view traffic analytics here.
          </p>
        </div>
      </div>
      <div className="bg-neutral-800/50 rounded-md p-4 text-sm text-neutral-300 space-y-3">
        <p className="font-medium text-neutral-200">Setup steps:</p>
        <ol className="list-decimal list-inside space-y-2 text-neutral-400">
          <li>Create a Google Cloud service account with GA4 Data API enabled</li>
          <li>Grant the service account <strong>Viewer</strong> access to your GA4 property</li>
          <li>Get the numeric Property ID from GA4 Admin &gt; Property Settings</li>
          <li>
            Add these environment variables in Vercel:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li><code className="text-primary-400">GA4_PROPERTY_ID</code></li>
              <li><code className="text-primary-400">GA4_CLIENT_EMAIL</code></li>
              <li><code className="text-primary-400">GA4_PRIVATE_KEY</code></li>
            </ul>
          </li>
          <li>Redeploy the application</li>
        </ol>
      </div>
    </div>
  );
}

// --- Error state ---

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-300 mb-1">Failed to load analytics</p>
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

// --- Section wrapper ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-neutral-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}

// --- Table helper ---

function DataTable<T>({
  columns,
  data,
  renderRow,
}: {
  columns: { label: string; align?: "left" | "right" }[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800">
            {columns.map((col) => (
              <th
                key={col.label}
                className={`py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-neutral-500">
                No data
              </td>
            </tr>
          ) : (
            data.map((item, i) => renderRow(item, i))
          )}
        </tbody>
      </table>
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

  if (!loading && data && data.configured === false) {
    return <NotConfiguredCard />;
  }

  if (!loading && error) {
    return <ErrorCard message={error} onRetry={fetchData} />;
  }

  const isLoading = loading || !data;
  const overview = data?.overview;

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

      {/* Section 1: Visitor Intelligence — 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading || !overview ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-neutral-500" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Real Visitors
                </span>
              </div>
              <p className="text-2xl font-bold text-neutral-100">
                {formatNumber(overview.users)}
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className={overview.engagementRate > 0.2 ? "text-green-500" : "text-neutral-500"} />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Engaged
                </span>
              </div>
              <p className={`text-2xl font-bold ${overview.engagementRate > 0.2 ? "text-green-400" : "text-neutral-100"}`}>
                {formatNumber(overview.engaged)}
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-neutral-500" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Avg. Time on Site
                </span>
              </div>
              <p className="text-2xl font-bold text-neutral-100">
                {formatDuration(overview.avgDuration)}
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-neutral-500" />
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Engagement Rate
                </span>
              </div>
              <p className={`text-2xl font-bold ${overview.engagementRate > 0.2 ? "text-green-400" : "text-neutral-100"}`}>
                {formatPercent(overview.engagementRate)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Section 2 + 3: Geographic Intelligence + Visitor Fingerprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic Intelligence */}
        <Section title="Geographic Intelligence">
          {isLoading ? (
            <SkeletonTable rows={6} />
          ) : (
            <DataTable
              columns={[
                { label: "City" },
                { label: "State" },
                { label: "Visitors", align: "right" },
                { label: "Engaged", align: "right" },
              ]}
              data={data?.cities || []}
              renderRow={(city, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                >
                  <td className={`py-1.5 px-2 ${isMichiganCity(city.region) ? "text-blue-400 font-medium" : "text-neutral-300"}`}>
                    {city.city}
                  </td>
                  <td className={`py-1.5 px-2 text-sm ${isMichiganCity(city.region) ? "text-blue-400/70" : "text-neutral-500"}`}>
                    {city.region}
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                    {city.users}
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                    {city.engaged}
                  </td>
                </tr>
              )}
            />
          )}
        </Section>

        {/* Visitor Fingerprint */}
        <div className="space-y-4">
          <Section title="Screen Resolutions">
            {isLoading ? (
              <SkeletonTable rows={4} />
            ) : (
              <DataTable
                columns={[
                  { label: "Resolution" },
                  { label: "Visitors", align: "right" },
                ]}
                data={data?.screenResolutions || []}
                renderRow={(sr, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs">
                      {sr.resolution}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {sr.users}
                    </td>
                  </tr>
                )}
              />
            )}
          </Section>

          <Section title="Browser / OS">
            {isLoading ? (
              <SkeletonTable rows={4} />
            ) : (
              <DataTable
                columns={[
                  { label: "Browser / OS" },
                  { label: "Visitors", align: "right" },
                ]}
                data={data?.browserOS || []}
                renderRow={(bo, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-1.5 px-2 text-neutral-300 text-xs">
                      {bo.browser} <span className="text-neutral-600">/</span> {bo.os}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {bo.users}
                    </td>
                  </tr>
                )}
              />
            )}
          </Section>
        </div>
      </div>

      {/* Section 4: Traffic Source Intelligence */}
      <Section title="Traffic Source Intelligence">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable
            columns={[
              { label: "Source / Medium" },
              { label: "Sessions", align: "right" },
              { label: "Engaged", align: "right" },
              { label: "Eng. Rate", align: "right" },
              { label: "Avg Duration", align: "right" },
            ]}
            data={data?.sourceMedium || []}
            renderRow={(sm, i) => {
              const isDirect = sm.source === "(direct) / (none)";
              return (
                <tr
                  key={i}
                  className={`border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors ${isDirect ? "opacity-50" : ""}`}
                >
                  <td className="py-1.5 px-2 text-neutral-300 text-xs max-w-[200px] truncate">
                    {sm.source}
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                    {sm.sessions}
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                    {sm.engaged}
                  </td>
                  <td className={`py-1.5 px-2 text-right tabular-nums ${engagementColor(sm.engagementRate)}`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${engagementBg(sm.engagementRate)}`}>
                      {formatPercent(sm.engagementRate)}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">
                    {formatDuration(sm.avgDuration)}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Section>

      {/* Section 5: Time-of-Day Patterns */}
      <Section title="Hourly Traffic Pattern">
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-4 text-[10px] text-neutral-500 mb-2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500/60" /> Business hours (8a-5p)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-neutral-500/60" /> Off hours
              </span>
            </div>
            <HourlyChart data={data?.hourly || []} />
          </div>
        )}
      </Section>

      {/* Day of Week */}
      <Section title="Day of Week — Engaged Sessions">
        {isLoading ? (
          <SkeletonTable rows={1} />
        ) : (
          <DayOfWeekRow data={data?.dayOfWeek || []} />
        )}
      </Section>

      {/* Section 6: Referrer Deep Dive */}
      <Section title="Referrer URLs">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable
            columns={[
              { label: "Referrer URL" },
              { label: "Sessions", align: "right" },
            ]}
            data={data?.referrers || []}
            renderRow={(ref, i) => (
              <tr
                key={i}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
              >
                <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs max-w-[400px] truncate" title={ref.url}>
                  {truncateUrl(ref.url, 60)}
                </td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                  {ref.sessions}
                </td>
              </tr>
            )}
          />
        )}
      </Section>

      {/* Section 7: Daily Engaged Traffic Trend */}
      <Section title="Daily Engaged Traffic">
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <DailyTrendChart data={data?.daily || []} />
        )}
      </Section>

      {/* Device Breakdown */}
      <Section title="Device Breakdown">
        {isLoading ? (
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
      </Section>
    </div>
  );
}
