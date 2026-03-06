/**
 * IP geolocation lookup using ipapi.co (free tier: 1,000 calls/day).
 * Returns enriched geo + network data for lead intelligence.
 *
 * - 3-second timeout — never blocks enrichment pipeline
 * - Module-level cache to avoid duplicate lookups within same server instance
 * - Skips private/loopback IPs immediately
 */

export interface GeoResult {
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  postal: string | null;
  isp: string | null;
  org: string | null;
  asn: string | null;
  ipType: "residential" | "business" | "mobile" | "datacenter" | "vpn" | "tor" | "unknown";
  isVpn: boolean;
  isDatacenter: boolean;
  isTor: boolean;
}

interface IpApiCoResponse {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
  asn: string;
  // ipapi.co doesn't provide ISP directly — org is the closest
  // Threat detection fields (available on paid plan, gracefully handle absence)
  threat?: {
    is_tor?: boolean;
    is_proxy?: boolean;
    is_datacenter?: boolean;
    is_anonymous?: boolean;
  };
  error?: boolean;
  reason?: string;
}

// Module-level cache: IP -> GeoResult
const geoCache = new Map<string, GeoResult>();

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^fc00:/,
  /^fe80:/,
  /^fd/,
];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

function classifyIpType(
  org: string,
  threat: IpApiCoResponse["threat"]
): GeoResult["ipType"] {
  if (threat?.is_tor) return "tor";
  if (threat?.is_datacenter) return "datacenter";
  if (threat?.is_proxy || threat?.is_anonymous) return "vpn";

  const orgLower = (org || "").toLowerCase();

  // Datacenter indicators
  const dcKeywords = [
    "amazon", "aws", "google cloud", "microsoft azure", "digitalocean",
    "linode", "vultr", "hetzner", "ovh", "cloudflare", "fastly",
    "akamai", "oracle cloud", "ibm cloud", "rackspace",
  ];
  if (dcKeywords.some((kw) => orgLower.includes(kw))) return "datacenter";

  // VPN/proxy indicators
  const vpnKeywords = [
    "vpn", "proxy", "private internet", "mullvad", "nordvpn",
    "expressvpn", "surfshark", "cyberghost", "proton vpn",
  ];
  if (vpnKeywords.some((kw) => orgLower.includes(kw))) return "vpn";

  // Mobile carriers
  const mobileKeywords = [
    "t-mobile", "verizon wireless", "at&t mobility", "sprint",
    "cricket", "boost mobile", "metro by t-mobile", "us cellular",
  ];
  if (mobileKeywords.some((kw) => orgLower.includes(kw))) return "mobile";

  // Business indicators (ISP org often reveals corporate networks)
  const businessKeywords = [
    "inc", "corp", "llc", "ltd", "company", "group", "industries",
    "manufacturing", "hospital", "university", "college", "school",
    "government", "county", "city of", "state of",
  ];
  if (businessKeywords.some((kw) => orgLower.includes(kw))) return "business";

  return "residential";
}

export async function getGeoData(ip: string): Promise<GeoResult | null> {
  if (!ip || ip === "unknown" || isPrivateIp(ip)) {
    return null;
  }

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "RMI-LeadPipeline/1.0" },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as IpApiCoResponse;
    if (data.error) {
      return null;
    }

    const ipType = classifyIpType(data.org, data.threat);

    const result: GeoResult = {
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
      lat: data.latitude ?? null,
      lng: data.longitude ?? null,
      timezone: data.timezone || null,
      postal: data.postal || null,
      isp: data.org || null, // ipapi.co uses org for ISP info
      org: data.org || null,
      asn: data.asn || null,
      ipType,
      isVpn: ipType === "vpn",
      isDatacenter: ipType === "datacenter",
      isTor: ipType === "tor",
    };

    // Cache the result
    geoCache.set(ip, result);

    return result;
  } catch {
    return null;
  }
}
