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

const VALID_CATEGORIES = ["hero", "service", "project", "cta", "logo"] as const;
type MediaCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(s: unknown): s is MediaCategory {
  return typeof s === "string" && VALID_CATEGORIES.includes(s as MediaCategory);
}

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

/** GET /api/admin/media — list all media, optionally filter by category */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureMediaTable();

    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    let result;
    if (category && isValidCategory(category)) {
      result = await sql.query(
        `SELECT id, slot, category, blob_url, file_name, file_size, width, height, alt_text, variants, uploaded_at, updated_at
         FROM media
         WHERE category = $1
         ORDER BY slot ASC`,
        [category]
      );
    } else {
      result = await sql.query(
        `SELECT id, slot, category, blob_url, file_name, file_size, width, height, alt_text, variants, uploaded_at, updated_at
         FROM media
         ORDER BY category ASC, slot ASC`
      );
    }

    return new Response(
      JSON.stringify({ media: result.rows }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin media fetch error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/** POST /api/admin/media — assign an uploaded image to a slot */
export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureMediaTable();
    await ensureAuditTable();

    const body = await request.json();
    const { slot, category, blobUrl, fileName, fileSize, altText, variants } = body as {
      slot?: unknown;
      category?: unknown;
      blobUrl?: unknown;
      fileName?: unknown;
      fileSize?: unknown;
      altText?: unknown;
      variants?: unknown;
    };

    // Validate required fields
    if (!slot || typeof slot !== "string" || slot.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Slot name is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!isValidCategory(category)) {
      return new Response(
        JSON.stringify({
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!blobUrl || typeof blobUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Blob URL is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!fileName || typeof fileName !== "string") {
      return new Response(
        JSON.stringify({ error: "File name is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (typeof fileSize !== "number" || fileSize <= 0) {
      return new Response(
        JSON.stringify({ error: "File size must be a positive number" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const altTextValue =
      altText !== undefined && typeof altText === "string" ? altText : null;
    const variantsValue =
      variants !== undefined && typeof variants === "object" && variants !== null
        ? JSON.stringify(variants)
        : null;

    // Upsert — if slot already exists, update it (preserve old blobs for audit trail)
    const existing = await sql.query(
      `SELECT id, blob_url, file_name, variants FROM media WHERE slot = $1`,
      [slot.trim()]
    );

    if (existing.rows.length > 0) {
      const oldBlobUrl = existing.rows[0].blob_url as string;
      const oldFileName = existing.rows[0].file_name as string;

      // DO NOT delete old blobs — preserve them for audit trail / undo

      const result = await sql.query(
        `UPDATE media
         SET blob_url = $1, file_name = $2, file_size = $3, alt_text = $4, variants = $5::jsonb, updated_at = NOW()
         WHERE slot = $6
         RETURNING id, slot, category, blob_url, file_name, file_size, alt_text, variants, uploaded_at, updated_at`,
        [blobUrl, fileName, fileSize, altTextValue, variantsValue, slot.trim()]
      );

      // Write audit log entry
      await sql.query(
        `INSERT INTO media_audit_log (slot, action, previous_blob_url, previous_filename, new_blob_url, new_filename)
         VALUES ($1, 'upload', $2, $3, $4, $5)`,
        [slot.trim(), oldBlobUrl, oldFileName, blobUrl, fileName]
      );

      return new Response(
        JSON.stringify({ media: result.rows[0] }),
        { status: 200, headers: SECURITY_HEADERS }
      );
    }

    // Insert new record
    const result = await sql.query(
      `INSERT INTO media (slot, category, blob_url, file_name, file_size, alt_text, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id, slot, category, blob_url, file_name, file_size, alt_text, variants, uploaded_at, updated_at`,
      [slot.trim(), category, blobUrl, fileName, fileSize, altTextValue, variantsValue]
    );

    // Write audit log entry for first upload
    await sql.query(
      `INSERT INTO media_audit_log (slot, action, new_blob_url, new_filename, notes)
       VALUES ($1, 'upload', $2, $3, 'First upload to slot')`,
      [slot.trim(), blobUrl, fileName]
    );

    return new Response(
      JSON.stringify({ media: result.rows[0] }),
      { status: 201, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin media create error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/** PATCH /api/admin/media — update alt text or swap image for a slot */
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureMediaTable();

    const body = await request.json();
    const { id, altText, blobUrl } = body as {
      id?: unknown;
      altText?: unknown;
      blobUrl?: unknown;
    };

    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Media ID is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid media ID format" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Build dynamic update
    const setClauses: string[] = ["updated_at = NOW()"];
    const updateValues: unknown[] = [];
    let idx = 1;

    if (altText !== undefined) {
      if (typeof altText !== "string") {
        return new Response(
          JSON.stringify({ error: "Alt text must be a string" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
      setClauses.push(`alt_text = $${idx}`);
      updateValues.push(altText);
      idx++;
    }

    if (blobUrl !== undefined) {
      if (typeof blobUrl !== "string" || blobUrl.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Blob URL must be a non-empty string" }),
          { status: 400, headers: SECURITY_HEADERS }
        );
      }
      setClauses.push(`blob_url = $${idx}`);
      updateValues.push(blobUrl);
      idx++;
    }

    if (setClauses.length === 1) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    updateValues.push(id);
    const result = await sql.query(
      `UPDATE media
       SET ${setClauses.join(", ")}
       WHERE id = $${idx}
       RETURNING id, slot, category, blob_url, file_name, file_size, alt_text, uploaded_at, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Media not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({ media: result.rows[0] }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin media update error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};

/** DELETE /api/admin/media — remove override from a slot (reverts to static fallback, preserves blob) */
export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    await ensureMediaTable();
    await ensureAuditTable();

    const body = await request.json();
    const { id } = body as { id?: unknown };

    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Media ID is required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid media ID format" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Fetch the record to get blob URL before deleting
    const existing = await sql.query(
      `SELECT id, slot, blob_url, file_name, variants FROM media WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Media not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const { slot, blob_url: blobUrl, file_name: fileName } = existing.rows[0] as {
      slot: string;
      blob_url: string;
      file_name: string;
    };

    // Delete from database (but DO NOT delete blobs — preserve for audit trail / undo)
    await sql.query(`DELETE FROM media WHERE id = $1`, [id]);

    // Write audit log entry
    await sql.query(
      `INSERT INTO media_audit_log (slot, action, previous_blob_url, previous_filename, notes)
       VALUES ($1, 'delete', $2, $3, 'Reverted to default image')`,
      [slot, blobUrl, fileName]
    );

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    console.error(
      "Admin media delete error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
