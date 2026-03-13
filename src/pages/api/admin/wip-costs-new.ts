import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * GET /api/admin/wip-costs-new?since={YYYY-MM-DD}
 *
 * "What's new since the last WIP update":
 * - All invoices entered since the given date
 * - Grouped by job
 * - Used by the controller to update the WIP
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...SECURITY_HEADERS,
        "WWW-Authenticate": 'Bearer realm="admin"',
      },
    });
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  try {
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");

    if (!sinceParam || !/^\d{4}-\d{2}-\d{2}$/.test(sinceParam)) {
      return new Response(
        JSON.stringify({ error: "since parameter required (format: YYYY-MM-DD)" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate it's a real date
    const sinceDate = new Date(sinceParam);
    if (isNaN(sinceDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // All invoices entered since the given date, grouped by job
    const result = await sql`
      SELECT
        i.job_number,
        COUNT(DISTINCT i.id)::int AS invoice_count,
        COUNT(li.id)::int AS line_item_count,
        SUM(li.quantity * li.price_per_item)::numeric AS total_cost,
        SUM(li.tax_amount)::numeric AS total_tax,
        MIN(i.invoice_date)::text AS first_invoice,
        MAX(i.invoice_date)::text AS last_invoice,
        MIN(i.created_at)::text AS first_entered,
        MAX(i.created_at)::text AS last_entered
      FROM invoices i
      JOIN invoice_line_items li ON li.invoice_id = i.id
      WHERE i.invoice_date >= ${sinceParam}
      GROUP BY i.job_number
      ORDER BY SUM(li.quantity * li.price_per_item) DESC
    `;

    // Look up job descriptions from jobs_master
    const jobNumbers = result.rows.map((r) => String(r.job_number));
    const jobsMap = new Map<string, { description: string | null; pm: string | null }>();

    if (jobNumbers.length > 0) {
      const jobsResult = await sql`
        SELECT DISTINCT ON (job_number)
          job_number, description, project_manager
        FROM jobs_master
        WHERE job_number = ANY(${jobNumbers as unknown as string})
        ORDER BY job_number, year DESC
      `;
      for (const row of jobsResult.rows) {
        jobsMap.set(String(row.job_number), {
          description: row.description,
          pm: row.project_manager,
        });
      }
    }

    const jobs = result.rows.map((row) => {
      const master = jobsMap.get(String(row.job_number));
      return {
        jobNumber: String(row.job_number),
        description: master?.description ?? null,
        pm: master?.pm ?? null,
        invoiceCount: Number(row.invoice_count),
        lineItemCount: Number(row.line_item_count),
        totalCost: Math.round(Number(row.total_cost) * 100) / 100,
        totalTax: Math.round(Number(row.total_tax) * 100) / 100,
        firstInvoice: row.first_invoice,
        lastInvoice: row.last_invoice,
        firstEntered: row.first_entered,
        lastEntered: row.last_entered,
      };
    });

    const totalNewCost = jobs.reduce((s, j) => s + j.totalCost, 0);
    const totalInvoices = jobs.reduce((s, j) => s + j.invoiceCount, 0);

    return new Response(
      JSON.stringify({
        since: sinceParam,
        summary: {
          jobCount: jobs.length,
          totalInvoices,
          totalNewCost: Math.round(totalNewCost * 100) / 100,
        },
        jobs,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "WIP new costs error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
