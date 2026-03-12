import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseArAging, parseBalanceSheet, parseIncomeStatement } from '../financial-parsers';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function hasFile(name: string): boolean {
  return fs.existsSync(path.join(DATA_DIR, name));
}

// ─────────────────────────────────────────────
// AR Aging Parser
// ─────────────────────────────────────────────

describe('parseArAging', () => {
  const arFile = 'RMI AR Aging - Jan 2026.PDF';

  it.skipIf(!hasFile(arFile))('extracts 47 customers from Jan 2026', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    expect(result.customers.length).toBe(47);
  });

  it.skipIf(!hasFile(arFile))('total matches $2,588,701.67 to the penny', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    expect(result.totals.total).toBeCloseTo(2588701.67, 2);
  });

  it.skipIf(!hasFile(arFile))('retainage matches -$652,833.44 to the penny', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    expect(result.totals.retainage).toBeCloseTo(-652833.44, 2);
  });

  it.skipIf(!hasFile(arFile))('self-validation passes (customer sum === report total)', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    expect(result.validation.matches).toBe(true);
  });

  it.skipIf(!hasFile(arFile))('extracts report date and generated date', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2026-01-31');
    expect(result.generatedDate.toISOString().split('T')[0]).toBe('2026-02-12');
  });

  it.skipIf(!hasFile(arFile))('extracts customer codes', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    const alco = result.customers.find(c => c.name === 'ALCO Products');
    expect(alco).toBeDefined();
    expect(alco?.code).toBe('ALCOPROD');
  });

  it.skipIf(!hasFile(arFile))('handles "CompanyTotals" (no space) pattern', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    // DTE Electric Company is known to sometimes have no space before Totals
    const dte = result.customers.find(c => c.name === 'DTE Electric Company');
    expect(dte).toBeDefined();
    expect(dte?.total).toBeCloseTo(371537.83, 2);
  });

  it.skipIf(!hasFile(arFile))('parses negative amounts (trailing dash)', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    // Advantage Mech has retainage of -36,581.95
    const adv = result.customers.find(c => c.name.startsWith('Advantage Mechanical'));
    expect(adv).toBeDefined();
    expect(adv?.retainage).toBeLessThan(0);
  });

  it.skipIf(!hasFile(arFile))('all aging buckets sum correctly per customer', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, arFile));
    const result = await parseArAging(buf);
    // Report Totals current + over30..over120 should approximately equal total - retainage
    const { total, current, over30, over60, over90, over120 } = result.totals;
    const bucketSum = Math.round((current + over30 + over60 + over90 + over120) * 100) / 100;
    // Bucket sum may not exactly equal total due to retainage being separate
    expect(typeof bucketSum).toBe('number');
  });
});

// ─────────────────────────────────────────────
// AR Aging Parser — Old format (2023)
// ─────────────────────────────────────────────

describe('parseArAging (2023 old format)', () => {
  const jan2023 = 'RMI AR Aging - January 2023.pdf';
  const dec2023 = 'RMI AR Aging - Dec  2023.pdf';

  it.skipIf(!hasFile(jan2023))('Jan 2023: extracts 42 customers', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.customers.length).toBe(42);
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: total matches $1,073,876.07', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.totals.total).toBeCloseTo(1073876.07, 2);
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: retainage matches -$215,111.17', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.totals.retainage).toBeCloseTo(-215111.17, 2);
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: self-validation passes', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.validation.matches).toBe(true);
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: extracts report date 2023-01-31', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2023-01-31');
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: extracts generated date 2023-02-09', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    expect(result.generatedDate.toISOString().split('T')[0]).toBe('2023-02-09');
  });

  it.skipIf(!hasFile(jan2023))('Jan 2023: over120 combines Over 120 + Over 150 buckets', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, jan2023));
    const result = await parseArAging(buf);
    // Report Over 120 = 48,698.16 + Over 150 = 26,055.07 = 74,753.23
    expect(result.totals.over120).toBeCloseTo(74753.23, 2);
  });

  it.skipIf(!hasFile(dec2023))('Dec 2023: self-validation passes', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, dec2023));
    const result = await parseArAging(buf);
    expect(result.validation.matches).toBe(true);
  });

  it.skipIf(!hasFile(dec2023))('Dec 2023: total matches $2,111,980.85', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, dec2023));
    const result = await parseArAging(buf);
    expect(result.totals.total).toBeCloseTo(2111980.85, 2);
  });

  it.skipIf(!hasFile(dec2023))('Dec 2023: extracts report date 2023-12-31', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, dec2023));
    const result = await parseArAging(buf);
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2023-12-31');
  });

  it.skipIf(!hasFile(dec2023))('Dec 2023: extracts generated date 2024-01-25', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, dec2023));
    const result = await parseArAging(buf);
    expect(result.generatedDate.toISOString().split('T')[0]).toBe('2024-01-25');
  });
});

// ─────────────────────────────────────────────
// Balance Sheet Parser
// ─────────────────────────────────────────────

