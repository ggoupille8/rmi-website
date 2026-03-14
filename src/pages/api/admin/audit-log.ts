import type { APIRoute } from "astro";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { getAuditLog, type AuditAction } from "../../../lib/audit-logger";

export const prerender = false;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const VALID_ACTIONS: AuditAction[] = [
  "login", "logout", "lead_view", "lead_status_change", "lead_delete",
  "lead_forward", "lead_notes_update", "media_upload", "media_delete",
  "settings_change", "analytics_view"
];

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), { status: 401, headers: HEADERS });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);
    const actionParam = url.searchParams.get("action");
    const action = actionParam && VALID_ACTIONS.includes(actionParam as AuditAction)
      ? (actionParam as AuditAction)
      : undefined;

    const { entries, total } = await getAuditLog(limit, offset, action);

    return new Response(
      JSON.stringify({
        entries,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      }),
      { status: 200, headers: HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch audit log", code: "INTERNAL_ERROR" }),
      { status: 500, headers: HEADERS }
    );
  }
};
