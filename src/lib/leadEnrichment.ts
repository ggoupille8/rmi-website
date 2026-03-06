/**
 * Lead enrichment pipeline orchestrator.
 *
 * Called fire-and-forget from contact.ts after a successful DB insert.
 * Gathers IP geo, calls Claude AI for lead qualification, computes bot score,
 * writes to lead_intelligence table, and sends the admin HTML email.
 *
 * Every step is wrapped in try/catch — this function NEVER throws.
 */

import Anthropic from "@anthropic-ai/sdk";
import { sql } from "@vercel/postgres";
import { getGeoData, type GeoResult } from "./ipGeo";
import { sendLeadEmail } from "./emailTemplate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  company: string;
  serviceType: string;
}

export interface IntelligencePayload {
  // Device
  userAgent?: string;
  language?: string;
  platform?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  colorDepth?: number;
  touchSupport?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  isMobile?: boolean;

  // Network
  connectionType?: string;
  connectionDownlink?: number;
  saveDataMode?: boolean;

  // Traffic
  referrer?: string;
  pageUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  // Behavior
  timeOnPageMs?: number;
  elapsedMs?: number;
  submissionSpeedMs?: number;
  timeToFirstKeyMs?: number;
  timeOnFormMs?: number;
  scrollDepthPct?: number;
  fieldEditCount?: number;
  optionalFieldsFilled?: number;
  pasteDetected?: boolean;
  tabBlurCount?: number;
  idlePeriods?: number;
  returnVisitor?: boolean;
  pageViews?: number;

  // Timezone
  timezone?: string;
  timezoneOffset?: number;
}

export interface ClaudeEnrichment {
  leadQuality: "hot" | "warm" | "cold" | "spam" | "unknown";
  qualityReasoning: string;
  aiSummary: string;
  projectType: string;
  urgencySignal: string;
  facilityType: string;
  locationMentioned: string;
  scopeSignals: string;
  aiFlags: string;
  companyVerified: boolean;
  companyVerifySource: string;
  companyContext: string;
  emailDomainType: string;
  disposableEmail: boolean;
}

// ---------------------------------------------------------------------------
// Daily enrichment budget (in-memory counter — resets on cold start)
// ---------------------------------------------------------------------------

let enrichmentCount = 0;
let enrichmentDate = new Date().toDateString();
const DAILY_ENRICHMENT_LIMIT = 50; // 50 leads/day = ~$0.05/day max

function checkEnrichmentBudget(): boolean {
  const today = new Date().toDateString();
  if (today !== enrichmentDate) {
    enrichmentCount = 0;
    enrichmentDate = today;
  }
  if (enrichmentCount >= DAILY_ENRICHMENT_LIMIT) {
    console.warn(`Daily enrichment limit reached (${DAILY_ENRICHMENT_LIMIT}). Skipping AI analysis.`);
    return false;
  }
  enrichmentCount++;
  return true;
}

// ---------------------------------------------------------------------------
// Claude AI enrichment
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a lead qualification assistant for Resource Mechanical Insulation (RMI), a commercial and industrial mechanical insulation contractor in Michigan.
Analyze this contact form submission and return ONLY a JSON object — no markdown, no explanation, no preamble. If a company name is provided, use web search to verify it is a real business.`;

async function callClaudeEnrichment(
  contact: ContactRecord,
  geo: GeoResult | null,
  intelligence: IntelligencePayload | null
): Promise<ClaudeEnrichment | null> {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping AI enrichment");
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const dataBlock = JSON.stringify(
      {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        serviceType: contact.serviceType,
        message: contact.message,
        location: geo
          ? { city: geo.city, region: geo.region, country: geo.country, org: geo.org }
          : null,
        deviceType: intelligence?.isMobile ? "mobile" : "desktop",
        timeOnPageMs: intelligence?.timeOnPageMs ?? intelligence?.elapsedMs ?? null,
        referrer: intelligence?.referrer ?? null,
      },
      null,
      2
    );

    const userMessage = `Analyze this lead submission and return the JSON result:

${dataBlock}

