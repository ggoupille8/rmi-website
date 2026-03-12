/**
 * PDF parsers for RMI financial reports (AR Aging, Balance Sheet, Income Statement).
 * Uses pdf-parse (v2) for text extraction from Sage/Peachtree-generated PDFs.
 */

import { PDFParse } from 'pdf-parse';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ArAgingCustomer {
  name: string;
  code: string | null;
  phone: string | null;
  total: number;
  current: number;
  over30: number;
  over60: number;
  over90: number;
  over120: number;
  retainage: number;
}

export interface ArAgingResult {
  reportDate: Date;
  generatedDate: Date;
  customers: ArAgingCustomer[];
  totals: {
    total: number;
    current: number;
    over30: number;
    over60: number;
    over90: number;
    over120: number;
    retainage: number;
  };
  validation: {
    customerSum: number;
    reportTotal: number;
    matches: boolean;
  };
}

export interface BalanceSheetEntry {
  accountNumber: string | null;
  accountName: string;
  amount: number;
  section: 'current_assets' | 'long_term_assets' | 'current_liabilities' | 'long_term_liabilities' | 'equity';
  isSubtotal: boolean;
  lineOrder: number;
}

export interface BalanceSheetResult {
  reportDate: Date;
  entries: BalanceSheetEntry[];
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    netIncome: number;
  };
  reconciliationAccounts: {
    ar: number;
    arRetainage: number;
    costsInExcess: number;
    billingsInExcess: number;
  };
  validation: {
    assetsMatch: boolean;
  };
}

export interface IncomeStatementEntry {
  accountNumber: string | null;
  accountName: string;
  currentActivity: number | null;
  currentBalance: number | null;
  section: 'income' | 'cost_of_sales' | 'expenses' | 'other_income';
  isSubtotal: boolean;
  lineOrder: number;
}

