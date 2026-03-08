import type { APIRoute } from "astro";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { isAdminAuthorized } from "../../../lib/admin-auth";

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

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
      { status: 200, headers: SECURITY_HEADERS }
    );
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const startDate = `${Math.min(Math.max(days, 1), 365)}daysAgo`;

  try {
    // Handle multiple possible formats of the private key from env vars
    let formattedKey = privateKey;
    if (formattedKey.includes('\\\\n')) {
      formattedKey = formattedKey.replace(/\\\\n/g, '\n');
    }
    if (formattedKey.includes('\\n')) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: formattedKey,
      },
    });

    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate, endDate: "today" }];

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
    ] = await Promise.all([
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
        ],
      }),

      // 2. City + Region
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "city" }, { name: "region" }],
        metrics: [{ name: "totalUsers" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "engagedSessions" }, desc: true }],
        limit: 20,
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
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 10,
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
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
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
        orderBys: [{ dimension: { dimensionName: "dayOfWeek" }, desc: false }],
      }),

      // 8. Full Referrer URLs
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "pageReferrer" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 20,
      }),

      // 9. Device Category (kept from original)
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),

      // 10. Daily Trend (engagedSessions instead of screenPageViews)
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "engagedSessions" }, { name: "totalUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      }),
    ]);

    const overviewRow = rows(overview[0])[0];
    const overviewData = {
      users: overviewRow ? metricInt(overviewRow, 0) : 0,
      engaged: overviewRow ? metricInt(overviewRow, 1) : 0,
      avgDuration: overviewRow ? metricFloat(overviewRow, 2) : 0,
      engagementRate: overviewRow ? metricFloat(overviewRow, 3) : 0,
      sessions: overviewRow ? metricInt(overviewRow, 4) : 0,
      newUsers: overviewRow ? metricInt(overviewRow, 5) : 0,
    };

    const citiesData = rows(cities[0])
      .filter((row) => {
        const city = dimVal(row, 0);
        return city && city !== "(not set)";
      })
      .slice(0, 15)
      .map((row) => ({
        city: dimVal(row, 0),
        region: dimVal(row, 1),
        users: metricInt(row, 0),
        engaged: metricInt(row, 1),
      }));

    const screenResData = rows(screenRes[0]).map((row) => ({
      resolution: dimVal(row, 0),
      users: metricInt(row, 0),
    }));

    const browserOSData = rows(browserOS[0]).map((row) => ({
      browser: dimVal(row, 0),
      os: dimVal(row, 1),
      users: metricInt(row, 0),
    }));

    const sourceMediumData = rows(sourceMedium[0]).map((row) => ({
      source: dimVal(row, 0),
      sessions: metricInt(row, 0),
      engaged: metricInt(row, 1),
      engagementRate: metricFloat(row, 2),
      avgDuration: metricFloat(row, 3),
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
        const url = dimVal(row, 0);
        return url && url !== "(not set)" && url !== "";
      })
      .slice(0, 15)
      .map((row) => ({
        url: dimVal(row, 0),
        sessions: metricInt(row, 0),
      }));

    const devicesData = rows(devices[0]).map((row) => ({
      device: dimVal(row, 0) || "unknown",
      sessions: metricInt(row, 0),
    }));

    const dailyData = rows(dailyTrend[0]).map((row) => ({
      date: dimVal(row, 0),
      engaged: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    return new Response(
      JSON.stringify({
        configured: true,
        days,
        overview: overviewData,
        cities: citiesData,
        screenResolutions: screenResData,
        browserOS: browserOSData,
        sourceMedium: sourceMediumData,
        hourly: hourlyData,
        dayOfWeek: dayOfWeekData,
        referrers: referrersData,
        devices: devicesData,
        daily: dailyData,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("GA4 API error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg, configured: true }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
