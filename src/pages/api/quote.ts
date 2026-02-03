import type { APIRoute } from "astro";
import sgMail from "@sendgrid/mail";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../lib/db-env";
import {
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  escapeHtml,
  MIN_SUBMISSION_TIME_MS,
} from "../../lib/validation";
import { quoteRateLimiter, getClientIP } from "../../lib/rate-limiter";

// Prevent prerendering - API routes must be server-side only
export const prerender = false;

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

function validateRequest(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const req = data as QuoteRequest;

  // Required fields
  if (!isNonEmptyString(req.name)) {
    return { valid: false, error: "Name is required" };
  }

  if (!isNonEmptyString(req.company)) {
    return { valid: false, error: "Company is required" };
  }

  // Email or phone required
  const hasEmail = isNonEmptyString(req.email);
  const hasPhone = isNonEmptyString(req.phone);
  if (!hasEmail && !hasPhone) {
    return { valid: false, error: "Email or phone is required" };
  }

  // Validate email format if provided
  if (hasEmail && !isValidEmail(req.email!)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Validate phone format if provided
  if (hasPhone && !isValidPhone(req.phone!)) {
    return { valid: false, error: "Invalid phone format" };
  }

  if (!isNonEmptyString(req.message)) {
    return { valid: false, error: "Message is required" };
  }

  if (!isNonEmptyString(req.serviceType)) {
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
    if (elapsed < MIN_SUBMISSION_TIME_MS) {
      return { valid: false, error: "Submission too fast" };
    }
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
  const toEmail = import.meta.env.QUOTE_TO_EMAIL || "fab@rmi-llc.net";
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

  // Escape HTML entities in user-provided content for HTML email
  const safeHtml = escapeHtml(emailContent).replace(/\n/g, "<br>");
  // Subject is plain text, but ensure it's safe (SendGrid handles this, but be defensive)
  const safeSubject = `New Quote Request from ${data.name} - ${data.company}`;

  await sgMail.send({
    to: toEmail,
    from: fromEmail,
    subject: safeSubject,
    text: emailContent,
    html: safeHtml,
  });
}

export const POST: APIRoute = async ({ request }) => {
  const requestId = crypto.randomUUID();

  try {
    const { url: postgresUrl } = getPostgresEnv();
    if (!postgresUrl) {
      console.warn(`[${requestId}] Database not configured; skipping save.`);
    }

    // Check rate limit
    const clientIP = getClientIP(request);
    const rateLimitCheck = quoteRateLimiter.check(clientIP);
    if (!rateLimitCheck.allowed) {
      console.log(
        `[${requestId}] Rate limit exceeded for IP: ${clientIP || "unknown"}`
      );
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Too many requests",
          requestId,
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
          requestId,
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
          requestId,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const quoteData = data as QuoteRequest;
    const userAgent = request.headers.get("user-agent");

    let saved = false;
    let emailed = false;
    let quoteId: string | null = null;

    // Save to database (best effort)
    if (postgresUrl) {
      try {
        quoteId = await saveQuote(quoteData, clientIP, userAgent);
        saved = !!quoteId;
      } catch (error) {
        // Log but continue - email is still important
        console.error(
          `[${requestId}] Database save failed:`,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    // Send email (best effort)
    try {
      await sendEmail(quoteData);
      emailed = true;
    } catch (error) {
      console.error(
        `[${requestId}] Email send failed:`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    if (saved || emailed) {
      console.log(
        `[${requestId}] Success${quoteId ? ` (saved: ${quoteId})` : ""}`
      );
      return new Response(
        JSON.stringify({
          ok: true,
          requestId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(
      `[${requestId}] Unexpected error:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
