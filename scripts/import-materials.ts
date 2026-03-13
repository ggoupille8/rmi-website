/**
 * Import materials, vendors, and pricing from Excel.
 * Reads "Lists" and "Pricing Log" tabs from the Timesheet Pricing workbook.
 *
 * Usage: npx tsx scripts/import-materials.ts [--file path/to/file.xlsm]
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

const VENDORS = [
  { code: "DI", full_name: "DI" },
  { code: "General", full_name: "General" },
  { code: "ISI", full_name: "ISI" },
  { code: "SPS", full_name: "SPS" },
  { code: "Extol", full_name: "Extol" },
  { code: "Hybroco", full_name: "Hybroco" },
  { code: "K-Industrial", full_name: "K-Industrial" },
  { code: "Norkan", full_name: "Norkan" },
];

// Pricing Log vendor column mapping (0-indexed)
const VENDOR_COLS: Array<{ col: number; code: string }> = [
  { col: 2, code: "ISI" },       // C
  { col: 3, code: "SPS" },       // D
  { col: 4, code: "DI" },        // E
  { col: 5, code: "General" },   // F
  { col: 6, code: "Hybroco" },   // G
  { col: 7, code: "Extol" },     // H
  { col: 8, code: "K-Industrial" }, // I
  { col: 9, code: "Norkan" },    // J
];

// Consumable patterns (case-insensitive partial match)
const CONSUMABLE_PATTERNS = [
  "brush",
  "cutoff blade",
  "knife",
  "staple",
  "stapler replacement",
  "stapler",
  "ear plug",
  "masks - n95",
  "safety glasses",
  "safety gloves",
  "safety vest",
  "tyvek suit",
];

function isConsumable(description: string): boolean {
  const lower = description.toLowerCase();
  return CONSUMABLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

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

function excelDateToISO(serial: number): string | null {
  if (!serial || serial < 1) return null;
  // Excel serial date -> JS Date
  const utcDays = Math.floor(serial) - 25569;
  const date = new Date(utcDays * 86400000);
  return date.toISOString().split("T")[0];
}

// ─── Main ───

async function main(): Promise<void> {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.split("=")[1] : DEFAULT_FILE;

  console.log("═══════════════════════════════════════════════════");
  console.log("  MATERIALS & PRICING IMPORT");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  File: ${filePath}\n`);

  const wb = XLSX.readFile(filePath);

  // ─── Step 1: Seed vendors ───
  console.log("Step 1: Seeding vendors...");
  const vendorIdMap: Record<string, number> = {};

  for (const v of VENDORS) {
    const result = await sql`
      INSERT INTO vendors (code, full_name)
      VALUES (${v.code}, ${v.full_name})
      ON CONFLICT (code) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `;
    vendorIdMap[v.code] = result[0].id as number;
    process.stdout.write(`  ${v.code} (id=${result[0].id}) `);
  }
  console.log(`\n  ${Object.keys(vendorIdMap).length} vendors created\n`);

  // ─── Step 2: Import materials from "Lists" tab ───
  console.log("Step 2: Importing materials from Lists tab...");
  const listsSheet = wb.Sheets["Lists"];
  if (!listsSheet) {
    console.error("  ERROR: 'Lists' tab not found");
    process.exit(1);
  }

  const listsRange = XLSX.utils.decode_range(listsSheet["!ref"] ?? "A1");
  let materialCount = 0;
  let consumableCount = 0;
  const materialIdMap: Record<string, number> = {};

  for (let r = 1; r <= listsRange.e.r; r++) {
    const description = cellString(listsSheet, r, 0);
    if (!description) continue;

    const unit = cellString(listsSheet, r, 1);
    const taxCategory = isConsumable(description) ? "consumable" : "installed";
    if (taxCategory === "consumable") consumableCount++;

    try {
      const result = await sql`
        INSERT INTO materials (description, unit, tax_category)
        VALUES (${description}, ${unit}, ${taxCategory})
        ON CONFLICT (description) DO UPDATE SET
          unit = COALESCE(EXCLUDED.unit, materials.unit),
          tax_category = EXCLUDED.tax_category,
          updated_at = NOW()
        RETURNING id
      `;
      materialIdMap[description] = result[0].id as number;
      materialCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR row ${r + 1}: ${msg}`);
    }
  }

  console.log(`  ${materialCount} materials created`);
  console.log(`  ${consumableCount} tagged as 'consumable'`);
  console.log(`  ${materialCount - consumableCount} tagged as 'installed'\n`);

  // ─── Step 3: Import pricing from "Pricing Log" tab ───
  console.log("Step 3: Importing pricing from Pricing Log tab...");
  const pricingSheet = wb.Sheets["Pricing Log"];
  if (!pricingSheet) {
    console.error("  ERROR: 'Pricing Log' tab not found");
    process.exit(1);
  }

  const pricingRange = XLSX.utils.decode_range(pricingSheet["!ref"] ?? "A1");
  let priceCount = 0;
  let skippedNoMaterial = 0;
  let skippedNullPrice = 0;

  // Process alternating pairs: price row (odd 0-index) and date row (even 0-index)
  for (let r = 1; r <= pricingRange.e.r; r += 2) {
    const description = cellString(pricingSheet, r, 0);
    if (!description) continue;

    // Find material_id
    const materialId = materialIdMap[description];
    if (!materialId) {
      // Try to find in DB (might have been inserted with slightly different name)
      const dbResult = await sql`SELECT id FROM materials WHERE description = ${description}`;
      if (dbResult.length === 0) {
        skippedNoMaterial++;
        continue;
      }
      materialIdMap[description] = dbResult[0].id as number;
    }

    const matId = materialIdMap[description];
    const dateRow = r + 1;

    // Book price from price row (col K = 10)
    const bookPrice = cellNumber(pricingSheet, r, 10);
    // Secondary book price from date row (col K = 10)
    const bookPrice2 = cellNumber(pricingSheet, dateRow, 10);
    // Book price note from price row (col L = 11)
    const bookPriceNote = cellString(pricingSheet, r, 11);

    // Process each vendor column
    for (const vc of VENDOR_COLS) {
      const price = cellNumber(pricingSheet, r, vc.col);
      if (price === null) {
        skippedNullPrice++;
        continue;
      }

      const dateSerial = cellNumber(pricingSheet, dateRow, vc.col);
      const priceDate = dateSerial ? excelDateToISO(dateSerial) : null;
      const vendorId = vendorIdMap[vc.code];

      try {
        await sql`
          INSERT INTO material_prices (material_id, vendor_id, price, price_date, book_price, book_price_note)
          VALUES (${matId}, ${vendorId}, ${price}, ${priceDate}, ${bookPrice}, ${bookPriceNote})
          ON CONFLICT (material_id, vendor_id) DO UPDATE SET
            price = EXCLUDED.price,
            price_date = EXCLUDED.price_date,
            book_price = EXCLUDED.book_price,
            book_price_note = EXCLUDED.book_price_note,
            updated_at = NOW()
        `;
        priceCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ERROR pricing row ${r + 1}, vendor ${vc.code}: ${msg}`);
      }
    }
  }

  console.log(`  ${priceCount} material_prices created`);
  console.log(`  ${skippedNoMaterial} pricing rows skipped (no matching material)`);
  console.log(`  ${skippedNullPrice} vendor slots skipped (null price)\n`);

  // ─── Verification ───
  console.log("═══════════════════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════════════════\n");

  const vendorCount = await sql`SELECT COUNT(*) as cnt FROM vendors`;
  const matCount = await sql`SELECT COUNT(*) as cnt FROM materials`;
  const consumables = await sql`SELECT COUNT(*) as cnt FROM materials WHERE tax_category = 'consumable'`;
  const installed = await sql`SELECT COUNT(*) as cnt FROM materials WHERE tax_category = 'installed'`;
  const pricesDb = await sql`SELECT COUNT(*) as cnt FROM material_prices`;

  console.log(`  Vendors:           ${vendorCount[0].cnt}`);
  console.log(`  Materials:         ${matCount[0].cnt}`);
  console.log(`  - consumable:      ${consumables[0].cnt}`);
  console.log(`  - installed:       ${installed[0].cnt}`);
  console.log(`  Material prices:   ${pricesDb[0].cnt}`);

  // Show consumable materials
  const consumableList = await sql`SELECT description FROM materials WHERE tax_category = 'consumable' ORDER BY description`;
  console.log(`\n  Consumable materials (${consumableList.length}):`);
  for (const c of consumableList) {
    console.log(`    - ${c.description}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
