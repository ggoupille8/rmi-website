import type { APIRoute } from "astro";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { sql } from "@vercel/postgres";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { getPostgresEnv } from "../../../lib/db-env";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, max-age=300",
  "X-Content-Type-Options": "nosniff",
};

interface GA4Row {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

function dimVal(row: GA4Row, index: number): string {
  return row.dimensionValues?.[index]?.value || "";
}

function metricInt(row: GA4Row, index: number): number {
  return parseInt(row.metricValues?.[index]?.value || "0", 10);
}

function metricFloat(row: GA4Row, index: number): number {
  return parseFloat(row.metricValues?.[index]?.value || "0");
}

function rows(report: unknown): GA4Row[] {
  const r = report as { rows?: GA4Row[] } | undefined;
  return (r?.rows as GA4Row[] | undefined) || [];
}

function classifyTraffic(
  visitors: number,
  engaged: number,
): "prospect" | "suspicious" | "bot" {
  if (visitors === 0) return "bot";
  const ratio = engaged / visitors;
  if (ratio > 0.3) return "prospect";
  if (ratio > 0.05 || (engaged >= 2 && visitors <= 20)) return "suspicious";
  return "bot";
}

// ── Visitor session queries ──────────────────────────────────────────────

interface VisitorSessionRow {
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
  geo_lat: number | null;
  geo_lng: number | null;
  geo_postal: string | null;
  isp_org: string | null;
  asn: string | null;
  ip_type: string | null;
  is_vpn: boolean;
  is_datacenter: boolean;
  is_bot: boolean;
  device_type: string | null;
  screen_width: number | null;
  screen_height: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  language: string | null;
  timezone: string | null;
  touch_support: boolean | null;
  device_memory: number | null;
  hardware_cores: number | null;
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

interface VisitorGeoAgg {
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
}

interface VisitorStats {
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
}

interface ReturnVisitorRow {
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

interface HourlyVisitorRow {
  hour: number;
  total: number;
  engaged: number;
  prospects: number;
}

interface ISPRow {
  isp_org: string;
  ip_type: string | null;
  total: number;
  engaged_count: number;
  unique_visitors: number;
  avg_time_ms: number;
  form_starts: number;
  cities: string;
}

async function getVisitorSessionData(
  dbStartDate: Date,
): Promise<{
  recentSessions: VisitorSessionRow[];
  geoBreakdown: VisitorGeoAgg[];
  stats: VisitorStats;
  returnVisitors: ReturnVisitorRow[];
  hourlyVisitors: HourlyVisitorRow[];
  ispBreakdown: ISPRow[];
} | null> {
  try {
    const { url: postgresUrl } = getPostgresEnv();
    if (!postgresUrl) return null;

    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'visitor_sessions'
      ) as exists
    `;
    if (!tableCheck.rows[0]?.exists) return null;

    const startIso = dbStartDate.toISOString();

    // Run queries in parallel
    const [
      recentResult,
      geoResult,
      statsResult,
      returnResult,
      hourlyResult,
      ispResult,
    ] = await Promise.all([
      // Recent individual sessions (last 100, non-bot)
      sql`
        SELECT *
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
          AND is_bot = FALSE
          AND traffic_class != 'bot'
        ORDER BY created_at DESC
        LIMIT 100
      `,

      // Geographic breakdown with engagement metrics
      sql`
        SELECT
          geo_city, geo_region,
          COALESCE(ip_type, 'unknown') as ip_type,
          traffic_class,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE engaged = TRUE)::int as engaged_count,
          COALESCE(AVG(time_on_page_ms)::int, 0) as avg_time_ms,
          COALESCE(AVG(scroll_depth)::int, 0) as avg_scroll,
          COUNT(DISTINCT visitor_id)::int as unique_visitors,
          COUNT(*) FILTER (WHERE form_started = TRUE)::int as form_starts,
          MODE() WITHIN GROUP (ORDER BY isp_org) as isp_org
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
          AND geo_city IS NOT NULL
          AND geo_city != ''
        GROUP BY geo_city, geo_region, ip_type, traffic_class
        ORDER BY engaged_count DESC, total DESC
        LIMIT 50
      `,

      // Overall stats
      sql`
        SELECT
          COUNT(*)::int as total_sessions,
          COUNT(DISTINCT visitor_id)::int as unique_visitors,
          COUNT(*) FILTER (WHERE engaged = TRUE)::int as engaged_sessions,
          COALESCE(AVG(time_on_page_ms)::int, 0) as avg_time_ms,
          COALESCE(AVG(scroll_depth)::int, 0) as avg_scroll,
          COALESCE(SUM(interactions)::int, 0) as total_interactions,
          COUNT(*) FILTER (WHERE form_started = TRUE)::int as form_starts,
          COALESCE(SUM(cta_clicks)::int, 0) as cta_clicks,
          COUNT(*) FILTER (WHERE exit_intent = TRUE)::int as exit_intents,
          COUNT(DISTINCT visitor_id) FILTER (WHERE visit_number > 1)::int as returning_visitors,
          COUNT(*) FILTER (WHERE is_bot = TRUE OR traffic_class = 'bot')::int as bot_sessions,
          COUNT(*) FILTER (WHERE traffic_class = 'prospect')::int as prospect_sessions
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
      `,

      // Return visitors (multi-visit)
      sql`
        SELECT
          visitor_id,
          COUNT(*)::int as visit_count,
          MIN(created_at) as first_seen,
          MAX(created_at) as last_seen,
          COALESCE(SUM(time_on_page_ms)::int, 0) as total_time_ms,
          COALESCE(MAX(scroll_depth)::int, 0) as max_scroll,
          MODE() WITHIN GROUP (ORDER BY geo_city) as geo_city,
          MODE() WITHIN GROUP (ORDER BY geo_region) as geo_region,
          MODE() WITHIN GROUP (ORDER BY ip_type) as ip_type,
          MODE() WITHIN GROUP (ORDER BY isp_org) as isp_org,
          MODE() WITHIN GROUP (ORDER BY device_type) as device_type,
          MODE() WITHIN GROUP (ORDER BY browser_name) as browser_name,
          MODE() WITHIN GROUP (ORDER BY os_name) as os_name,
          BOOL_OR(form_started) as form_started
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
          AND visitor_id IS NOT NULL
          AND is_bot = FALSE
        GROUP BY visitor_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 30
      `,

      // Hourly pattern from visitor sessions
      sql`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE engaged = TRUE)::int as engaged,
          COUNT(*) FILTER (WHERE traffic_class = 'prospect')::int as prospects
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `,

      // ISP/Organization breakdown
      sql`
        SELECT
          COALESCE(isp_org, 'Unknown') as isp_org,
          COALESCE(ip_type, 'unknown') as ip_type,
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE engaged = TRUE)::int as engaged_count,
          COUNT(DISTINCT visitor_id)::int as unique_visitors,
          COALESCE(AVG(time_on_page_ms)::int, 0) as avg_time_ms,
          COUNT(*) FILTER (WHERE form_started = TRUE)::int as form_starts,
          STRING_AGG(DISTINCT geo_city, ', ' ORDER BY geo_city) as cities
        FROM visitor_sessions
        WHERE created_at >= ${startIso}
          AND isp_org IS NOT NULL
          AND isp_org != ''
        GROUP BY isp_org, ip_type
        ORDER BY engaged_count DESC, total DESC
        LIMIT 25
      `,
    ]);

    return {
      recentSessions: recentResult.rows as unknown as VisitorSessionRow[],
      geoBreakdown: geoResult.rows as unknown as VisitorGeoAgg[],
      stats: (statsResult.rows[0] || {
        total_sessions: 0,
        unique_visitors: 0,
        engaged_sessions: 0,
        avg_time_ms: 0,
        avg_scroll: 0,
        total_interactions: 0,
        form_starts: 0,
        cta_clicks: 0,
        exit_intents: 0,
        returning_visitors: 0,
        bot_sessions: 0,
        prospect_sessions: 0,
      }) as unknown as VisitorStats,
      returnVisitors: returnResult.rows as unknown as ReturnVisitorRow[],
      hourlyVisitors: hourlyResult.rows as unknown as HourlyVisitorRow[],
      ispBreakdown: ispResult.rows as unknown as ISPRow[],
    };
  } catch (err) {
    console.error("Visitor session query error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: SECURITY_HEADERS,
    });
  }

  const propertyId = import.meta.env.GA4_PROPERTY_ID;
  const clientEmail = import.meta.env.GA4_CLIENT_EMAIL;
  const privateKey = import.meta.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    return new Response(
      JSON.stringify({ error: "GA4 not configured", configured: false }),
      { status: 200, headers: SECURITY_HEADERS },
    );
  }

  const url = new URL(request.url);
  const customStart = url.searchParams.get("startDate");
  const customEnd = url.searchParams.get("endDate");
  const days = parseInt(url.searchParams.get("days") || "30", 10);

  let startDate: string;
  let endDate: string;
  let dbStartDate: Date;

  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
    dbStartDate = new Date(customStart);
  } else {
    startDate = `${Math.min(Math.max(days, 1), 365)}daysAgo`;
    endDate = "today";
    dbStartDate = new Date();
    dbStartDate.setDate(dbStartDate.getDate() - days);
  }

  try {
    // Handle multiple possible formats of the private key from env vars
    let formattedKey = privateKey;
    if (formattedKey.includes("\\\\n")) {
      formattedKey = formattedKey.replace(/\\\\n/g, "\n");
    }
    if (formattedKey.includes("\\n")) {
      formattedKey = formattedKey.replace(/\\n/g, "\n");
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: formattedKey,
      },
    });

    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate, endDate }];

    // Run GA4 queries and visitor session queries in parallel
    const [ga4Results, visitorData] = await Promise.all([
      Promise.all([
        // 1. Overview (aggregate, no dimensions)
        client.runReport({
          property,
          dateRanges,
          metrics: [
            { name: "totalUsers" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "engagementRate" },
            { name: "sessions" },
            { name: "newUsers" },
            { name: "bounceRate" },
            { name: "userEngagementDuration" },
            { name: "sessionsPerUser" },
          ],
        }),

        // 2. City + Region
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "city" }, { name: "region" }],
          metrics: [
            { name: "totalUsers" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
          orderBys: [{ metric: { metricName: "engagedSessions" }, desc: true }],
          limit: 30,
        }),

        // 3. Screen Resolution
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "screenResolution" }],
          metrics: [{ name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 10,
        }),

        // 4. Browser + OS
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "browser" }, { name: "operatingSystem" }],
          metrics: [{ name: "totalUsers" }, { name: "engagedSessions" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 15,
        }),

        // 5. Source/Medium
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "sessionSourceMedium" }],
          metrics: [
            { name: "sessions" },
            { name: "engagedSessions" },
            { name: "engagementRate" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "conversions" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 20,
        }),

        // 6. Hour of Day
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "hour" }],
          metrics: [{ name: "totalUsers" }, { name: "engagedSessions" }],
          orderBys: [{ dimension: { dimensionName: "hour" }, desc: false }],
        }),

        // 7. Day of Week
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "dayOfWeek" }],
          metrics: [{ name: "totalUsers" }, { name: "engagedSessions" }],
          orderBys: [
            { dimension: { dimensionName: "dayOfWeek" }, desc: false },
          ],
        }),

        // 8. Full Referrer URLs
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "pageReferrer" }],
          metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 20,
        }),

        // 9. Device Category
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "averageSessionDuration" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),

        // 10. Daily Trend
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "date" }],
          metrics: [{ name: "engagedSessions" }, { name: "totalUsers" }, { name: "newUsers" }],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
        }),

        // 11. Engaged sessions by date + city (prospect activity timeline)
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "date" }, { name: "city" }, { name: "region" }],
          metrics: [
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
          limit: 100,
        }),

        // 12. Top Pages by page path
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
          orderBys: [
            { metric: { metricName: "screenPageViews" }, desc: true },
          ],
          limit: 20,
        }),

        // 13. Total page views (for funnel)
        client.runReport({
          property,
          dateRanges,
          metrics: [{ name: "screenPageViews" }],
        }),

        // 14. New vs Returning users
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "newVsReturning" }],
          metrics: [
            { name: "totalUsers" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        }),

        // 15. Landing pages
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "landingPage" }],
          metrics: [
            { name: "sessions" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 15,
        }),

        // 16. Country breakdown
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "country" }],
          metrics: [{ name: "totalUsers" }, { name: "engagedSessions" }],
          orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
          limit: 15,
        }),

        // 17. Channel grouping
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [
            { name: "sessions" },
            { name: "engagedSessions" },
            { name: "averageSessionDuration" },
            { name: "conversions" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),

        // 18. Event-level: scroll depth milestones
        client.runReport({
          property,
          dateRanges,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
          dimensionFilter: {
            orGroup: {
              expressions: [
                { filter: { fieldName: "eventName", stringFilter: { value: "scroll_depth" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "time_on_page" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "section_view" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "cta_click" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "form_start" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "exit_intent" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "phone_click" } } },
                { filter: { fieldName: "eventName", stringFilter: { value: "email_click" } } },
              ],
            },
          },
        }),
      ]),
      getVisitorSessionData(dbStartDate),
    ]);

    const [
      overview,
      cities,
      screenRes,
      browserOS,
      sourceMedium,
      hourly,
      dayOfWeek,
      referrers,
      devices,
      dailyTrend,
      engagedByDateCity,
      topPages,
      pageViewsReport,
      newVsReturning,
      landingPages,
      countries,
      channels,
      customEvents,
    ] = ga4Results;

    const overviewRow = rows(overview[0])[0];
    const overviewData = {
      users: overviewRow ? metricInt(overviewRow, 0) : 0,
      engaged: overviewRow ? metricInt(overviewRow, 1) : 0,
      avgDuration: overviewRow ? metricFloat(overviewRow, 2) : 0,
      engagementRate: overviewRow ? metricFloat(overviewRow, 3) : 0,
      sessions: overviewRow ? metricInt(overviewRow, 4) : 0,
      newUsers: overviewRow ? metricInt(overviewRow, 5) : 0,
      bounceRate: overviewRow ? metricFloat(overviewRow, 6) : 0,
      totalEngagementDuration: overviewRow ? metricFloat(overviewRow, 7) : 0,
      sessionsPerUser: overviewRow ? metricFloat(overviewRow, 8) : 0,
    };

    const citiesData = rows(cities[0])
      .filter((row) => {
        const city = dimVal(row, 0);
        return city && city !== "(not set)";
      })
      .slice(0, 20)
      .map((row) => {
        const city = dimVal(row, 0);
        const region = dimVal(row, 1);
        const visitors = metricInt(row, 0);
        const engaged = metricInt(row, 1);
        return {
          city,
          region,
          visitors,
          engaged,
          avgDuration: metricFloat(row, 2),
          bounceRate: metricFloat(row, 3),
          classification: classifyTraffic(visitors, engaged),
        };
      });

    // Traffic summary from city classifications
    const botVisitors = citiesData
      .filter((c) => c.classification === "bot")
      .reduce((s, c) => s + c.visitors, 0);
    const suspiciousVisitors = citiesData
      .filter((c) => c.classification === "suspicious")
      .reduce((s, c) => s + c.visitors, 0);
    const prospectVisitors = citiesData
      .filter((c) => c.classification === "prospect")
      .reduce((s, c) => s + c.visitors, 0);
    const totalFromCities = botVisitors + suspiciousVisitors + prospectVisitors;

    const trafficSummary = {
      prospects: prospectVisitors,
      suspicious: suspiciousVisitors,
      bots: botVisitors,
      botPercentage:
        totalFromCities > 0
          ? Math.round((botVisitors / totalFromCities) * 1000) / 10
          : 0,
    };

    // Prospect activity: non-bot cities with engagement, sorted by engaged count
    const prospectActivity = citiesData
      .filter((c) => c.classification !== "bot" && c.engaged >= 1)
      .sort((a, b) => b.engaged - a.engaged);

    // Engaged timeline: sessions by date + city
    const engagedTimeline = rows(engagedByDateCity[0])
      .filter(
        (row) =>
          metricInt(row, 0) > 0 &&
          dimVal(row, 0) !== "(not set)" &&
          dimVal(row, 1) !== "(not set)",
      )
      .map((row) => ({
        date: dimVal(row, 0),
        city: dimVal(row, 1),
        region: dimVal(row, 2),
        engaged: metricInt(row, 0),
        avgDuration: metricFloat(row, 1),
      }));

    const screenResData = rows(screenRes[0]).map((row) => ({
      resolution: dimVal(row, 0),
      users: metricInt(row, 0),
    }));

    const browserOSData = rows(browserOS[0]).map((row) => ({
      browser: dimVal(row, 0),
      os: dimVal(row, 1),
      users: metricInt(row, 0),
      engaged: metricInt(row, 1),
    }));

    const sourceMediumData = rows(sourceMedium[0]).map((row) => ({
      source: dimVal(row, 0),
      sessions: metricInt(row, 0),
      engaged: metricInt(row, 1),
      engagementRate: metricFloat(row, 2),
      avgDuration: metricFloat(row, 3),
      bounceRate: metricFloat(row, 4),
      conversions: metricInt(row, 5),
    }));

    const hourlyData = rows(hourly[0]).map((row) => ({
      hour: dimVal(row, 0),
      users: metricInt(row, 0),
      engaged: metricInt(row, 1),
    }));

    const dayOfWeekData = rows(dayOfWeek[0]).map((row) => ({
      day: parseInt(dimVal(row, 0) || "0", 10),
      users: metricInt(row, 0),
      engaged: metricInt(row, 1),
    }));

    const referrersData = rows(referrers[0])
      .filter((row) => {
        const refUrl = dimVal(row, 0);
        return refUrl && refUrl !== "(not set)" && refUrl !== "";
      })
      .slice(0, 15)
      .map((row) => ({
        url: dimVal(row, 0),
        sessions: metricInt(row, 0),
        engaged: metricInt(row, 1),
      }));

    const devicesData = rows(devices[0]).map((row) => ({
      device: dimVal(row, 0) || "unknown",
      sessions: metricInt(row, 0),
      engaged: metricInt(row, 1),
      avgDuration: metricFloat(row, 2),
    }));

    const dailyData = rows(dailyTrend[0]).map((row) => ({
      date: dimVal(row, 0),
      engaged: metricInt(row, 0),
      users: metricInt(row, 1),
      newUsers: metricInt(row, 2),
    }));

    const topPagesData = rows(topPages[0])
      .filter((row) => {
        const path = dimVal(row, 0);
        return path && path !== "(not set)";
      })
      .map((row) => ({
        path: dimVal(row, 0),
        views: metricInt(row, 0),
        engaged: metricInt(row, 1),
        avgDuration: metricFloat(row, 2),
        bounceRate: metricFloat(row, 3),
      }));

    const totalPageViews =
      rows(pageViewsReport[0])[0]
        ? metricInt(rows(pageViewsReport[0])[0], 0)
        : 0;

    // New vs Returning
    const newVsReturningData = rows(newVsReturning[0]).map((row) => ({
      type: dimVal(row, 0),
      users: metricInt(row, 0),
      engaged: metricInt(row, 1),
      avgDuration: metricFloat(row, 2),
      bounceRate: metricFloat(row, 3),
    }));

    // Landing pages
    const landingPagesData = rows(landingPages[0])
      .filter((row) => dimVal(row, 0) && dimVal(row, 0) !== "(not set)")
      .map((row) => ({
        path: dimVal(row, 0),
        sessions: metricInt(row, 0),
        engaged: metricInt(row, 1),
        avgDuration: metricFloat(row, 2),
        bounceRate: metricFloat(row, 3),
      }));

    // Countries
    const countriesData = rows(countries[0])
      .filter((row) => dimVal(row, 0) && dimVal(row, 0) !== "(not set)")
      .map((row) => ({
        country: dimVal(row, 0),
        users: metricInt(row, 0),
        engaged: metricInt(row, 1),
      }));

    // Channel grouping
    const channelsData = rows(channels[0]).map((row) => ({
      channel: dimVal(row, 0),
      sessions: metricInt(row, 0),
      engaged: metricInt(row, 1),
      avgDuration: metricFloat(row, 2),
      conversions: metricInt(row, 3),
    }));

    // Custom events
    const customEventsData = rows(customEvents[0]).map((row) => ({
      event: dimVal(row, 0),
      count: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    let formSubmissions = 0;
    try {
      const { url: postgresUrl } = getPostgresEnv();
      if (postgresUrl) {
        const dbResult =
          await sql`SELECT COUNT(*)::int as count FROM contacts WHERE created_at >= ${dbStartDate.toISOString()}`;
        formSubmissions = dbResult.rows[0]?.count ?? 0;
      }
    } catch {
      // DB query failure is non-fatal for analytics
    }

    const funnelData = {
      pageViews: totalPageViews,
      engagedSessions: overviewData.engaged,
      formSubmissions,
    };

    return new Response(
      JSON.stringify({
        configured: true,
        days,
        overview: overviewData,
        cities: citiesData,
        trafficSummary,
        prospectActivity,
        engagedTimeline,
        screenResolutions: screenResData,
        browserOS: browserOSData,
        sourceMedium: sourceMediumData,
        hourly: hourlyData,
        dayOfWeek: dayOfWeekData,
        referrers: referrersData,
        devices: devicesData,
        daily: dailyData,
        topPages: topPagesData,
        funnel: funnelData,
        // New data
        newVsReturning: newVsReturningData,
        landingPages: landingPagesData,
        countries: countriesData,
        channels: channelsData,
        customEvents: customEventsData,
        // Visitor session data (server-side tracking)
        visitorSessions: visitorData
          ? {
              recentSessions: visitorData.recentSessions,
              geoBreakdown: visitorData.geoBreakdown,
              stats: visitorData.stats,
              returnVisitors: visitorData.returnVisitors,
              hourlyVisitors: visitorData.hourlyVisitors,
              ispBreakdown: visitorData.ispBreakdown,
            }
          : null,
      }),
      { status: 200, headers: SECURITY_HEADERS },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("GA4 API error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg, configured: true, code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
