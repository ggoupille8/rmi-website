/**
 * Normalize customer names from jobs_master into canonical customers + aliases.
 * Must run AFTER import-job-master.ts.
 *
 * Usage: npx tsx scripts/normalize-customers.ts
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Load .env.local ───

function loadEnv(): void {
  const envPath = resolve(ROOT, ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: No POSTGRES_URL or DATABASE_URL found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ─── Customer normalization map ───

const CUSTOMER_MAP: Record<string, string> = {
  // John E. Green cluster
  "John E. Green": "John E. Green Company",
  "John E. Green Company Company": "John E. Green Company",
  "JE Green": "John E. Green Company",
  "JEG AA": "John E. Green Company",
  "JEG HP": "John E. Green Company",

  // Goyette cluster
  "Goyette": "Goyette Mechanical",

  // Ken Cooks cluster
  "Ken Cook": "Ken Cooks Plumbing",
  "Ken Cook Plumbing": "Ken Cooks Plumbing",
  "Ken Cook's Plumbing": "Ken Cooks Plumbing",

  // Ecker cluster
  "Ecker": "Ecker Mechanical",

  // Monroe Plumbing cluster
  "Monroe Plumbing": "Monroe Plumbing & Heating",
  "Monroe Plumbing & Heating, Inc.": "Monroe Plumbing & Heating",

  // Johnson & Wood cluster
  "Johnson & Wood, LLC": "Johnson & Wood",
  "J&W": "Johnson & Wood",

  // Al Walk cluster
  "Al Walk": "Al Walk Plumbing",

  // CMR cluster
  "CMR": "CMR Mechanical",

  // Alliance cluster
  "Alliance Mechanical Mechanical": "Alliance Mechanical",
  "Allience Mechanical": "Alliance Mechanical",

  // Erie Welding cluster
  "Erie Welding": "Erie Welding & Mechanical",
  "Erie Welding & Mech.": "Erie Welding & Mechanical",
  "Erie Welding Mechanical": "Erie Welding & Mechanical",
  "Erie Welding Welding": "Erie Welding & Mechanical",

  // Bumler cluster
  "Bumler": "Bumler Mechanical",

  // Long cluster
  "Long": "Long Mechanical",

  // Pipeline cluster
  "Pipeline": "Pipeline Plumbing",
  "Pipeline Plumbing LLC": "Pipeline Plumbing",

  // S&Z cluster
  "S&Z": "S&Z Sheetmetal",

  // Progressive cluster
  "Progressive": "Progressive Mechanical",
  "Progressive Mech.": "Progressive Mechanical",

  // Mid American cluster
  "Mid American": "Mid American Group",

  // John Darr cluster
  "John Darr": "John Darr Mechanical",
  "John Darr Mechanical Mechanical": "John Darr Mechanical",

  // Hoyt Brumm cluster
  "Hoyt Brumm and Linc": "Hoyt Brumm & Link",
  "Hoyt Brumm and Link": "Hoyt Brumm & Link",
  "HBL": "Hoyt Brumm & Link",

  // Sylvan cluster
  "Sylvan, Inc. Inc.": "Sylvan, Inc.",

  // Campbell cluster
  "Campbell Inc": "Campbell Mechanical",

  // Macomb cluster
  "Macomb Mechanical Mechanical": "Macomb Mechanical",

  // Advantage cluster
  "Advantage": "Advantage Mechanical",

  // Babcock cluster
  "Babcock and Wilcox": "Babcock & Wilcox",

  // Detroit Piping cluster
  "Detroit Pipe Group": "Detroit Piping Group",
  "DPG": "Detroit Piping Group",

  // UM cluster
  "UM": "University of Michigan",
  "UofM": "University of Michigan",

  // WJO cluster
  "WJO": "W.J. O'Neil",
  "WJ Oneil": "W.J. O'Neil",
};

// Short codes for common customers
const SHORT_CODES: Record<string, string> = {
  "John E. Green Company": "JEG",
  "Ken Cooks Plumbing": "KCP",
  "Johnson & Wood": "J&W",
  "CMR Mechanical": "CMR",
  "Alliance Mechanical": "AM",
  "Erie Welding & Mechanical": "EWM",
  "Pipeline Plumbing": "PP",
  "S&Z Sheetmetal": "S&Z",
  "Progressive Mechanical": "PM",
  "Hoyt Brumm & Link": "HBL",
  "Detroit Piping Group": "DPG",
  "University of Michigan": "UM",
  "W.J. O'Neil": "WJO",
  "Babcock & Wilcox": "B&W",
  "Mid American Group": "MAG",
};

// ─── Main ───

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════");
  console.log("  CUSTOMER NORMALIZATION");
  console.log("═══════════════════════════════════════════════════\n");

  // Step 1: Get all distinct raw customer names from jobs_master
  const rawNames = await sql`
    SELECT DISTINCT customer_name_raw
    FROM jobs_master
    WHERE customer_name_raw IS NOT NULL
    ORDER BY customer_name_raw
  `;
  console.log(`  Found ${rawNames.length} distinct raw customer names\n`);

  // Step 2: Build canonical -> aliases mapping
  // Group all raw names by their canonical form
  const canonicalToAliases: Record<string, Set<string>> = {};

  for (const row of rawNames) {
    const raw = row.customer_name_raw as string;
    const canonical = CUSTOMER_MAP[raw] ?? raw;

    if (!canonicalToAliases[canonical]) {
      canonicalToAliases[canonical] = new Set();
    }
    // Add the raw name as an alias (even if it equals canonical)
    canonicalToAliases[canonical].add(raw);
  }

  console.log(`  Normalized to ${Object.keys(canonicalToAliases).length} canonical customers\n`);

  // Step 3: Create customer entries and aliases
  let customerCount = 0;
  let aliasCount = 0;
  const customerIdByCanonical: Record<string, number> = {};

  for (const [canonical, aliases] of Object.entries(canonicalToAliases)) {
    const shortCode = SHORT_CODES[canonical] ?? null;

    try {
      const result = await sql`
        INSERT INTO customers (canonical_name, short_code)
        VALUES (${canonical}, ${shortCode})
        ON CONFLICT (canonical_name) DO UPDATE SET
          short_code = COALESCE(EXCLUDED.short_code, customers.short_code),
          updated_at = NOW()
        RETURNING id
      `;
      const customerId = result[0].id as number;
      customerIdByCanonical[canonical] = customerId;
      customerCount++;

      // Create aliases for all variants (including the canonical name itself)
      for (const alias of aliases) {
        try {
          await sql`
            INSERT INTO customer_aliases (customer_id, alias_name)
            VALUES (${customerId}, ${alias})
            ON CONFLICT (alias_name) DO UPDATE SET
              customer_id = EXCLUDED.customer_id
          `;
          aliasCount++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  ERROR alias "${alias}" -> "${canonical}": ${msg}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR customer "${canonical}": ${msg}`);
    }
  }

  console.log(`  ${customerCount} canonical customers created`);
  console.log(`  ${aliasCount} customer aliases created\n`);

  // Step 4: Update jobs_master.customer_id
  console.log("  Linking jobs to customers...");
  let linkedCount = 0;
  let unlinkCount = 0;

  for (const [canonical, aliases] of Object.entries(canonicalToAliases)) {
    const customerId = customerIdByCanonical[canonical];
    if (!customerId) continue;

    for (const alias of aliases) {
      const result = await sql`
        UPDATE jobs_master
        SET customer_id = ${customerId}, updated_at = NOW()
        WHERE customer_name_raw = ${alias} AND (customer_id IS NULL OR customer_id != ${customerId})
      `;
      // neon returns array, check length for affected rows
      linkedCount += (result as unknown[]).length;
    }
  }

  // Check for any unlinked jobs
  const unlinked = await sql`
    SELECT COUNT(*) as cnt FROM jobs_master WHERE customer_id IS NULL AND customer_name_raw IS NOT NULL
  `;
  unlinkCount = parseInt(String(unlinked[0].cnt), 10);

  console.log(`  ${linkedCount} job links updated`);
  if (unlinkCount > 0) {
    console.log(`  WARNING: ${unlinkCount} jobs still unlinked`);
  }

  // ─── Verification ───
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════════════════\n");

  const dbCustomers = await sql`SELECT COUNT(*) as cnt FROM customers`;
  const dbAliases = await sql`SELECT COUNT(*) as cnt FROM customer_aliases`;
  const dbLinked = await sql`SELECT COUNT(*) as cnt FROM jobs_master WHERE customer_id IS NOT NULL`;
  const dbTotal = await sql`SELECT COUNT(*) as cnt FROM jobs_master`;
  const dbNullCustomer = await sql`SELECT COUNT(*) as cnt FROM jobs_master WHERE customer_name_raw IS NULL`;

  console.log(`  Canonical customers: ${dbCustomers[0].cnt}`);
  console.log(`  Customer aliases:    ${dbAliases[0].cnt}`);
  console.log(`  Jobs with customer:  ${dbLinked[0].cnt} / ${dbTotal[0].cnt}`);
  console.log(`  Jobs with null name: ${dbNullCustomer[0].cnt}`);

  // Show top customers by job count
  const topCustomers = await sql`
    SELECT c.canonical_name, c.short_code, COUNT(j.id) as job_count
    FROM customers c
    JOIN jobs_master j ON j.customer_id = c.id
    GROUP BY c.id, c.canonical_name, c.short_code
    ORDER BY job_count DESC
    LIMIT 15
  `;
  console.log("\n  Top 15 customers by job count:");
  for (const row of topCustomers) {
    const code = row.short_code ? ` (${row.short_code})` : "";
    console.log(`    ${String(row.job_count).padStart(4)} jobs - ${row.canonical_name}${code}`);
  }

  // Check for orphaned aliases
  const orphaned = await sql`
    SELECT ca.alias_name FROM customer_aliases ca
    LEFT JOIN customers c ON c.id = ca.customer_id
    WHERE c.id IS NULL
  `;
  if (orphaned.length > 0) {
    console.log(`\n  WARNING: ${orphaned.length} orphaned aliases`);
  } else {
    console.log("\n  No orphaned aliases (OK)");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
