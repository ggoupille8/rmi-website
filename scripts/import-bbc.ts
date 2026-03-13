/**
 * Bulk import Borrowing Base Certificate PDFs from data/ directory.
 * Uses the Anthropic Vision API to OCR each scanned PDF.
 *
 * Usage: npx tsx scripts/import-bbc.ts
 * Requires: ANTHROPIC_API_KEY and POSTGRES_URL env vars
 */

import fs from "fs";
import path from "path";
import { sql } from "@vercel/postgres";
import { parseBorrowingBase, parseBbcFilenameDate } from "../src/lib/pdf-parsers";

// Load .env.local (or .env) if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = fs.existsSync(envLocalPath)
  ? envLocalPath
  : path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const DATA_DIR = path.resolve(process.cwd(), "data");

async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS borrowing_base (
      id SERIAL PRIMARY KEY,
      report_date DATE NOT NULL,
      gross_ar NUMERIC(14,2),
      ar_over_90 NUMERIC(14,2),
      eligible_ar NUMERIC(14,2),
      ar_advance_rate NUMERIC(5,4),
      ar_availability NUMERIC(14,2),
      gross_inventory NUMERIC(14,2),
      inventory_advance_rate NUMERIC(5,4),
      inventory_availability NUMERIC(14,2),
      total_borrowing_base NUMERIC(14,2),
      amount_borrowed NUMERIC(14,2),
      excess_availability NUMERIC(14,2),
      raw_data JSONB,
      source_file TEXT,
      imported_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(report_date)
    )
  `;
  console.log("✓ borrowing_base table ready");
}

async function main(): Promise<void> {
  // Find all BBC PDFs
  const allFiles = fs.readdirSync(DATA_DIR);
  const bbcFiles = allFiles
    .filter((f) => /borrowing\s*base/i.test(f) && /\.pdf$/i.test(f))
    .sort((a, b) => {
      const dateA = parseBbcFilenameDate(a) ?? "";
      const dateB = parseBbcFilenameDate(b) ?? "";
      return dateA.localeCompare(dateB);
    });

  console.log(`Found ${bbcFiles.length} Borrowing Base Certificate PDFs\n`);

  if (bbcFiles.length === 0) {
    console.log("No files to import.");
    return;
  }

  await ensureTable();

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const filename of bbcFiles) {
    const filePath = path.join(DATA_DIR, filename);
    const filenameMonth = parseBbcFilenameDate(filename);

    process.stdout.write(`  ${filename} ... `);

    try {
      const buffer = Buffer.from(fs.readFileSync(filePath));
      const result = await parseBorrowingBase(buffer);

      // Idempotent: delete existing for same date
      await sql`DELETE FROM borrowing_base WHERE report_date = ${result.reportDate}`;

      const rawData = JSON.stringify(result.validation);

      await sql`
        INSERT INTO borrowing_base (
          report_date, gross_ar, ar_over_90, eligible_ar,
          ar_advance_rate, ar_availability,
          gross_inventory, inventory_advance_rate, inventory_availability,
          total_borrowing_base, amount_borrowed, excess_availability,
          raw_data, source_file
        ) VALUES (
          ${result.reportDate}, ${result.grossAr}, ${result.arOver90}, ${result.eligibleAr},
          ${result.arAdvanceRate}, ${result.arAvailability},
          ${result.grossInventory}, ${result.inventoryAdvanceRate}, ${result.inventoryAvailability},
          ${result.totalBorrowingBase}, ${result.amountBorrowed}, ${result.excessAvailability},
          ${rawData}::jsonb, ${filename}
        )
      `;

      const checks = result.validation;
      const allPass = checks.eligibleArCheck && checks.arAvailCheck && checks.invAvailCheck && checks.baseCheck && checks.excessCheck;

      console.log(
        `✓ ${result.reportDate} | Base: $${result.totalBorrowingBase.toLocaleString()} | Avail: $${result.excessAvailability.toLocaleString()}` +
        (allPass ? "" : " ⚠ validation flags") +
        (filenameMonth && !result.reportDate.startsWith(filenameMonth) ? ` ⚠ date mismatch (filename=${filenameMonth})` : "")
      );
      success++;

      // Small delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`✗ FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Import complete: ${success} imported, ${failed} failed, ${skipped} skipped`);
  console.log(`Total: ${bbcFiles.length} files processed`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
