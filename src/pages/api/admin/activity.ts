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

interface ActivityEvent {
  event_type: string;
  description: string;
  event_time: string;
  link: string;
}

/**
 * GET /api/admin/activity — Returns the most recent events across all systems.
 * Aggregates: new leads, WIP uploads, financial report imports.
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...SECURITY_HEADERS, "WWW-Authenticate": 'Bearer realm="admin"' },
    });
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  try {
    const events: ActivityEvent[] = [];

    // Recent leads
    try {
      const leads = await sql`
        SELECT name, created_at FROM contacts
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 5
      `;
      for (const row of leads.rows) {
        events.push({
          event_type: "lead",
          description: `New lead: ${row.name}`,
          event_time: row.created_at,
          link: "/admin/leads",
        });
      }
    } catch { /* table may not exist */ }

    // WIP uploads from sync_log
    try {
      const uploads = await sql`
        SELECT source_file, jobs_total, jobs_created, jobs_updated, created_at
        FROM sync_log
        WHERE sync_type = 'wip-upload'
        ORDER BY created_at DESC LIMIT 5
      `;
      for (const row of uploads.rows) {
        const file = row.source_file ?? "Unknown file";
        const shortName = file.length > 40 ? `…${file.slice(-37)}` : file;
        events.push({
          event_type: "wip_upload",
          description: `WIP upload: ${shortName} (${row.jobs_total ?? 0} jobs)`,
          event_time: row.created_at,
          link: "/admin/wip",
        });
      }
    } catch { /* table may not exist */ }

    // AR Aging imports
    try {
      const ar = await sql`
        SELECT source_filename, report_date, imported_at
        FROM ar_aging_snapshots
        ORDER BY imported_at DESC LIMIT 3
      `;
      for (const row of ar.rows) {
        const name = row.source_filename ?? `AR Aging ${row.report_date}`;
        events.push({
          event_type: "financial_import",
          description: `AR Aging imported: ${name}`,
          event_time: row.imported_at,
          link: "/admin/financials",
        });
      }
    } catch { /* table may not exist */ }

    // Balance Sheet imports
    try {
      const bs = await sql`
        SELECT source_filename, report_date, imported_at
        FROM balance_sheet_snapshots
        ORDER BY imported_at DESC LIMIT 3
      `;
      for (const row of bs.rows) {
        const name = row.source_filename ?? `Balance Sheet ${row.report_date}`;
        events.push({
          event_type: "financial_import",
          description: `Balance Sheet imported: ${name}`,
          event_time: row.imported_at,
          link: "/admin/financials",
        });
      }
    } catch { /* table may not exist */ }

    // Income Statement imports
    try {
      const is_ = await sql`
        SELECT source_filename, period_end_date, imported_at
        FROM income_statement_snapshots
        ORDER BY imported_at DESC LIMIT 3
      `;
      for (const row of is_.rows) {
        const name = row.source_filename ?? `Income Statement ${row.period_end_date}`;
        events.push({
          event_type: "financial_import",
          description: `Income Statement imported: ${name}`,
          event_time: row.imported_at,
          link: "/admin/financials",
        });
      }
    } catch { /* table may not exist */ }

    // Sort by time descending and take top 5
    events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

    return new Response(JSON.stringify({ events: events.slice(0, 5) }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[activity] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
