/**
 * Lead enrichment & legitimacy scoring.
 *
 * Runs server-side on every new contact submission (non-blocking).
 * Checks email MX records, company website, phone validity,
 * and computes a 0-100 quality score.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
  emailDomain: string | null;
  hasMxRecords: boolean;
  isFreeMail: boolean;
  emailFormat: "professional" | "generic" | "personal" | "suspicious";
  companyWebsiteExists: boolean | null;
  companyWebsiteTitle: string | null;
  phoneValid: boolean;
  phoneAreaCode: string | null;
  phoneRegion: string | null;
  ipOrgMatch: boolean | null;
  legitimacyScore: number;
  quality: "high" | "medium" | "low" | "spam";
}

interface EnrichmentInput {
  email: string;
  phone: string;
  company: string;
  message: string;
  timeOnPageMs: number | null;
  ipOrg: string | null;
  honeypot: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
  "proton.me",
  "live.com",
  "msn.com",
  "ymail.com",
  "zoho.com",
  "gmx.com",
  "fastmail.com",
  "tutanota.com",
  "hey.com",
  "me.com",
  "mac.com",
  "comcast.net",
  "att.net",
  "verizon.net",
  "sbcglobal.net",
  "cox.net",
  "charter.net",
]);

/**
 * US area codes mapped to regions.
 * Covers Michigan area codes and major US metro codes.
 */
