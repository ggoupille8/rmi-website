import * as XLSX from "xlsx";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WipSnapshot {
  snapshotDate: Date;
  snapshotYear: number;
  snapshotMonth: number;
  jobNumber: string;
  description: string | null;
  projectManager: string | null;
  isHiddenInSource: boolean;
  contractAmount: number | null;
  changeOrders: number | null;
  pendingChangeOrders: number | null;
  revisedContract: number | null;
  originalEstimate: number | null;
  estimateChanges: number | null;
  pendingCoEstimates: number | null;
  revisedEstimate: number | null;
  grossProfit: number | null;
  grossMarginPct: number | null;
  pctComplete: number | null;
  earnedRevenue: number | null;
  costsToDate: number | null;
  grossProfitToDate: number | null;
  backlogRevenue: number | null;
  costsToComplete: number | null;
  backlogProfit: number | null;
  billingsToDate: number | null;
  revenueBillingExcess: number | null;
  invoicingRemaining: number | null;
  revenueExcess: number | null;
  billingsExcess: number | null;
  sourceTab: string;
  sourceRow: number;
}

export interface WipSnapshotTotal {
  snapshotYear: number;
  snapshotMonth: number;
  contractAmount: number | null;
  changeOrders: number | null;
  pendingChangeOrders: number | null;
  revisedContract: number | null;
  originalEstimate: number | null;
  estimateChanges: number | null;
  revisedEstimate: number | null;
  grossProfit: number | null;
  earnedRevenue: number | null;
  costsToDate: number | null;
  grossProfitToDate: number | null;
  backlogRevenue: number | null;
  costsToComplete: number | null;
  backlogProfit: number | null;
  billingsToDate: number | null;
  revenueBillingExcess: number | null;
  invoicingRemaining: number | null;
  revenueExcess: number | null;
  billingsExcess: number | null;
  jobCount: number;
}

export interface WipParseResult {
  snapshots: WipSnapshot[];
  totals: WipSnapshotTotal[];
  errors: string[];
  fileName: string;
}

// ─────────────────────────────────────────────
// Column mapping: Excel column letter → 0-based index
// ─────────────────────────────────────────────

const COL = {
  A: 0,  // Job Number
  B: 1,  // Description
  C: 2,  // PM
  D: 3,  // Contract Amount
  E: 4,  // Change Orders
  F: 5,  // Pending Change Orders
  G: 6,  // Revised Contract
  H: 7,  // Original Estimate
  I: 8,  // Changes to Estimate
  J: 9,  // Pending CO Estimates
  K: 10, // Revised Estimate
  L: 11, // Gross Profit
  M: 12, // Gross Margin %
  N: 13, // % Complete
  O: 14, // Earned Revenue to Date
  P: 15, // Job Costs to Date
  Q: 16, // Gross Profit to Date
  R: 17, // Backlog of Revenues
  S: 18, // Costs to Complete
  T: 19, // Profit in Backlog
  U: 20, // Job to Date Billings
  V: 21, // Revenue or (Billings) in Excess
  W: 22, // Total Invoicing Remaining
  // X: 23 — unused
  Y: 24, // Revenue in Excess of Billings
  Z: 25, // Billings in Excess of Revenues
} as const;

// Data starts at row 6 (0-based index 5)
const DATA_START_ROW = 5;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parse tab name like "1-31-2026" to { date, year, month }
 */
export function parseTabDate(tabName: string): { date: Date; year: number; month: number } | null {
  const match = tabName.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return {
    date: new Date(year, month - 1, day),
    year,
    month,
  };
}

/**
 * Safely extract a numeric value from a cell.
 * Returns null for: undefined, null, empty string, whitespace-only, '#DIV/0!', NaN
 */
function numericCell(value: unknown): number | null {
  if (value === undefined || value === null) return null;

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "#DIV/0!" || trimmed === "#REF!" || trimmed === "#N/A") {
      return null;
    }
    const parsed = parseFloat(trimmed.replace(/,/g, ""));
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Safely extract a string value from a cell.
 * Returns null for undefined/null/empty/whitespace-only.
 */
function stringCell(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
}

/**
 * Get row data as an array from the worksheet.
 */
function getRowValues(ws: XLSX.WorkSheet, rowIndex: number): unknown[] {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const values: unknown[] = [];

  for (let col = range.s.c; col <= Math.max(range.e.c, 25); col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: col });
    const cell = ws[cellAddr];
    values[col] = cell ? cell.v : undefined;
  }

  return values;
}

/**
 * Check if a row is hidden in Excel.
 */
function isRowHidden(ws: XLSX.WorkSheet, rowIndex: number): boolean {
  const rows = ws["!rows"];
  if (!rows) return false;
  return rows[rowIndex]?.hidden === true;
}

