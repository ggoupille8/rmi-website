/**
 * Centralized site content - single source of truth for all site-wide content
 */

// Company Information
export const companyName = "Resource Mechanical Insulation";
export const companyNameFull = "Resource Mechanical Insulation, LLC";

// Contact Information
export const email = "fab@rmi-llc.net";
export const phone = "419-705-6153";
export const phoneE164 = "+14197056153";
export const phoneTel = `tel:${phoneE164}`;
export const phoneDisplay = phone; // Display format same as phone

// Address
export const address = {
  street: "11677 Wayne Road, Suite 112",
  city: "Romulus",
  state: "MI",
  zip: "48174",
  full: "11677 Wayne Road, Suite 112, Romulus, MI 48174",
} as const;

// SEO / Meta
export const siteTitle = `${companyName} | Insulation Contractors MI`;
export const siteDescription =
  "Professional mechanical insulation for piping, ductwork, tanks, and equipment. Hot, cold, and cryogenic applications. Serving Michigan from Romulus, MI.";

// Hero Content
export const heroHeadline = "Resource Mechanical Insulation";
export const heroTagline = "Commercial & Industrial Insulation Experts";

// Section Subtitles
export const servicesSubtitle =
  "Comprehensive mechanical insulation services for commercial and industrial facilities. From routine maintenance to emergency response and custom fabrication \u2014 we handle every insulation need.";
export const footerDescription =
  "Professional mechanical insulation services for commercial and industrial environments.";

// CTA Banner Content
export const ctaBannerHeading = "READY TO START YOUR INSULATION PROJECT?";
export const ctaBannerSubtitle =
  "Share your project details and receive a detailed quote within 48 hours\u2014or call for immediate assessment on urgent jobs.";
export const ctaBannerButton = "Request a Quote";

// Services Data
export interface ServiceData {
  title: string;
  description: string;
  anchorId: string;
  tag?: string; // e.g., "Core Service", "Specialized", "24/7 Available"
  tier: "core" | "specialty" | "additional";
  systems?: string[]; // Systems covered list (Pattern A)
}

export const services: ServiceData[] = [
  {
    title: "Pipe Insulation",
    anchorId: "piping",
    tag: "Core Service",
    tier: "core",
    description:
      "Professional pipe insulation for hot and cold piping applications including steam, chilled water, refrigerant, and heat-trace systems. We provide burn protection, energy efficiency, and freeze protection for HVAC piping, plumbing lines, and industrial process piping in commercial and industrial facilities.",
  },
  {
    title: "Duct Insulation",
    anchorId: "duct",
    tag: "Core Service",
    tier: "core",
    description:
      "Supply, return, and outside air duct insulation including roof curb infills for sound protection under rooftop air handling units, plus specialty applications like quench vent, plenum wrap, fire-wrap, ceramic fiber, sound-lagging, and acoustic insulation. Our duct insulation services reduce energy loss, control condensation, maintain air quality, and improve system efficiency across manufacturing facilities, data centers, and commercial buildings.",
  },
  {
    title: "Tanks, Vessels, & Equipment Insulation",
    anchorId: "tanks",
    tag: "Core Service",
    tier: "core",
    description:
      "Thermal insulation solutions for process vessels, storage tanks, and industrial equipment. We maintain optimal operating temperatures, reduce heat loss, protect personnel from hot and cold surfaces, and extend equipment lifespan. Perfect for manufacturing, food & beverage, pharmaceutical, and energy production facilities.",
  },
  {
    title: "Removable Insulation Blankets",
    anchorId: "blankets",
    tag: "Core Service",
    tier: "core",
    description:
      "Custom removable insulation blankets for valves, flanges, equipment access points, and seasonal applications. Our removable blankets maintain thermal performance and energy efficiency while preserving maintenance access and equipment flexibility — ideal for temporary insulation needs and equipment that requires frequent access.",
  },
  {
    title: "Field-Applied Jacketing",
    anchorId: "jacketing",
    tag: "Specialty",
    tier: "specialty",
    description:
      "Interior and exterior jacketing systems in VentureClad, FlexClad, PVC, aluminum, and stainless steel. Our field-applied jacketing protects insulation from weather, UV exposure, chemical spray, and physical damage — extending system life and performance in outdoor installations and harsh industrial environments subject to moisture, chemicals, or frequent washdowns.",
  },
  {
    title: "Pipe Supports & Fabrication",
    anchorId: "supports",
    tag: "Specialty",
    tier: "specialty",
    description:
      "In-house fabricated pipe supports and hangers with fast turnaround times. We design, fabricate, and deliver custom pipe supports that reduce lead times, keep your projects on schedule, and meet all structural and code requirements for commercial and industrial piping systems.",
  },
  {
    title: "Plan & Specification / Bid Work",
    anchorId: "ps-bid",
    tag: "Specialty",
    tier: "specialty",
    description:
      "Weekly plan & specification bidding and estimation services for commercial and industrial insulation projects. We review customer bid lists weekly, quoting most jobs and working to quote every opportunity we can. Our estimating and technical coordination streamline your project planning and ensure seamless execution from bid to completion.",
  },
  {
    title: "Material Sales",
    anchorId: "materials",
    tag: "Additional",
    tier: "additional",
    description:
      "Bulk insulation materials including foam pipe insulation, fiberglass batts, specialty blankets, and jacketing materials. We supply contractors, facility managers, and OEMs with high-quality insulation products available for local pickup or direct-to-job delivery with technical support and installation guidance.",
  },
  {
    title: "24/7 Emergency Response",
    anchorId: "247",
    tag: "Additional",
    tier: "additional",
    description:
      "Around-the-clock emergency insulation repair and outage support. We mobilize crews immediately for pipe failures, emergency breaks, facility shutdowns, and production-critical issues. Our rapid-response teams minimize downtime and keep your operations running with professional emergency insulation services available 7 days a week.",
  },
];

