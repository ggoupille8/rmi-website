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

// ─── Types ───────────────────────────────────────────────

interface CreateLineItem {
  materialId: number | null;
  description: string;
  quantity: number;
  pricePerItem: number;
  isSpecialPricing?: boolean;
  taxOverride?: boolean | null;
  notes?: string | null;
}

interface CreateInvoiceRequest {
  invoiceNumber: string;
  vendorId: number;
  jobNumber: string;
  invoiceDate: string;
  taxOverride?: TaxOverride;
  notes?: string | null;
  lineItems: CreateLineItem[];
}

// ─── POST: Create Invoice ────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as CreateInvoiceRequest;
    const {
      invoiceNumber,
      vendorId,
      jobNumber,
      invoiceDate,
      taxOverride: invoiceTaxOverride,
      notes,
      lineItems,
    } = body;

    // Validate required fields
    if (!invoiceNumber || !vendorId || !jobNumber || !invoiceDate) {
      return new Response(
        JSON.stringify({ error: "invoiceNumber, vendorId, jobNumber, and invoiceDate are required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one line item is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate vendor exists
    const vendorResult = await sql`
      SELECT id, code, full_name FROM vendors WHERE id = ${vendorId}
    `;
    if (vendorResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: `Vendor ${vendorId} not found` }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate job exists and get tax status
    const jobResult = await sql`
      SELECT job_number, tax_status FROM jobs_master
      WHERE job_number = ${jobNumber}
      ORDER BY year DESC
      LIMIT 1
    `;
    if (jobResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: `Job ${jobNumber} not found` }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const jobTaxStatus = jobResult.rows[0].tax_status as TaxStatus;

    // Mixed job requires invoice-level tax override
    const resolvedInvoiceOverride: TaxOverride = invoiceTaxOverride ?? null;
    if (
      (jobTaxStatus === "mixed" || jobTaxStatus === "unknown") &&
      resolvedInvoiceOverride === null
    ) {
      return new Response(
        JSON.stringify({
          error:
            "This job has mixed tax status. Please specify taxable or exempt for this invoice.",
          jobTaxStatus,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Look up material details for tax computation
    const materialIds = lineItems
      .map((li) => li.materialId)
      .filter((id): id is number => id !== null);

    let materialsMap = new Map<
      number,
      { description: string; taxCategory: MaterialTaxCategory }
    >();

    if (materialIds.length > 0) {
      const materialsResult = await sql`
        SELECT id, description, tax_category
        FROM materials
        WHERE id = ANY(${materialIds})
      `;
      for (const row of materialsResult.rows) {
        materialsMap.set(Number(row.id), {
          description: String(row.description),
          taxCategory: row.tax_category as MaterialTaxCategory,
        });
      }
    }

    // Compute tax for each line item
    const computedLines = lineItems.map((li) => {
      const material = li.materialId ? materialsMap.get(li.materialId) : null;
      const taxCategory: MaterialTaxCategory = material?.taxCategory ?? "installed";
      const totalCost = Math.round(li.quantity * li.pricePerItem * 100) / 100;

      const taxResult = computeLineTax(
        jobTaxStatus,
        resolvedInvoiceOverride,
        taxCategory,
        li.taxOverride ?? null,
        totalCost
      );

      return {
        ...li,
        totalCost,
        taxCategory,
        taxResult,
      };
    });

    // Compute invoice totals
    const invoiceTotals = computeInvoiceTax(
      computedLines.map((line) => ({
        totalCost: line.totalCost,
        taxResult: line.taxResult,
      }))
    );

    // Insert invoice header
    const invoiceResult = await sql`
      INSERT INTO invoices (
        invoice_number, vendor_id, job_number, invoice_date,
        tax_override, subtotal, tax_amount, total, notes
      )
      VALUES (
        ${invoiceNumber}, ${vendorId}, ${jobNumber}, ${invoiceDate},
        ${resolvedInvoiceOverride}, ${invoiceTotals.subtotal},
        ${invoiceTotals.taxAmount}, ${invoiceTotals.total}, ${notes ?? null}
      )
      RETURNING *
    `;
    const invoice = invoiceResult.rows[0];
    const invoiceId = Number(invoice.id);

    // Insert line items
    const insertedLines = [];
    for (const line of computedLines) {
      const lineResult = await sql`
        INSERT INTO invoice_line_items (
          invoice_id, material_id, description, quantity,
          price_per_item, total_cost, is_taxable, tax_rate,
          tax_amount, is_special_pricing, tax_override, notes
        )
        VALUES (
          ${invoiceId}, ${line.materialId}, ${line.description},
          ${line.quantity}, ${line.pricePerItem}, ${line.totalCost},
          ${line.taxResult.isTaxable}, ${line.taxResult.taxRate},
          ${line.taxResult.taxAmount}, ${line.isSpecialPricing ?? false},
          ${line.taxOverride ?? null}, ${line.notes ?? null}
        )
        RETURNING *
      `;
      insertedLines.push({
        ...lineResult.rows[0],
        taxTier: line.taxResult.tier,
        taxReason: line.taxResult.reason,
      });
    }

    // Price update logic: for non-special-pricing items,
    // update vendor price if new price is higher
    for (const line of computedLines) {
      if (line.isSpecialPricing || !line.materialId) continue;

      const currentPrice = await sql`
        SELECT id, price FROM material_prices
        WHERE material_id = ${line.materialId} AND vendor_id = ${vendorId}
      `;

      if (currentPrice.rows.length === 0) {
        // No existing price record — insert new one
        await sql`
          INSERT INTO material_prices (material_id, vendor_id, price, price_date)
          VALUES (${line.materialId}, ${vendorId}, ${line.pricePerItem}, ${invoiceDate})
        `;
      } else {
        const existing = Number(currentPrice.rows[0].price);
        if (line.pricePerItem > existing) {
          await sql`
            UPDATE material_prices
            SET price = ${line.pricePerItem},
                price_date = ${invoiceDate},
                updated_at = NOW()
            WHERE material_id = ${line.materialId} AND vendor_id = ${vendorId}
          `;
        }
      }
    }

    return new Response(
      JSON.stringify({
        invoice: {
          ...invoice,
          jobTaxStatus,
        },
        lineItems: insertedLines,
      }),
      { status: 201, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Invoice create error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

// ─── GET: List / Single Invoice ──────────────────────────

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    // Single invoice by ID
    if (id) {
      const invoiceResult = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.id = ${Number(id)}
      `;

      if (invoiceResult.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invoice not found" }),
          { status: 404, headers: SECURITY_HEADERS }
        );
      }

      const lineItems = await sql`
        SELECT li.*, m.tax_category
        FROM invoice_line_items li
        LEFT JOIN materials m ON m.id = li.material_id
        WHERE li.invoice_id = ${Number(id)}
        ORDER BY li.id
      `;

      return new Response(
        JSON.stringify({
          invoice: invoiceResult.rows[0],
          lineItems: lineItems.rows,
        }),
        { headers: SECURITY_HEADERS }
      );
    }

    // List with filters and pagination
    const jobFilter = url.searchParams.get("job");
    const vendorFilter = url.searchParams.get("vendor");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const perPage = 25;
    const offset = (page - 1) * perPage;

    // Build filtered query — use conditional parameterization
    // @vercel/postgres template literals require static structure,
    // so we handle each filter combination
    let result;
    let countResult;

    if (jobFilter && vendorFilter && fromDate && toDate) {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.job_number = ${jobFilter}
          AND v.code = ${vendorFilter}
          AND i.invoice_date >= ${fromDate}
          AND i.invoice_date <= ${toDate}
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.job_number = ${jobFilter}
          AND v.code = ${vendorFilter}
          AND i.invoice_date >= ${fromDate}
          AND i.invoice_date <= ${toDate}
      `;
    } else if (jobFilter && vendorFilter) {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.job_number = ${jobFilter}
          AND v.code = ${vendorFilter}
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.job_number = ${jobFilter}
          AND v.code = ${vendorFilter}
      `;
    } else if (jobFilter) {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.job_number = ${jobFilter}
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
        WHERE i.job_number = ${jobFilter}
      `;
    } else if (vendorFilter) {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE v.code = ${vendorFilter}
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE v.code = ${vendorFilter}
      `;
    } else if (fromDate && toDate) {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        WHERE i.invoice_date >= ${fromDate}
          AND i.invoice_date <= ${toDate}
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
        WHERE i.invoice_date >= ${fromDate}
          AND i.invoice_date <= ${toDate}
      `;
    } else {
      result = await sql`
        SELECT i.*, v.code AS vendor_code, v.full_name AS vendor_name,
          (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_item_count
        FROM invoices i
        JOIN vendors v ON v.id = i.vendor_id
        ORDER BY i.invoice_date DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) AS total FROM invoices i
      `;
    }

    const total = Number(countResult.rows[0].total);

    return new Response(
      JSON.stringify({
        invoices: result.rows,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      }),
      { headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Invoice list error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

// ─── DELETE: Remove Invoice ──────────────────────────────

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = (await request.json()) as { id?: number };
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Verify invoice exists
    const existing = await sql`SELECT id FROM invoices WHERE id = ${id}`;
    if (existing.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Hard delete — line items cascade via ON DELETE CASCADE
    await sql`DELETE FROM invoices WHERE id = ${id}`;

    return new Response(JSON.stringify({ deleted: id }), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error(
      "Invoice delete error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
