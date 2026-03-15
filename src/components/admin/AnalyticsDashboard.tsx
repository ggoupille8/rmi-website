import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Target,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Settings,
  Calendar,
  FileText,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Eye,
  MousePointer,
  LogOut,
  Activity,
  BarChart3,
  Building2,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// --- Data interfaces ---

interface OverviewData {
  users: number;
  engaged: number;
  avgDuration: number;
  engagementRate: number;
  sessions: number;
  newUsers: number;
  bounceRate?: number;
  returningUsers?: number;
  sessionsPerUser?: number;
  totalInteractions?: number;
}

interface TrafficSummary {
  prospects: number;
  suspicious: number;
  bots: number;
  botPercentage: number;
}

interface CityRow {
  city: string;
  region: string;
  visitors: number;
  engaged: number;
  classification: "prospect" | "suspicious" | "bot";
  bounceRate?: number;
  avgDuration?: number;
}

interface TimelineEntry {
  date: string;
  city: string;
  region: string;
  engaged: number;
  avgDuration: number;
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

interface TopPageRow {
  path: string;
  views: number;
  engaged: number;
  avgDuration: number;
}

interface FunnelData {
  pageViews: number;
  engagedSessions: number;
  formSubmissions: number;
}

interface VisitorSession {
  id: string;
  created_at: string;
  session_id: string;
  visitor_id: string | null;
  visit_number: number;
  ip_address: string | null;
  page_path: string;
  referrer_url: string | null;
  referrer_domain: string | null;
  geo_city: string | null;
  geo_region: string | null;
  geo_country: string | null;
  isp_org: string | null;
  ip_type: string | null;
  is_vpn: boolean;
  is_datacenter: boolean;
  is_bot: boolean;
  device_type: string | null;
  screen_width: number | null;
  screen_height: number | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  language: string | null;
  timezone: string | null;
  connection_type: string | null;
  scroll_depth: number;
  time_on_page_ms: number;
  engaged: boolean;
  interactions: number;
  sections_viewed: string[] | null;
  cta_clicks: number;
  form_started: boolean;
  exit_intent: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  traffic_class: string;
}

interface ReturnVisitor {
  visitor_id: string;
  visit_count: number;
  first_seen: string;
  last_seen: string;
  total_time_ms: number;
  max_scroll: number;
  geo_city: string | null;
  geo_region: string | null;
  ip_type: string | null;
  isp_org: string | null;
  device_type: string | null;
  browser_name: string | null;
  os_name: string | null;
  form_started: boolean;
}

interface ISPEntry {
  isp_org: string;
  ip_type: string | null;
  total: number;
  engaged_count: number;
  unique_visitors: number;
  avg_time_ms: number;
  form_starts: number;
  cities: string;
}

interface VisitorSessionData {
  recentSessions: VisitorSession[];
  geoBreakdown: Array<{
    geo_city: string;
    geo_region: string;
    ip_type: string | null;
    traffic_class: string;
    total: number;
    engaged_count: number;
    avg_time_ms: number;
    avg_scroll: number;
    unique_visitors: number;
    form_starts: number;
    isp_org: string | null;
  }>;
  stats: {
    total_sessions: number;
    unique_visitors: number;
    engaged_sessions: number;
    avg_time_ms: number;
    avg_scroll: number;
    total_interactions: number;
    form_starts: number;
    cta_clicks: number;
    exit_intents: number;
    returning_visitors: number;
    bot_sessions: number;
    prospect_sessions: number;
  };
  returnVisitors: ReturnVisitor[];
  hourlyVisitors: Array<{ hour: number; total: number; engaged: number; prospects: number }>;
  ispBreakdown: ISPEntry[];
}

interface NewVsReturningRow {
  type: string;
  users: number;
  engaged: number;
  avgDuration: number;
  bounceRate: number;
}

interface LandingPageRow {
  path: string;
  sessions: number;
  engaged: number;
  avgDuration: number;
  bounceRate: number;
}

interface CountryRow {
  country: string;
  users: number;
  engaged: number;
}

interface ChannelRow {
  channel: string;
  sessions: number;
  engaged: number;
  avgDuration: number;
  conversions: number;
}

interface CustomEventRow {
  event: string;
  count: number;
  users: number;
}

interface AnalyticsResponse {
  configured: boolean;
  days?: number;
  overview?: OverviewData;
  trafficSummary?: TrafficSummary;
  prospectActivity?: CityRow[];
  engagedTimeline?: TimelineEntry[];
  cities?: CityRow[];
  screenResolutions?: ScreenResRow[];
  browserOS?: BrowserOSRow[];
  sourceMedium?: SourceMediumRow[];
  hourly?: HourlyRow[];
  dayOfWeek?: DayOfWeekRow[];
  referrers?: ReferrerRow[];
  devices?: Device[];
  daily?: DailyPoint[];
  topPages?: TopPageRow[];
  funnel?: FunnelData;
  visitorSessions?: VisitorSessionData;
  newVsReturning?: NewVsReturningRow[];
  landingPages?: LandingPageRow[];
  countries?: CountryRow[];
  channels?: ChannelRow[];
  customEvents?: CustomEventRow[];
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

function formatDurationMs(ms: number | undefined | null): string {
  const totalSec = (ms ?? 0) / 1000;
  return formatDuration(totalSec);
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

function formatPercentRaw(pct: number | undefined | null): string {
  return `${(pct ?? 0).toFixed(1)}%`;
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  const m = parseInt(yyyymmdd.slice(4, 6), 10);
  const d = parseInt(yyyymmdd.slice(6, 8), 10);
  return `${m}/${d}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `${month}/${day} ${h12}:${m}${ampm}`;
  } catch {
    return iso;
  }
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
  const lower = (region ?? "").toLowerCase();
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

function classificationBadge(classification: string | undefined | null): string {
  if (classification === "prospect") return "bg-green-600/20 text-green-400";
  if (classification === "suspicious") return "bg-yellow-600/15 text-yellow-400";
  if (classification === "bot") return "bg-red-600/15 text-red-400";
  return "bg-neutral-700 text-neutral-400";
}

function ipTypeBadgeClasses(ipType: string | null | undefined): string {
  const t = (ipType ?? "").toLowerCase();
  if (t === "residential") return "bg-green-600/20 text-green-400 border-green-600/30";
  if (t === "business") return "bg-blue-600/20 text-blue-400 border-blue-600/30";
  if (t === "mobile") return "bg-amber-600/20 text-amber-400 border-amber-600/30";
  if (t === "datacenter") return "bg-red-600/20 text-red-400 border-red-600/30";
  if (t === "vpn") return "bg-purple-600/20 text-purple-400 border-purple-600/30";
  if (t === "tor") return "bg-red-600/20 text-red-400 border-red-600/30";
  return "bg-neutral-700/50 text-neutral-400 border-neutral-600/30";
}

function trafficClassBadge(tc: string | undefined | null): string {
  const t = (tc ?? "").toLowerCase();
  if (t === "prospect") return "bg-green-600/20 text-green-400";
  if (t === "suspicious") return "bg-yellow-600/15 text-yellow-400";
  if (t === "bot") return "bg-red-600/15 text-red-400";
  if (t === "engaged") return "bg-blue-600/20 text-blue-400";
  return "bg-neutral-700 text-neutral-400";
}

function scrollDepthColor(depth: number): string {
  if (depth >= 75) return "bg-green-500";
  if (depth >= 50) return "bg-blue-500";
  if (depth >= 25) return "bg-yellow-500";
  return "bg-red-500";
}

function deviceIcon(deviceType: string | null | undefined) {
  const t = (deviceType ?? "").toLowerCase();
  if (t === "mobile" || t === "phone") return <Smartphone size={14} className="text-neutral-400" />;
  if (t === "tablet") return <Tablet size={14} className="text-neutral-400" />;
  return <Monitor size={14} className="text-neutral-400" />;
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

interface SkeletonTableProps {
  rows?: number;
}

function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
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

// --- Section wrapper (collapsible) ---

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}

function Section({ title, children, defaultOpen = true, badge }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 text-left min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={14} className="text-neutral-500" />
          ) : (
            <ChevronRight size={14} className="text-neutral-500" />
          )}
          <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
          {badge}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// --- Table helper ---

interface DataTableProps<T> {
  columns: { label: string; align?: "left" | "right" }[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  maxRows?: number;
}

function DataTable<T>({
  columns,
  data,
  renderRow,
  maxRows,
}: DataTableProps<T>) {
  const [showAll, setShowAll] = useState(false);
  const displayData = maxRows && !showAll ? data.slice(0, maxRows) : data;
  const hasMore = maxRows ? data.length > maxRows : false;

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
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-neutral-500">
                No data
              </td>
            </tr>
          ) : (
            displayData.map((item, i) => renderRow(item, i))
          )}
        </tbody>
      </table>
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full mt-2 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded transition-colors min-h-[44px]"
        >
          Show all {data.length} rows
        </button>
      )}
    </div>
  );
}

// --- Chart components ---

interface DailyTrendChartProps {
  data: DailyPoint[];
}

function DailyTrendChart({ data }: DailyTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral-500 text-sm">
        No data available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="engagedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#404040" strokeOpacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#737373", fontSize: 10 }}
          axisLine={{ stroke: "#404040" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #404040",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#a3a3a3" }}
          itemStyle={{ padding: "2px 0" }}
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="#3b82f6"
          strokeWidth={1.5}
          fill="url(#usersGradient)"
          name="Total Users"
          dot={data.length <= 14}
        />
        <Area
          type="monotone"
          dataKey="engaged"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#engagedGradient)"
          name="Engaged"
          dot={data.length <= 14}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ConversionFunnelProps {
  funnel: FunnelData;
}

function ConversionFunnel({ funnel }: ConversionFunnelProps) {
  const stages = [
    { label: "Page Views", value: funnel.pageViews, color: "#3b82f6" },
    { label: "Engaged Sessions", value: funnel.engagedSessions, color: "#f59e0b" },
    { label: "Form Submissions", value: funnel.formSubmissions, color: "#22c55e" },
  ];

  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct = ((stage.value / maxVal) * 100).toFixed(1);
        const convRate =
          i > 0 && stages[i - 1].value > 0
            ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
            : null;
        return (
          <div key={stage.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-neutral-300">{stage.label}</span>
              <span className="text-neutral-200 font-semibold tabular-nums">
                {stage.value.toLocaleString()}
                {convRate && (
                  <span className="text-neutral-500 font-normal ml-2 text-xs">
                    {convRate}% of previous
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: stage.color,
                  minWidth: stage.value > 0 ? "4px" : "0",
                }}
              />
            </div>
            {i < stages.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown size={14} className="text-neutral-600" />
              </div>
            )}
          </div>
        );
      })}
      {funnel.pageViews > 0 && (
        <div className="pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Overall Conversion Rate</span>
            <span className="text-green-400 font-semibold">
              {((funnel.formSubmissions / funnel.pageViews) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface HourlyChartProps {
  data: HourlyRow[];
}

function HourlyChart({ data }: HourlyChartProps) {
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
  const barX = (hour: number) => hour * (barW + gap);

  return (
    <div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <rect
          x={barX(8)} y={0}
          width={barX(17) - barX(8) + barW}
          height={chartH - padB}
          fill="#3b82f6"
          opacity={0.03}
          rx={4}
        />
        {allHours.map((h) => {
          const x = barX(h.hour);
          const ratio = h.engaged / maxEngaged;
          const bH = Math.max(ratio * plotH, 1);
          const barOpacity = Math.max(ratio * 0.8 + 0.2, 0.15);
          const isBusinessHour = h.hour >= 8 && h.hour <= 17;
          return (
            <g key={h.hour}>
              <rect
                x={x} y={padT + plotH - bH}
                width={barW} height={bH}
                rx={2}
                fill={isBusinessHour ? "#3b82f6" : "#6b7280"}
                opacity={barOpacity}
              />
              <text
                x={x + barW / 2} y={chartH - 4}
                textAnchor="middle" fill="#737373" fontSize={9}
              >
                {h.hour === 0 ? "12a" : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? "12p" : `${h.hour - 12}p`}
              </text>
              {h.engaged > 0 && (
                <text
                  x={x + barW / 2} y={padT + plotH - bH - 3}
                  textAnchor="middle" fill="#a3a3a3" fontSize={8}
                >
                  {h.engaged}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-neutral-600 text-center mt-1">Business Hours (8AM-5PM EST)</p>
    </div>
  );
}

interface DayOfWeekChartProps {
  data: DayOfWeekRow[];
}

function DayOfWeekChart({ data }: DayOfWeekChartProps) {
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

interface DeviceChartProps {
  data: Device[];
}

function DeviceChart({ data }: DeviceChartProps) {
  const total = data.reduce((sum, d) => sum + (d.sessions ?? 0), 0) || 1;
  const deviceColors: Record<string, string> = {
    desktop: "#3b82f6",
    mobile: "#22c55e",
    tablet: "#f59e0b",
  };

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = (((d.sessions ?? 0) / total) * 100).toFixed(1);
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

// --- Visitor Session Row (expandable) ---

interface VisitorSessionRowProps {
  session: VisitorSession;
}

function VisitorSessionRow({ session }: VisitorSessionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isMI = isMichiganCity(session.geo_region ?? "");
  const timeSeconds = (session.time_on_page_ms ?? 0) / 1000;

  return (
    <>
      <tr
        className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 px-2">
          <div className="flex items-center gap-1">
            {expanded ? (
              <ChevronDown size={12} className="text-neutral-500" />
            ) : (
              <ChevronRight size={12} className="text-neutral-500" />
            )}
            <span className="text-xs text-neutral-500">{formatTimestamp(session.created_at)}</span>
          </div>
        </td>
        <td className="py-2 px-2">
          <span className={isMI ? "text-blue-400 font-medium text-sm" : "text-neutral-300 text-sm"}>
            {session.geo_city ?? "Unknown"}
          </span>
          {session.geo_region && (
            <span className={isMI ? "text-blue-400/70 text-xs ml-1" : "text-neutral-500 text-xs ml-1"}>
              {session.geo_region}
            </span>
          )}
        </td>
        <td className="py-2 px-2">
          {session.ip_type && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${ipTypeBadgeClasses(session.ip_type)}`}>
              {session.ip_type}
            </span>
          )}
        </td>
        <td className="py-2 px-2">
          {deviceIcon(session.device_type)}
        </td>
        <td className="py-2 px-2 text-right">
          <span className={timeSeconds > 30 ? "text-green-400 text-xs" : timeSeconds > 10 ? "text-yellow-400 text-xs" : "text-neutral-500 text-xs"}>
            {formatDuration(timeSeconds)}
          </span>
        </td>
        <td className="py-2 px-2">
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${scrollDepthColor(session.scroll_depth)}`}
                style={{ width: `${Math.min(session.scroll_depth, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 tabular-nums">{session.scroll_depth}%</span>
          </div>
        </td>
        <td className="py-2 px-2">
          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${trafficClassBadge(session.traffic_class)}`}>
            {session.traffic_class}
          </span>
        </td>
        <td className="py-2 px-2 text-center">
          <div className="flex items-center gap-1 justify-center">
            {session.form_started && (
              <span className="text-green-400" title="Form Started">
                <FileText size={12} />
              </span>
            )}
            {session.cta_clicks > 0 && (
              <span className="text-blue-400" title={`${session.cta_clicks} CTA clicks`}>
                <MousePointer size={12} />
              </span>
            )}
            {session.exit_intent && (
              <span className="text-yellow-400" title="Exit Intent">
                <LogOut size={12} />
              </span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-neutral-800/50">
          <td colSpan={8} className="py-3 px-4 bg-neutral-800/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 block">ISP/Org</span>
                <span className="text-neutral-300">{session.isp_org ?? "Unknown"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Browser / OS</span>
                <span className="text-neutral-300">
                  {session.browser_name ?? "?"} {session.browser_version ?? ""} / {session.os_name ?? "?"} {session.os_version ?? ""}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Screen</span>
                <span className="text-neutral-300">
                  {session.screen_width ?? "?"}x{session.screen_height ?? "?"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Interactions</span>
                <span className="text-neutral-300">{session.interactions}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Referrer</span>
                <span className="text-neutral-300 break-all">{session.referrer_domain ?? "Direct"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Visit #</span>
                <span className={session.visit_number > 1 ? "text-blue-400 font-medium" : "text-neutral-300"}>{session.visit_number}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Connection</span>
                <span className="text-neutral-300">{session.connection_type ?? "Unknown"}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Language / TZ</span>
                <span className="text-neutral-300">{session.language ?? "?"} / {session.timezone ?? "?"}</span>
              </div>
              {session.sections_viewed && session.sections_viewed.length > 0 && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-neutral-500 block mb-1">Sections Viewed</span>
                  <div className="flex flex-wrap gap-1">
                    {session.sections_viewed.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-neutral-700/50 text-neutral-300 rounded text-[10px]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(session.utm_source || session.utm_medium || session.utm_campaign) && (
                <div className="col-span-2 md:col-span-4">
                  <span className="text-neutral-500 block mb-1">UTM Parameters</span>
                  <span className="text-neutral-300">
                    {[session.utm_source, session.utm_medium, session.utm_campaign].filter(Boolean).join(" / ")}
                  </span>
                </div>
              )}
              <div className="col-span-2 md:col-span-4 flex gap-3">
                {session.is_vpn && <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 rounded text-[10px] border border-purple-600/30">VPN</span>}
                {session.is_datacenter && <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] border border-red-600/30">Datacenter</span>}
                {session.is_bot && <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] border border-red-600/30">Bot</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

function ErrorCard({ message, onRetry }: ErrorCardProps) {
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors min-h-[44px] min-w-[44px]"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    </div>
  );
}

// --- Main component ---

function toYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [classFilter, setClassFilter] = useState<string>("");
  const [customRange, setCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toYYYYMMDD(d);
  });
  const [customEnd, setCustomEnd] = useState(() => toYYYYMMDD(new Date()));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = customRange
        ? `startDate=${customStart}&endDate=${customEnd}`
        : `days=${days}`;
      const res = await fetch(`/api/admin/analytics?${params}`);
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
  }, [days, customRange, customStart, customEnd]);

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
  const vsStats = data?.visitorSessions?.stats;

  // Computed overview values
  const prospects = data?.trafficSummary?.prospects ?? overview?.users ?? 0;
  const engagedSessions = overview?.engaged ?? 0;
  const avgTime = overview?.avgDuration ?? 0;
  const bounceRate = overview?.bounceRate ?? 0;
  const returningUsers = overview?.returningUsers ?? 0;
  const sessionsPerUser = overview?.sessionsPerUser ?? 0;
  const totalInteractions = overview?.totalInteractions ?? vsStats?.total_interactions ?? 0;
  const signalRatio = (() => {
    const ts = data?.trafficSummary;
    if (ts) {
      return (ts.prospects ?? 0) / Math.max((ts.prospects ?? 0) + (ts.suspicious ?? 0) + (ts.bots ?? 0), 1);
    }
    return overview?.engagementRate ?? 0;
  })();

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => {
                setCustomRange(false);
                setDays(range.days);
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors min-h-[44px] min-w-[44px] ${
                !customRange && days === range.days
                  ? "bg-neutral-700 text-neutral-100 font-medium"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              {range.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomRange(true)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors min-h-[44px] ${
              customRange
                ? "bg-neutral-700 text-neutral-100 font-medium"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            <Calendar size={13} />
            Custom
          </button>
        </div>
        {customRange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
            />
            <span className="text-neutral-500 text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1.5 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
            />
          </div>
        )}
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50 ml-auto min-h-[44px] min-w-[44px]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Traffic Summary Bar */}
      {data?.trafficSummary && (
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30">
            {(data.trafficSummary.prospects ?? 0).toLocaleString()} Prospects
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-600/15 text-yellow-400 border border-yellow-600/30">
            {(data.trafficSummary.suspicious ?? 0).toLocaleString()} Suspicious
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-600/15 text-red-400 border border-red-600/30">
            {(data.trafficSummary.bots ?? 0).toLocaleString()} Bots
          </span>
          <span className="text-xs text-neutral-500 flex items-center">
            {data.trafficSummary.botPercentage ?? 0}% noise
          </span>
        </div>
      )}

      {/* Enhanced Overview Cards - 2 rows of 4 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading || !overview ? (
            [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-green-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    {data?.trafficSummary ? "Prospects" : "Real Visitors"}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {formatNumber(prospects)}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className={(overview.engagementRate ?? 0) > 0.2 ? "text-green-500" : "text-neutral-500"} />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Engaged Sessions
                  </span>
                </div>
                <p className={`text-2xl font-bold ${(overview.engagementRate ?? 0) > 0.2 ? "text-green-400" : "text-neutral-100"}`}>
                  {formatNumber(engagedSessions)}
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
                  {formatDuration(avgTime)}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Signal Ratio
                  </span>
                </div>
                <p className={`text-2xl font-bold ${signalRatio > 0.2 ? "text-green-400" : "text-neutral-100"}`}>
                  {formatPercentRaw(signalRatio * 100)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading || !overview ? (
            [5, 6, 7, 8].map((i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Bounce Rate
                  </span>
                </div>
                <p className={`text-2xl font-bold ${bounceRate > 60 ? "text-red-400" : bounceRate > 40 ? "text-yellow-400" : "text-green-400"}`}>
                  {formatPercentRaw(bounceRate)}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Return Visitors
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {formatNumber(returningUsers)}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Sessions/User
                  </span>
                </div>
                <p className="text-2xl font-bold text-neutral-100">
                  {sessionsPerUser > 0 ? sessionsPerUser.toFixed(1) : "--"}
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer size={14} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Total Interactions
                  </span>
                </div>
                <p className="text-2xl font-bold text-neutral-100">
                  {formatNumber(totalInteractions)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Server-Side Stats Summary */}
      {vsStats && (
        <Section title="Server-Side Tracking Summary" badge={
          <span className="px-2 py-0.5 text-[10px] rounded bg-blue-600/20 text-blue-400 border border-blue-600/30 font-medium">LIVE</span>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Tracked Sessions", value: formatNumber(vsStats.total_sessions), color: "text-neutral-100" },
              { label: "Unique Visitors", value: formatNumber(vsStats.unique_visitors), color: "text-blue-400" },
              { label: "Engaged Sessions", value: formatNumber(vsStats.engaged_sessions), color: "text-green-400" },
              { label: "Avg Time", value: formatDurationMs(vsStats.avg_time_ms), color: "text-neutral-100" },
              { label: "Avg Scroll", value: `${vsStats.avg_scroll}%`, color: "text-neutral-100" },
              { label: "Interactions", value: formatNumber(vsStats.total_interactions), color: "text-neutral-100" },
              { label: "Form Starts", value: String(vsStats.form_starts), color: vsStats.form_starts > 0 ? "text-green-400" : "text-neutral-400" },
              { label: "CTA Clicks", value: String(vsStats.cta_clicks), color: vsStats.cta_clicks > 0 ? "text-blue-400" : "text-neutral-400" },
              { label: "Exit Intents", value: String(vsStats.exit_intents), color: "text-yellow-400" },
              { label: "Returning", value: String(vsStats.returning_visitors), color: vsStats.returning_visitors > 0 ? "text-blue-400" : "text-neutral-400" },
              { label: "Bot Sessions", value: String(vsStats.bot_sessions), color: vsStats.bot_sessions > 0 ? "text-red-400" : "text-neutral-400" },
              { label: "Prospect Sessions", value: String(vsStats.prospect_sessions), color: "text-green-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-neutral-800/30 rounded-md p-2.5">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className={`text-lg font-semibold tabular-nums ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Prospect Activity Feed */}
      {data?.engagedTimeline && data.engagedTimeline.length > 0 && (
        <Section title="Prospect Activity Feed" badge={
          <span className="text-[10px] text-neutral-500 ml-2">{data.engagedTimeline.length} entries</span>
        }>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {data.engagedTimeline.map((entry, i) => {
              const entryIsMichigan = isMichiganCity(entry.region ?? "");
              const durationMin = Math.floor((entry.avgDuration ?? 0) / 60);
              const durationSec = Math.round((entry.avgDuration ?? 0) % 60);
              const durationColor = (entry.avgDuration ?? 0) > 30 ? "text-green-400" : (entry.avgDuration ?? 0) > 10 ? "text-yellow-400" : "text-neutral-500";
              const dateStr = entry.date ? `${entry.date.substring(4, 6)}/${entry.date.substring(6, 8)}` : "";
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-md border-l-2 ${entryIsMichigan ? "border-l-accent-500 bg-accent-500/5" : "border-l-neutral-700 bg-neutral-800/30"}`}>
                  <span className="text-xs text-neutral-500 w-12 shrink-0">{dateStr}</span>
                  <span className={`text-sm font-medium ${entryIsMichigan ? "text-accent-400" : "text-neutral-200"}`}>
                    {entry.city}, {entry.region?.substring(0, 2).toUpperCase() || ""}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {entry.engaged ?? 0} engaged {(entry.engaged ?? 0) === 1 ? "session" : "sessions"}
                  </span>
                  <span className={`text-xs ml-auto ${durationColor}`}>
                    avg {durationMin > 0 ? `${durationMin}m ` : ""}{durationSec}s
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Visitor Intelligence Feed (NEW) */}
      {data?.visitorSessions?.recentSessions && data.visitorSessions.recentSessions.length > 0 && (
        <Section
          title="Visitor Intelligence Feed"
          badge={
            <span className="text-[10px] text-neutral-500 ml-2">
              {data.visitorSessions.recentSessions.length} recent sessions
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">Time</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">Location</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">IP Type</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">Device</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right">Time on Page</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">Scroll</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-left">Class</th>
                  <th className="py-2 px-2 text-xs font-medium text-neutral-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.visitorSessions.recentSessions.map((session) => (
                  <VisitorSessionRow key={session.id} session={session} />
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Return Visitor Intelligence (NEW) */}
      {data?.visitorSessions?.returnVisitors && data.visitorSessions.returnVisitors.length > 0 && (
        <Section
          title="Return Visitor Intelligence"
          badge={
            <span className="px-2 py-0.5 text-[10px] rounded bg-blue-600/20 text-blue-400 font-medium">
              {data.visitorSessions.returnVisitors.length} returning
            </span>
          }
        >
          <DataTable
            columns={[
              { label: "Visitor ID" },
              { label: "Visits", align: "right" },
              { label: "First Seen" },
              { label: "Last Seen" },
              { label: "Total Time", align: "right" },
              { label: "Location" },
              { label: "Device" },
              { label: "IP Type" },
              { label: "Form" },
            ]}
            data={data.visitorSessions.returnVisitors}
            maxRows={15}
            renderRow={(rv, i) => {
              const isMI = isMichiganCity(rv.geo_region ?? "");
              return (
                <tr
                  key={i}
                  className={`border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors ${rv.form_started ? "bg-green-900/5" : ""}`}
                >
                  <td className="py-1.5 px-2 text-neutral-400 font-mono text-xs" title={rv.visitor_id}>
                    {rv.visitor_id.slice(0, 8)}...
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-200 font-semibold tabular-nums">
                    {rv.visit_count}
                  </td>
                  <td className="py-1.5 px-2 text-neutral-500 text-xs">{formatTimestamp(rv.first_seen)}</td>
                  <td className="py-1.5 px-2 text-neutral-500 text-xs">{formatTimestamp(rv.last_seen)}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 text-xs tabular-nums">
                    {formatDurationMs(rv.total_time_ms)}
                  </td>
                  <td className={`py-1.5 px-2 text-xs ${isMI ? "text-blue-400 font-medium" : "text-neutral-300"}`}>
                    {rv.geo_city ?? "?"}{rv.geo_region ? `, ${rv.geo_region}` : ""}
                  </td>
                  <td className="py-1.5 px-2">{deviceIcon(rv.device_type)}</td>
                  <td className="py-1.5 px-2">
                    {rv.ip_type && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${ipTypeBadgeClasses(rv.ip_type)}`}>
                        {rv.ip_type}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {rv.form_started && (
                      <span className="text-green-400 font-semibold text-xs">Started</span>
                    )}
                  </td>
                </tr>
              );
            }}
          />
        </Section>
      )}