// =============================================================================
// OSHA MAN-HOURS DATA
// Source: Annual OSHA reporting records
// To add a new year: Add entry to oshaManHoursByYear, total auto-calculates
// =============================================================================
export const oshaManHoursByYear: Record<number, number> = {
  2021: 23848,
  2022: 60088,
  2023: 73803,
  2024: 74014,
  // Add new years here as data becomes available:
  // 2025: XXXXX,
};

// Calculated total - automatically sums all years
export const totalOshaManHours = Object.values(oshaManHoursByYear).reduce(
  (sum, hours) => sum + hours,
  0
);

// Get the year range from the data (e.g., "2021-2024" or "Since 2021")
const oshaYears = Object.keys(oshaManHoursByYear).map(Number).sort((a, b) => a - b);
export const oshaFirstYear = oshaYears[0];
export const oshaYearRange = `Since ${oshaFirstYear}`;
// Alternative format: `${oshaFirstYear}-${oshaLastYear}`

// Helper to format large numbers (e.g., 231753 -> "231K+")
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${Math.floor(num / 1000000)}M+`;
  }
  if (num >= 1000) {
    return `${Math.floor(num / 1000)}K+`;
  }
  return `${num}+`;
};

// Prose-friendly formatter (e.g., 231753 -> "231,000") — for use in body copy
export const formatLargeNumberProse = (num: number): string => {
  const rounded = Math.floor(num / 1000) * 1000;
  return rounded.toLocaleString("en-US");
};

// =============================================================================
// HERO ANIMATED STATS
// These are the stats displayed with counting animation in the hero
// =============================================================================
export interface HeroStat {
  endValue: number;
  suffix: string;
  label: string;
  shortLabel?: string; // Shown on mobile when label is too long
}

export const heroStats: HeroStat[] = [
  { endValue: 100, suffix: "+", label: "Clients" },
  { endValue: 500, suffix: "+", label: "Projects Annually", shortLabel: "Projects / Yr" },
  { endValue: totalOshaManHours, suffix: "", label: "OSHA Man-Hours", shortLabel: "OSHA Hours" },
];

// Project Highlights (placeholder images — swap with real project photos later)
export interface ProjectHighlight {
  title: string;
  description: string;
  image: string;
  alt: string;
}

export const projectHighlights: ProjectHighlight[] = [
  {
    title: "Henry Ford Hospital — Detroit",
    description: "Our team maintains a year-round presence across Henry Ford Hospital's Detroit campus, providing insulation services, material supply, and pipe support fabrication across multiple buildings. With crews available seven days a week and insulators who have spent the better part of their careers on-site, we deliver the continuity and institutional knowledge that complex healthcare facilities demand.",
    image: "/images/projects/henry-ford-hospital",
    alt: "Mechanical insulation work at Henry Ford Hospital in Detroit",
  },
  {
    title: "Michigan Central Station — Detroit",
    description: "We were part of the subcontractor team on Ford Motor Company's landmark six-year restoration of Michigan Central Station — one of the most ambitious preservation projects in Detroit's history. Our crews contributed insulation work throughout the historic Beaux-Arts building, and we remain on-site today supporting the ongoing buildout of the hotel and additional spaces within the station.",
    image: "/images/projects/michigan-central-station",
    alt: "Insulation work at Michigan Central Station in Detroit",
  },
  {
    title: "Ford World Headquarters — Dearborn",
    description: "From the ground up, we contributed to the construction of Ford's new Henry Ford II World Center in Dearborn — a state-of-the-art campus replacing the iconic Glass House. This multi-year, multi-million dollar project included insulation services and pipe supports from our fabrication team, helping build the next generation of Ford's global headquarters.",
    image: "/images/projects/ford-hub-dearborn",
    alt: "Insulation and pipe support fabrication at Ford World Headquarters in Dearborn",
  },
];

// Materials
export const materials = [
  "Fiberglass",
  "Mineral Wool",
  "Flexible Elastomeric",
  "Polyiso Foam / Phenolic Foam",
  "Phenolic",
  "Cellular Glass (FOAMGLAS®)",
  "Calcium Silicate",
  "Ceramic Fiber",
  "Aerogel",
  "Fyrewrap® / Fire-Rated Wrap Systems",
  "Removable Insulation Blankets",
  "PVC Jacketing",
  "VentureClad® Jacketing",
  "Aluminum Jacketing",
  "Stainless Steel Jacketing",
  "PVC Fittings",
  "Aluminum Fittings",
  "Stainless Steel Fittings",
  "Acoustic Control (Mass Loaded Vinyl, Lead-Free)",
  "Pipe Supports",
  "Banding Systems",
  "Mastics, Tapes, and Sundries",
] as const;
