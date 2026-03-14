/**
 * Import job master data from the RMI Job W.I.P. workbook.
 * Reads 6 year tabs (2021-2026) with job data, tax status, and contract types.
 *
 * Usage: npx tsx scripts/import-job-master.ts [--file path/to/file.xlsm]
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

const DEFAULT_FILE = resolve(ROOT, "data", "RMI Job W.I.P.xlsm");

// Column indices (0-based)
const COL = {
  JOB_NUMBER: 0,       // A
  DESCRIPTION: 1,      // B
  CUSTOMER_NAME: 2,    // C
  CONTRACT_TYPE: 3,    // D
  VARIABLE: 4,         // E
  TIMING: 5,           // F
  CLOSE_DATE: 6,       // G
  PO_NUMBER: 7,        // H
  TAX_STATUS: 8,       // I
  GENERAL_CONTRACTOR: 9, // J
  PROJECT_MANAGER: 10, // K
};

// Tax status mapping
function mapTaxStatus(raw: string | null): string {
  if (!raw) return "unknown";
  const val = raw.trim().toUpperCase();
  if (val === "Y" || val === "YES") return "taxable";
  if (val === "N") return "exempt";
  if (val === "N / Y" || val === "N/Y") return "mixed";
  return "unknown";
}

// Contract type normalization
function normalizeContractType(raw: string | null): string | null {
  if (!raw) return null;
  const val = raw.trim();
  if (val === "T&M") return "TM";
  return val; // TM NTE, NTE, LS stay as-is
}

// ─── Helpers ───

function cellString(ws: pkg.WorkSheet, row: number, col: number): string | null {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell || cell.v === undefined || cell.v === null) return null;
  const s = String(cell.v).trim();
  return s === "" ? null : s;
}

function excelDateToISO(ws: pkg.WorkSheet, row: number, col: number): string | null {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return null;

  // If it's a date object
  if (cell.t === "d" && cell.v instanceof Date) {
    return cell.v.toISOString().split("T")[0];
  }

  // If it's a number (Excel serial date)
  if (typeof cell.v === "number" && cell.v > 0) {
    const utcDays = Math.floor(cell.v) - 25569;
    const date = new Date(utcDays * 86400000);
    return date.toISOString().split("T")[0];
  }

  // If it's a string, try to parse
  if (typeof cell.v === "string") {
    const trimmed = cell.v.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }

  return null;
}

function isRowHidden(ws: pkg.WorkSheet, rowIndex: number): boolean {
  const rows = ws["!rows"];
  if (!rows) return false;
  return rows[rowIndex]?.hidden === true;
}

function isJobRow(value: string | null): boolean {
  if (!value) return false;
  return /^\d/.test(value.trim());
}

// ─── Main ───

async function main(): Promise<void> {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const filePath = fileArg ? fileArg.split("=")[1] : DEFAULT_FILE;

  console.log("═══════════════════════════════════════════════════");
  console.log("  JOB MASTER IMPORT");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  File: ${filePath}\n`);

  const wb = XLSX.readFile(filePath, { cellStyles: true });
  const yearTabs = wb.SheetNames.filter((name) => /^\d{4}$/.test(name));
  console.log(`  Year tabs found: ${yearTabs.join(", ")}\n`);

  const yearCounts: Record<string, number> = {};
  const taxCounts: Record<string, number> = { taxable: 0, exempt: 0, mixed: 0, unknown: 0 };
  const hiddenCounts: Record<string, number> = {};
  let totalJobs = 0;
  let totalErrors = 0;

  for (const tabName of yearTabs) {
    const year = parseInt(tabName, 10);
    const ws = wb.Sheets[tabName];
    if (!ws || !ws["!ref"]) {
      console.log(`  Tab ${tabName}: empty worksheet, skipping`);
      continue;
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    let tabJobCount = 0;
    let tabHiddenCount = 0;
    let tabErrors = 0;
    let sectionHeaders = 0;

    // Row 0 = headers (skip), data starts at row 1
    for (let r = 1; r <= range.e.r; r++) {
      const colA = cellString(ws, r, COL.JOB_NUMBER);
      if (!colA) continue;

      // Skip section headers (non-numeric text in column A)
      if (!isJobRow(colA)) {
        sectionHeaders++;
        continue;
      }

      const jobNumber = colA.trim();
      const description = cellString(ws, r, COL.DESCRIPTION);
      const customerNameRaw = cellString(ws, r, COL.CUSTOMER_NAME);
      const contractTypeRaw = cellString(ws, r, COL.CONTRACT_TYPE);
      const contractType = normalizeContractType(contractTypeRaw);
      const variable = cellString(ws, r, COL.VARIABLE);
      const timing = cellString(ws, r, COL.TIMING);
      const closeDate = excelDateToISO(ws, r, COL.CLOSE_DATE);
      const poNumber = cellString(ws, r, COL.PO_NUMBER);
      const taxStatusRaw = cellString(ws, r, COL.TAX_STATUS);
      const taxStatus = mapTaxStatus(taxStatusRaw);
      const generalContractor = cellString(ws, r, COL.GENERAL_CONTRACTOR);
      const projectManager = cellString(ws, r, COL.PROJECT_MANAGER);
      const hidden = isRowHidden(ws, r);

      if (hidden) tabHiddenCount++;
      taxCounts[taxStatus]++;

      try {
        await sql`
          INSERT INTO jobs_master (
            job_number, year, description, customer_name_raw,
            contract_type, variable, timing, close_date, po_number,
            tax_status, general_contractor, project_manager,
            is_hidden, source_tab, source_row
          ) VALUES (
            ${jobNumber}, ${year}, ${description}, ${customerNameRaw},
            ${contractType}, ${variable}, ${timing}, ${closeDate}, ${poNumber},
            ${taxStatus}, ${generalContractor}, ${projectManager},
            ${hidden}, ${tabName}, ${r + 1}
          )
          ON CONFLICT (job_number, year) DO UPDATE SET
            description = EXCLUDED.description,
            customer_name_raw = EXCLUDED.customer_name_raw,
            contract_type = EXCLUDED.contract_type,
            variable = EXCLUDED.variable,
            timing = EXCLUDED.timing,
            close_date = EXCLUDED.close_date,
            po_number = EXCLUDED.po_number,
            tax_status = EXCLUDED.tax_status,
            general_contractor = EXCLUDED.general_contractor,
            project_manager = EXCLUDED.project_manager,
            is_hidden = EXCLUDED.is_hidden,
            source_tab = EXCLUDED.source_tab,
            source_row = EXCLUDED.source_row,
            updated_at = NOW()
        `;
        tabJobCount++;
      } catch (err: unknown) {
        tabErrors++;
        const msg = err instanceof Error ? err.message : String(err);
        if (tabErrors <= 3) {
          console.error(`  ERROR row ${r + 1} (job ${jobNumber}): ${msg}`);
        }
      }
    }

    yearCounts[tabName] = tabJobCount;
    hiddenCounts[tabName] = tabHiddenCount;
    totalJobs += tabJobCount;
    totalErrors += tabErrors;

    console.log(
      `  ${tabName}: ${tabJobCount} jobs imported, ${tabHiddenCount} hidden, ${sectionHeaders} section headers skipped` +
        (tabErrors > 0 ? `, ${tabErrors} errors` : "")
    );
  }

  // ─── Verification ───
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("  Jobs per year:");
  for (const [year, count] of Object.entries(yearCounts)) {
    console.log(`    ${year}: ${count}`);
  }
  console.log(`    Total: ${totalJobs}`);

  console.log("\n  Tax status distribution:");
  for (const [status, count] of Object.entries(taxCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  console.log("\n  Hidden rows per year:");
  for (const [year, count] of Object.entries(hiddenCounts)) {
    if (count > 0) console.log(`    ${year}: ${count}`);
  }

  // DB verification
  const dbCount = await sql`SELECT COUNT(*) as cnt FROM jobs_master`;
  const dbByYear = await sql`SELECT year, COUNT(*) as cnt FROM jobs_master GROUP BY year ORDER BY year`;
  const dbByTax = await sql`SELECT tax_status, COUNT(*) as cnt FROM jobs_master GROUP BY tax_status ORDER BY tax_status`;

  console.log(`\n  Database total: ${dbCount[0].cnt} jobs`);
  console.log("  DB jobs per year:");
  for (const row of dbByYear) {
    console.log(`    ${row.year}: ${row.cnt}`);
  }
  console.log("  DB tax status:");
  for (const row of dbByTax) {
    console.log(`    ${row.tax_status}: ${row.cnt}`);
  }

  // Contract type distribution
  const dbByContract = await sql`SELECT contract_type, COUNT(*) as cnt FROM jobs_master GROUP BY contract_type ORDER BY contract_type`;
  console.log("  DB contract types:");
  for (const row of dbByContract) {
    console.log(`    ${row.contract_type || "(null)"}: ${row.cnt}`);
  }

  if (totalErrors > 0) {
    console.log(`\n  WARNING: ${totalErrors} errors during import`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
