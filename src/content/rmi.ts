// Re-export from centralized content
import { email, phone, serviceArea } from "./site";

export const RMI_CONTACT = {
  email,
  phone,
  locationShort: serviceArea.replace(/\.$/, ""), // Remove trailing period for locationShort
} as const;

export interface Stat {
  label: string;
  value: string;
}

export const RMI_STATS: Stat[] = [
  { label: "Hours worked (2021)", value: "23,848" },
  { label: "Hours worked (2022)", value: "57,621" },
  { label: "Hours worked (2023)", value: "73,803" },
  { label: "Hours worked (2024)", value: "74,014" },
];

export const RMI_SERVICE_CHIPS: string[] = [
  serviceArea.replace(/\.$/, ""), // Use centralized serviceArea
  "24/7 response",
  "Fire-rated assemblies",
  "In-house fabrication",
];

// Re-export ServiceData and services from centralized content
export type { ServiceData } from "./site";
export { services as RMI_SERVICES } from "./site";
