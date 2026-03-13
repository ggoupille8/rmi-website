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

  // ─── New edge case tests ─────────────────────────────

  it('zero line total → tax amount is 0', () => {
    const result = computeLineTax('taxable', null, 'installed', null, 0);
    expect(result.isTaxable).toBe(true);
    expect(result.taxRate).toBe(0.06);
    expect(result.taxAmount).toBe(0);
  });

  it('zero quantity scenario (lineTotal=0) → tax amount is 0 even on taxable job', () => {
    // Simulates qty=0 × price=50 → lineTotal=0
    const result = computeLineTax('taxable', null, 'consumable', null, 0);
    expect(result.isTaxable).toBe(true);
    expect(result.taxAmount).toBe(0);
    expect(result.tier).toBe('line_item');
    expect(result.reason).toContain('RAB 2019-15');
  });

  it('rounding: 3 items at $1.33 → tax rounds to 2 decimal places', () => {
    // 3 × $1.33 = $3.99, tax = 3.99 × 0.06 = 0.2394 → 0.24
    const result = computeLineTax('taxable', null, 'installed', null, 3.99);
    expect(result.taxAmount).toBe(0.24);
    expect(typeof result.taxAmount).toBe('number');
    // Verify it's exactly 2 decimal places
    expect(result.taxAmount.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });

  it('multi-line invoice: mix of taxable and exempt items, subtotal + tax = total', () => {
    // Taxable installed material
    const taxableLine = computeLineTax('taxable', null, 'installed', null, 250);
    // Same job, but line-item override to exempt
    const exemptLine = computeLineTax('taxable', null, 'installed', false, 150);
    // Consumable (always taxable)
    const consumableLine = computeLineTax('taxable', null, 'consumable', null, 75);

    const invoiceResult = computeInvoiceTax([
      { totalCost: 250, taxResult: taxableLine },
      { totalCost: 150, taxResult: exemptLine },
      { totalCost: 75, taxResult: consumableLine },
    ]);

    expect(invoiceResult.subtotal).toBe(475);
    // Tax: 250×0.06=15 + 0 + 75×0.06=4.50 = 19.50
    expect(invoiceResult.taxAmount).toBe(19.50);
    expect(invoiceResult.total).toBe(494.50);
    expect(invoiceResult.total).toBe(invoiceResult.subtotal + invoiceResult.taxAmount);
  });

  it('null material tax category defaults to installed behavior', () => {
    // The tax engine treats 'installed' as the default — when category is 'installed',
    // it defers to job/invoice tier (not forced taxable like consumable)
    const result = computeLineTax('exempt', null, 'installed', null, 100);
    expect(result.isTaxable).toBe(false);
    expect(result.taxAmount).toBe(0);
    expect(result.tier).toBe('job');
  });

  it('very small fractional amount rounds correctly', () => {
    // $0.01 × 0.06 = 0.0006 → rounds to 0.00
    const result = computeLineTax('taxable', null, 'installed', null, 0.01);
    expect(result.taxAmount).toBe(0);
  });

  it('large line total computes correct tax', () => {
    // $999,999.99 × 0.06 = $59,999.9994 → rounds to $60,000.00
    const result = computeLineTax('taxable', null, 'installed', null, 999999.99);
    expect(result.taxAmount).toBe(60000);
  });

  it('exempt job + consumable + line override exempt → override wins', () => {
    // Even though consumable is "always taxable", line override should win
    const result = computeLineTax('exempt', null, 'consumable', false, 100);
    expect(result.isTaxable).toBe(false);
    expect(result.taxAmount).toBe(0);
    expect(result.tier).toBe('override');
  });

  it('all four tax statuses produce expected tier for installed material', () => {
    const taxable = computeLineTax('taxable', null, 'installed', null, 100);
    expect(taxable.tier).toBe('job');
    expect(taxable.isTaxable).toBe(true);

    const exempt = computeLineTax('exempt', null, 'installed', null, 100);
    expect(exempt.tier).toBe('job');
    expect(exempt.isTaxable).toBe(false);

    const mixed = computeLineTax('mixed', null, 'installed', null, 100);
    expect(mixed.tier).toBe('job');
    expect(mixed.isTaxable).toBe(true); // defaults to taxable

    const unknown = computeLineTax('unknown', null, 'installed', null, 100);
    expect(unknown.tier).toBe('job');
    expect(unknown.isTaxable).toBe(true); // defaults to taxable
  });

  it('mixed job reason contains "Mixed job without invoice override"', () => {
    const result = computeLineTax('mixed', null, 'installed', null, 100);
    expect(result.reason).toBe('Mixed job without invoice override: defaulting to taxable');
  });

  it('unknown job reason contains "Unknown tax status"', () => {
    const result = computeLineTax('unknown', null, 'installed', null, 100);
    expect(result.reason).toBe('Unknown tax status: defaulting to taxable');
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

  // ─── New edge case tests ─────────────────────────────

  it('single line item computes correctly', () => {
    const result = computeInvoiceTax([
      { totalCost: 500, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 30, reason: '', tier: 'job' as const } },
    ]);
    expect(result.subtotal).toBe(500);
    expect(result.taxAmount).toBe(30);
    expect(result.total).toBe(530);
  });

  it('all exempt lines → zero tax total', () => {
    const lineItems = [
      { totalCost: 100, taxResult: { isTaxable: false, taxRate: 0, taxAmount: 0, reason: '', tier: 'job' as const } },
      { totalCost: 200, taxResult: { isTaxable: false, taxRate: 0, taxAmount: 0, reason: '', tier: 'invoice' as const } },
      { totalCost: 300, taxResult: { isTaxable: false, taxRate: 0, taxAmount: 0, reason: '', tier: 'override' as const } },
    ];

    const result = computeInvoiceTax(lineItems);
    expect(result.subtotal).toBe(600);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(600);
  });

  it('many small items accumulate correctly without drift', () => {
    // 10 items at $9.99 each, taxed
    const lineItems = Array.from({ length: 10 }, () => ({
      totalCost: 9.99,
      taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 0.60, reason: '', tier: 'job' as const },
    }));

    const result = computeInvoiceTax(lineItems);
    expect(result.subtotal).toBe(99.90);
    expect(result.taxAmount).toBe(6);
    expect(result.total).toBe(105.90);
  });

  it('total always equals subtotal + taxAmount', () => {
    const lineItems = [
      { totalCost: 123.45, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 7.41, reason: '', tier: 'job' as const } },
      { totalCost: 67.89, taxResult: { isTaxable: false, taxRate: 0, taxAmount: 0, reason: '', tier: 'invoice' as const } },
      { totalCost: 0.01, taxResult: { isTaxable: true, taxRate: 0.06, taxAmount: 0, reason: '', tier: 'line_item' as const } },
    ];

    const result = computeInvoiceTax(lineItems);
    expect(result.total).toBe(result.subtotal + result.taxAmount);
  });
});
