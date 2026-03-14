/**
 * Fix "undefined" string values in jobs_master.
 * Reports row counts affected per column, then runs the cleanup.
 *
 * Usage: node scripts/fix-undefined-to-null.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Load .env.local ───
function loadEnv() {
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

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  FIX: 'undefined' string → NULL in jobs_master");
  console.log("═══════════════════════════════════════════════════\n");

  // ─── Phase 1: Audit — count affected rows per column ───
  console.log("  Phase 1: Counting affected rows...\n");

  const columns = [
    "description",
    "customer_name_raw",
    "project_manager",
    "contract_type",
    "general_contractor",
    "tax_status",
    "timing",
    "po_number",
  ];

  const counts = {};
  for (const col of columns) {
    const result = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM jobs_master
      WHERE ${sql(col)} = 'undefined'
    `;
    counts[col] = result[0]?.cnt ?? 0;
  }

  // Count customer_id referencing bogus "undefined" customer
  const bogusCustomer = await sql`
    SELECT id FROM customers WHERE canonical_name = 'undefined'
  `;
  const bogusId = bogusCustomer[0]?.id ?? null;

  let customerIdCount = 0;
  if (bogusId) {
    const cidResult = await sql`
      SELECT COUNT(*)::int AS cnt FROM jobs_master WHERE customer_id = ${bogusId}
    `;
    customerIdCount = cidResult[0]?.cnt ?? 0;
  }

  console.log("  Rows with 'undefined' per column:");
  let totalAffected = 0;
  for (const col of columns) {
    console.log(`    ${col.padEnd(22)} ${counts[col]}`);
    totalAffected += counts[col];
  }
  console.log(`    ${"customer_id (bogus)".padEnd(22)} ${customerIdCount}`);
  totalAffected += customerIdCount;
  console.log(`\n  Total column-values to fix: ${totalAffected}\n`);

  if (totalAffected === 0) {
    console.log("  Nothing to fix — all clean.");
    return;
  }

  // ─── Phase 2: Fix ───
  console.log("  Phase 2: Running fixes...\n");

  for (const col of columns) {
    if (counts[col] === 0) continue;

    if (col === "tax_status") {
      // tax_status 'undefined' → 'unknown' (not NULL, it's a required enum)
      await sql`
        UPDATE jobs_master SET tax_status = 'unknown' WHERE tax_status = 'undefined'
      `;
      console.log(`    ${col}: ${counts[col]} rows → 'unknown'`);
    } else {
      await sql`
        UPDATE jobs_master SET ${sql(col)} = NULL WHERE ${sql(col)} = 'undefined'
      `;
      console.log(`    ${col}: ${counts[col]} rows → NULL`);
    }
  }

  if (bogusId && customerIdCount > 0) {
    await sql`
      UPDATE jobs_master SET customer_id = NULL WHERE customer_id = ${bogusId}
    `;
    console.log(`    customer_id: ${customerIdCount} rows → NULL (was pointing to bogus customer #${bogusId})`);

    // Clean up the bogus customer
    await sql`DELETE FROM customer_aliases WHERE customer_id = ${bogusId}`;
    await sql`DELETE FROM customers WHERE id = ${bogusId}`;
    console.log(`    Deleted bogus customer record (id=${bogusId}, canonical_name='undefined')`);
  }

  // ─── Phase 3: Verify ───
  console.log("\n  Phase 3: Verification...\n");

  let stillBad = 0;
  for (const col of columns) {
    const check = await sql`
      SELECT COUNT(*)::int AS cnt FROM jobs_master WHERE ${sql(col)} = 'undefined'
    `;
    const remaining = check[0]?.cnt ?? 0;
    if (remaining > 0) {
      console.log(`    WARNING: ${col} still has ${remaining} 'undefined' values`);
      stillBad += remaining;
    }
  }

  const bogusCheck = await sql`
    SELECT COUNT(*)::int AS cnt FROM customers WHERE canonical_name = 'undefined'
  `;
  if ((bogusCheck[0]?.cnt ?? 0) > 0) {
    console.log("    WARNING: Bogus 'undefined' customer still exists");
    stillBad++;
  }

  if (stillBad === 0) {
    console.log("    All clean — zero 'undefined' strings remain.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
