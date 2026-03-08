import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "./db-env";

export type AuditAction =
  | "login"
  | "logout"
  | "lead_view"
  | "lead_status_change"
  | "lead_delete"
  | "lead_forward"
  | "lead_notes_update"
  | "media_upload"
  | "media_delete"
  | "settings_change"
  | "analytics_view";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  details: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Ensure the audit_log table exists.
 */
export async function ensureAuditTable(): Promise<void> {
  const { url } = getPostgresEnv();
  if (!url) return;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log (action)
  `;
}

/**
 * Log an admin action.
 * Call this fire-and-forget — never block the response.
 */
export async function logAuditEvent(
  action: AuditAction,
  details: string,
  request?: Request,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { url } = getPostgresEnv();
  if (!url) return;

  try {
    await ensureAuditTable();

    const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = request?.headers.get("user-agent")?.substring(0, 500) || null;

    await sql`
      INSERT INTO audit_log (action, details, ip_address, user_agent, metadata)
      VALUES (${action}, ${details}, ${ipAddress}, ${userAgent}, ${JSON.stringify(metadata)})
    `;
  } catch (error) {
    // Never throw — audit logging should never break the main operation
    console.error("Audit log error:", error instanceof Error ? error.message : "Unknown");
  }
}

/**
 * Get audit log entries.
 */
export async function getAuditLog(
  limit = 50,
  offset = 0,
  action?: AuditAction
): Promise<{ entries: AuditEntry[]; total: number }> {
  const { url } = getPostgresEnv();
  if (!url) return { entries: [], total: 0 };

  try {
    await ensureAuditTable();

    let entries: AuditEntry[];
    let total: number;

    if (action) {
      const result = await sql`
        SELECT * FROM audit_log WHERE action = ${action}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM audit_log WHERE action = ${action}`;
      entries = result.rows as AuditEntry[];
      total = parseInt(countResult.rows[0]?.count || "0", 10);
    } else {
      const result = await sql`
        SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM audit_log`;
      entries = result.rows as AuditEntry[];
      total = parseInt(countResult.rows[0]?.count || "0", 10);
    }

    return { entries, total };
  } catch (error) {
    console.error("Failed to get audit log:", error instanceof Error ? error.message : "Unknown");
    return { entries: [], total: 0 };
  }
}
