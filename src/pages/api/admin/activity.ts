import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { getActivityLog, getRecentActivity } from "../../../lib/activity-log";

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

function linkForAction(action: string, entityType: string): string {
  if (entityType === "lead") return "/admin/leads";
  if (entityType === "client") return "/admin/clients";
  if (entityType === "invoice") return "/admin/invoices";
  if (entityType === "financial") return "/admin/financials";
  if (entityType === "job") return "/admin/jobs";
  return "/admin/activity";
}

function descriptionForEntry(
  action: string,
  entityType: string,
  details: Record<string, unknown>
): string {
  switch (action) {
    case "status_change":
      return `Lead ${details.name ?? ""} → ${details.new_status ?? "unknown"}`;
    case "create":
      if (entityType === "client") return `New client: ${details.name ?? ""}`;
      if (entityType === "invoice") return `Invoice #${details.invoice_number ?? ""}`;
      return `Created ${entityType}`;
    case "update":
      return `Updated ${entityType}: ${details.name ?? ""}`;
    case "import":
      return `Imported ${details.report_type ?? "report"}: ${details.filename ?? ""}`;
    case "tax_status_change":
      return `Job ${details.job_number ?? ""} tax → ${details.new_status ?? ""}`;
    case "bulk_tax_update":
      return `Bulk: ${details.count ?? 0} jobs → ${details.new_status ?? ""}`;
    default:
      return action;
  }
}

/**
 * GET /api/admin/activity
 *
 * mode=full: Paginated activity_log entries (for Activity Log page)
 * default: Dashboard widget — merges activity_log with legacy aggregated events
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...SECURITY_HEADERS, "WWW-Authenticate": 'Bearer realm="admin"' },
    });
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode");

    // Full mode: paginated activity_log entries
    if (mode === "full") {
      const result = await getActivityLog({
        limit: parseInt(url.searchParams.get("limit") ?? "25", 10),
        offset: parseInt(url.searchParams.get("offset") ?? "0", 10),
        action: url.searchParams.get("action") ?? undefined,
        entityType: url.searchParams.get("entity_type") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: SECURITY_HEADERS,
      });
    }

    // Dashboard widget mode: merge activity_log + legacy events
    const events: ActivityEvent[] = [];

    // Pull from activity_log first
    try {
      const recent = await getRecentActivity(10);
      for (const entry of recent) {
        events.push({
          event_type: entry.action,
          description: descriptionForEntry(entry.action, entry.entity_type, entry.details),
          event_time: entry.created_at,
          link: linkForAction(entry.action, entry.entity_type),
        });
      }
    } catch { /* activity_log may not exist yet */ }

    // Legacy: recent leads (dedup against activity_log events)
    try {
      const leads = await sql`
        SELECT name, created_at FROM contacts
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 5
      `;
      for (const row of leads.rows) {
        const isDup = events.some(
          (e) => e.event_type === "lead" || (e.description.includes(row.name) && e.event_type === "status_change")
        );
        if (!isDup) {
          events.push({
            event_type: "lead",
            description: `New lead: ${row.name}`,
            event_time: row.created_at,
            link: "/admin/leads",
          });
        }
      }
    } catch { /* table may not exist */ }

    // Legacy: WIP uploads
    try {
      const uploads = await sql`
        SELECT source_file, jobs_total, created_at
        FROM sync_log
        WHERE sync_type = 'wip-upload'
        ORDER BY created_at DESC LIMIT 3
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

    // Legacy: financial imports
    try {
      const ar = await sql`
        SELECT source_filename, report_date, imported_at
        FROM ar_aging_snapshots
        ORDER BY imported_at DESC LIMIT 2
      `;
      for (const row of ar.rows) {
        const isDup = events.some(
          (e) => e.event_type === "import" && e.description.includes(row.source_filename ?? "")
        );
        if (!isDup) {
          events.push({
            event_type: "financial_import",
            description: `AR Aging imported: ${row.source_filename ?? row.report_date}`,
            event_time: row.imported_at,
            link: "/admin/financials",
          });
        }
      }
    } catch { /* table may not exist */ }

    events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

    return new Response(JSON.stringify({ events: events.slice(0, 5) }), {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[activity] Error:", message);
    return new Response(JSON.stringify({ error: message, code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
