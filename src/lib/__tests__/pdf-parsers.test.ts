import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────
// Utility function tests (no fixtures needed)
// ─────────────────────────────────────────────

import { parseAccountAmount, parseArAmount, detectReportType } from '../financial-parsers';

describe('parseAccountAmount', () => {
  it('parses comma-separated number: "1,234.56" → 1234.56', () => {
    expect(parseAccountAmount('1,234.56')).toBe(1234.56);
  });

  it('parses parenthetical negative: "(1,234.56)" → -1234.56', () => {
    expect(parseAccountAmount('(1,234.56)')).toBe(-1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseAccountAmount('')).toBe(0);
  });

  it('returns 0 for dash: "-"', () => {
    expect(parseAccountAmount('-')).toBe(0);
  });

  it('parses integer: "1234" → 1234', () => {
    expect(parseAccountAmount('1234')).toBe(1234);
  });

  it('strips dollar sign: "$5,000.00" → 5000', () => {
    expect(parseAccountAmount('$5,000.00')).toBe(5000);
  });

  it('parses negative parenthetical with dollar sign: "($500.00)" → -500', () => {
    expect(parseAccountAmount('($500.00)')).toBe(-500);
  });

  it('handles whitespace: "  1,000.00  " → 1000', () => {
    expect(parseAccountAmount('  1,000.00  ')).toBe(1000);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseAccountAmount('abc')).toBe(0);
  });
});

describe('parseArAmount', () => {
  it('parses standard amount: "1,234.56" → 1234.56', () => {
    expect(parseArAmount('1,234.56')).toBe(1234.56);
  });

  it('parses trailing dash as negative: "5,250.00-" → -5250', () => {
    expect(parseArAmount('5,250.00-')).toBe(-5250);
  });

  it('strips asterisk suffix: "1,234.56*" → 1234.56', () => {
    expect(parseArAmount('1,234.56*')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseArAmount('')).toBe(0);
  });

  it('parses zero: "0.00" → 0', () => {
    expect(parseArAmount('0.00')).toBe(0);
  });

  it('parses large amounts: "2,588,701.67" → 2588701.67', () => {
    expect(parseArAmount('2,588,701.67')).toBe(2588701.67);
  });
});

describe('detectReportType', () => {
  it('"RMI AR Aging - Jan 2026.PDF" → ar_aging', () => {
    expect(detectReportType('RMI AR Aging - Jan 2026.PDF')).toBe('ar_aging');
  });

  it('"RMI Balance Sheet - Dec 2025 post AJEs.pdf" → balance_sheet', () => {
    expect(detectReportType('RMI Balance Sheet - Dec 2025 post AJEs.pdf')).toBe('balance_sheet');
  });

  it('"RMI Income Statement - Jan 2024.pdf" → income_statement', () => {
    expect(detectReportType('RMI Income Statement - Jan 2024.pdf')).toBe('income_statement');
  });

  it('"RMI Income Stmt - Feb 2026.pdf" → income_statement', () => {
    expect(detectReportType('RMI Income Stmt - Feb 2026.pdf')).toBe('income_statement');
  });

  it('returns null for unrecognized filenames', () => {
    expect(detectReportType('random-document.pdf')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(detectReportType('rmi ar aging - jan 2026.pdf')).toBe('ar_aging');
    expect(detectReportType('RMI BALANCE SHEET - DEC 2025.PDF')).toBe('balance_sheet');
  });
});

// ─────────────────────────────────────────────
// Parser tests using anonymized fixtures
// Fixtures use fictional customer names, amounts, and phone numbers.
// Company name "Resource Mechanical Insulation" is kept because
// the parser's skip-line and date-extraction logic depends on it.
// ─────────────────────────────────────────────

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
}

// Store fixture text to inject into the mock
let mockPdfText = '';

// Mock pdf-parse so parsers receive fixture text instead of reading a real PDF.
// PDFParse is used as a constructor (new PDFParse(uint8)), so mock it as a class.
vi.mock('pdf-parse', () => ({
  PDFParse: class MockPDFParse {
    getText() {
      return Promise.resolve({ text: mockPdfText });
    }
  },
}));

// Import parsers AFTER mock is set up
import { parseArAging, parseBalanceSheet, parseIncomeStatement } from '../financial-parsers';

