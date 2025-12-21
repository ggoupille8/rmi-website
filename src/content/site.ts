/**
 * Centralized site content - single source of truth for all site-wide content
 */

// Company Information
export const companyName = "Resource Mechanical Insulation";
export const companyNameFull = "Resource Mechanical Insulation, LLC";

// Contact Information
export const email = "ggoupille@rmi-llc.net";
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
    title: "Mechanical Piping Insulation",
    anchorId: "piping",
    description:
      "Hot and cold piping insulation for steam, condensate, chilled water, condenser water, refrigerant systems, and condensate drain lines with heat tracing. Installed for performance, personnel protection, and durability across industrial and commercial facilities.",
    systems: ["Steam", "Chilled water", "Refrigerant", "Heat tracing"],
  },
  {
    title: "HVAC & Specialty Duct Insulation",
    anchorId: "duct",
    description:
      "Supply, return, outside air, and exhaust duct insulation installed cleanly and to spec. Built to last in exposed, mechanical-room, and rooftop environments.",
    systems: ["Supply/return", "Outside air", "Exhaust", "Rooftop"],
  },
  {
    title: "Fire-Rated Duct Assemblies",
    anchorId: "fire-rated",
    description:
      "Fire-rated duct systems including grease duct, stair pressurization, and other fire-rated assemblies. Installed by experienced crews to meet code requirements without slowing your schedule.",
    systems: ["Grease duct", "Stair pressurization", "Fire-rated assemblies"],
  },
  {
    title: "Rooftop Duct Jacketing Systems",
    anchorId: "jacketing",
    description:
      "Exterior jacketing systems for rooftop duct and equipment including VentureClad, FlexClad, PVC, aluminum, and other specified systems. Weather-resistant, clean finish, and long-term durability.",
    systems: ["VentureClad", "FlexClad", "PVC", "Aluminum"],
  },
  {
    title: "Fabrication: Inserts, Shields, Pipe Supports",
    anchorId: "supports",
    description:
      "In-house fabrication of inserts, shields, and pipe supports for speed, fit, and consistency. Custom solutions built for strength and thermal performance with quick turnaround times.",
    systems: ["Inserts", "Shields", "Pipe supports", "Custom fabrication"],
  },
  {
    title: "Maintenance, Outages & 24/7 Response",
    anchorId: "247",
    description:
      "Reliable support for ongoing maintenance, shutdowns, and urgent issues. Available 24/7 for emergency response—executed safely, cleanly, and on schedule.",
    systems: ["Maintenance", "Shutdowns", "Emergency response", "24/7"],
  },
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