const AREA_CODE_REGIONS: Record<string, string> = {
  // Michigan
  "231": "Northern Michigan",
  "248": "Metro Detroit (Oakland County)",
  "269": "Southwest Michigan",
  "313": "Detroit",
  "517": "Lansing / Central Michigan",
  "586": "Metro Detroit (Macomb County)",
  "616": "Grand Rapids / West Michigan",
  "734": "Metro Detroit (Ann Arbor / Downriver)",
  "810": "Flint / Eastern Michigan",
  "906": "Upper Peninsula",
  "947": "Metro Detroit (Oakland County)",
  "989": "Central Michigan",
  // Ohio (nearby)
  "216": "Cleveland, OH",
  "419": "Toledo, OH",
  "440": "Cleveland suburbs, OH",
  "513": "Cincinnati, OH",
  "614": "Columbus, OH",
  "330": "Akron, OH",
  // Indiana (nearby)
  "219": "Northwest Indiana",
  "317": "Indianapolis, IN",
  "574": "South Bend, IN",
  "260": "Fort Wayne, IN",
  // Common US
  "212": "New York, NY",
  "310": "Los Angeles, CA",
  "312": "Chicago, IL",
  "404": "Atlanta, GA",
  "415": "San Francisco, CA",
  "469": "Dallas, TX",
  "602": "Phoenix, AZ",
  "713": "Houston, TX",
  "786": "Miami, FL",
  "832": "Houston, TX",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if the email domain has valid MX records via Google DNS.
 * Free, no API key, fast.
 */
async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = (await res.json()) as { Status: number; Answer?: unknown[] };
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a company website exists (HEAD request with timeout).
 * Returns the page title if possible.
 */
async function checkCompanyWebsite(
  domain: string
): Promise<{ exists: boolean; title: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${domain}`, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RMI-LeadCheck/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { exists: false, title: null };
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim().slice(0, 100) || null;
    return { exists: true, title };
  } catch {
    return { exists: false, title: null };
  }
}

/**
 * Classify the email format for quality signals.
 */
function classifyEmailFormat(
  localPart: string,
  _isFreeMail: boolean
): EnrichmentResult["emailFormat"] {
  // Known generic prefixes
  const genericPrefixes = [
    "info",
    "admin",
    "office",
    "contact",
    "sales",
    "support",
    "hello",
    "help",
    "general",
    "billing",
    "team",
    "service",
    "noreply",
    "no-reply",
  ];
  if (genericPrefixes.includes(localPart.toLowerCase())) return "generic";

  // Professional: firstname.lastname or first_last pattern
  if (/^[a-z]+[._][a-z]+$/i.test(localPart)) return "professional";

  // Suspicious: very short, all numbers, or random-looking
  if (localPart.length <= 2) return "suspicious";
  if (/^\d+$/.test(localPart)) return "suspicious";
  if (/^[a-z]{1,2}\d{3,}$/i.test(localPart)) return "suspicious";

  return "personal";
}

/**
 * Validate US phone number and extract area code info.
 */
function validatePhone(phone: string): {
  valid: boolean;
  areaCode: string | null;
  region: string | null;
} {
  if (!phone) return { valid: false, areaCode: null, region: null };
  const digits = phone.replace(/\D/g, "");
  // 10 digits or 11 starting with 1
  const normalized =
    digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (normalized.length !== 10) {
    return { valid: false, areaCode: null, region: null };
  }
  const areaCode = normalized.slice(0, 3);
  const region = AREA_CODE_REGIONS[areaCode] || null;
  return { valid: true, areaCode, region };
}

// ---------------------------------------------------------------------------
// Main enrichment function
// ---------------------------------------------------------------------------

export async function enrichLead(input: EnrichmentInput): Promise<EnrichmentResult> {
  // Honeypot triggered — instant spam
  if (input.honeypot) {
    return {
      emailDomain: null,
      hasMxRecords: false,
      isFreeMail: false,
      emailFormat: "suspicious",
      companyWebsiteExists: null,
      companyWebsiteTitle: null,
      phoneValid: false,
      phoneAreaCode: null,
      phoneRegion: null,
      ipOrgMatch: null,
      legitimacyScore: 0,
      quality: "spam",
    };
  }

  // Extract email domain
  const emailParts = input.email.split("@");
  const emailDomain = emailParts.length === 2 ? emailParts[1].toLowerCase() : null;
  const localPart = emailParts.length === 2 ? emailParts[0] : "";

  const isFreeMail = emailDomain ? FREE_MAIL_DOMAINS.has(emailDomain) : false;
  const emailFormat = classifyEmailFormat(localPart, isFreeMail);

  // Run async checks in parallel
  const mxPromise = emailDomain ? checkMxRecords(emailDomain) : Promise.resolve(false);
  const websitePromise =
    emailDomain && !isFreeMail
      ? checkCompanyWebsite(emailDomain)
      : Promise.resolve(null);

  const [hasMxRecords, websiteResult] = await Promise.all([
    mxPromise,
    websitePromise,
  ]);

  const companyWebsiteExists = websiteResult?.exists ?? null;
  const companyWebsiteTitle = websiteResult?.title ?? null;

  // Phone validation
  const phoneResult = validatePhone(input.phone);

  // IP org match check
  let ipOrgMatch: boolean | null = null;
  if (input.ipOrg && input.company) {
    const orgLower = input.ipOrg.toLowerCase();
    const companyLower = input.company.toLowerCase();
    // Check for substring match in either direction
    ipOrgMatch =
      orgLower.includes(companyLower) || companyLower.includes(orgLower);
  }

  // ---------------------------------------------------------------------------
  // Legitimacy score computation
  // ---------------------------------------------------------------------------
  let score = 50;

  // Email signals
  if (hasMxRecords) score += 10;
  if (!isFreeMail) score += 15;
  if (emailFormat === "professional") score += 10;
  if (companyWebsiteExists) score += 10;

  // Form signals
  if (input.phone && phoneResult.valid) score += 10;
  if (input.company.trim().length > 0) score += 5;
  if (input.message.length > 100) score += 5;
  if (input.timeOnPageMs !== null && input.timeOnPageMs > 30000) score += 5;

  // Red flags
  if (isFreeMail && !input.phone) score -= 10;
  if (input.message.length < 20) score -= 15;
  if (input.timeOnPageMs !== null && input.timeOnPageMs < 5000) score -= 10;

  // IP org match bonus
  if (ipOrgMatch === true) score += 5;

  // Cap at 0-100
  score = Math.max(0, Math.min(100, score));

  const quality: EnrichmentResult["quality"] =
    score >= 75 ? "high" : score >= 50 ? "medium" : score >= 25 ? "low" : "spam";

  return {
    emailDomain,
    hasMxRecords,
    isFreeMail,
    emailFormat,
    companyWebsiteExists,
    companyWebsiteTitle,
    phoneValid: phoneResult.valid,
    phoneAreaCode: phoneResult.areaCode,
    phoneRegion: phoneResult.region,
    ipOrgMatch,
    legitimacyScore: score,
    quality,
  };
}