Return ONLY this JSON structure (no markdown fences):
{
  "leadQuality": "hot|warm|cold|spam",
  "qualityReasoning": "brief explanation",
  "aiSummary": "2-3 sentence plain English summary",
  "projectType": "piping|ductwork|equipment|specialty|unknown",
  "urgencySignal": "emergency|planned|exploratory",
  "facilityType": "hospital|industrial|commercial|residential|unknown",
  "locationMentioned": "city/region from message or empty string",
  "scopeSignals": "size indicators, GC relationship, etc. or empty string",
  "aiFlags": "anything suspicious or noteworthy or empty string",
  "companyVerified": true|false,
  "companyVerifySource": "URL or 'no results' or 'no company provided'",
  "companyContext": "brief company description if verified",
  "emailDomainType": "corporate|free|disposable|unknown",
  "disposableEmail": true|false
}`;

    const tools: Anthropic.Messages.Tool[] = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
      } as unknown as Anthropic.Messages.Tool,
    ];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract text from response content blocks
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      }
    }

    if (!text.trim()) {
      return null;
    }

    // Strip markdown code fences if Claude added them despite instructions
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ClaudeEnrichment;
    return parsed;
  } catch (error) {
    console.error(
      "Claude enrichment failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bot score computation
// ---------------------------------------------------------------------------

function computeBotScore(
  intelligence: IntelligencePayload | null,
  geo: GeoResult | null,
  claudeResult: ClaudeEnrichment | null
): number {
  let score = 0;

  if (intelligence) {
    // Fast submission
    const speed = intelligence.submissionSpeedMs ?? intelligence.elapsedMs ?? intelligence.timeOnPageMs;
    if (speed !== undefined && speed < 3000) {
      score += 30;
    }

    // Headless browser signature: no device memory AND low CPU cores
    if (
      intelligence.deviceMemory === undefined &&
      intelligence.hardwareConcurrency !== undefined &&
      intelligence.hardwareConcurrency <= 2
    ) {
      score += 15;
    }

    // Connection + touch + color depth combo (automation signature)
    if (
      intelligence.connectionType === "unknown" &&
      intelligence.touchSupport === false &&
      intelligence.colorDepth !== undefined &&
      intelligence.colorDepth < 24
    ) {
      score += 10;
    }
  }

  // Datacenter IP
  if (geo?.isDatacenter) {
    score += 40;
  }

  // VPN
  if (geo?.isVpn) {
    score += 15;
  }

  // Disposable email (from Claude)
  if (claudeResult?.disposableEmail) {
    score += 25;
  }

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Parse user agent into components
// ---------------------------------------------------------------------------

interface ParsedUA {
  browserName: string | null;
  browserVersion: string | null;
  osName: string | null;
  osVersion: string | null;
  deviceType: string;
}

function parseUserAgent(ua: string | undefined): ParsedUA {
  const result: ParsedUA = {
    browserName: null,
    browserVersion: null,
    osName: null,
    osVersion: null,
    deviceType: "desktop",
  };

  if (!ua) return result;

  // Device type
  if (/Mobi|Android/i.test(ua)) {
    result.deviceType = /tablet|ipad/i.test(ua) ? "tablet" : "mobile";
  }

  // Browser
  if (/Edg\/(\d+[\d.]*)/i.test(ua)) {
    result.browserName = "Edge";
    result.browserVersion = ua.match(/Edg\/(\d+[\d.]*)/i)?.[1] ?? null;
  } else if (/Chrome\/(\d+[\d.]*)/i.test(ua) && !/Edg/i.test(ua)) {
    result.browserName = "Chrome";
    result.browserVersion = ua.match(/Chrome\/(\d+[\d.]*)/i)?.[1] ?? null;
  } else if (/Firefox\/(\d+[\d.]*)/i.test(ua)) {
    result.browserName = "Firefox";
    result.browserVersion = ua.match(/Firefox\/(\d+[\d.]*)/i)?.[1] ?? null;
  } else if (/Safari\/(\d+[\d.]*)/i.test(ua) && !/Chrome/i.test(ua)) {
    result.browserName = "Safari";
    result.browserVersion = ua.match(/Version\/(\d+[\d.]*)/i)?.[1] ?? null;
  }

  // OS
  if (/Windows NT (\d+[\d.]*)/i.test(ua)) {
    result.osName = "Windows";
    const ntVersion = ua.match(/Windows NT (\d+[\d.]*)/i)?.[1];
    if (ntVersion === "10.0") result.osVersion = "10/11";
    else if (ntVersion === "6.3") result.osVersion = "8.1";
    else if (ntVersion === "6.1") result.osVersion = "7";
    else result.osVersion = ntVersion ?? null;
  } else if (/Mac OS X (\d+[._\d]*)/i.test(ua)) {
    result.osName = "macOS";
    result.osVersion = ua.match(/Mac OS X (\d+[._\d]*)/i)?.[1]?.replace(/_/g, ".") ?? null;
  } else if (/Android (\d+[\d.]*)/i.test(ua)) {
    result.osName = "Android";
    result.osVersion = ua.match(/Android (\d+[\d.]*)/i)?.[1] ?? null;
  } else if (/iPhone OS (\d+[._\d]*)/i.test(ua)) {
    result.osName = "iOS";
    result.osVersion = ua.match(/iPhone OS (\d+[._\d]*)/i)?.[1]?.replace(/_/g, ".") ?? null;
  } else if (/Linux/i.test(ua)) {
    result.osName = "Linux";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Classify traffic source from referrer
// ---------------------------------------------------------------------------

function classifyTrafficSource(
  referrer: string | undefined,
  utmSource: string | undefined
): string {
  if (utmSource) return "paid";
  if (!referrer) return "direct";

  try {
    const domain = new URL(referrer).hostname.toLowerCase();
    if (domain.includes("google")) return "organic";
    if (domain.includes("bing")) return "organic";
    if (domain.includes("yahoo")) return "organic";
    if (domain.includes("duckduckgo")) return "organic";
    if (domain.includes("facebook") || domain.includes("fb.com")) return "social";
    if (domain.includes("linkedin")) return "social";
    if (domain.includes("twitter") || domain.includes("x.com")) return "social";
    if (domain.includes("instagram")) return "social";
    if (domain.includes("rmi-llc.net")) return "direct";
    return "referral";
  } catch {
    return "direct";
  }
}

// ---------------------------------------------------------------------------
// Determine business hours
// ---------------------------------------------------------------------------

function isBusinessHours(timezone: string | undefined): {
  dayOfWeek: number;
  hourOfDay: number;
  isBusinessHrs: boolean;
} {
  try {
    const now = new Date();
    const localTime = new Date(
      now.toLocaleString("en-US", { timeZone: timezone || "America/Detroit" })
    );
    const day = localTime.getDay(); // 0=Sunday
    const hour = localTime.getHours();
    return {
      dayOfWeek: day,
      hourOfDay: hour,
      isBusinessHrs: day >= 1 && day <= 5 && hour >= 7 && hour < 18,
    };
  } catch {
    return { dayOfWeek: -1, hourOfDay: -1, isBusinessHrs: false };
  }
}

// ---------------------------------------------------------------------------
// Write to lead_intelligence table
// ---------------------------------------------------------------------------

async function writeLeadIntelligence(
  contactId: string,
  contact: ContactRecord,
  intelligence: IntelligencePayload | null,
  geo: GeoResult | null,
  claudeResult: ClaudeEnrichment | null,
  botScore: number
): Promise<void> {
  const ua = parseUserAgent(intelligence?.userAgent);
  const trafficSource = classifyTrafficSource(
    intelligence?.referrer,
    intelligence?.utmSource
  );
  const bizHours = isBusinessHours(
    intelligence?.timezone ?? geo?.timezone ?? undefined
  );

  const referrerDomain = intelligence?.referrer
    ? (() => {
        try {
          return new URL(intelligence.referrer).hostname;
        } catch {
          return null;
        }
      })()
    : null;

  try {
    await sql`
      INSERT INTO lead_intelligence (
        contact_id,
        ip_address, ip_type, isp_name, isp_org, asn,
        geo_city, geo_region, geo_country, geo_lat, geo_lng, geo_timezone, geo_postal,
        user_agent, browser_name, browser_version, os_name, os_version, device_type,
        screen_width, screen_height, viewport_width, viewport_height,
        device_pixel_ratio, color_depth, touch_support, hardware_concurrency, device_memory,
        connection_type, connection_downlink, save_data_mode,
        browser_language, timezone_offset,
        referrer_url, referrer_domain, traffic_source,
        utm_source, utm_medium, utm_campaign, entry_url,
        session_duration_ms, time_to_first_key_ms, time_on_form_ms,
        scroll_depth_pct, field_edit_count, message_length, optional_fields_filled,
        paste_detected, tab_blur_count, idle_periods, return_visitor,
        submitted_at_local, day_of_week, hour_of_day, is_business_hours,
        honeypot_triggered, submission_speed_ms,
        is_vpn, is_datacenter_ip, is_tor, bot_score,
        lead_quality, quality_reasoning, ai_summary,
        project_type, urgency_signal, facility_type,
        location_mentioned, scope_signals, ai_flags,
        company_verified, company_verify_source, company_context,
        email_domain_type, email_mx_valid, disposable_email,
        enriched_at, enrichment_version
      ) VALUES (
        ${contactId},
        ${null}, ${geo?.ipType ?? null}, ${geo?.isp ?? null}, ${geo?.org ?? null}, ${geo?.asn ?? null},
        ${geo?.city ?? null}, ${geo?.region ?? null}, ${geo?.country ?? null},
        ${geo?.lat ?? null}, ${geo?.lng ?? null}, ${geo?.timezone ?? null}, ${geo?.postal ?? null},
        ${intelligence?.userAgent ?? null}, ${ua.browserName}, ${ua.browserVersion},
        ${ua.osName}, ${ua.osVersion}, ${ua.deviceType},
        ${intelligence?.screenWidth ?? null}, ${intelligence?.screenHeight ?? null},
        ${intelligence?.viewportWidth ?? null}, ${intelligence?.viewportHeight ?? null},
        ${intelligence?.devicePixelRatio ?? null}, ${intelligence?.colorDepth ?? null},
        ${intelligence?.touchSupport ?? null},
        ${intelligence?.hardwareConcurrency ?? null}, ${intelligence?.deviceMemory ?? null},
        ${intelligence?.connectionType ?? null}, ${intelligence?.connectionDownlink ?? null},
        ${intelligence?.saveDataMode ?? false},
        ${intelligence?.language ?? null}, ${intelligence?.timezoneOffset ?? null},
        ${intelligence?.referrer ?? null}, ${referrerDomain},
        ${trafficSource},
        ${intelligence?.utmSource ?? null}, ${intelligence?.utmMedium ?? null},
        ${intelligence?.utmCampaign ?? null}, ${intelligence?.pageUrl ?? null},
        ${intelligence?.timeOnPageMs ?? intelligence?.elapsedMs ?? null},
        ${intelligence?.timeToFirstKeyMs ?? null}, ${intelligence?.timeOnFormMs ?? null},
        ${intelligence?.scrollDepthPct ?? null}, ${intelligence?.fieldEditCount ?? null},
        ${contact.message.length}, ${intelligence?.optionalFieldsFilled ?? null},
        ${intelligence?.pasteDetected ?? false},
        ${intelligence?.tabBlurCount ?? 0}, ${intelligence?.idlePeriods ?? 0},
        ${intelligence?.returnVisitor ?? false},
        ${new Date().toISOString()}, ${bizHours.dayOfWeek}, ${bizHours.hourOfDay},
        ${bizHours.isBusinessHrs},
        ${false}, ${intelligence?.submissionSpeedMs ?? intelligence?.elapsedMs ?? null},
        ${geo?.isVpn ?? false}, ${geo?.isDatacenter ?? false}, ${geo?.isTor ?? false},
        ${botScore},
        ${claudeResult?.leadQuality ?? null}, ${claudeResult?.qualityReasoning ?? null},
        ${claudeResult?.aiSummary ?? null},
        ${claudeResult?.projectType ?? null}, ${claudeResult?.urgencySignal ?? null},
        ${claudeResult?.facilityType ?? null},
        ${claudeResult?.locationMentioned ?? null}, ${claudeResult?.scopeSignals ?? null},
        ${claudeResult?.aiFlags ?? null},
        ${claudeResult?.companyVerified ?? null}, ${claudeResult?.companyVerifySource ?? null},
        ${claudeResult?.companyContext ?? null},
        ${claudeResult?.emailDomainType ?? null}, ${null}, ${claudeResult?.disposableEmail ?? false},
        ${new Date().toISOString()}, ${"2.0"}
      )
    `;
  } catch (error) {
    console.error(
      "Failed to write lead_intelligence:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Update contacts table with lead_quality in metadata
  try {
    if (claudeResult?.leadQuality) {
      await sql`
        UPDATE contacts
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{lead_quality}',
          ${JSON.stringify(claudeResult.leadQuality)}::jsonb
        )
        WHERE id = ${contactId}::uuid
      `;
    }
  } catch (error) {
    console.error(
      "Failed to update contact lead_quality:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// ---------------------------------------------------------------------------
// Global enrichment timeout
// ---------------------------------------------------------------------------

const ENRICHMENT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Core enrichment logic (called within timeout wrapper)
// ---------------------------------------------------------------------------

async function doEnrichment(
  contactId: string,
  contact: ContactRecord,
  intelligence: IntelligencePayload | null,
  clientIp: string
): Promise<void> {
  // Step 1 — Parallel data gathering (race against 8s timeout)
  const geoPromise = getGeoData(clientIp);
  const geoTimeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 8000)
  );

  const [geoSettled] = await Promise.allSettled([
    Promise.race([geoPromise, geoTimeoutPromise]),
  ]);

  const geoData: GeoResult | null =
    geoSettled.status === "fulfilled" ? (geoSettled.value as GeoResult | null) : null;

  // Step 2 — Call Claude AI for enrichment (if within daily budget)
  let claudeResult: ClaudeEnrichment | null = null;
  const withinBudget = checkEnrichmentBudget();

  if (!withinBudget) {
    claudeResult = {
      leadQuality: "unknown",
      qualityReasoning: "Daily enrichment limit reached — manual review needed",
      aiSummary: "Daily enrichment limit reached — manual review needed",
      projectType: "unknown",
      urgencySignal: "unknown",
      facilityType: "unknown",
      locationMentioned: "",
      scopeSignals: "",
      aiFlags: "daily_limit_reached",
      companyVerified: false,
      companyVerifySource: "",
      companyContext: "",
      emailDomainType: "unknown",
      disposableEmail: false,
    };
  } else {
    try {
      claudeResult = await callClaudeEnrichment(contact, geoData, intelligence);
    } catch (error) {
      console.error(
        "Claude enrichment step failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // Step 3 — Compute bot score
  const botScore = computeBotScore(intelligence, geoData, withinBudget ? claudeResult : null);

  // Step 4 — Write to lead_intelligence table
  try {
    await writeLeadIntelligence(
      contactId,
      contact,
      intelligence,
      geoData,
      claudeResult,
      botScore
    );
  } catch (error) {
    console.error(
      "lead_intelligence write failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Step 5 — Send admin email
  try {
    await sendLeadEmail({
      contact,
      intelligence,
      geo: geoData,
      claudeResult: withinBudget ? claudeResult : null,
      botScore,
    });
  } catch (error) {
    console.error(
      "Lead email send failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// ---------------------------------------------------------------------------
// Main orchestrator — called fire-and-forget from contact.ts
// ---------------------------------------------------------------------------

export async function enrichLeadAsync(
  contactId: string,
  contact: ContactRecord,
  intelligence: IntelligencePayload | null,
  clientIp: string
): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Enrichment timeout exceeded")), ENRICHMENT_TIMEOUT_MS)
  );

  try {
    await Promise.race([
      doEnrichment(contactId, contact, intelligence, clientIp),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error(
      "Enrichment pipeline failed or timed out:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // On timeout/failure, still attempt to send a basic email
    try {
      await sendLeadEmail({
        contact,
        intelligence,
        geo: null,
        claudeResult: null,
        botScore: 0,
      });
    } catch (emailError) {
      console.error(
        "Fallback email send failed:",
        emailError instanceof Error ? emailError.message : "Unknown error"
      );
    }
  }
}