describe('parseArAging (anonymized fixture)', () => {
  beforeEach(() => {
    mockPdfText = loadFixture('sample-ar-aging.txt');
  });

  it('extracts 4 customers', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.customers.length).toBe(4);
  });

  it('report total matches $280,050.00', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.totals.total).toBeCloseTo(280050, 2);
  });

  it('retainage is negative ($-24,000.00)', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.totals.retainage).toBeCloseTo(-24000, 2);
  });

  it('self-validation passes (customer sum ≈ report total)', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.validation.matches).toBe(true);
  });

  it('extracts aging as-of date: 2026-02-28', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2026-02-28');
  });

  it('extracts generated date: 2026-03-15', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    expect(result.generatedDate.toISOString().split('T')[0]).toBe('2026-03-15');
  });

  it('extracts customer codes', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    const alpha = result.customers.find(c => c.name === 'Alpha Manufacturing');
    expect(alpha).toBeDefined();
    expect(alpha?.code).toBe('ALPHAMFG');
  });

  it('extracts customer phone numbers', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    const alpha = result.customers.find(c => c.name === 'Alpha Manufacturing');
    expect(alpha?.phone).toBe('(313)555-0101');
  });

  it('aging buckets sum correctly', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    const { current, over30, over60, over90, over120 } = result.totals;
    expect(current).toBeCloseTo(193750, 2);
    expect(over30).toBeCloseTo(80000, 2);
    expect(over60).toBeCloseTo(22100, 2);
    expect(over90).toBeCloseTo(8200, 2);
    expect(over120).toBeCloseTo(0, 2);
  });

  it('handles negative retainage per customer', async () => {
    const result = await parseArAging(Buffer.from('dummy'));
    const alpha = result.customers.find(c => c.name === 'Alpha Manufacturing');
    expect(alpha?.retainage).toBeLessThan(0);
  });
});

describe('parseBalanceSheet (anonymized fixture)', () => {
  beforeEach(() => {
    mockPdfText = loadFixture('sample-balance-sheet.txt');
  });

  it('extracts report date: 2026-01-31', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2026-01-31');
  });

  it('total assets = $1,911,001.25', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    expect(result.totals.totalAssets).toBeCloseTo(1911001.25, 2);
  });

  it('total assets === total liabilities & equity (self-validation)', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    expect(result.validation.assetsMatch).toBe(true);
  });

  it('categorizes assets vs liabilities vs equity', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    const sections = new Set(result.entries.map(e => e.section));
    expect(sections.has('current_assets')).toBe(true);
    expect(sections.has('long_term_assets')).toBe(true);
    expect(sections.has('current_liabilities')).toBe(true);
    expect(sections.has('equity')).toBe(true);
  });

  it('extracts account numbers and amounts', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    const ar = result.entries.find(e => e.accountNumber === '1-1100');
    expect(ar).toBeDefined();
    expect(ar?.amount).toBeCloseTo(1250000.50, 2);
    expect(ar?.accountName).toBe('Accounts Receivable');
  });

  it('reconciliation accounts extracted correctly', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    expect(result.reconciliationAccounts.ar).toBeCloseTo(1250000.50, 2);
    expect(result.reconciliationAccounts.arRetainage).toBeCloseTo(325000, 2);
    expect(result.reconciliationAccounts.costsInExcess).toBeCloseTo(45000, 2);
    expect(result.reconciliationAccounts.billingsInExcess).toBeCloseTo(275000, 2);
  });

  it('handles parenthetical negatives (accumulated depreciation)', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    const depr = result.entries.find(e => e.accountNumber === '1-1690');
    expect(depr).toBeDefined();
    expect(depr?.amount).toBeLessThan(0);
    expect(depr?.amount).toBeCloseTo(-42500, 2);
  });

  it('handles account with "(Note" in name — not parsed as negative', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    const loan = result.entries.find(e => e.accountNumber === '1-2100');
    expect(loan).toBeDefined();
    expect(loan?.amount).toBeGreaterThan(0);
  });

  it('net income extracted', async () => {
    const result = await parseBalanceSheet(Buffer.from('dummy'));
    expect(result.totals.netIncome).toBeCloseTo(120425, 2);
  });
});

describe('parseIncomeStatement (anonymized fixture)', () => {
  beforeEach(() => {
    mockPdfText = loadFixture('sample-income-statement.txt');
  });

  it('extracts period end date: 2026-01-31', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    expect(result.periodEndDate.toISOString().split('T')[0]).toBe('2026-01-31');
  });

  it('extracts revenue, COGS, expenses', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    expect(result.totals.totalIncome.balance).toBe(1020075);
    expect(result.totals.totalCostOfSales.balance).toBe(623500);
  });

  it('gross profit = revenue - COGS', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    expect(result.validation.grossMarginCheck).toBe(true);
    expect(result.totals.grossMargin.balance).toBe(396575);
  });

  it('net income validation passes', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    expect(result.validation.netIncomeCheck).toBe(true);
  });

  it('handles 401(k) in account name without confusing parentheses', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    const k401 = result.entries.find(e => e.accountName.includes('401(k)'));
    expect(k401).toBeDefined();
    expect(k401?.currentBalance).toBeGreaterThan(0);
  });

  it('handles parenthetical negative amounts (Sales Discounts)', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    const discounts = result.entries.find(e => e.accountNumber === '1-4010');
    expect(discounts).toBeDefined();
    expect(discounts?.currentBalance).toBeLessThan(0);
  });

  it('handles single-value lines (balance only, no activity)', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    const adv = result.entries.find(e => e.accountNumber === '1-6135');
    expect(adv).toBeDefined();
    expect(adv?.currentActivity).toBeNull();
    expect(adv?.currentBalance).toBe(2099);
  });

  it('classifies entries into correct sections', async () => {
    const result = await parseIncomeStatement(Buffer.from('dummy'));
    const sections = new Set(result.entries.map(e => e.section));
    expect(sections.has('income')).toBe(true);
    expect(sections.has('cost_of_sales')).toBe(true);
    expect(sections.has('expenses')).toBe(true);
  });
});
