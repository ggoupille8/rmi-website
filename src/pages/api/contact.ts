import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../lib/db-env";
import {
  isNonEmptyString,
  isValidEmail,
  FIELD_LIMITS,
} from "../../lib/validation";
import { getClientIP } from "../../lib/rate-limiter";
import { enrichLeadAsync } from "../../lib/leadEnrichment";
import type { IntelligencePayload, ContactRecord } from "../../lib/leadEnrichment";

export const prerender = false;

let hasLoggedMissingContacts = false;

// ---------------------------------------------------------------------------
// Bot detection constants
// ---------------------------------------------------------------------------

const BOT_USER_AGENTS = [
  "headlesschrome",
  "phantomjs",
  "selenium",
  "python-requests",
  "curl",
  "wget",
  "scrapy",
  "httpclient",
  "java/",
  "go-http-client",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDbError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    return code ? `${code}: ${error.message}` : error.message;
  }
  return "Unknown error";
}

async function checkContactsTable(): Promise<{ ok: boolean }> {
  try {
    const result = await sql`SELECT to_regclass('public.contacts') as contacts`;
    const hasTable = Boolean(result.rows[0]?.contacts);
    if (!hasTable && !hasLoggedMissingContacts) {
      console.warn("contacts table missing");
      hasLoggedMissingContacts = true;
    }
    return { ok: hasTable };
  } catch (error) {
    console.error("Contacts table check failed:", formatDbError(error));
    return { ok: false };
  }
}

