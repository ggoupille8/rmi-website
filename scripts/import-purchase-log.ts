/**
 * Import legacy purchase log from Excel.
 * Reads "Purchase Log" tab from the Timesheet Pricing workbook.
 * Truncates and re-imports (staging table, not production data).
 *
 * Usage: npx tsx scripts/import-purchase-log.ts [--file path/to/file.xlsm]
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "xlsx";

const XLSX = pkg;
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

// ─── Constants ───

const DEFAULT_FILE = resolve(ROOT, "data", "2024 Timesheet Pricing 59.xlsm");

// Column indices (0-based)
const COL = {
  DESCRIPTION: 0,        // A
  QUANTITY: 1,            // B
  PRICE_PER_ITEM: 2,     // C
  TOTAL_COST: 3,         // D
  PURCHASE_DATE: 4,      // E
  VENDOR: 5,             // F
  INVOICE_NUMBER: 6,     // G
  JOB_NUMBER: 7,         // H
  NOTES: 8,              // I
  SPECIAL_PRICING: 9,    // J (Wingdings checkmark 'ü' = true)
};

// ─── Helpers ───

function cellString(ws: pkg.WorkSheet, row: number, col: number): string | null {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return null;
  const s = String(cell.v).trim();
  return s === "" ? null : s;
}

function cellNumber(ws: pkg.WorkSheet, row: number, col: number): number | null {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return null;
  if (typeof cell.v === "number") return isNaN(cell.v) ? null : cell.v;
  if (typeof cell.v === "string") {
    const trimmed = cell.v.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return null;
    const parsed = parseFloat(trimmed.replace(/,/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function excelDateToISO(ws: pkg.WorkSheet, row: number, col: number): string | null {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return null;

  if (cell.t === "d" && cell.v instanceof Date) {
    return cell.v.toISOString().split("T")[0];
  }

  if (typeof cell.v === "number" && cell.v > 0) {
    const utcDays = Math.floor(cell.v) - 25569;
    const date = new Date(utcDays * 86400000);
    return date.toISOString().split("T")[0];
  }

  if (typeof cell.v === "string") {
    const trimmed = cell.v.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }

  return null;
}

function isSpecialPricing(ws: pkg.WorkSheet, row: number, col: number): boolean {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return false;
  const v = String(cell.v).trim();
  // Wingdings checkmark is 'ü' (U+00FC)
  return v === "\u00FC" || v === "ü";
}

// ─── Main ───

async function main(): Promise<void> {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.split("=")[1] : DEFAULT_FILE;

  console.log("═══════════════════════════════════════════════════");
  console.log("  PURCHASE LOG (LEGACY) IMPORT");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  File: ${filePath}\n`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["Purchase Log"];
  if (!ws) {
    console.error("  ERROR: 'Purchase Log' tab not found");
    process.exit(1);
  }

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const totalExcelRows = range.e.r; // excluding header

  console.log(`  Excel rows (excluding header): ${totalExcelRows}\n`);

  // Truncate the staging table first
  console.log("  Truncating purchase_log_legacy...");
  await sql`TRUNCATE TABLE purchase_log_legacy RESTART IDENTITY`;
  console.log("  Table truncated.\n");

  // Import rows
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let specialCount = 0;
  const vendorCounts: Record<string, number> = {};
  let minDate: string | null = null;
  let maxDate: string | null = null;
  const BATCH_LOG_INTERVAL = 2000;

  for (let r = 1; r <= range.e.r; r++) {
    const description = cellString(ws, r, COL.DESCRIPTION);

    // Skip completely empty rows
    if (!description) {
      const qty = cellNumber(ws, r, COL.QUANTITY);
      const vendor = cellString(ws, r, COL.VENDOR);
      if (!qty && !vendor) {
        skipped++;
        continue;
      }
    }

    const quantity = cellNumber(ws, r, COL.QUANTITY);
    const pricePerItem = cellNumber(ws, r, COL.PRICE_PER_ITEM);
    const totalCost = cellNumber(ws, r, COL.TOTAL_COST);
    const purchaseDate = excelDateToISO(ws, r, COL.PURCHASE_DATE);
    const vendor = cellString(ws, r, COL.VENDOR);
    const invoiceNumber = cellString(ws, r, COL.INVOICE_NUMBER);
    const jobNumber = cellString(ws, r, COL.JOB_NUMBER);
    const notes = cellString(ws, r, COL.NOTES);
    const specialPricing = isSpecialPricing(ws, r, COL.SPECIAL_PRICING);

    if (specialPricing) specialCount++;
    if (vendor) vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;

    if (purchaseDate) {
      if (!minDate || purchaseDate < minDate) minDate = purchaseDate;
      if (!maxDate || purchaseDate > maxDate) maxDate = purchaseDate;
    }

    try {
      await sql`
        INSERT INTO purchase_log_legacy (
          description, quantity, price_per_item, total_cost,
          purchase_date, vendor, invoice_number, job_number,
          notes, is_special_pricing, source_row
        ) VALUES (
          ${description}, ${quantity}, ${pricePerItem}, ${totalCost},
          ${purchaseDate}, ${vendor}, ${invoiceNumber}, ${jobNumber},
          ${notes}, ${specialPricing}, ${r + 1}
        )
      `;
      imported++;
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      if (errors <= 5) {
        console.error(`  ERROR row ${r + 1}: ${msg}`);
      }
    }

    if (imported % BATCH_LOG_INTERVAL === 0) {
      process.stdout.write(`  Imported ${imported} rows...\r`);
    }
  }

  console.log(`  Imported ${imported} rows.                    \n`);

  // ─── Verification ───
  console.log("═══════════════════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════════════════\n");

  const dbCount = await sql`SELECT COUNT(*) as cnt FROM purchase_log_legacy`;
  const dbSpecial = await sql`SELECT COUNT(*) as cnt FROM purchase_log_legacy WHERE is_special_pricing = true`;
  const dbDateRange = await sql`SELECT MIN(purchase_date) as min_date, MAX(purchase_date) as max_date FROM purchase_log_legacy`;

  console.log(`  Rows imported:       ${imported}`);
  console.log(`  Rows skipped:        ${skipped}`);
  console.log(`  Errors:              ${errors}`);
  console.log(`  DB row count:        ${dbCount[0].cnt}`);
  console.log(`  Special pricing:     ${dbSpecial[0].cnt}`);
  console.log(`  Date range:          ${dbDateRange[0].min_date} to ${dbDateRange[0].max_date}`);

  console.log("\n  Vendor distribution:");
  const sortedVendors = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);
  for (const [vendor, count] of sortedVendors) {
    console.log(`    ${vendor.padEnd(20)} ${count}`);
  }

  // Job number distribution
  const dbJobTypes = await sql`
    SELECT
      CASE
        WHEN job_number ~ '^\d' THEN 'numeric'
        ELSE job_number
      END as job_type,
      COUNT(*) as cnt
    FROM purchase_log_legacy
    WHERE job_number IS NOT NULL
    GROUP BY job_type
    ORDER BY cnt DESC
    LIMIT 10
  `;
  console.log("\n  Job number types (top 10):");
  for (const row of dbJobTypes) {
    console.log(`    ${String(row.job_type).padEnd(20)} ${row.cnt}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
