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

// Service Area
export const serviceArea = "Michigan and surrounding areas.";

// Hero Content
export const heroEyebrow = undefined; // Optional eyebrow text
export const heroHeadline = "Resource Mechanical Insulation";
export const heroSubheadline =
  "Serving Michigan and surrounding areas with mechanical insulation for piping, ductwork, equipment, and specialty applications across commercial and industrial environments—focused on professional installs and safety-driven practices.";
export const heroCtaPrimary = "Request a Quote";
export const heroCtaSecondary = phoneDisplay;

// Services Data
export interface ServiceData {
  title: string;
  description: string;
  anchorId: string;
  systems?: string[]; // Systems covered list (Pattern A)
}

export const services: ServiceData[] = [
  {
    title: "Mechanical Piping",
    anchorId: "piping",
    description:
      "Hot and cold piping insulation for steam, chilled water, refrigerant, and heat tracing systems.",
  },
  {
    title: "HVAC Duct Insulation",
    anchorId: "duct",
    description:
      "Supply, return, outside air, and exhaust duct insulation for commercial and industrial facilities.",
  },
  {
    title: "Fire-Rated Assemblies",
    anchorId: "fire-rated",
    description:
      "Grease duct, stair pressurization, and fire-rated duct systems installed to code.",
  },
  {
    title: "Outdoor Jacketing",
    anchorId: "jacketing",
    description:
      "Exterior jacketing systems including VentureClad, FlexClad, PVC, and aluminum.",
  },
  {
    title: "Pipe Supports & Fabrication",
    anchorId: "supports",
    description:
      "In-house fabrication of pipe supports with quick turnaround.",
  },
  {
    title: "24/7 Emergency Response",
    anchorId: "247",
    description:
      "Maintenance, shutdowns, and urgent issues—available around the clock.",
  },
  {
    title: "Tank & Vessel Insulation",
    anchorId: "tanks",
    description:
      "Hot and cold tank insulation for process vessels, storage tanks, and equipment.",
  },
  {
    title: "Removable Blankets",
    anchorId: "blankets",
    description:
      "Custom removable insulation blankets for valves, flanges, and equipment requiring access.",
  },
  {
    title: "Cryogenic Insulation",
    anchorId: "cryogenic",
    description:
      "Specialized insulation for LNG, nitrogen, oxygen, and other cryogenic piping and equipment.",
  },
];

// Value Propositions (4-column grid)
export interface ValueProp {
  icon: string;
  title: string;
  description: string;
}

export const valueProps: ValueProp[] = [
  {
    icon: "Building2",
    title: "Industry Leaders Trust Us",
    description: "Serving top-tier clients including Apple, Ford, Rivian, and Cartier.",
  },
  {
    icon: "Target",
    title: "Precision Engineering",
    description: "Exacting standards for thermal performance and energy efficiency.",
  },
  {
    icon: "ShieldCheck",
    title: "Safety-Driven Execution",
    description: "OSHA-compliant crews with impeccable jobsite safety records.",
  },
  {
    icon: "Wrench",
    title: "Custom Fabrication",
    description: "In-house manufacturing of inserts, shields, and pipe supports.",
  },
];

// Stats/Metrics
export interface Stat {
  value: string;
  label: string;
}

export const stats: Stat[] = [
  { value: "150+", label: "Years Combined Experience" },
  { value: "500+", label: "Projects Annually" },
  { value: "74K+", label: "OSHA Man-Hours" },
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
export const oshaLastYear = oshaYears[oshaYears.length - 1];
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

// =============================================================================
// HERO ANIMATED STATS
// These are the stats displayed with counting animation in the hero
// =============================================================================
export interface HeroStat {
  endValue: number;
  suffix: string;
  label: string;
}

export const heroStats: HeroStat[] = [
  { endValue: 100, suffix: "+", label: "Clients" },
  { endValue: 500, suffix: "+", label: "Projects Annually" },
  { endValue: totalOshaManHours, suffix: "", label: `OSHA Man-Hours (${oshaYearRange})` },
];

// Materials
export const materials = [
  "Fiberglass",
  "Mineral wool",
  "Flexible elastomeric",
  "Polyiso foam / Phenolic foam",
  "Phenolic",
  "Cellular glass (FOAMGLAS®)",
  "Calcium silicate",
  "Ceramic fiber",
  "Aerogel",
  "Fyrewrap® / fire-rated wrap systems",
  "Removable insulation blankets",
  "PVC jacketing",
  "VentureClad® jacketing",
  "Aluminum jacketing",
  "Stainless steel jacketing",
  "PVC fittings",
  "Aluminum fittings",
  "Stainless steel fittings",
  "Acoustic control (mass loaded vinyl, lead-free)",
  "Pipe supports",
  "Banding systems",
  "Mastics, tapes, and sundries",
] as const;