async function verifyDatabaseReady(): Promise<{ ok: boolean }> {
  const { url } = getPostgresEnv();
  if (!url) return { ok: false };
  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function logDbEnvSource(source: "POSTGRES_URL" | "DATABASE_URL" | null) {
  if (!import.meta.env.DEV) return;
  console.log(`db env source: ${source ?? "none"}`);
}

/**
 * Normalize phone: strip non-numeric, validate 10-digit NANP pattern.
 * Returns normalized digits or empty string if invalid.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (normalized.length === 10) return normalized;
  return "";
}

/**
 * Compute bot score from pre-checks (before DB insert).
 * Returns a number 0-100 representing bot likelihood.
 */
function computePreBotScore(
  submissionSpeedMs: number | undefined,
  userAgent: string | null,
  honeypotEmpty: boolean
): number {
  let score = 0;

  // Fast submission + honeypot empty = suspicious (real bots sometimes skip honeypot)
  if (submissionSpeedMs !== undefined && submissionSpeedMs < 3000 && honeypotEmpty) {
    score += 40;
  }

  // Missing or known bot user agent
  if (!userAgent) {
    score += 50;
  } else {
    const uaLower = userAgent.toLowerCase();
    if (BOT_USER_AGENTS.some((bot) => uaLower.includes(bot))) {
      score += 50;
    }
  }

  return Math.min(score, 100);
}

/**
 * Check rate limit against the database — same IP, last 60 minutes.
 * Returns true if rate limit exceeded.
 */
async function checkDbRateLimit(clientIp: string): Promise<boolean> {
  if (!clientIp) return false;
  try {
    const result = await sql`
      SELECT COUNT(*) as cnt
      FROM contacts
      WHERE metadata->>'ip' = ${clientIp}
        AND created_at > NOW() - INTERVAL '60 minutes'
    `;
    const count = parseInt(String(result.rows[0]?.cnt ?? "0"), 10);
    return count >= 3;
  } catch {
    // If rate limit check fails, allow the request (fail open)
    return false;
  }
}

/**
 * Parse intelligence JSON from request body.
 * Returns null if missing or invalid.
 */
function parseIntelligence(
  metadata: Record<string, unknown> | undefined
): IntelligencePayload | null {
  if (!metadata || typeof metadata !== "object") return null;

  try {
    return {
      userAgent: typeof metadata.userAgent === "string" ? metadata.userAgent : undefined,
      language: typeof metadata.language === "string" ? metadata.language : undefined,
      platform: typeof metadata.platform === "string" ? metadata.platform : undefined,
      screenWidth: typeof metadata.screenWidth === "number" ? metadata.screenWidth : undefined,
      screenHeight: typeof metadata.screenHeight === "number" ? metadata.screenHeight : undefined,
      viewportWidth: typeof metadata.viewportWidth === "number" ? metadata.viewportWidth : undefined,
      viewportHeight: typeof metadata.viewportHeight === "number" ? metadata.viewportHeight : undefined,
      devicePixelRatio: typeof metadata.devicePixelRatio === "number" ? metadata.devicePixelRatio : undefined,
      colorDepth: typeof metadata.colorDepth === "number" ? metadata.colorDepth : undefined,
      touchSupport: typeof metadata.touchSupport === "boolean" ? metadata.touchSupport : undefined,
      hardwareConcurrency: typeof metadata.hardwareConcurrency === "number" ? metadata.hardwareConcurrency : undefined,
      deviceMemory: typeof metadata.deviceMemory === "number" ? metadata.deviceMemory : undefined,
      isMobile: typeof metadata.isMobile === "boolean" ? metadata.isMobile : undefined,
      connectionType: typeof metadata.connectionType === "string" ? metadata.connectionType : undefined,
      connectionDownlink: typeof metadata.connectionDownlink === "number" ? metadata.connectionDownlink : undefined,
      saveDataMode: typeof metadata.saveDataMode === "boolean" ? metadata.saveDataMode : undefined,
      referrer: typeof metadata.referrer === "string" ? metadata.referrer : undefined,
      pageUrl: typeof metadata.pageUrl === "string" ? metadata.pageUrl : undefined,
      utmSource: typeof metadata.utmSource === "string" ? metadata.utmSource : undefined,
      utmMedium: typeof metadata.utmMedium === "string" ? metadata.utmMedium : undefined,
      utmCampaign: typeof metadata.utmCampaign === "string" ? metadata.utmCampaign : undefined,
      timeOnPageMs: typeof metadata.timeOnPageMs === "number" ? metadata.timeOnPageMs : undefined,
      elapsedMs: typeof metadata.elapsedMs === "number" ? metadata.elapsedMs : undefined,
      submissionSpeedMs: typeof metadata.elapsedMs === "number" ? metadata.elapsedMs : undefined,
      timeToFirstKeyMs: typeof metadata.timeToFirstKeyMs === "number" ? metadata.timeToFirstKeyMs : undefined,
      timeOnFormMs: typeof metadata.timeOnFormMs === "number" ? metadata.timeOnFormMs : undefined,
      scrollDepthPct: typeof metadata.scrollDepthPct === "number" ? metadata.scrollDepthPct : undefined,
      fieldEditCount: typeof metadata.fieldEditCount === "number" ? metadata.fieldEditCount : undefined,
      optionalFieldsFilled: typeof metadata.optionalFieldsFilled === "number" ? metadata.optionalFieldsFilled : undefined,
      pasteDetected: typeof metadata.pasteDetected === "boolean" ? metadata.pasteDetected : undefined,
      tabBlurCount: typeof metadata.tabBlurCount === "number" ? metadata.tabBlurCount : undefined,
      idlePeriods: typeof metadata.idlePeriods === "number" ? metadata.idlePeriods : undefined,
      returnVisitor: typeof metadata.returnVisitor === "boolean" ? metadata.returnVisitor : undefined,
      pageViews: typeof metadata.pageViews === "number" ? metadata.pageViews : undefined,
      timezone: typeof metadata.timezone === "string" ? metadata.timezone : undefined,
      timezoneOffset: typeof metadata.timezoneOffset === "number" ? metadata.timezoneOffset : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  // --- Parse JSON body ---
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const obj =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};

  // --- Extract and sanitize fields ---
  const rawName = typeof obj.name === "string" ? obj.name : "";
  const rawEmail = typeof obj.email === "string" ? obj.email : "";
  const rawPhone = typeof obj.phone === "string" ? obj.phone : "";
  const rawMessage = typeof obj.message === "string" ? obj.message : "";
  const rawCompany = typeof obj.company === "string" ? obj.company : "";
  const rawServiceType = typeof obj.serviceType === "string" ? obj.serviceType : "";
  const website = typeof obj.website === "string" ? obj.website.trim() : "";
  const source = typeof obj.source === "string" ? obj.source.trim() : "contact";
  const clientMetadata =
    typeof obj.metadata === "object" && obj.metadata !== null
      ? (obj.metadata as Record<string, unknown>)
      : {};

  // Strip whitespace and truncate
  const name = rawName.trim().slice(0, 100);
  const email = rawEmail.trim().slice(0, 254);
  const phone = rawPhone.trim();
  const message = rawMessage.trim().slice(0, 2000);
  const company = rawCompany.trim().slice(0, 150);
  const serviceType = rawServiceType.trim().slice(0, 100);

  // Normalize phone
  const normalizedPhone = normalizePhone(phone);

  // --- Honeypot check ---
  if (website.length > 0) {
    // Accept request silently — don't reveal the trap
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Bot detection pre-checks ---
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent");
  const elapsedMs =
    typeof clientMetadata.elapsedMs === "number" ? clientMetadata.elapsedMs : undefined;
  const preBotScore = computePreBotScore(elapsedMs, userAgent, true);

  // If bot score is very high from pre-checks alone, silently accept (don't reveal)
  if (preBotScore >= 90) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Input validation ---
  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(message) ||
    name.length > FIELD_LIMITS.MAX_NAME_LENGTH ||
    message.length > FIELD_LIMITS.MAX_MESSAGE_LENGTH
  ) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email) {
    return new Response(
      JSON.stringify({ ok: false, error: "Email is required", field: "email" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isValidEmail(email) || email.length > FIELD_LIMITS.MAX_EMAIL_LENGTH) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid email format", field: "email" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Database checks ---
  const { url: postgresUrl, source: postgresSource } = getPostgresEnv();
  logDbEnvSource(postgresSource);

  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "Database not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const contactsTableReady = await checkContactsTable();
  if (!contactsTableReady.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Database schema missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const dbReady = await verifyDatabaseReady();
  if (!dbReady.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Rate limiting (DB-backed) ---
  if (clientIP) {
    const rateLimited = await checkDbRateLimit(clientIP);
    if (rateLimited) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "3600",
          },
        }
      );
    }
  }

  // --- Parse intelligence payload ---
  const intelligencePayload = parseIntelligence(clientMetadata);

  // --- Insert contact record ---
  let savedContactId: string;
  try {
    const fullMetadata: Record<string, unknown> = {
      ...clientMetadata,
      ip: clientIP || null,
      userAgent: userAgent || null,
      company: company || null,
      serviceType: serviceType || null,
    };

    const emailVal = email || null;
    const phoneVal = normalizedPhone || phone || null;
    const result = await sql`
      INSERT INTO contacts (name, email, phone, message, source, metadata)
      VALUES (
        ${name}, ${emailVal}, ${phoneVal}, ${message},
        ${source}, ${JSON.stringify(fullMetadata)}
      )
      RETURNING id
    `;
    savedContactId = result.rows[0]?.id || "";
  } catch (error) {
    console.error(
      "Failed to save contact:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Fire enrichment async — do NOT await, do NOT block the response ---
  const contactRecord: ContactRecord = {
    id: savedContactId,
    name,
    email,
    phone: normalizedPhone || phone,
    message,
    company,
    serviceType,
  };

  enrichLeadAsync(savedContactId, contactRecord, intelligencePayload, clientIP || "")
    .catch((err) =>
      console.error("Enrichment failed silently:", err instanceof Error ? err.message : err)
    );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

// Ensure non-POST methods get a clear response
export async function ALL() {
  return new Response(
    JSON.stringify({ ok: false, error: "Method not allowed" }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    }
  );
}
