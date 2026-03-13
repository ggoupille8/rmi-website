import { describe, it, expect } from 'vitest';
import {
  computeLineTax,
  computeInvoiceTax,
  type TaxStatus,
  type TaxOverride,
  type MaterialTaxCategory,
} from '../tax-engine';

describe('computeLineTax', () => {
  const LINE_TOTAL = 100;

  it('taxable job + installed material = taxable', () => {
    const result = computeLineTax('taxable', null, 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.taxRate).toBe(0.06);
    expect(result.taxAmount).toBe(6);
    expect(result.tier).toBe('job');
  });

  it('taxable job + consumable material = taxable', () => {
    const result = computeLineTax('taxable', null, 'consumable', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.taxRate).toBe(0.06);
    expect(result.taxAmount).toBe(6);
    expect(result.tier).toBe('line_item');
    expect(result.reason).toContain('RAB 2019-15');
  });

  it('exempt job + installed material = exempt', () => {
    const result = computeLineTax('exempt', null, 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(false);
    expect(result.taxRate).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.tier).toBe('job');
  });

  it('exempt job + consumable material = taxable (RAB 2019-15)', () => {
    const result = computeLineTax('exempt', null, 'consumable', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.taxRate).toBe(0.06);
    expect(result.taxAmount).toBe(6);
    expect(result.tier).toBe('line_item');
  });

  it('mixed job + no invoice override = taxable (safe default)', () => {
    const result = computeLineTax('mixed', null, 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.taxAmount).toBe(6);
    expect(result.tier).toBe('job');
    expect(result.reason).toContain('defaulting to taxable');
  });

  it('mixed job + invoice override exempt + installed = exempt', () => {
    const result = computeLineTax('mixed', 'exempt', 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(false);
    expect(result.taxAmount).toBe(0);
    expect(result.tier).toBe('invoice');
  });

  it('mixed job + invoice override exempt + consumable = taxable', () => {
    const result = computeLineTax('mixed', 'exempt', 'consumable', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.taxAmount).toBe(6);
    expect(result.tier).toBe('line_item');
  });

  it('line item override always wins over all other tiers', () => {
    // Override to exempt even on taxable job with consumable
    const exemptOverride = computeLineTax('taxable', 'taxable', 'consumable', false, LINE_TOTAL);
    expect(exemptOverride.isTaxable).toBe(false);
    expect(exemptOverride.taxAmount).toBe(0);
    expect(exemptOverride.tier).toBe('override');

    // Override to taxable even on exempt job
    const taxableOverride = computeLineTax('exempt', 'exempt', 'installed', true, LINE_TOTAL);
    expect(taxableOverride.isTaxable).toBe(true);
    expect(taxableOverride.taxAmount).toBe(6);
    expect(taxableOverride.tier).toBe('override');
  });

  it('unknown job status defaults to taxable', () => {
    const result = computeLineTax('unknown', null, 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.tier).toBe('job');
    expect(result.reason).toContain('Unknown');
  });

  it('invoice override taxable applies to installed materials', () => {
    const result = computeLineTax('exempt', 'taxable', 'installed', null, LINE_TOTAL);
    expect(result.isTaxable).toBe(true);
    expect(result.tier).toBe('invoice');
  });

  it('computes correct tax amount for fractional totals', () => {
    const result = computeLineTax('taxable', null, 'installed', null, 42.13);
    expect(result.taxAmount).toBe(2.53); // 42.13 * 0.06 = 2.5278 → rounds to 2.53
  });
});

describe('computeInvoiceTax', () => {
  it('sums subtotal, tax, and total from line items', () => {
    const lineItems = [
      { totalCost: 100, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 6, reason: '', tier: 'job' as const } },
      { totalCost: 50, taxResult: { isTaxable: false, taxRate: 0, taxAmount: 0, reason: '', tier: 'invoice' as const } },
      { totalCost: 30, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 1.80, reason: '', tier: 'line_item' as const } },
    ];

    const result = computeInvoiceTax(lineItems);
    expect(result.subtotal).toBe(180);
    expect(result.taxAmount).toBe(7.80);
    expect(result.total).toBe(187.80);
  });

  it('handles empty line items', () => {
    const result = computeInvoiceTax([]);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('avoids floating-point drift', () => {
    const lineItems = [
      { totalCost: 33.33, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 2, reason: '', tier: 'job' as const } },
      { totalCost: 33.33, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 2, reason: '', tier: 'job' as const } },
      { totalCost: 33.34, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 2, reason: '', tier: 'job' as const } },
    ];

    const result = computeInvoiceTax(lineItems);
    expect(result.subtotal).toBe(100);
    expect(result.total).toBe(106);
  });
});
