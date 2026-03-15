import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getGeoData } from "../../lib/ipGeo";
import { getClientIP } from "../../lib/rate-limiter";
import { getPostgresEnv } from "../../lib/db-env";

export const prerender = false;

/** Rate limit: max beacons per IP per minute */
const BEACON_RATE_LIMIT = 10;
const beaconCounts = new Map<string, { count: number; resetAt: number }>();

function checkBeaconRate(ip: string): boolean {
  const now = Date.now();
  const entry = beaconCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    beaconCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= BEACON_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of beaconCounts) {
    if (now > entry.resetAt) beaconCounts.delete(ip);
  }
}, 120_000);

interface BeaconPayload {
  type: "pageview" | "update" | "exit";
  sessionId: string;
  visitorId?: string;
  visitNumber?: number;
  pagePath: string;
  referrer?: string;

  // Device fingerprint
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceType?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  language?: string;
  timezone?: string;
  touchSupport?: boolean;
  deviceMemory?: number;
  hardwareCores?: number;
  pixelRatio?: number;
  colorDepth?: number;
  connectionType?: string;

  // Behavioral (for update/exit beacons)
  scrollDepth?: number;
  timeOnPageMs?: number;
  interactions?: number;
  sectionsViewed?: string[];
  ctaClicks?: number;
  formStarted?: boolean;
  exitIntent?: boolean;

  // UTM
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scraper/i, /headless/i,
  /phantom/i, /selenium/i, /puppeteer/i, /lighthouse/i,
  /pagespeed/i, /gtmetrix/i, /pingdom/i, /uptimerobot/i,
  /curl/i, /wget/i, /python-requests/i, /go-http/i,
  /java\//i, /apache-httpclient/i,
];

function isLikelyBot(ua: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

function parseUserAgent(ua: string): {
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  deviceType: string;
} {
  let browserName = "Unknown";
  let browserVersion = "";
  let osName = "Unknown";
  let osVersion = "";
  let deviceType = "desktop";

  // OS detection
  if (/Windows NT (\d+\.\d+)/.test(ua)) {
    osName = "Windows";
    osVersion = RegExp.$1;
  } else if (/Mac OS X (\d+[._]\d+)/.test(ua)) {
    osName = "macOS";
    osVersion = RegExp.$1.replace(/_/g, ".");
  } else if (/Android (\d+\.?\d*)/.test(ua)) {
    osName = "Android";
    osVersion = RegExp.$1;
    deviceType = "mobile";
  } else if (/iPhone|iPad/.test(ua)) {
    osName = "iOS";
    const m = ua.match(/OS (\d+_\d+)/);
    osVersion = m ? m[1].replace(/_/g, ".") : "";
    deviceType = /iPad/.test(ua) ? "tablet" : "mobile";
  } else if (/Linux/.test(ua)) {
    osName = "Linux";
  } else if (/CrOS/.test(ua)) {
    osName = "ChromeOS";
  }

  // Browser detection
  if (/Edg\/(\d+)/.test(ua)) {
    browserName = "Edge";
    browserVersion = RegExp.$1;
  } else if (/Chrome\/(\d+)/.test(ua) && !/Edg/.test(ua)) {
    browserName = "Chrome";
    browserVersion = RegExp.$1;
  } else if (/Firefox\/(\d+)/.test(ua)) {
    browserName = "Firefox";
    browserVersion = RegExp.$1;
  } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
    browserName = "Safari";
    const m = ua.match(/Version\/(\d+)/);
    browserVersion = m ? m[1] : RegExp.$1;
  }

  // Tablet detection
  if (/tablet|ipad/i.test(ua)) deviceType = "tablet";
  if (/mobile/i.test(ua) && deviceType !== "tablet") deviceType = "mobile";

  return { browserName, browserVersion, osName, osVersion, deviceType };
}

function classifyTraffic(
  ipType: string | undefined,
  isBot: boolean,
  engaged: boolean,
): string {
  if (isBot) return "bot";
  if (ipType === "datacenter" || ipType === "tor") return "bot";
  if (ipType === "vpn") return "suspicious";
  if (engaged) return "prospect";
  return "unknown";
}