      {/* ISP/Organization Intelligence (NEW) */}
      {data?.visitorSessions?.ispBreakdown && data.visitorSessions.ispBreakdown.length > 0 && (
        <Section
          title="ISP/Organization Intelligence"
          badge={
            <span className="text-[10px] text-neutral-500 ml-2">
              {data.visitorSessions.ispBreakdown.length} organizations
            </span>
          }
        >
          <DataTable
            columns={[
              { label: "Organization" },
              { label: "IP Type" },
              { label: "Sessions", align: "right" },
              { label: "Engaged", align: "right" },
              { label: "Unique", align: "right" },
              { label: "Avg Time", align: "right" },
              { label: "Forms", align: "right" },
              { label: "Cities" },
            ]}
            data={data.visitorSessions.ispBreakdown}
            maxRows={15}
            renderRow={(isp, i) => (
              <tr
                key={i}
                className={`border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors ${isp.form_starts > 0 ? "bg-green-900/5" : ""}`}
              >
                <td className="py-1.5 px-2 text-neutral-300 text-xs max-w-[200px] truncate" title={isp.isp_org}>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-neutral-600 flex-shrink-0" />
                    {isp.isp_org}
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  {isp.ip_type && (
                    <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${ipTypeBadgeClasses(isp.ip_type)}`}>
                      {isp.ip_type}
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{isp.total}</td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{isp.engaged_count}</td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{isp.unique_visitors}</td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">{formatDurationMs(isp.avg_time_ms)}</td>
                <td className={`py-1.5 px-2 text-right tabular-nums ${isp.form_starts > 0 ? "text-green-400 font-semibold" : "text-neutral-500"}`}>
                  {isp.form_starts}
                </td>
                <td className="py-1.5 px-2 text-neutral-500 text-xs max-w-[150px] truncate" title={isp.cities}>
                  {isp.cities}
                </td>
              </tr>
            )}
          />
        </Section>
      )}

      {/* Lead Conversion Funnel + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Lead Conversion Funnel">
          {isLoading ? (
            <SkeletonChart />
          ) : data?.funnel ? (
            <ConversionFunnel funnel={data.funnel} />
          ) : (
            <div className="text-sm text-neutral-500 text-center py-4">No funnel data available</div>
          )}
        </Section>

        <Section title="Top Pages">
          {isLoading ? (
            <SkeletonTable rows={6} />
          ) : (
            <DataTable
              columns={[
                { label: "Page" },
                { label: "Views", align: "right" },
                { label: "Engaged", align: "right" },
                { label: "Avg Duration", align: "right" },
              ]}
              data={data?.topPages || []}
              renderRow={(page, i) => {
                const isHome = page.path === "/" || page.path === "/index.html";
                return (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs max-w-[250px] truncate" title={page.path}>
                      <span className="flex items-center gap-1.5">
                        <FileText size={12} className={isHome ? "text-blue-400" : "text-neutral-600"} />
                        {page.path}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(page.views ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(page.engaged ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">
                      {formatDuration(page.avgDuration)}
                    </td>
                  </tr>
                );
              }}
            />
          )}
        </Section>
      </div>

      {/* New vs Returning + Channel Grouping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* New vs Returning (NEW) */}
        {data?.newVsReturning && data.newVsReturning.length > 0 && (
          <Section title="New vs Returning Users">
            <DataTable
              columns={[
                { label: "Type" },
                { label: "Users", align: "right" },
                { label: "Engaged", align: "right" },
                { label: "Avg Duration", align: "right" },
                { label: "Bounce Rate", align: "right" },
              ]}
              data={data.newVsReturning}
              renderRow={(row, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                >
                  <td className="py-1.5 px-2 text-neutral-300 text-sm capitalize font-medium">{row.type}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{row.users.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{row.engaged.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">{formatDuration(row.avgDuration)}</td>
                  <td className={`py-1.5 px-2 text-right tabular-nums text-xs ${row.bounceRate > 60 ? "text-red-400" : row.bounceRate > 40 ? "text-yellow-400" : "text-green-400"}`}>
                    {formatPercentRaw(row.bounceRate)}
                  </td>
                </tr>
              )}
            />
          </Section>
        )}

        {/* Channel Grouping (NEW) */}
        {data?.channels && data.channels.length > 0 && (
          <Section title="Channel Grouping">
            <DataTable
              columns={[
                { label: "Channel" },
                { label: "Sessions", align: "right" },
                { label: "Engaged", align: "right" },
                { label: "Avg Duration", align: "right" },
                { label: "Conversions", align: "right" },
              ]}
              data={data.channels}
              renderRow={(ch, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                >
                  <td className="py-1.5 px-2 text-neutral-300 text-sm">{ch.channel}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{ch.sessions.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{ch.engaged.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">{formatDuration(ch.avgDuration)}</td>
                  <td className={`py-1.5 px-2 text-right tabular-nums ${ch.conversions > 0 ? "text-green-400 font-semibold" : "text-neutral-500"}`}>
                    {ch.conversions}
                  </td>
                </tr>
              )}
            />
          </Section>
        )}
      </div>

      {/* Landing Pages (NEW) */}
      {data?.landingPages && data.landingPages.length > 0 && (
        <Section title="Landing Pages">
          <DataTable
            columns={[
              { label: "Path" },
              { label: "Sessions", align: "right" },
              { label: "Engaged", align: "right" },
              { label: "Avg Duration", align: "right" },
              { label: "Bounce Rate", align: "right" },
            ]}
            data={data.landingPages}
            maxRows={10}
            renderRow={(lp, i) => (
              <tr
                key={i}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
              >
                <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs max-w-[300px] truncate" title={lp.path}>
                  {lp.path}
                </td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{lp.sessions.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{lp.engaged.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">{formatDuration(lp.avgDuration)}</td>
                <td className={`py-1.5 px-2 text-right tabular-nums text-xs ${lp.bounceRate > 60 ? "text-red-400" : lp.bounceRate > 40 ? "text-yellow-400" : "text-green-400"}`}>
                  {formatPercentRaw(lp.bounceRate)}
                </td>
              </tr>
            )}
          />
        </Section>
      )}

      {/* Geographic Intelligence + Visitor Fingerprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic Intelligence */}
        <Section title="Geographic Intelligence">
          {isLoading ? (
            <SkeletonTable rows={6} />
          ) : (
            <>
              <div className="flex gap-1 mb-2">
                {["", "prospect", "suspicious", "bot"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setClassFilter(f)}
                    className={`px-2 py-1 text-xs rounded min-h-[44px] min-w-[44px] ${
                      classFilter === f
                        ? "bg-neutral-700 text-white"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <DataTable
                columns={[
                  { label: "City" },
                  { label: "State" },
                  { label: "Class" },
                  { label: "Visitors", align: "right" },
                  { label: "Engaged", align: "right" },
                  { label: "Bounce", align: "right" },
                  { label: "Avg Time", align: "right" },
                ]}
                data={(data?.cities || []).filter(
                  (c) => !classFilter || c.classification === classFilter
                )}
                maxRows={15}
                renderRow={(city, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td
                      className={`py-1.5 px-2 ${
                        isMichiganCity(city.region ?? "")
                          ? "text-blue-400 font-medium"
                          : "text-neutral-300"
                      }`}
                    >
                      {city.city}
                    </td>
                    <td
                      className={`py-1.5 px-2 text-sm ${
                        isMichiganCity(city.region ?? "")
                          ? "text-blue-400/70"
                          : "text-neutral-500"
                      }`}
                    >
                      {city.region}
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${classificationBadge(city.classification)}`}
                      >
                        {city.classification ?? "unknown"}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(city.visitors ?? 0).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(city.engaged ?? 0).toLocaleString()}
                    </td>
                    <td className={`py-1.5 px-2 text-right tabular-nums text-xs ${(city.bounceRate ?? 0) > 60 ? "text-red-400" : (city.bounceRate ?? 0) > 40 ? "text-yellow-400" : "text-neutral-400"}`}>
                      {city.bounceRate != null ? formatPercentRaw(city.bounceRate) : "--"}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums text-xs">
                      {city.avgDuration != null ? formatDuration(city.avgDuration) : "--"}
                    </td>
                  </tr>
                )}
              />
            </>
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
                maxRows={8}
                renderRow={(sr, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs">
                      {sr.resolution}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(sr.users ?? 0).toLocaleString()}
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
                maxRows={8}
                renderRow={(bo, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-1.5 px-2 text-neutral-300 text-xs">
                      {bo.browser} <span className="text-neutral-600">/</span> {bo.os}
                    </td>
                    <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                      {(bo.users ?? 0).toLocaleString()}
                    </td>
                  </tr>
                )}
              />
            )}
          </Section>
        </div>
      </div>

      {/* Traffic Source Intelligence */}
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
                    {(sm.sessions ?? 0).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                    {(sm.engaged ?? 0).toLocaleString()}
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

      {/* Engagement Depth (Custom Events) (NEW) */}
      {data?.customEvents && data.customEvents.length > 0 && (
        <Section title="Engagement Depth" badge={
          <span className="text-[10px] text-neutral-500 ml-2">{data.customEvents.length} event types</span>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.customEvents.map((evt) => {
              const eventColors: Record<string, string> = {
                scroll_depth: "text-blue-400",
                time_milestone: "text-purple-400",
                section_view: "text-cyan-400",
                cta_click: "text-green-400",
                form_start: "text-green-400",
                exit_intent: "text-yellow-400",
                phone_click: "text-green-400",
                email_click: "text-green-400",
              };
              const color = eventColors[evt.event] ?? "text-neutral-300";
              const eventLabel = evt.event.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
              return (
                <div key={evt.event} className="bg-neutral-800/30 rounded-md p-3">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{eventLabel}</div>
                  <div className={`text-xl font-bold tabular-nums ${color}`}>{formatNumber(evt.count)}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{evt.users.toLocaleString()} users</div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Hourly Traffic Pattern */}
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
          <DayOfWeekChart data={data?.dayOfWeek || []} />
        )}
      </Section>

      {/* Countries (NEW) */}
      {data?.countries && data.countries.length > 0 && (
        <Section title="Countries" defaultOpen={false}>
          <DataTable
            columns={[
              { label: "Country" },
              { label: "Users", align: "right" },
              { label: "Engaged", align: "right" },
            ]}
            data={data.countries}
            maxRows={10}
            renderRow={(country, i) => {
              const isUS = country.country === "United States" || country.country === "US";
              return (
                <tr
                  key={i}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
                >
                  <td className={`py-1.5 px-2 text-sm ${isUS ? "text-blue-400 font-medium" : "text-neutral-300"}`}>
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} className={isUS ? "text-blue-400" : "text-neutral-600"} />
                      {country.country}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{country.users.toLocaleString()}</td>
                  <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">{country.engaged.toLocaleString()}</td>
                </tr>
              );
            }}
          />
        </Section>
      )}

      {/* Referrer URLs */}
      <Section title="Referrer URLs" defaultOpen={false}>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : (
          <DataTable
            columns={[
              { label: "Referrer URL" },
              { label: "Sessions", align: "right" },
            ]}
            data={data?.referrers || []}
            maxRows={10}
            renderRow={(ref, i) => (
              <tr
                key={i}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/60 transition-colors"
              >
                <td className="py-1.5 px-2 text-neutral-300 font-mono text-xs max-w-[400px] truncate" title={ref.url}>
                  {truncateUrl(ref.url, 60)}
                </td>
                <td className="py-1.5 px-2 text-right text-neutral-400 tabular-nums">
                  {(ref.sessions ?? 0).toLocaleString()}
                </td>
              </tr>
            )}
          />
        )}
      </Section>

      {/* Daily Engaged Traffic Trend */}
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