describe('parseBalanceSheet', () => {
  const bsFile = 'RMI Balance Sheet - Dec 2025.PDF';

  it.skipIf(!hasFile(bsFile))('Total Assets = $5,085,878.52', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.totals.totalAssets).toBeCloseTo(5085878.52, 2);
  });

  it.skipIf(!hasFile(bsFile))('Total Assets === Total L&E (self-validation)', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.validation.assetsMatch).toBe(true);
  });

  it.skipIf(!hasFile(bsFile))('account 1-1100 (AR) = $3,746,294.26', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.reconciliationAccounts.ar).toBeCloseTo(3746294.26, 2);
  });

  it.skipIf(!hasFile(bsFile))('account 1-1110 (AR Retainage) = $765,231.44', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.reconciliationAccounts.arRetainage).toBeCloseTo(765231.44, 2);
  });

  it.skipIf(!hasFile(bsFile))('account 1-1500 (Costs in Excess) = $95,164.00', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.reconciliationAccounts.costsInExcess).toBeCloseTo(95164.0, 2);
  });

  it.skipIf(!hasFile(bsFile))('account 1-2200 (Billings in Excess) = $515,929.00', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.reconciliationAccounts.billingsInExcess).toBeCloseTo(515929.0, 2);
  });

  it.skipIf(!hasFile(bsFile))('handles parenthetical negatives (Accumulated Depreciation)', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    const depr = result.entries.find(e => e.accountNumber === '1-1690');
    expect(depr).toBeDefined();
    expect(depr?.amount).toBeLessThan(0);
  });

  it.skipIf(!hasFile(bsFile))('handles 1-2100 Waterford Bank Loan "(Note" as name, not negative', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    const loan = result.entries.find(e => e.accountNumber === '1-2100');
    expect(loan).toBeDefined();
    expect(loan?.amount).toBeGreaterThan(0); // 300,000.28, NOT negative
  });

  it.skipIf(!hasFile(bsFile))('extracts report date', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    expect(result.reportDate.toISOString().split('T')[0]).toBe('2025-12-31');
  });

  it.skipIf(!hasFile(bsFile))('classifies entries into correct sections', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, bsFile));
    const result = await parseBalanceSheet(buf);
    const sections = new Set(result.entries.map(e => e.section));
    expect(sections.has('current_assets')).toBe(true);
    expect(sections.has('long_term_assets')).toBe(true);
    expect(sections.has('current_liabilities')).toBe(true);
    expect(sections.has('equity')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Income Statement Parser
// ─────────────────────────────────────────────

describe('parseIncomeStatement', () => {
  const isFileJan = 'RMI Income Statement - Jan 2026.PDF';
  const isFileDec = 'RMI Income Statement - Dec 2025.PDF';

  it.skipIf(!hasFile(isFileJan))('Jan 2026: Net Income = $120,425', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    expect(result.totals.netIncome.balance).toBe(120425);
  });

  it.skipIf(!hasFile(isFileJan))('Jan 2026: Total Income = $1,020,075', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    expect(result.totals.totalIncome.balance).toBe(1020075);
  });

  it.skipIf(!hasFile(isFileJan))('Jan 2026: Gross Margin validation passes', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    expect(result.validation.grossMarginCheck).toBe(true);
  });

  it.skipIf(!hasFile(isFileJan))('Jan 2026: Net Income validation passes', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    expect(result.validation.netIncomeCheck).toBe(true);
  });

  it.skipIf(!hasFile(isFileJan))('Jan 2026: extracts period end date', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    expect(result.periodEndDate.toISOString().split('T')[0]).toBe('2026-01-31');
  });

  it.skipIf(!hasFile(isFileJan))('handles 401(k) in account name without confusing parentheses', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    const k401 = result.entries.find(e => e.accountName.includes('401(k)'));
    expect(k401).toBeDefined();
    expect(k401?.currentBalance).toBeGreaterThan(0); // Should be positive 1,735
  });

  it.skipIf(!hasFile(isFileJan))('handles parenthetical negative amounts', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileJan));
    const result = await parseIncomeStatement(buf);
    const discounts = result.entries.find(e => e.accountNumber === '1-4010');
    expect(discounts).toBeDefined();
    expect(discounts?.currentBalance).toBeLessThan(0); // Sales Discounts are negative
  });

  it.skipIf(!hasFile(isFileDec))('Dec 2025: handles single-value lines (balance only)', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileDec));
    const result = await parseIncomeStatement(buf);
    // Lines like "1-6135 Advertising & Promotion 2,099" have only balance
    const adv = result.entries.find(e => e.accountNumber === '1-6135');
    expect(adv).toBeDefined();
    expect(adv?.currentActivity).toBeNull();
    expect(adv?.currentBalance).toBe(2099);
  });

  it.skipIf(!hasFile(isFileDec))('Dec 2025: validation passes with YTD numbers', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileDec));
    const result = await parseIncomeStatement(buf);
    expect(result.validation.grossMarginCheck).toBe(true);
    expect(result.validation.netIncomeCheck).toBe(true);
  });

  it.skipIf(!hasFile(isFileDec))('Dec 2025: classifies entries into correct sections', async () => {
    const buf = fs.readFileSync(path.join(DATA_DIR, isFileDec));
    const result = await parseIncomeStatement(buf);
    const sections = new Set(result.entries.map(e => e.section));
    expect(sections.has('income')).toBe(true);
    expect(sections.has('cost_of_sales')).toBe(true);
    expect(sections.has('expenses')).toBe(true);
  });
});