export interface IncomeStatementResult {
  periodEndDate: Date;
  entries: IncomeStatementEntry[];
  totals: {
    totalIncome: { activity: number; balance: number };
    totalCostOfSales: { activity: number; balance: number };
    grossMargin: { activity: number; balance: number };
    totalExpenses: { activity: number; balance: number };
    netIncome: { activity: number; balance: number };
  };
  validation: {
    grossMarginCheck: boolean;
    netIncomeCheck: boolean;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function extractText(buffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  return result.text;
}

/** Parse an AR Aging amount: strip commas, trailing `-` = negative, `*` suffix */
function parseArAmount(raw: string): number {
  let s = raw.replace(/\*/g, '').replace(/,/g, '').trim();
  const negative = s.endsWith('-');
  if (negative) s = s.slice(0, -1);
  const val = parseFloat(s);
  if (isNaN(val)) return 0;
  return negative ? -val : val;
}

/** Parse a BS/IS amount: strip `$`, commas; parenthetical = negative */
function parseAccountAmount(raw: string): number {
  let s = raw.replace(/\$/g, '').replace(/,/g, '').trim();
  const parenMatch = s.match(/^\((.+)\)$/);
  if (parenMatch) {
    const val = parseFloat(parenMatch[1]);
    return isNaN(val) ? 0 : -val;
  }
  const val = parseFloat(s);
  return isNaN(val) ? 0 : val;
}

/** Parse a date like "01-31-2026" (MM-DD-YYYY) */
function parseMMDDYYYY(s: string): Date {
  const [mm, dd, yyyy] = s.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/** Parse a date like "1/31/2023" or "12/31/2023" (M/D/YYYY with slashes) */
function parseSlashDate(s: string): Date {
  const [mm, dd, yyyy] = s.split('/').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/** Parse a date like "January 31, 2026" or "December 31, 2025" */
function parseWrittenDate(s: string): Date {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const match = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) throw new Error(`Cannot parse date: "${s}"`);
  const month = months[match[1].toLowerCase()];
  if (month === undefined) throw new Error(`Unknown month: "${match[1]}"`);
  return new Date(Number(match[3]), month, Number(match[2]));
}

/** Check if a line is a page header/footer/separator to skip */
function isSkipLine(line: string): boolean {
  if (!line.trim()) return true;
  if (/^-- \d+ of \d+ --$/.test(line.trim())) return true;
  if (line.includes('Confidential: For Internal Use Only')) return true;
  if (line.startsWith('Resource Mechanical Insulation')) return true;
  if (line.startsWith('Aging Detail by Customer Name')) return true;
  if (line.startsWith('Aging Detail by Customer')) return true;
  if (line.startsWith('Aging As of Date')) return true;
  if (line.startsWith('Aging Basis')) return true;
  if (line.startsWith('Include Retainage')) return true;
  if (line.startsWith('Unpaid Only')) return true;
  if (line.startsWith('Age Finance Charges')) return true;
  if (line.startsWith('Current Over 30')) return true;
  if (line.startsWith('Tran Type')) return true;
  // Old-format (2023-era Sage) header lines
  if (line.startsWith('Aging as of date:')) return true;
  if (line.startsWith('Aging basis:')) return true;
  if (line.startsWith('Include Finance Charges')) return true;
  if (line.startsWith('Unpaid only')) return true;
  if (line.startsWith('Show detail')) return true;
  return false;
}

// ─────────────────────────────────────────────
// AR Aging Parser
// ─────────────────────────────────────────────

export async function parseArAging(buffer: Buffer): Promise<ArAgingResult> {
  const text = await extractText(buffer);
  const lines = text.split('\n');

  let reportDate: Date | null = null;
  let generatedDate: Date | null = null;

  // Maps for customer info extracted from header lines
  const customerInfo = new Map<string, { code: string | null; phone: string | null }>();
  const customers: ArAgingCustomer[] = [];
  let reportTotals: ArAgingResult['totals'] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract report generated date from page header
    if (trimmed.startsWith('Resource Mechanical Insulation') && !generatedDate) {
      const dashMatch = trimmed.match(/(\d{2}-\d{2}-\d{4})/);
      if (dashMatch) {
        generatedDate = parseMMDDYYYY(dashMatch[1]);
      } else {
        const slashMatch = trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (slashMatch) generatedDate = parseSlashDate(slashMatch[1]);
      }
      continue;
    }

    // Extract aging as-of date (new format: "Aging As of Date  01-31-2026")
    if (trimmed.startsWith('Aging As of Date') && !reportDate) {
      const dateMatch = trimmed.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) reportDate = parseMMDDYYYY(dateMatch[1]);
      continue;
    }

    // Extract aging as-of date (old format: "Aging as of date: 1/31/2023 ...")
    if (trimmed.startsWith('Aging as of date:') && !reportDate) {
      const dateMatch = trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) reportDate = parseSlashDate(dateMatch[1]);
      continue;
    }

    // Skip header/footer lines
    if (isSkipLine(trimmed)) continue;
    if (/^-- \d+ of \d+ --$/.test(trimmed)) continue;

    // Report Totals line
    const reportTotalMatch = trimmed.match(
      /^Report Totals\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*$/
    );
    if (reportTotalMatch) {
      reportTotals = {
        total: parseArAmount(reportTotalMatch[1]),
        current: parseArAmount(reportTotalMatch[2]),
        over30: parseArAmount(reportTotalMatch[3]),
        over60: parseArAmount(reportTotalMatch[4]),
        over90: parseArAmount(reportTotalMatch[5]),
        over120: parseArAmount(reportTotalMatch[6]),
        retainage: parseArAmount(reportTotalMatch[7]),
      };
      continue;
    }

    // Customer Totals line (with or without space before "Totals")
    const totalsMatch = trimmed.match(
      /^(.+?)(?:\s+)?Totals\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*\s+([\d,.]+(?:-)?)\*$/
    );
    if (totalsMatch) {
      const name = totalsMatch[1].trim();
      const info = customerInfo.get(name) ?? { code: null, phone: null };

      // Try to find info by partial match if exact match failed
      if (!info.code) {
        for (const [key, val] of customerInfo.entries()) {
          if (name.startsWith(key) || key.startsWith(name)) {
            info.code = val.code;
            info.phone = val.phone;
            break;
          }
        }
      }

      customers.push({
        name,
        code: info.code,
        phone: info.phone,
        total: parseArAmount(totalsMatch[2]),
        current: parseArAmount(totalsMatch[3]),
        over30: parseArAmount(totalsMatch[4]),
        over60: parseArAmount(totalsMatch[5]),
        over90: parseArAmount(totalsMatch[6]),
        over120: parseArAmount(totalsMatch[7]),
        retainage: parseArAmount(totalsMatch[8]),
      });
      continue;
    }

    // ── Old-format (2023-era Sage) totals: "TOTAL RETAINAGE\tNAME Totals: CURRENT OVER120 OVER90 OVER60 OVER30 OVER150"
    // Normalize tabs to spaces for old-format matching
    const norm = trimmed.replace(/\t/g, ' ').replace(/ +/g, ' ');

    // Old-format Report Totals (must check before customer totals)
    const oldReportTotalMatch = norm.match(
      /^(-?[\d,]+\.\d+) (-?[\d,]+\.\d+) Report Totals: (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+)$/
    );
    if (oldReportTotalMatch) {
      const over120Val = parseArAmount(oldReportTotalMatch[4]);
      const over150Val = parseArAmount(oldReportTotalMatch[8]);
      reportTotals = {
        total: parseArAmount(oldReportTotalMatch[1]),
        current: parseArAmount(oldReportTotalMatch[3]),
        over30: parseArAmount(oldReportTotalMatch[7]),
        over60: parseArAmount(oldReportTotalMatch[6]),
        over90: parseArAmount(oldReportTotalMatch[5]),
        over120: Math.round((over120Val + over150Val) * 100) / 100,
        retainage: parseArAmount(oldReportTotalMatch[2]),
      };
      continue;
    }

    // Old-format Customer Totals
    const oldTotalsMatch = norm.match(
      /^(-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (.+?) Totals: (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+) (-?[\d,]+\.\d+)$/
    );
    if (oldTotalsMatch) {
      const name = oldTotalsMatch[3].trim();
      const info = customerInfo.get(name) ?? { code: null, phone: null };

      if (!info.code) {
        for (const [key, val] of customerInfo.entries()) {
          if (name.startsWith(key) || key.startsWith(name)) {
            info.code = val.code;
            info.phone = val.phone;
            break;
          }
        }
      }

      const over120Val = parseArAmount(oldTotalsMatch[5]);
      const over150Val = parseArAmount(oldTotalsMatch[9]);

      customers.push({
        name,
        code: info.code,
        phone: info.phone,
        total: parseArAmount(oldTotalsMatch[1]),
        current: parseArAmount(oldTotalsMatch[4]),
        over30: parseArAmount(oldTotalsMatch[8]),
        over60: parseArAmount(oldTotalsMatch[7]),
        over90: parseArAmount(oldTotalsMatch[6]),
        over120: Math.round((over120Val + over150Val) * 100) / 100,
        retainage: parseArAmount(oldTotalsMatch[2]),
      });
      continue;
    }

    // Customer header line: "CustomerName CODE (phone)" or "CustomerName CODE"
    // Skip transaction lines (Invoice, Cash receipt, etc.)
    if (/^(Invoice|Cash receipt|Cust Cash Recpt|Ret\. Released|Write off|Billed credit)\s/.test(trimmed)) continue;

    // Customer header: extract code and optional phone
    const custHeaderWithPhone = trimmed.match(
      /^(.+?)\s+([A-Z][A-Z0-9]{2,})\s+\(?(\d{3})\)?(\d{3})-?(\d{4})$/
    );
    if (custHeaderWithPhone) {
      const custName = custHeaderWithPhone[1].trim();
      const code = custHeaderWithPhone[2];
      const phone = `(${custHeaderWithPhone[3]})${custHeaderWithPhone[4]}-${custHeaderWithPhone[5]}`;
      customerInfo.set(custName, { code, phone });
      continue;
    }

    const custHeaderNoPhone = trimmed.match(
      /^(.+?)\s+([A-Z][A-Z0-9]{2,})$/
    );
    if (custHeaderNoPhone) {
      // Make sure this isn't a transaction line with an ID
      const possibleName = custHeaderNoPhone[1].trim();
      // Skip if it looks like a transaction (starts with known types)
      if (!/^(Invoice|Cash receipt|Ret\.|Write off|Billed credit)/.test(possibleName)) {
        customerInfo.set(possibleName, { code: custHeaderNoPhone[2], phone: null });
      }
    }
  }

  if (!reportDate) throw new Error('Could not find aging as-of date in AR Aging report');
  if (!generatedDate) throw new Error('Could not find generated date in AR Aging report');
  if (!reportTotals) throw new Error('Could not find "Report Totals" line in AR Aging report');

  const customerSum = Math.round(customers.reduce((s, c) => s + c.total, 0) * 100) / 100;
  const matches = Math.abs(customerSum - reportTotals.total) < 0.01;

  if (!matches) {
    throw new Error(
      `AR Aging validation failed: customer sum ${customerSum} !== report total ${reportTotals.total} (diff: ${Math.abs(customerSum - reportTotals.total).toFixed(2)})`
    );
  }

  return {
    reportDate,
    generatedDate,
    customers,
    totals: reportTotals,
    validation: {
      customerSum,
      reportTotal: reportTotals.total,
      matches,
    },
  };
}

// ─────────────────────────────────────────────
// Balance Sheet Parser
// ─────────────────────────────────────────────

export async function parseBalanceSheet(buffer: Buffer): Promise<BalanceSheetResult> {
  const text = await extractText(buffer);
  const lines = text.split('\n');

  let reportDate: Date | null = null;
  const entries: BalanceSheetEntry[] = [];
  let lineOrder = 0;

  type BSSection = BalanceSheetEntry['section'];
  let currentSection: BSSection = 'current_assets';

  // Track key values
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalLiabilitiesAndEquity = 0;
  let netIncome = 0;

  const reconciliation = {
    ar: 0,
    arRetainage: 0,
    costsInExcess: 0,
    billingsInExcess: 0,
  };

  // State: are we in "Assets" or "Liabilities and Equity"?
  let inLiabilitiesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('Confidential: For Internal Use Only')) continue;
    if (/^-- \d+ of \d+ --$/.test(trimmed)) continue;
    if (trimmed === 'Resource Mechanical Insulation') continue;
    if (trimmed === 'Balance Sheet') continue;

