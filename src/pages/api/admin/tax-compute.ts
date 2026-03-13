import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import {
  computeLineTax,
  computeInvoiceTax,
  type TaxStatus,
  type TaxOverride,
  type MaterialTaxCategory,
} from "../../../lib/tax-engine";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      ...SECURITY_HEADERS,
      "WWW-Authenticate": 'Bearer realm="admin"',
    },
  });
}

function dbNotConfiguredResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Database not configured" }),
    { status: 500, headers: SECURITY_HEADERS }
  );
}

interface TaxComputeLineItem {
  materialId: number;
  quantity: number;
  pricePerItem: number;
  taxOverride?: boolean | null;
}

interface TaxComputeRequest {
  jobNumber: string;
  invoiceTaxOverride?: TaxOverride;
  lineItems: TaxComputeLineItem[];
}

/**
 * POST /api/admin/tax-compute
 *
 * Preview tax calculation without saving — "dry run" endpoint.
 * Looks up job tax_status and material tax_category from DB,
 * then runs through the tax engine for each line item.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as TaxComputeRequest;
    const { jobNumber, invoiceTaxOverride, lineItems } = body;

    if (!jobNumber || !Array.isArray(lineItems) || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "jobNumber and at least one line item required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Look up job tax status
    const jobResult = await sql`
      SELECT tax_status FROM jobs_master
      WHERE job_number = ${jobNumber}
      ORDER BY year DESC
      LIMIT 1
    `;

    if (jobResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: `Job ${jobNumber} not found` }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const jobTaxStatus = jobResult.rows[0].tax_status as TaxStatus;

    // Look up material details for all line items
    const materialIds = lineItems.map((li) => li.materialId);
    const materialsResult = await sql`
      SELECT id, description, unit, tax_category
      FROM materials
      WHERE id = ANY(${materialIds})
    `;

    const materialsMap = new Map<
      number,
      { description: string; unit: string; taxCategory: MaterialTaxCategory }
    >();
    for (const row of materialsResult.rows) {
      materialsMap.set(Number(row.id), {
        description: String(row.description),
        unit: String(row.unit ?? ""),
        taxCategory: row.tax_category as MaterialTaxCategory,
      });
    }

    const invoiceOverride: TaxOverride = invoiceTaxOverride ?? null;

    // Compute tax for each line item
    const computedLines = lineItems.map((li) => {
      const material = materialsMap.get(li.materialId);
      const taxCategory: MaterialTaxCategory = material?.taxCategory ?? "installed";
      const totalCost = Math.round(li.quantity * li.pricePerItem * 100) / 100;

      const taxResult = computeLineTax(
        jobTaxStatus,
        invoiceOverride,
        taxCategory,
        li.taxOverride ?? null,
        totalCost
      );

      return {
        materialId: li.materialId,
        description: material?.description ?? "Unknown material",
        taxCategory,
        isTaxable: taxResult.isTaxable,
        taxRate: taxResult.taxRate,
        totalCost,
        taxAmount: taxResult.taxAmount,
        reason: taxResult.reason,
        tier: taxResult.tier,
      };
    });

    // Compute invoice totals
    const invoiceTotals = computeInvoiceTax(
      computedLines.map((line) => ({
        totalCost: line.totalCost,
        taxResult: {
          isTaxable: line.isTaxable,
          taxRate: line.taxRate,
          taxAmount: line.taxAmount,
          reason: line.reason,
          tier: line.tier,
        },
      }))
    );

    return new Response(
      JSON.stringify({
        jobTaxStatus,
        lineItems: computedLines,
        subtotal: invoiceTotals.subtotal,
        taxAmount: invoiceTotals.taxAmount,
        total: invoiceTotals.total,
      }),
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Tax compute error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
