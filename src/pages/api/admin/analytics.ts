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
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, "\n"),
      },
    });

    const property = `properties/${propertyId}`;

    const [overview, topPages, referrers, devices, dailyTrend] =
      await Promise.all([
        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
            { name: "sessions" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "newUsers" },
          ],
        }),

        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
          ],
          orderBys: [
            { metric: { metricName: "screenPageViews" }, desc: true },
          ],
          limit: 10,
        }),

        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }, { name: "totalUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),

        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),

        client.runReport({
          property,
          dateRanges: [{ startDate, endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "totalUsers" },
          ],
          orderBys: [
            { dimension: { dimensionName: "date" }, desc: false },
          ],
        }),
      ]);

    const overviewRow = overview[0]?.rows?.[0] as GA4Row | undefined;
    const overviewData = {
      pageViews: overviewRow ? metricInt(overviewRow, 0) : 0,
      users: overviewRow ? metricInt(overviewRow, 1) : 0,
      sessions: overviewRow ? metricInt(overviewRow, 2) : 0,
      avgSessionDuration: overviewRow ? metricFloat(overviewRow, 3) : 0,
      bounceRate: overviewRow ? metricFloat(overviewRow, 4) : 0,
      newUsers: overviewRow ? metricInt(overviewRow, 5) : 0,
    };

    const topPagesData = ((topPages[0]?.rows as GA4Row[] | undefined) || []).map(
      (row) => ({
        path: dimVal(row, 0),
        views: metricInt(row, 0),
        users: metricInt(row, 1),
      })
    );

    const referrersData = (
      (referrers[0]?.rows as GA4Row[] | undefined) || []
    ).map((row) => ({
      source: dimVal(row, 0) || "(direct)",
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    const devicesData = (
      (devices[0]?.rows as GA4Row[] | undefined) || []
    ).map((row) => ({
      device: dimVal(row, 0) || "unknown",
      sessions: metricInt(row, 0),
    }));

    const dailyData = (
      (dailyTrend[0]?.rows as GA4Row[] | undefined) || []
    ).map((row) => ({
      date: dimVal(row, 0),
      views: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    return new Response(
      JSON.stringify({
        configured: true,
        days,
        overview: overviewData,
        topPages: topPagesData,
        referrers: referrersData,
        devices: devicesData,
        daily: dailyData,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "GA4 API error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({
        error: "Failed to fetch analytics",
        configured: true,
      }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