    // Extract report date (e.g., "January 31, 2026" or "December 31, 2025")
    if (!reportDate && /^\w+ \d{1,2},?\s+\d{4}$/.test(trimmed)) {
      reportDate = parseWrittenDate(trimmed);
      continue;
    }

    // Section markers
    if (trimmed === 'Assets') continue;
    if (trimmed === 'Current Assets') { currentSection = 'current_assets'; continue; }
    if (trimmed === 'Long Term Assets') { currentSection = 'long_term_assets'; continue; }
    if (trimmed === 'Liabilities and Equity') { inLiabilitiesSection = true; continue; }
    if (trimmed === 'Current Liabilities') { currentSection = 'current_liabilities'; continue; }
    if (trimmed === 'Long Term Liabilities') { currentSection = 'long_term_liabilities'; continue; }
    if (trimmed === 'Equity') { currentSection = 'equity'; continue; }

    // Net Income line (no account number)
    const netIncomeMatch = trimmed.match(/^Net Income\s+\$?\s*([\d,]+\.\d{2}|\([\d,]+\.\d{2}\))$/);
    if (netIncomeMatch) {
      netIncome = parseAccountAmount(netIncomeMatch[1]);
      entries.push({
        accountNumber: null,
        accountName: 'Net Income',
        amount: netIncome,
        section: 'equity',
        isSubtotal: false,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Subtotal lines: "Total X $ amount" or "Total X amount"
    // Also handles "Long Term Liabilities $ amount" (section subtotal without "Total" prefix)
    const subtotalMatch = trimmed.match(/^(Total .+?|Long Term Liabilities)\s+\$?\s*([\d,]+\.\d{2}|\([\d,]+\.\d{2}\))$/);
    if (subtotalMatch) {
      const name = subtotalMatch[1].trim();
      const amount = parseAccountAmount(subtotalMatch[2]);

      if (name === 'Total Assets') totalAssets = amount;
      else if (name === 'Total Liabilities') totalLiabilities = amount;
      else if (name === 'Total Equity') totalEquity = amount;
      else if (name === 'Total Liabilities & Equity') totalLiabilitiesAndEquity = amount;

      // Determine section for this subtotal
      let section: BSSection = currentSection;
      if (name === 'Total Current Assets') section = 'current_assets';
      else if (name === 'Total Long Term Assets') section = 'long_term_assets';
      else if (name === 'Total Assets') section = 'long_term_assets';
      else if (name === 'Total Current Liabilities') section = 'current_liabilities';
      else if (name === 'Long Term Liabilities' || name === 'Total Long Term Liabilities') section = 'long_term_liabilities';
      else if (name === 'Total Liabilities') section = 'long_term_liabilities';
      else if (name === 'Total Equity' || name === 'Total Liabilities & Equity') section = 'equity';

      entries.push({
        accountNumber: null,
        accountName: name,
        amount,
        section,
        isSubtotal: true,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Account lines: "1-NNNN Account Name $ amount" or "1-NNNN Account Name amount" or "1-NNNN Account Name (amount)"
    const accountMatch = trimmed.match(/^(1-\d{4})\s+(.+?)\s+\$?\s*([\d,]+\.\d{2}|\([\d,]+\.\d{2}\))$/);
    if (accountMatch) {
      const acctNum = accountMatch[1];
      const acctName = accountMatch[2].trim();
      const amount = parseAccountAmount(accountMatch[3]);

      // Track reconciliation accounts
      if (acctNum === '1-1100') reconciliation.ar = amount;
      if (acctNum === '1-1110') reconciliation.arRetainage = amount;
      if (acctNum === '1-1500') reconciliation.costsInExcess = amount;
      if (acctNum === '1-2200') reconciliation.billingsInExcess = amount;

      entries.push({
        accountNumber: acctNum,
        accountName: acctName,
        amount,
        section: currentSection,
        isSubtotal: false,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Special case: lines that don't end with a parenthetical amount but have one
    // e.g., "1-2100 Waterford Bank Loan (Note 300,000.28"
    // The "(Note" is part of the name, the amount is at the end WITHOUT parens
    const specialMatch = trimmed.match(/^(1-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})$/);
    if (specialMatch) {
      const acctNum = specialMatch[1];
      const acctName = specialMatch[2].trim();
      const amount = parseAccountAmount(specialMatch[3]);

      if (acctNum === '1-1100') reconciliation.ar = amount;
      if (acctNum === '1-1110') reconciliation.arRetainage = amount;
      if (acctNum === '1-1500') reconciliation.costsInExcess = amount;
      if (acctNum === '1-2200') reconciliation.billingsInExcess = amount;

      entries.push({
        accountNumber: acctNum,
        accountName: acctName,
        amount,
        section: currentSection,
        isSubtotal: false,
        lineOrder: lineOrder++,
      });
      continue;
    }
  }

  if (!reportDate) throw new Error('Could not find report date in Balance Sheet');

  const assetsMatch = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  return {
    reportDate,
    entries,
    totals: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity,
      netIncome,
    },
    reconciliationAccounts: reconciliation,
    validation: {
      assetsMatch,
    },
  };
}

// ─────────────────────────────────────────────
// Income Statement Parser
// ─────────────────────────────────────────────

export async function parseIncomeStatement(buffer: Buffer): Promise<IncomeStatementResult> {
  const text = await extractText(buffer);
  const lines = text.split('\n');

  let periodEndDate: Date | null = null;
  const entries: IncomeStatementEntry[] = [];
  let lineOrder = 0;

  type ISSection = IncomeStatementEntry['section'];
  let currentSection: ISSection = 'income';

  // Key totals
  const totals = {
    totalIncome: { activity: 0, balance: 0 },
    totalCostOfSales: { activity: 0, balance: 0 },
    grossMargin: { activity: 0, balance: 0 },
    totalExpenses: { activity: 0, balance: 0 },
    netIncome: { activity: 0, balance: 0 },
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('Confidential: For Internal Use Only')) continue;
    if (/^-- \d+ of \d+ --$/.test(trimmed)) continue;
    if (trimmed === 'Resource Mechanical Insulation') continue;
    if (trimmed === 'Income Statement') continue;
    if (/^Current\s+Current$/.test(trimmed)) continue;
    if (/^Account Title\s+Activity\s+Balance$/.test(trimmed)) continue;

    // Period end date
    if (!periodEndDate) {
      const periodMatch = trimmed.match(/^For the Period Ended (.+)$/);
      if (periodMatch) {
        periodEndDate = parseWrittenDate(periodMatch[1]);
        continue;
      }
    }

    // Section markers
    if (trimmed === 'Income') { currentSection = 'income'; continue; }
    if (trimmed === 'Cost of Sales') { currentSection = 'cost_of_sales'; continue; }
    if (trimmed === 'Expenses') { currentSection = 'expenses'; continue; }
    if (trimmed === 'Other Income') { currentSection = 'other_income'; continue; }

    // "Total Other Income" with no amount
    if (trimmed === 'Total Other Income') {
      entries.push({
        accountNumber: null,
        accountName: 'Total Other Income',
        currentActivity: 0,
        currentBalance: 0,
        section: 'other_income',
        isSubtotal: true,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Subtotal lines with two amounts
    const subtotalTwoMatch = trimmed.match(
      /^(Total Income|Total Cost of Sales|Gross Margin|Total Expenses|Net Income \(Loss\))\s+\$?\s*([\d,]+|\([\d,]+\))\s+\$?\s*([\d,]+|\([\d,]+\))$/
    );
    if (subtotalTwoMatch) {
      const name = subtotalTwoMatch[1];
      const activity = parseAccountAmount(subtotalTwoMatch[2]);
      const balance = parseAccountAmount(subtotalTwoMatch[3]);

      if (name === 'Total Income') { totals.totalIncome = { activity, balance }; }
      else if (name === 'Total Cost of Sales') { totals.totalCostOfSales = { activity, balance }; }
      else if (name === 'Gross Margin') { totals.grossMargin = { activity, balance }; }
      else if (name === 'Total Expenses') { totals.totalExpenses = { activity, balance }; }
      else if (name === 'Net Income (Loss)') { totals.netIncome = { activity, balance }; }

      let section: ISSection = currentSection;
      if (name === 'Total Income') section = 'income';
      else if (name === 'Total Cost of Sales') section = 'cost_of_sales';
      else if (name === 'Gross Margin') section = 'cost_of_sales';
      else if (name === 'Total Expenses') section = 'expenses';
      else if (name === 'Net Income (Loss)') section = 'expenses';

      entries.push({
        accountNumber: null,
        accountName: name,
        currentActivity: activity,
        currentBalance: balance,
        section,
        isSubtotal: true,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Account line with two amounts
    // Must handle "401(k)" in name — only treat `(digits)` at the END as negative
    const acctTwoMatch = trimmed.match(
      /^(1-\d{4})\s+(.+?)\s+\$?\s*([\d,]+|\(\d[\d,]*\))\s+\$?\s*([\d,]+|\(\d[\d,]*\))$/
    );
    if (acctTwoMatch) {
      entries.push({
        accountNumber: acctTwoMatch[1],
        accountName: acctTwoMatch[2].trim(),
        currentActivity: parseAccountAmount(acctTwoMatch[3]),
        currentBalance: parseAccountAmount(acctTwoMatch[4]),
        section: currentSection,
        isSubtotal: false,
        lineOrder: lineOrder++,
      });
      continue;
    }

    // Account line with ONE amount (balance only, at end of line)
    const acctOneMatch = trimmed.match(
      /^(1-\d{4})\s+(.+?)\s+\$?\s*([\d,]+|\(\d[\d,]*\))$/
    );
    if (acctOneMatch) {
      const acctName = acctOneMatch[2].trim();
      const value = parseAccountAmount(acctOneMatch[3]);

      // Heuristic: single value is the balance (YTD), activity is null
      entries.push({
        accountNumber: acctOneMatch[1],
        accountName: acctName,
        currentActivity: null,
        currentBalance: value,
        section: currentSection,
        isSubtotal: false,
        lineOrder: lineOrder++,
      });
      continue;
    }
  }

  if (!periodEndDate) throw new Error('Could not find "For the Period Ended" date in Income Statement');

  // Validation
  const grossMarginCheck = Math.abs(
    (totals.totalIncome.balance - totals.totalCostOfSales.balance) - totals.grossMargin.balance
  ) < 1; // within $1 rounding for integer amounts

  const netIncomeCheck = Math.abs(
    (totals.grossMargin.balance - totals.totalExpenses.balance) - totals.netIncome.balance
  ) < 1;

  return {
    periodEndDate,
    entries,
    totals,
    validation: {
      grossMarginCheck,
      netIncomeCheck,
    },
  };
}
