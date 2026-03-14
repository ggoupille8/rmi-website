import type { APIRoute } from "astro";
import { Resend } from "resend";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { escapeHtml } from "../../../lib/validation";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const SALES_EMAIL = "fab@rmi-llc.net";

interface GeoData {
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  isp?: string;
  org?: string;
}

interface EnrichmentData {
  emailDomain?: string | null;
  hasMxRecords?: boolean;
  isFreeMail?: boolean;
  emailFormat?: string;
  companyWebsiteExists?: boolean | null;
  companyWebsiteTitle?: string | null;
  phoneValid?: boolean;
  phoneAreaCode?: string | null;
  phoneRegion?: string | null;
  ipOrgMatch?: boolean | null;
  legitimacyScore?: number;
  quality?: string;
}

interface LeadMetadata {
  ip?: string;
  userAgent?: string;
  timezone?: string;
  isMobile?: boolean;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  timeOnPageMs?: number;
  elapsedMs?: number;
  pageViews?: number;
  screenWidth?: number;
  screenHeight?: number;
  geo?: GeoData | null;
  enrichment?: EnrichmentData | null;
  [key: string]: unknown;
}

function formatTimeOnPage(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatReferrerSource(referrer: string | undefined | null): string {
  if (!referrer) return "Direct Visit";
  try {
    const hostname = new URL(referrer).hostname.replace("www.", "");
    const sources: Record<string, string> = {
      "google.com": "Google Search",
      "bing.com": "Bing Search",
      "linkedin.com": "LinkedIn",
      "facebook.com": "Facebook",
    };
    return sources[hostname] || hostname;
  } catch {
    return referrer;
  }
}

function buildQualitySection(enrichment: EnrichmentData | null | undefined): string {
  if (!enrichment || enrichment.legitimacyScore == null) return "";

  const colorMap: Record<string, string> = {
    high: "#22c55e",
    medium: "#eab308",
    low: "#ef4444",
    spam: "#6b7280",
  };
  const labelMap: Record<string, string> = {
    high: "HIGH QUALITY",
    medium: "MEDIUM QUALITY",
    low: "LOW QUALITY",
    spam: "SPAM",
  };

  const quality = enrichment.quality || "medium";
  const color = colorMap[quality] || colorMap.medium;
  const label = labelMap[quality] || "UNKNOWN";

  const checks: string[] = [];
  const check = (pass: boolean | null | undefined, text: string) => {
    if (pass === true) checks.push(`<span style="color:#22c55e;">&#10003;</span> ${escapeHtml(text)}`);
    else if (pass === false) checks.push(`<span style="color:#ef4444;">&#10007;</span> ${escapeHtml(text)}`);
  };

  if (enrichment.hasMxRecords != null) {
    check(enrichment.hasMxRecords, "Email domain verified (MX records)");
  }
  if (enrichment.isFreeMail != null) {
    check(!enrichment.isFreeMail, enrichment.isFreeMail ? "Free email provider" : `Company email (${enrichment.emailDomain || ""})`);
  }
  if (enrichment.companyWebsiteExists != null) {
    check(enrichment.companyWebsiteExists, enrichment.companyWebsiteExists ? `Company website exists${enrichment.companyWebsiteTitle ? ` (${enrichment.companyWebsiteTitle})` : ""}` : "Company website not found");
  }
  if (enrichment.phoneValid != null) {
    const phoneDetail = enrichment.phoneAreaCode && enrichment.phoneRegion
      ? ` (${enrichment.phoneAreaCode} — ${enrichment.phoneRegion})`
      : "";
    check(enrichment.phoneValid, enrichment.phoneValid ? `Valid phone${phoneDetail}` : "Phone invalid or not provided");
  }

  return `<div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
    <h3 style="margin:0 0 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Lead Quality</h3>
    <div style="display:inline-block;background:${color}20;border:1px solid ${color}40;border-radius:6px;padding:6px 16px;margin-bottom:12px;">
      <span style="color:${color};font-weight:700;font-size:14px;">${label}</span>
      <span style="color:#9ca3af;font-size:13px;margin-left:8px;">(Score: ${enrichment.legitimacyScore}/100)</span>
    </div>
    ${checks.length > 0 ? `<div style="margin-top:8px;font-size:13px;line-height:2;color:#d1d5db;">${checks.join("<br>")}</div>` : ""}
  </div>`;
}

function buildEmailHtml(contact: Record<string, unknown>): string {
  const name = escapeHtml(String(contact.name || ""));
  const email = escapeHtml(String(contact.email || "Not provided"));
  const phone = escapeHtml(String(contact.phone || "Not provided"));
  const message = escapeHtml(String(contact.message || "")).replace(/\n/g, "<br>");
  const createdAt = contact.created_at
    ? new Date(String(contact.created_at)).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  const meta = (contact.metadata || {}) as LeadMetadata;
  const geo = meta.geo;
  const enrichment = meta.enrichment;

  // Build intelligence rows
  const intelRows: string[] = [];

  if (geo?.city || geo?.state) {
    intelRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Location</td><td style="padding:4px 0;font-size:13px;">${escapeHtml([geo.city, geo.state, geo.country].filter(Boolean).join(", "))}</td></tr>`
    );
  }
  if (geo?.org) {
    intelRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Organization</td><td style="padding:4px 0;font-size:13px;color:#60a5fa;font-weight:600;">${escapeHtml(geo.org)}</td></tr>`
    );
  }
  if (meta.isMobile !== undefined) {
    intelRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Device</td><td style="padding:4px 0;font-size:13px;">${meta.isMobile ? "Mobile" : "Desktop"}</td></tr>`
    );
  }
  if (meta.referrer !== undefined) {
    intelRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Source</td><td style="padding:4px 0;font-size:13px;">${escapeHtml(formatReferrerSource(meta.referrer))}</td></tr>`
    );
  }
  const timeMs = meta.timeOnPageMs ?? meta.elapsedMs;
  if (timeMs && timeMs > 0) {
    intelRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Time on Page</td><td style="padding:4px 0;font-size:13px;">${formatTimeOnPage(timeMs)}</td></tr>`
    );
  }

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#e5e7eb;">
  <div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
    <h2 style="margin:0 0 16px;color:#fff;font-size:18px;">New Lead from RMI Website</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 12px 6px 0;color:#9ca3af;font-size:14px;white-space:nowrap;">Name</td><td style="padding:6px 0;font-size:14px;color:#fff;font-weight:600;">${name}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#9ca3af;font-size:14px;">Email</td><td style="padding:6px 0;font-size:14px;"><a href="mailto:${escapeHtml(String(contact.email || ""))}" style="color:#60a5fa;">${email}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#9ca3af;font-size:14px;">Phone</td><td style="padding:6px 0;font-size:14px;"><a href="tel:${escapeHtml(String(contact.phone || ""))}" style="color:#60a5fa;">${phone}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#9ca3af;font-size:14px;">Submitted</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(createdAt)}</td></tr>
    </table>
  </div>

  <div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
    <h3 style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Message</h3>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#e5e7eb;">${message}</p>
  </div>

  ${
    intelRows.length > 0
      ? `<div style="background:#1e293b;border-radius:8px;padding:24px;margin-bottom:16px;">
    <h3 style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Intelligence</h3>
    <table style="width:100%;border-collapse:collapse;">${intelRows.join("")}</table>
  </div>`
      : ""
  }

  ${buildQualitySection(enrichment)}

  <p style="text-align:center;margin-top:24px;">
    <a href="https://rmi-llc.net/admin/leads" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">View in Admin Panel</a>
  </p>
</div>`.trim();
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: {
        ...SECURITY_HEADERS,
        "WWW-Authenticate": 'Bearer realm="admin"',
      },
    });
  }

  const apiKey = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  let body: { contactId?: unknown };
  try {
    body = (await request.json()) as { contactId?: unknown };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON", code: "BAD_REQUEST" }), {
      status: 400,
      headers: SECURITY_HEADERS,
    });
  }

  const contactId = body.contactId;
  if (!contactId || typeof contactId !== "string") {
    return new Response(
      JSON.stringify({ error: "contactId is required", code: "BAD_REQUEST" }),
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  // Validate UUID format
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contactId
    )
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid contact ID format", code: "BAD_REQUEST" }),
      { status: 400, headers: SECURITY_HEADERS }
    );
  }

  try {
    // Fetch the contact
    const result = await sql`
      SELECT id, created_at, name, email, phone, message, source, metadata, status, notes
      FROM contacts
      WHERE id = ${contactId}
    `;

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Contact not found", code: "NOT_FOUND" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const contact = result.rows[0];
    const contactName = String(contact.name || "Unknown");
    const emailSubject = `New Lead: ${contactName}`;

    // Build and send email
    const resend = new Resend(apiKey);
    const html = buildEmailHtml(contact);

    await resend.emails.send({
      from: "RMI Leads <onboarding@resend.dev>",
      to: SALES_EMAIL,
      subject: emailSubject,
      html,
    });

    // Update status to "forwarded" and add forwarding note
    const forwardNote = `Forwarded to ${SALES_EMAIL} on ${new Date().toLocaleDateString("en-US")}`;
    const existingNotes = contact.notes ? `${contact.notes}\n${forwardNote}` : forwardNote;

    await sql`
      UPDATE contacts
      SET status = 'forwarded', notes = ${existingNotes}, updated_at = NOW()
      WHERE id = ${contactId}
    `;

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Forward lead error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Failed to forward lead", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
