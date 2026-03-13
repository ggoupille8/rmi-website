/**
 * Seed script: populate logo columns on clients table from hardcoded showcase data.
 *
 * Usage:
 *   npx tsx scripts/seed-client-logos.ts
 *
 * Idempotent — safe to re-run. Matches by client name (case-insensitive).
 * If a client doesn't exist in the DB yet, it will be created as active + featured.
 */

import { sql } from "@vercel/postgres";

interface LogoSeed {
  name: string;
  logo_url: string;
  logo_type: "svg";
  needs_invert: boolean;
  display_scale: number;
}

// Extracted from the current hardcoded ClientShowcase.tsx
const HARDCODED_LOGOS: LogoSeed[] = [
  { name: "Ford Motor Company", logo_url: "/images/clients/ford.svg", logo_type: "svg", needs_invert: false, display_scale: 2.4 },
  { name: "General Motors", logo_url: "/images/clients/generalmotors.svg", logo_type: "svg", needs_invert: false, display_scale: 1.4 },
  { name: "Toyota", logo_url: "/images/clients/toyota.svg", logo_type: "svg", needs_invert: false, display_scale: 1.7 },
  { name: "Stellantis", logo_url: "/images/clients/stellantis.svg", logo_type: "svg", needs_invert: true, display_scale: 1.0 },
  { name: "Apple", logo_url: "/images/clients/apple.svg", logo_type: "svg", needs_invert: false, display_scale: 1.4 },
  { name: "Amazon", logo_url: "/images/clients/amazon.svg", logo_type: "svg", needs_invert: true, display_scale: 0.8 },
  { name: "FedEx", logo_url: "/images/clients/fedex.svg", logo_type: "svg", needs_invert: false, display_scale: 3.2 },
  { name: "Delta Air Lines", logo_url: "/images/clients/delta.svg", logo_type: "svg", needs_invert: false, display_scale: 3.0 },
  { name: "BMW", logo_url: "/images/clients/bmw.svg", logo_type: "svg", needs_invert: false, display_scale: 1.8 },
  { name: "BASF", logo_url: "/images/clients/basf.svg", logo_type: "svg", needs_invert: true, display_scale: 0.8 },
  { name: "Flagstar Bank", logo_url: "/images/clients/flagstar.svg", logo_type: "svg", needs_invert: true, display_scale: 0.8 },
  { name: "Verizon", logo_url: "/images/clients/verizon.svg", logo_type: "svg", needs_invert: false, display_scale: 0.8 },
  { name: "Rocket Mortgage", logo_url: "/images/clients/rocket.svg", logo_type: "svg", needs_invert: false, display_scale: 1.9 },
  { name: "CBRE", logo_url: "/images/clients/cbre.svg", logo_type: "svg", needs_invert: false, display_scale: 0.8 },
  { name: "University of Michigan", logo_url: "/images/clients/michigan.svg", logo_type: "svg", needs_invert: false, display_scale: 1.5 },
  { name: "Meijer", logo_url: "/images/clients/meijer.svg", logo_type: "svg", needs_invert: false, display_scale: 1.1 },
  { name: "Babcock & Wilcox", logo_url: "/images/clients/babcock-wilcox.svg", logo_type: "svg", needs_invert: false, display_scale: 1.0 },
  { name: "Nissan", logo_url: "/images/clients/nissan.svg", logo_type: "svg", needs_invert: false, display_scale: 2.0 },
  { name: "Target", logo_url: "/images/clients/target.svg", logo_type: "svg", needs_invert: true, display_scale: 0.8 },
  { name: "Cadillac", logo_url: "/images/clients/cadillac.svg", logo_type: "svg", needs_invert: false, display_scale: 3.0 },
  { name: "Starbucks", logo_url: "/images/clients/starbucks.svg", logo_type: "svg", needs_invert: false, display_scale: 1.6 },
  { name: "Consumers Energy", logo_url: "/images/clients/consumers-energy.svg", logo_type: "svg", needs_invert: false, display_scale: 0.8 },
  { name: "Shake Shack", logo_url: "/images/clients/shake-shack.svg", logo_type: "svg", needs_invert: true, display_scale: 1.2 },
  { name: "Five Below", logo_url: "/images/clients/five-below.svg", logo_type: "svg", needs_invert: true, display_scale: 1.0 },
  { name: "Ascension Health", logo_url: "/images/clients/ascension.svg", logo_type: "svg", needs_invert: false, display_scale: 1.0 },
  { name: "Culver's", logo_url: "/images/clients/culvers.svg", logo_type: "svg", needs_invert: false, display_scale: 1.0 },
  { name: "Eastern Michigan University", logo_url: "/images/clients/eastern-michigan.svg", logo_type: "svg", needs_invert: false, display_scale: 1.6 },
  { name: "Mercedes-Benz", logo_url: "/images/clients/mercedes-benz.svg", logo_type: "svg", needs_invert: false, display_scale: 1.0 },
  { name: "Audi", logo_url: "/images/clients/audi.svg", logo_type: "svg", needs_invert: false, display_scale: 1.5 },
  { name: "Edward Jones", logo_url: "/images/clients/edward-jones.svg", logo_type: "svg", needs_invert: false, display_scale: 1.2 },
];

async function seed() {
  console.log(`Seeding ${HARDCODED_LOGOS.length} client logos...`);
  let updated = 0;
  let created = 0;

  for (const logo of HARDCODED_LOGOS) {
    // Try to match by name (case-insensitive)
    const existing = await sql`
      SELECT id FROM clients WHERE LOWER(name) = LOWER(${logo.name})
    `;

    if (existing.rows.length > 0) {
      // Update existing record
      const id = existing.rows[0].id as number;
      await sql`
        UPDATE clients SET
          logo_url = ${logo.logo_url},
          logo_type = ${logo.logo_type},
          is_featured = TRUE,
          display_scale = ${logo.display_scale},
          needs_invert = ${logo.needs_invert},
          updated_at = NOW()
        WHERE id = ${id}
      `;
      console.log(`  Updated: ${logo.name} (id=${id})`);
      updated++;
    } else {
      // Create new client record
      const domain = logo.name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
      await sql`
        INSERT INTO clients (name, domain, color, description, seo_value, logo_url, logo_type, is_featured, display_scale, needs_invert, active, sort_order)
        VALUES (${logo.name}, ${domain}, '#0066CC', '', 70, ${logo.logo_url}, ${logo.logo_type}, TRUE, ${logo.display_scale}, ${logo.needs_invert}, TRUE, 0)
      `;
      console.log(`  Created: ${logo.name}`);
      created++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${created} created.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