export const POST: APIRoute = async ({ request }) => {
  const clientIP = getClientIP(request) || "unknown";

  if (!checkBeaconRate(clientIP)) {
    return new Response("{}", { status: 200 }); // Silent drop
  }

  try {
    const body = (await request.json()) as BeaconPayload;
    if (!body.sessionId || !body.pagePath) {
      return new Response("{}", { status: 200 }); // Silent drop
    }

    const ua = request.headers.get("user-agent") || "";
    const isBotUA = isLikelyBot(ua);
    const parsedUA = parseUserAgent(ua);

    const { url: postgresUrl } = getPostgresEnv();
    if (!postgresUrl) {
      return new Response("{}", { status: 200 });
    }

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS visitor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        session_id VARCHAR(64) NOT NULL,
        visitor_id VARCHAR(64),
        visit_number INTEGER DEFAULT 1,
        ip_address VARCHAR(45),
        user_agent TEXT,
        page_path VARCHAR(500),
        referrer_url TEXT,
        referrer_domain VARCHAR(255),
        geo_city VARCHAR(100),
        geo_region VARCHAR(100),
        geo_country VARCHAR(10),
        geo_lat DECIMAL(9,6),
        geo_lng DECIMAL(9,6),
        geo_postal VARCHAR(20),
        geo_timezone VARCHAR(50),
        isp_org VARCHAR(255),
        asn VARCHAR(20),
        ip_type VARCHAR(20),
        is_vpn BOOLEAN DEFAULT FALSE,
        is_datacenter BOOLEAN DEFAULT FALSE,
        is_bot BOOLEAN DEFAULT FALSE,
        device_type VARCHAR(20),
        screen_width INTEGER,
        screen_height INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        browser_name VARCHAR(50),
        browser_version VARCHAR(20),
        os_name VARCHAR(50),
        os_version VARCHAR(20),
        language VARCHAR(20),
        timezone VARCHAR(50),
        touch_support BOOLEAN,
        device_memory DECIMAL(4,1),
        hardware_cores INTEGER,
        pixel_ratio DECIMAL(4,2),
        color_depth INTEGER,
        connection_type VARCHAR(20),
        scroll_depth INTEGER DEFAULT 0,
        time_on_page_ms INTEGER DEFAULT 0,
        engaged BOOLEAN DEFAULT FALSE,
        interactions INTEGER DEFAULT 0,
        sections_viewed TEXT[],
        cta_clicks INTEGER DEFAULT 0,
        form_started BOOLEAN DEFAULT FALSE,
        exit_intent BOOLEAN DEFAULT FALSE,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_term VARCHAR(100),
        utm_content VARCHAR(100),
        traffic_class VARCHAR(20) DEFAULT 'unknown'
      )
    `;

    if (body.type === "pageview") {
      // Get geo data (non-blocking, cached)
      let geo: Awaited<ReturnType<typeof getGeoData>> = null;
      try {
        geo = await getGeoData(clientIP);
      } catch {
        // Non-fatal
      }

      const engaged = (body.timeOnPageMs ?? 0) > 10_000 || (body.scrollDepth ?? 0) > 25;
      const trafficClass = classifyTraffic(
        geo?.ipType,
        isBotUA,
        engaged,
      );

      const referrerDomain = body.referrer
        ? (() => {
            try {
              return new URL(body.referrer).hostname;
            } catch {
              return null;
            }
          })()
        : null;

      await sql`
        INSERT INTO visitor_sessions (
          session_id, visitor_id, visit_number,
          ip_address, user_agent, page_path,
          referrer_url, referrer_domain,
          geo_city, geo_region, geo_country,
          geo_lat, geo_lng, geo_postal, geo_timezone,
          isp_org, asn, ip_type,
          is_vpn, is_datacenter, is_bot,
          device_type, screen_width, screen_height,
          viewport_width, viewport_height,
          browser_name, browser_version, os_name, os_version,
          language, timezone, touch_support,
          device_memory, hardware_cores, pixel_ratio, color_depth,
          connection_type,
          scroll_depth, time_on_page_ms, engaged, interactions,
          sections_viewed, cta_clicks, form_started, exit_intent,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          traffic_class
        ) VALUES (
          ${body.sessionId}, ${body.visitorId ?? null}, ${body.visitNumber ?? 1},
          ${clientIP}, ${ua}, ${body.pagePath.slice(0, 500)},
          ${body.referrer ?? null}, ${referrerDomain},
          ${geo?.city ?? null}, ${geo?.region ?? null}, ${geo?.country ?? null},
          ${geo?.lat ?? null}, ${geo?.lng ?? null}, ${geo?.postal ?? null}, ${geo?.timezone ?? null},
          ${geo?.org ?? null}, ${geo?.asn ?? null}, ${geo?.ipType ?? null},
          ${geo?.isVpn ?? false}, ${geo?.isDatacenter ?? false}, ${isBotUA},
          ${body.deviceType || parsedUA.deviceType}, ${body.screenWidth ?? null}, ${body.screenHeight ?? null},
          ${body.viewportWidth ?? null}, ${body.viewportHeight ?? null},
          ${body.browserName || parsedUA.browserName}, ${body.browserVersion || parsedUA.browserVersion},
          ${body.osName || parsedUA.osName}, ${body.osVersion || parsedUA.osVersion},
          ${body.language ?? null}, ${body.timezone ?? null}, ${body.touchSupport ?? null},
          ${body.deviceMemory ?? null}, ${body.hardwareCores ?? null},
          ${body.pixelRatio ?? null}, ${body.colorDepth ?? null},
          ${body.connectionType ?? null},
          ${body.scrollDepth ?? 0}, ${body.timeOnPageMs ?? 0}, ${engaged}, ${body.interactions ?? 0},
          ${body.sectionsViewed ? `{${body.sectionsViewed.join(",")}}` : null},
          ${body.ctaClicks ?? 0}, ${body.formStarted ?? false}, ${body.exitIntent ?? false},
          ${body.utmSource ?? null}, ${body.utmMedium ?? null},
          ${body.utmCampaign ?? null}, ${body.utmTerm ?? null}, ${body.utmContent ?? null},
          ${trafficClass}
        )
      `;
    } else if (body.type === "update" || body.type === "exit") {
      // Update existing session record
      const engaged = (body.timeOnPageMs ?? 0) > 10_000 || (body.scrollDepth ?? 0) > 25;

      await sql`
        UPDATE visitor_sessions SET
          scroll_depth = GREATEST(scroll_depth, ${body.scrollDepth ?? 0}),
          time_on_page_ms = GREATEST(time_on_page_ms, ${body.timeOnPageMs ?? 0}),
          engaged = ${engaged},
          interactions = GREATEST(interactions, ${body.interactions ?? 0}),
          sections_viewed = ${body.sectionsViewed ? `{${body.sectionsViewed.join(",")}}` : null},
          cta_clicks = GREATEST(cta_clicks, ${body.ctaClicks ?? 0}),
          form_started = form_started OR ${body.formStarted ?? false},
          exit_intent = exit_intent OR ${body.exitIntent ?? false},
          traffic_class = CASE
            WHEN is_bot THEN 'bot'
            WHEN ${engaged} AND traffic_class != 'bot' THEN 'prospect'
            ELSE traffic_class
          END
        WHERE session_id = ${body.sessionId}
          AND page_path = ${body.pagePath.slice(0, 500)}
      `;
    }

    return new Response("{}", { status: 200 });
  } catch (err) {
    console.error("Beacon error:", err instanceof Error ? err.message : err);
    return new Response("{}", { status: 200 }); // Always 200 — never reveal errors
  }
};

// Also support GET for sendBeacon fallback (query string)
export const GET: APIRoute = async () => {
  return new Response("{}", { status: 200 });
};