// ─────────────────────────────────────────────
// Main parser
// ─────────────────────────────────────────────

/**
 * Parse a WIP Excel workbook object.
 * Iterates all tabs, extracting job snapshots and totals.
 */
export function parseWipWorkbook(workbook: XLSX.WorkBook, fileName: string): WipParseResult {

  const snapshots: WipSnapshot[] = [];
  const totals: WipSnapshotTotal[] = [];
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const tabDate = parseTabDate(sheetName);
    if (!tabDate) {
      // Skip non-date tabs (e.g., summary tabs, metadata tabs)
      continue;
    }

    const ws = workbook.Sheets[sheetName];
    if (!ws || !ws["!ref"]) {
      errors.push(`Tab "${sheetName}": empty worksheet`);
      continue;
    }

    const range = XLSX.utils.decode_range(ws["!ref"]);
    let jobCount = 0;

    for (let rowIdx = DATA_START_ROW; rowIdx <= range.e.r; rowIdx++) {
      const row = getRowValues(ws, rowIdx);

      const colA = stringCell(row[COL.A]);
      const colB = stringCell(row[COL.B]);

      // Check for totals row
      if (colB !== null && colB.toLowerCase() === "totals") {
        const total: WipSnapshotTotal = {
          snapshotYear: tabDate.year,
          snapshotMonth: tabDate.month,
          contractAmount: numericCell(row[COL.D]),
          changeOrders: numericCell(row[COL.E]),
          pendingChangeOrders: numericCell(row[COL.F]),
          revisedContract: numericCell(row[COL.G]),
          originalEstimate: numericCell(row[COL.H]),
          estimateChanges: numericCell(row[COL.I]),
          revisedEstimate: numericCell(row[COL.K]),
          grossProfit: numericCell(row[COL.L]),
          earnedRevenue: numericCell(row[COL.O]),
          costsToDate: numericCell(row[COL.P]),
          grossProfitToDate: numericCell(row[COL.Q]),
          backlogRevenue: numericCell(row[COL.R]),
          costsToComplete: numericCell(row[COL.S]),
          backlogProfit: numericCell(row[COL.T]),
          billingsToDate: numericCell(row[COL.U]),
          revenueBillingExcess: numericCell(row[COL.V]),
          invoicingRemaining: numericCell(row[COL.W]),
          revenueExcess: numericCell(row[COL.Y]),
          billingsExcess: numericCell(row[COL.Z]),
          jobCount,
        };
        totals.push(total);
        break; // Done with this tab after totals row
      }

      // Skip blank rows (both A and B empty)
      if (colA === null && colB === null) {
        continue;
      }

      // Skip rows without a job number
      if (colA === null) {
        continue;
      }

      const jobNumber = colA.trim();
      jobCount++;

      const snapshot: WipSnapshot = {
        snapshotDate: tabDate.date,
        snapshotYear: tabDate.year,
        snapshotMonth: tabDate.month,
        jobNumber,
        description: colB,
        projectManager: stringCell(row[COL.C]),
        isHiddenInSource: isRowHidden(ws, rowIdx),
        contractAmount: numericCell(row[COL.D]),
        changeOrders: numericCell(row[COL.E]),
        pendingChangeOrders: numericCell(row[COL.F]),
        revisedContract: numericCell(row[COL.G]),
        originalEstimate: numericCell(row[COL.H]),
        estimateChanges: numericCell(row[COL.I]),
        pendingCoEstimates: numericCell(row[COL.J]),
        revisedEstimate: numericCell(row[COL.K]),
        grossProfit: numericCell(row[COL.L]),
        grossMarginPct: numericCell(row[COL.M]),
        pctComplete: numericCell(row[COL.N]),
        earnedRevenue: numericCell(row[COL.O]),
        costsToDate: numericCell(row[COL.P]),
        grossProfitToDate: numericCell(row[COL.Q]),
        backlogRevenue: numericCell(row[COL.R]),
        costsToComplete: numericCell(row[COL.S]),
        backlogProfit: numericCell(row[COL.T]),
        billingsToDate: numericCell(row[COL.U]),
        revenueBillingExcess: numericCell(row[COL.V]),
        invoicingRemaining: numericCell(row[COL.W]),
        revenueExcess: numericCell(row[COL.Y]),
        billingsExcess: numericCell(row[COL.Z]),
        sourceTab: sheetName,
        sourceRow: rowIdx + 1, // 1-based for user display
      };

      snapshots.push(snapshot);
    }
  }

  return { snapshots, totals, errors, fileName };
}

/**
 * Parse a WIP Excel file from a Buffer.
 * Thin wrapper that reads the buffer into a workbook and delegates to parseWipWorkbook.
 */
export function parseWipExcel(buffer: Buffer, fileName: string): WipParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return parseWipWorkbook(workbook, fileName);
}
