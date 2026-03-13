/**
 * Tax Engine — Three-tier cascade per Michigan RAB 2019-15
 *
 * Priority (highest wins):
 *   1. Manual line-item override (tier: 'override')
 *   2. Consumable materials — always taxable at 6% (tier: 'line_item')
 *   3. Invoice-level tax override (tier: 'invoice')
 *   4. Job default tax status (tier: 'job')
 *
 * Tax rate is 6% (Michigan sales tax) when taxable, 0% when exempt.
 */

export type TaxStatus = 'taxable' | 'exempt' | 'mixed' | 'unknown';
export type MaterialTaxCategory = 'installed' | 'consumable';
export type TaxOverride = 'taxable' | 'exempt' | null;

export interface TaxResult {
  isTaxable: boolean;
  taxRate: number;
  taxAmount: number;
  reason: string;
  tier: 'job' | 'invoice' | 'line_item' | 'override';
}

const MI_TAX_RATE = 0.06;

/**
 * Compute tax for a single line item using the three-tier cascade.
 */
export function computeLineTax(
  jobTaxStatus: TaxStatus,
  invoiceTaxOverride: TaxOverride,
  materialTaxCategory: MaterialTaxCategory,
  lineItemTaxOverride: boolean | null,
  lineTotal: number
): TaxResult {
  // Tier 1: Manual line-item override always wins
  if (lineItemTaxOverride !== null) {
    return buildResult(
      lineItemTaxOverride,
      lineTotal,
      lineItemTaxOverride
        ? 'Manual override: line marked taxable'
        : 'Manual override: line marked exempt',
      'override'
    );
  }

  // Tier 2: Consumable materials (PPE/tools) are ALWAYS taxable
  if (materialTaxCategory === 'consumable') {
    return buildResult(
      true,
      lineTotal,
      'PPE/tools always taxable per RAB 2019-15',
      'line_item'
    );
  }

  // Tier 3: Invoice-level tax override (for installed materials)
  if (invoiceTaxOverride !== null) {
    const taxable = invoiceTaxOverride === 'taxable';
    return buildResult(
      taxable,
      lineTotal,
      taxable ? 'Invoice marked taxable' : 'Invoice marked exempt',
      'invoice'
    );
  }

  // Tier 4: Job default
  if (jobTaxStatus === 'taxable') {
    return buildResult(true, lineTotal, 'Job default: taxable', 'job');
  }

  if (jobTaxStatus === 'exempt') {
    return buildResult(false, lineTotal, 'Job default: exempt', 'job');
  }

  // Mixed or unknown without invoice override → safe default: taxable
  return buildResult(
    true,
    lineTotal,
    jobTaxStatus === 'mixed'
      ? 'Mixed job without invoice override: defaulting to taxable'
      : 'Unknown tax status: defaulting to taxable',
    'job'
  );
}

/**
 * Compute invoice-level tax totals from an array of line items
 * that already have their individual TaxResult computed.
 */
export function computeInvoiceTax(
  lineItems: Array<{ totalCost: number; taxResult: TaxResult }>
): { subtotal: number; taxAmount: number; total: number } {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of lineItems) {
    subtotal += item.totalCost;
    taxAmount += item.taxResult.taxAmount;
  }

  // Round to 2 decimal places to avoid floating-point drift
  subtotal = round2(subtotal);
  taxAmount = round2(taxAmount);

  return {
    subtotal,
    taxAmount,
    total: round2(subtotal + taxAmount),
  };
}

function buildResult(
  isTaxable: boolean,
  lineTotal: number,
  reason: string,
  tier: TaxResult['tier']
): TaxResult {
  const taxRate = isTaxable ? MI_TAX_RATE : 0;
  return {
    isTaxable,
    taxRate,
    taxAmount: round2(lineTotal * taxRate),
    reason,
    tier,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
