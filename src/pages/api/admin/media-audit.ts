import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { ensureMediaTable } from "../../../lib/ensure-media-table";
import { ensureAuditTable } from "../../../lib/ensure-audit-table";

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

/** GET /api/admin/media-audit — fetch audit log entries */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureAuditTable();

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const slotParam = url.searchParams.get("slot");

    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

    let result;
    if (slotParam && typeof slotParam === "string" && slotParam.trim().length > 0) {
      result = await sql.query(
        `SELECT id, slot, action, previous_blob_url, previous_filename,
                new_blob_url, new_filename, performed_by, performed_at, notes
         FROM media_audit_log
         WHERE slot = $1
         ORDER BY performed_at DESC
         LIMIT $2 OFFSET $3`,
        [slotParam.trim(), limit, offset]
      );
    } else {
      result = await sql.query(
        `SELECT id, slot, action, previous_blob_url, previous_filename,
                new_blob_url, new_filename, performed_by, performed_at, notes
         FROM media_audit_log
         ORDER BY performed_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }

    // Get total count for pagination
    const countResult = slotParam
      ? await sql.query(
          `SELECT COUNT(*) as total FROM media_audit_log WHERE slot = $1`,
          [slotParam.trim()]
        )
      : await sql.query(`SELECT COUNT(*) as total FROM media_audit_log`);

    return new Response(
      JSON.stringify({
        logs: result.rows,
        total: parseInt(countResult.rows[0].total as string, 10),
        limit,
        offset,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin audit log fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/** POST /api/admin/media-audit — perform undo or restore action */
export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureMediaTable();
    await ensureAuditTable();

    const body = await request.json();
    const { action, slot, category } = body as {
      action?: unknown;
      slot?: unknown;
      category?: unknown;
    };

    if (!action || typeof action !== "string") {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!slot || typeof slot !== "string") {
      return new Response(
        JSON.stringify({ error: "Slot is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (action === "undo") {
      // Look up the most recent audit log entry for this slot
      const lastChange = await sql.query(
        `SELECT * FROM media_audit_log
         WHERE slot = $1
         ORDER BY performed_at DESC
         LIMIT 1`,
        [slot.trim()]
      );

      if (lastChange.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: "No history found for this slot" }),
          { status: 404, headers: SECURITY_HEADERS }
        );
      }

      const entry = lastChange.rows[0] as {
        action: string;
        previous_blob_url: string | null;
        previous_filename: string | null;
        new_blob_url: string | null;
        new_filename: string | null;
      };

      // Check if there's something to undo to
      if (entry.action === "upload" && entry.previous_blob_url) {
        // Revert to previous image — update media record
        const existing = await sql.query(
          `SELECT id, blob_url, file_name FROM media WHERE slot = $1`,
          [slot.trim()]
        );

        if (existing.rows.length > 0) {
          await sql.query(
            `UPDATE media SET blob_url = $1, file_name = $2, updated_at = NOW() WHERE slot = $3`,
            [entry.previous_blob_url, entry.previous_filename || "restored", slot.trim()]
          );
        }

        // Write audit log
        await sql.query(
          `INSERT INTO media_audit_log (slot, action, previous_blob_url, previous_filename, new_blob_url, new_filename, notes)
           VALUES ($1, 'revert', $2, $3, $4, $5, 'Undo last change')`,
          [
            slot.trim(),
            entry.new_blob_url,
            entry.new_filename,
            entry.previous_blob_url,
            entry.previous_filename,
          ]
        );

        return new Response(
          JSON.stringify({ ok: true, action: "reverted", restoredUrl: entry.previous_blob_url }),
          { status: 200, headers: SECURITY_HEADERS }
        );
      } else if (entry.action === "upload" && !entry.previous_blob_url) {
        // First upload — undo means delete the override entirely
        await sql.query(`DELETE FROM media WHERE slot = $1`, [slot.trim()]);

        await sql.query(
          `INSERT INTO media_audit_log (slot, action, previous_blob_url, previous_filename, notes)
           VALUES ($1, 'revert', $2, $3, 'Undo first upload — reverted to default')`,
          [slot.trim(), entry.new_blob_url, entry.new_filename]
        );

        return new Response(
          JSON.stringify({ ok: true, action: "reverted-to-default" }),
          { status: 200, headers: SECURITY_HEADERS }
        );
      } else if (entry.action === "delete") {
        // Undo a delete — restore the override
        if (!entry.previous_blob_url) {
          return new Response(
            JSON.stringify({ error: "No image to restore" }),
            { status: 400, headers: SECURITY_HEADERS }
          );
        }

        if (!category || typeof category !== "string") {
          return new Response(
            JSON.stringify({ error: "Category is required for restore" }),
            { status: 400, headers: SECURITY_HEADERS }
          );
        }

        // Re-insert the media record
        await sql.query(
          `INSERT INTO media (slot, category, blob_url, file_name, file_size)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT (slot) DO UPDATE SET blob_url = $3, file_name = $4, updated_at = NOW()`,
          [slot.trim(), category, entry.previous_blob_url, entry.previous_filename || "restored"]
        );

        await sql.query(
          `INSERT INTO media_audit_log (slot, action, new_blob_url, new_filename, notes)
           VALUES ($1, 'restore', $2, $3, 'Undo delete — restored custom image')`,
          [slot.trim(), entry.previous_blob_url, entry.previous_filename]
        );

        return new Response(
          JSON.stringify({ ok: true, action: "restored", restoredUrl: entry.previous_blob_url }),
          { status: 200, headers: SECURITY_HEADERS }
        );
      } else if (entry.action === "revert") {
        // Undo a revert — this means re-applying the previous state before the revert
        if (entry.previous_blob_url) {
          const existing = await sql.query(
            `SELECT id FROM media WHERE slot = $1`,
            [slot.trim()]
          );

          if (existing.rows.length > 0) {
            await sql.query(
              `UPDATE media SET blob_url = $1, file_name = $2, updated_at = NOW() WHERE slot = $3`,
              [entry.previous_blob_url, entry.previous_filename || "restored", slot.trim()]
            );
          } else if (category && typeof category === "string") {
            await sql.query(
              `INSERT INTO media (slot, category, blob_url, file_name, file_size)
               VALUES ($1, $2, $3, $4, 0)`,
              [slot.trim(), category, entry.previous_blob_url, entry.previous_filename || "restored"]
            );
          }

          await sql.query(
            `INSERT INTO media_audit_log (slot, action, previous_blob_url, previous_filename, new_blob_url, new_filename, notes)
             VALUES ($1, 'revert', $2, $3, $4, $5, 'Undo revert')`,
            [
              slot.trim(),
              entry.new_blob_url,
              entry.new_filename,
              entry.previous_blob_url,
              entry.previous_filename,
            ]
          );

          return new Response(
            JSON.stringify({ ok: true, action: "reverted" }),
            { status: 200, headers: SECURITY_HEADERS }
          );
        }

        return new Response(
          JSON.stringify({ error: "Nothing to undo" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({ error: "Cannot undo this action" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${String(action)}` }),
      { status: 400, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin audit action error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
