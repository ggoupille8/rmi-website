import type { APIRoute } from "astro";
import sgMail from "@sendgrid/mail";
import { sql } from "@vercel/postgres";

// Prevent prerendering - API routes must be server-side only
export const prerender = false;

// Simple in-memory rate limiting store
// In production, consider using Redis or a database
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit: 5 requests per 15 minutes per IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

// Minimum time between page load and submission (2 seconds)
const MIN_SUBMISSION_TIME = 2000;

interface QuoteRequest {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  message: string;
  serviceType: string;
  honeypot?: string;
  timestamp?: string;
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

function checkRateLimit(ip: string | null): {
  allowed: boolean;
  retryAfter?: number;
} {
  if (!ip) {
    // If we can't determine IP, allow but log
    console.warn("Rate limit check: Could not determine client IP");
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

function validateRequest(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const req = data as QuoteRequest;

  // Required fields
  if (
    !req.name ||
    typeof req.name !== "string" ||
    req.name.trim().length === 0
  ) {
    return { valid: false, error: "Name is required" };
  }

  if (
    !req.company ||
    typeof req.company !== "string" ||
    req.company.trim().length === 0
  ) {
    return { valid: false, error: "Company is required" };
  }

  // Email or phone required
  const hasEmail =
    req.email && typeof req.email === "string" && req.email.trim().length > 0;
  const hasPhone =
    req.phone && typeof req.phone === "string" && req.phone.trim().length > 0;
  if (!hasEmail && !hasPhone) {
    return { valid: false, error: "Email or phone is required" };
  }

  // Validate email format if provided
  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.email.trim())) {
      return { valid: false, error: "Invalid email format" };
    }
  }

  if (
    !req.message ||
    typeof req.message !== "string" ||
    req.message.trim().length === 0
  ) {
    return { valid: false, error: "Message is required" };
  }

  if (
    !req.serviceType ||
    typeof req.serviceType !== "string" ||
    req.serviceType.trim().length === 0
  ) {
    return { valid: false, error: "Service type is required" };
  }

  // Honeypot check
  if (req.honeypot && req.honeypot.trim().length > 0) {
    return { valid: false, error: "Spam detected" };
  }

  // Timestamp check (minimum submission time)
  if (req.timestamp) {
    const timestamp = parseInt(req.timestamp, 10);
    if (isNaN(timestamp)) {
      return { valid: false, error: "Invalid timestamp" };
    }
    const elapsed = Date.now() - timestamp;
    if (elapsed < MIN_SUBMISSION_TIME) {
      return { valid: false, error: "Submission too fast" };
    }
  } else {
    // Timestamp is recommended but not strictly required for backwards compatibility
    // In production, you might want to make this required
  }

  return { valid: true };
}

async function saveQuote(
  data: QuoteRequest,
  clientIP: string | null,
  userAgent: string | null
): Promise<string> {
  const metadata = {
    ip: clientIP || null,
    userAgent: userAgent || null,
    timestamp: data.timestamp || null,
  };

  try {
    const result = await sql`
      INSERT INTO quotes (name, company, email, phone, service_type, message, metadata)
      VALUES (${data.name.trim()}, ${data.company.trim()}, ${
      data.email?.trim() || null
    }, ${
      data.phone?.trim() || null
    }, ${data.serviceType.trim()}, ${data.message.trim()}, ${JSON.stringify(
      metadata
    )})
      RETURNING id
    `;
    return result.rows[0]?.id || "";
  } catch (error) {
    // Log error but don't expose database details
    console.error(
      "Failed to save quote:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw new Error("Failed to save quote");
  }
}

async function sendEmail(data: QuoteRequest): Promise<void> {
  const apiKey = import.meta.env.SENDGRID_API_KEY;
  const toEmail = import.meta.env.QUOTE_TO_EMAIL || "ggoupille@rmi-llc.net";
  const fromEmail = import.meta.env.QUOTE_FROM_EMAIL || "no-reply@rmi-llc.net";

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  sgMail.setApiKey(apiKey);

  const emailContent = `
New Quote Request

Name: ${data.name}
Company: ${data.company}
Email: ${data.email || "Not provided"}
Phone: ${data.phone || "Not provided"}
Service Type: ${data.serviceType}

Message:
${data.message}
  `.trim();

  await sgMail.send({
    to: toEmail,
    from: fromEmail,
    subject: `New Quote Request from ${data.name} - ${data.company}`,
    text: emailContent,
    html: emailContent.replace(/\n/g, "<br>"),
  });
}

export const POST: APIRoute = async ({ request }) => {
  const requestId = crypto.randomUUID();

  try {
    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitCheck = checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
      console.log(
        `[${requestId}] Rate limit exceeded for IP: ${clientIP || "unknown"}`
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Too many requests",
        }),
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

    // Parse request body
    let data: unknown;
    try {
      data = await request.json();
    } catch (error) {
      console.log(`[${requestId}] Invalid JSON`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate request
    const validation = validateRequest(data);
    if (!validation.valid) {
      console.log(`[${requestId}] Validation failed: ${validation.error}`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: validation.error,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const quoteData = data as QuoteRequest;
    const userAgent = request.headers.get("user-agent");

    // Save to database first
    let quoteId: string | null = null;
    try {
      quoteId = await saveQuote(quoteData, clientIP, userAgent);
    } catch (error) {
      // Log but continue - email is still important
      console.error(
        `[${requestId}] Database save failed:`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // Send email
    try {
      await sendEmail(quoteData);
      console.log(
        `[${requestId}] Success${quoteId ? ` (saved: ${quoteId})` : ""}`
      );
      return new Response(
        JSON.stringify({
          ok: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(
        `[${requestId}] Email send failed:`,
        error instanceof Error ? error.message : "Unknown error"
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error(
      `[${requestId}] Unexpected error:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
