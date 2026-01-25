import type { APIRoute } from "astro";
import sgMail from "@sendgrid/mail";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../lib/db-env";

// src/pages/api/contact.ts
export const prerender = false;

// Simple in-memory rate limiting store
// In production, consider using Redis or a database
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit: 5 requests per minute per IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5000;
let hasLoggedMissingContacts = false;

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  source?: string;
  timestamp?: string;
  metadata?: {
    elapsedMs?: number;
    fastSubmit?: boolean;
  };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isEmailLike(v: string): boolean {
  // pragmatic validation; avoids dependencies
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function checkRateLimit(ip: string | null): {
  allowed: boolean;
  retryAfter?: number;
} {
  if (!ip) {
    // If we can't determine IP, allow (best-effort in serverless)
    return { allowed: true };
  }

  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // Create new record or reset expired one
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(ip, record);
  return { allowed: true };
}

function getClientIP(request: Request): string | null {
  // Try Vercel headers first
  const vercelIP = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (vercelIP) return vercelIP;

  // Fallback to other common headers
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  // Last resort: use CF-Connecting-IP (Cloudflare) or similar
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;

  return null;
}

async function saveContact(
  data: ContactRequest,
  clientIP: string | null,
  userAgent: string | null
): Promise<string> {
  const metadata = {
    ip: clientIP || null,
    userAgent: userAgent || null,
    timestamp: data.timestamp || null,
    elapsedMs: data.metadata?.elapsedMs ?? null,
    fastSubmit: data.metadata?.fastSubmit ?? null,
  };

  try {
    const result = await sql`
      INSERT INTO contacts (name, email, message, source, metadata)
      VALUES (${data.name.trim()}, ${data.email.trim()}, ${
      data.message.trim()
    }, ${data.source?.trim() || "contact"}, ${JSON.stringify(metadata)})
      RETURNING id
    `;
    return result.rows[0]?.id || "";
  } catch (error) {
    // Log error but don't expose database details
    console.error(
      "Failed to save contact:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw new Error("Failed to save contact");
  }
}

async function verifyDatabaseReady(): Promise<{ ok: boolean }> {
  const { url } = getPostgresEnv();
  if (!url) {
    return { ok: false };
  }

  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function logDbEnvSource(source: "POSTGRES_URL" | "DATABASE_URL" | null) {
  if (!import.meta.env.DEV) {
    return;
  }
  const label = source ?? "none";
  console.log(`db env source: ${label}`);
}

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

async function sendContactEmail(params: {
  name: string;
  email: string;
  message: string;
  timestamp: string;
}): Promise<void> {
  const apiKey = import.meta.env.SENDGRID_API_KEY;
  const toEmail = import.meta.env.QUOTE_TO_EMAIL || "fab@rmi-llc.net";
  const fromEmail = import.meta.env.QUOTE_FROM_EMAIL || "no-reply@rmi-llc.net";

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  sgMail.setApiKey(apiKey);

  const emailContent = `
New Contact Submission

Name: ${params.name}
Email: ${params.email}
Timestamp: ${params.timestamp}

Message:
${params.message}
  `.trim();

  await sgMail.send({
    to: toEmail,
    from: fromEmail,
    subject: "New Contact Submission",
    text: emailContent,
  });
}

export const POST: APIRoute = async ({ request }) => {
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { url: postgresUrl, source: postgresSource } = getPostgresEnv();
  logDbEnvSource(postgresSource);
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "Database not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const contactsTableReady = await checkContactsTable();
  if (!contactsTableReady.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Database schema missing" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const clientIP = getClientIP(request);
  const rateLimitCheck = checkRateLimit(clientIP);
  if (!rateLimitCheck.allowed) {
    console.warn(
      `Rate limit exceeded for /api/contact (ip: ${clientIP || "unknown"})`
    );
    return new Response(
      JSON.stringify({ ok: false, error: "Too many requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...(rateLimitCheck.retryAfter && {
            "Retry-After": rateLimitCheck.retryAfter.toString(),
          }),
        },
      }
    );
  }

  const obj =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)
      : {};

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const email = typeof obj.email === "string" ? obj.email.trim() : "";
  const message = typeof obj.message === "string" ? obj.message.trim() : "";
  const website = typeof obj.website === "string" ? obj.website.trim() : "";
  const source = typeof obj.source === "string" ? obj.source.trim() : "contact";
  const timestamp =
    typeof obj.timestamp === "string" ? obj.timestamp : undefined;
  const metadataObj =
    typeof obj.metadata === "object" && obj.metadata !== null
      ? (obj.metadata as Record<string, unknown>)
      : {};
  const elapsedMs =
    typeof metadataObj.elapsedMs === "number" && metadataObj.elapsedMs >= 0
      ? metadataObj.elapsedMs
      : undefined;
  const fastSubmit =
    typeof metadataObj.fastSubmit === "boolean"
      ? metadataObj.fastSubmit
      : undefined;

  // Honeypot: accept request but do not store
  if (website.length > 0) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(message) ||
    !isEmailLike(email) ||
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dbReady = await verifyDatabaseReady();
  if (!dbReady.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const userAgent = request.headers.get("user-agent");
    await saveContact(
      { name, email, message, source, timestamp, metadata: { elapsedMs, fastSubmit } },
      clientIP,
      userAgent
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    await sendContactEmail({
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Contact email send failed.");
  }

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
