/**
 * Lead notification email — builds and sends a self-contained HTML email
 * with two panels: Contact Submission (forward-safe) and Intelligence (admin only).
 *
 * Uses Resend for delivery.
 */

import { Resend } from "resend";
import type { ContactRecord, IntelligencePayload, ClaudeEnrichment } from "./leadEnrichment";
import type { GeoResult } from "./ipGeo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadEmailParams {
  contact: ContactRecord;
  intelligence: IntelligencePayload | null;
  geo: GeoResult | null;
  claudeResult: ClaudeEnrichment | null;
  botScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return phone;
}

function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "Unknown";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function qualityBadge(quality: string | undefined): { label: string; color: string; bg: string } {
  switch (quality) {
    case "hot":
      return { label: "HOT LEAD", color: "#ef4444", bg: "#7f1d1d" };
    case "warm":
      return { label: "WARM LEAD", color: "#f59e0b", bg: "#78350f" };
    case "cold":
      return { label: "COLD LEAD", color: "#3b82f6", bg: "#1e3a5f" };
    case "spam":
      return { label: "SPAM", color: "#6b7280", bg: "#374151" };
    default:
      return { label: "NEW LEAD", color: "#8b5cf6", bg: "#4c1d95" };
  }
}

function buildSubjectLine(
  contact: ContactRecord,
  claudeResult: ClaudeEnrichment | null,
  geo: GeoResult | null
): string {
  const quality = claudeResult?.leadQuality ?? "new";
  const tag = quality === "hot" ? "[HOT LEAD]"
    : quality === "warm" ? "[WARM LEAD]"
    : quality === "cold" ? "[COLD LEAD]"
    : quality === "spam" ? "[SPAM]"
    : "[NEW LEAD]";

  const name = contact.name || contact.email;
  const projectType = claudeResult?.projectType && claudeResult.projectType !== "unknown"
    ? claudeResult.projectType.charAt(0).toUpperCase() + claudeResult.projectType.slice(1) + " insulation"
    : contact.serviceType || "Unknown type";

  const location = claudeResult?.locationMentioned
    || geo?.city
    || "";

  const parts = [tag, name, " — ", projectType];
  if (location) parts.push(" \u00B7 ", location);

  return parts.join("");
}

// ---------------------------------------------------------------------------
// Check mark or X mark
// ---------------------------------------------------------------------------

function checkIcon(pass: boolean): string {
  return pass
    ? '<span style="color:#22c55e;">&#10003;</span>'
    : '<span style="color:#ef4444;">&#10007;</span>';
}

// ---------------------------------------------------------------------------
// Build HTML email
// ---------------------------------------------------------------------------

