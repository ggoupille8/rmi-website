/**
 * IP geolocation lookup using ip-api.com (free, no API key needed for server-side).
 * Rate limit: 45 requests/minute — more than sufficient for form submissions.
 */

export interface GeoResult {
  country: string;
  state: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
  asn: string;
}

interface IpApiResponse {
  status: string;
  country: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
  as: string;
}

export async function getGeoFromIp(ip: string): Promise<GeoResult | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,zip,lat,lon,isp,org,as`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as IpApiResponse;
    if (data.status !== "success") {
      return null;
    }

    return {
      country: data.country,
      state: data.regionName,
      city: data.city,
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      isp: data.isp,
      org: data.org,
      asn: data.as,
    };
  } catch {
    return null;
  }
}