function buildEmailHtml(params: LeadEmailParams): string {
  const { contact, intelligence, geo, claudeResult, botScore } = params;
  const badge = qualityBadge(claudeResult?.leadQuality);

  const phoneFormatted = contact.phone ? formatPhone(contact.phone) : null;
  const timeOnPage = formatDuration(
    intelligence?.timeOnPageMs ?? intelligence?.elapsedMs
  );
  const formTime = formatDuration(intelligence?.timeOnFormMs);
  const firstKey = formatDuration(intelligence?.timeToFirstKeyMs);

  // UA display
  const ua = intelligence?.userAgent ?? "";
  const isMobile = intelligence?.isMobile;
  const deviceLabel = isMobile ? "Mobile" : "Desktop";

  // Browser detection (simple)
  let browserStr = "Unknown";
  if (/Edg\/(\d+)/i.test(ua)) browserStr = `Edge ${ua.match(/Edg\/(\d+)/i)?.[1]}`;
  else if (/Chrome\/(\d+)/i.test(ua) && !/Edg/i.test(ua)) browserStr = `Chrome ${ua.match(/Chrome\/(\d+)/i)?.[1]}`;
  else if (/Firefox\/(\d+)/i.test(ua)) browserStr = `Firefox ${ua.match(/Firefox\/(\d+)/i)?.[1]}`;
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserStr = `Safari`;

  // OS detection
  let osStr = "Unknown";
  if (/Windows NT/i.test(ua)) osStr = "Windows";
  else if (/Mac OS X/i.test(ua)) osStr = "macOS";
  else if (/Android/i.test(ua)) osStr = "Android";
  else if (/iPhone|iPad/i.test(ua)) osStr = "iOS";
  else if (/Linux/i.test(ua)) osStr = "Linux";

  // Screen info
  const screenInfo = intelligence?.screenWidth && intelligence?.screenHeight
    ? `${intelligence.screenWidth}\u00D7${intelligence.screenHeight}`
    : null;
  const hwInfo: string[] = [];
  if (intelligence?.hardwareConcurrency) hwInfo.push(`${intelligence.hardwareConcurrency} cores`);
  if (intelligence?.deviceMemory) hwInfo.push(`${intelligence.deviceMemory}GB RAM`);
  if (screenInfo) hwInfo.push(screenInfo);

  // Referrer source
  let sourceLabel = "Direct visit";
  if (intelligence?.referrer) {
    try {
      const domain = new URL(intelligence.referrer).hostname;
      if (domain.includes("google")) sourceLabel = "Google organic";
      else if (domain.includes("bing")) sourceLabel = "Bing organic";
      else if (domain.includes("linkedin")) sourceLabel = "LinkedIn";
      else if (domain.includes("facebook")) sourceLabel = "Facebook";
      else sourceLabel = domain;
    } catch {
      sourceLabel = "Unknown referrer";
    }
  }

  // Scroll depth
  const scrollDepth = intelligence?.scrollDepthPct !== undefined
    ? `${intelligence.scrollDepthPct}%`
    : "Unknown";

  // Network info
  const networkParts: string[] = [];
  if (geo?.isp) networkParts.push(escapeHtml(geo.isp));
  if (geo?.city && geo?.region) networkParts.push(`${escapeHtml(geo.city)}, ${escapeHtml(geo.region)}`);
  const ipTypeLabel = geo?.ipType ? `(${geo.ipType})` : "";

  // Company verification
  let companyLine = "";
  if (claudeResult?.companyVerified) {
    companyLine = `${checkIcon(true)} Verified &mdash; ${escapeHtml(claudeResult.companyContext || contact.company)}`;
    if (claudeResult.companyVerifySource && claudeResult.companyVerifySource !== "no results") {
      companyLine += `<br/><span style="color:#94a3b8;font-size:12px;">source: ${escapeHtml(claudeResult.companyVerifySource)}</span>`;
    }
  } else if (contact.company) {
    companyLine = `${checkIcon(false)} Not verified &mdash; ${escapeHtml(contact.company)}`;
  } else {
    companyLine = '<span style="color:#94a3b8;">No company provided</span>';
  }

  // Signal tags
  const signalTags: string[] = [];
  if (claudeResult?.projectType && claudeResult.projectType !== "unknown") {
    signalTags.push(claudeResult.projectType.charAt(0).toUpperCase() + claudeResult.projectType.slice(1));
  }
  if (claudeResult?.urgencySignal && claudeResult.urgencySignal !== "exploratory") {
    signalTags.push(claudeResult.urgencySignal.charAt(0).toUpperCase() + claudeResult.urgencySignal.slice(1));
  }
  if (claudeResult?.facilityType && claudeResult.facilityType !== "unknown") {
    signalTags.push(claudeResult.facilityType.charAt(0).toUpperCase() + claudeResult.facilityType.slice(1));
  }
  if (claudeResult?.locationMentioned) {
    signalTags.push(claudeResult.locationMentioned);
  }

  const signalTagsHtml = signalTags.length > 0
    ? signalTags
        .map(
          (t) =>
            `<span style="display:inline-block;background:#1e293b;color:#cbd5e1;padding:2px 8px;border-radius:4px;font-size:12px;margin:2px 4px 2px 0;">${escapeHtml(t)}</span>`
        )
        .join("")
    : '<span style="color:#64748b;">No signals detected</span>';

  // Bot score checks
  const botChecks = [
    {
      pass: botScore < 30,
      label: botScore < 30 ? "Real browser" : "Possible automation",
    },
    {
      pass: claudeResult?.emailDomainType !== "disposable",
      label: claudeResult?.disposableEmail ? "Disposable email" : "Valid email domain",
    },
    {
      pass: !geo?.isDatacenter && !geo?.isVpn && !geo?.isTor,
      label: geo?.isDatacenter ? "Datacenter IP" : geo?.isVpn ? "VPN detected" : geo?.isTor ? "Tor detected" : "Business/residential IP",
    },
    {
      pass: (intelligence?.elapsedMs ?? intelligence?.timeOnPageMs ?? 5000) >= 3000,
      label: (intelligence?.elapsedMs ?? intelligence?.timeOnPageMs ?? 5000) >= 3000 ? "Normal speed" : "Suspiciously fast",
    },
  ];

  const checksHtml = botChecks
    .map((c) => `${checkIcon(c.pass)} ${escapeHtml(c.label)}`)
    .join("&nbsp;&nbsp;&nbsp;&nbsp;");

  // Timestamp
  const now = new Date();
  const timeStr = now.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: intelligence?.timezone || geo?.timezone || "America/Detroit",
    timeZoneName: "short",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- PANEL 1: CONTACT SUBMISSION (forward-safe) -->
<tr><td style="background:#1a1a2e;border:1px solid #2d2d44;border-radius:8px;padding:24px;margin-bottom:16px;">
  <!-- Quality badge -->
  <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
    <td style="background:${badge.bg};border:1px solid ${badge.color};border-radius:20px;padding:4px 14px;">
      <span style="color:${badge.color};font-weight:700;font-size:13px;letter-spacing:0.5px;">&bull; ${badge.label}</span>
    </td>
  </tr></table>

  <!-- Contact details -->
  <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#e2e8f0;">
    <tr><td style="padding:4px 0;color:#94a3b8;width:80px;">Name:</td>
        <td style="padding:4px 0;font-weight:600;">${escapeHtml(contact.name)}</td></tr>
    ${contact.phone ? `<tr><td style="padding:4px 0;color:#94a3b8;">Phone:</td>
        <td style="padding:4px 0;"><a href="tel:${escapeHtml(contact.phone.replace(/\D/g, ""))}" style="color:#60a5fa;text-decoration:none;">${escapeHtml(phoneFormatted || contact.phone)}</a></td></tr>` : ""}
    <tr><td style="padding:4px 0;color:#94a3b8;">Email:</td>
        <td style="padding:4px 0;"><a href="mailto:${escapeHtml(contact.email)}" style="color:#60a5fa;text-decoration:none;">${escapeHtml(contact.email)}</a></td></tr>
    ${contact.company ? `<tr><td style="padding:4px 0;color:#94a3b8;">Company:</td>
        <td style="padding:4px 0;">${escapeHtml(contact.company)}</td></tr>` : ""}
    ${contact.serviceType ? `<tr><td style="padding:4px 0;color:#94a3b8;">Type:</td>
        <td style="padding:4px 0;">${escapeHtml(contact.serviceType)}</td></tr>` : ""}
  </table>

  <!-- Message -->
  <div style="margin-top:16px;">
    <div style="color:#94a3b8;font-size:13px;margin-bottom:6px;">Message:</div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:12px;color:#cbd5e1;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(contact.message)}</div>
  </div>

  <!-- Reply button -->
  <table cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
    <td style="background:#2563eb;border-radius:6px;">
      <a href="mailto:${escapeHtml(contact.email)}?subject=RE: Your RMI inquiry" style="display:inline-block;padding:10px 24px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">Reply to ${escapeHtml(contact.name.split(" ")[0])}</a>
    </td>
  </tr></table>
</td></tr>

<!-- Spacer -->
<tr><td style="height:16px;"></td></tr>

<!-- PANEL 2: INTELLIGENCE (admin only) -->
<tr><td style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:24px;">
  <div style="color:#ef4444;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;border-bottom:1px solid #1e293b;padding-bottom:8px;">ADMIN INTELLIGENCE &mdash; DO NOT FORWARD</div>

  ${claudeResult?.aiSummary ? `
  <!-- AI Summary -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">AI Summary:</div>
    <div style="color:#e2e8f0;font-size:14px;line-height:1.5;font-style:italic;">&ldquo;${escapeHtml(claudeResult.aiSummary)}&rdquo;</div>
  </div>` : ""}

  <!-- Signals -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:6px;">Signals:</div>
    <div>${signalTagsHtml}</div>
  </div>

  <!-- Company -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">Company:</div>
    <div style="color:#e2e8f0;font-size:14px;">${companyLine}</div>
  </div>

  <!-- Network -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">Network:</div>
    <div style="color:#e2e8f0;font-size:14px;">${networkParts.join(" &middot; ") || "Unknown"} ${ipTypeLabel}</div>
  </div>

  <!-- Device -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">Device:</div>
    <div style="color:#e2e8f0;font-size:14px;">${deviceLabel} &middot; ${browserStr} &middot; ${osStr}</div>
    ${hwInfo.length > 0 ? `<div style="color:#94a3b8;font-size:13px;">${hwInfo.join(" &middot; ")}</div>` : ""}
  </div>

  <!-- Behavior -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">Behavior:</div>
    <div style="color:#e2e8f0;font-size:14px;">
      ${timeOnPage} on page &middot; ${scrollDepth} scroll depth<br/>
      First key: ${firstKey} &middot; Form time: ${formTime}<br/>
      Came from: ${escapeHtml(sourceLabel)}
    </div>
  </div>

  <!-- Checks -->
  <div style="margin-bottom:16px;">
    <div style="color:#94a3b8;font-size:12px;font-weight:600;margin-bottom:4px;">Checks:</div>
    <div style="color:#e2e8f0;font-size:14px;">${checksHtml}</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Bot score: ${botScore}/100</div>
  </div>

  <!-- Timestamp -->
  <div style="border-top:1px solid #1e293b;padding-top:8px;margin-top:8px;">
    <div style="color:#94a3b8;font-size:12px;">Submitted: ${escapeHtml(timeStr)}</div>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Send email via Resend
// ---------------------------------------------------------------------------

export async function sendLeadEmail(params: LeadEmailParams): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping lead notification email");
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail = import.meta.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const subject = buildSubjectLine(params.contact, params.claudeResult, params.geo);
  const html = buildEmailHtml(params);

  await resend.emails.send({
    from: fromEmail,
    to: "ggoupille8@gmail.com",
    subject,
    html,
  });
}
