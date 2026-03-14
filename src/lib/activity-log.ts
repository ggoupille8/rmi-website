import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "./db-env";

let tableEnsured = false;

async function ensureActivityTable(): Promise<boolean> {
  if (tableEnsured) return true;
  const env = getPostgresEnv();
  if (!env) return false;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL DEFAULT '',
        "user" TEXT NOT NULL DEFAULT 'admin',
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    tableEnsured = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget activity logging.
 * Call with .catch(() => {}) to never block the response.
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityId: string = "",
  details: Record<string, unknown> = {},
  user: string = "admin"
): Promise<void> {
  const ready = await ensureActivityTable();
  if (!ready) return;

  await sql`
    INSERT INTO activity_log (action, entity_type, entity_id, "user", details)
    VALUES (${action}, ${entityType}, ${entityId}, ${user}, ${JSON.stringify(details)})
  `;
}

interface ActivityLogOptions {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

interface ActivityEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  user: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Paginated activity log with optional filters (for the Activity Log page).
 */
export async function getActivityLog(
  options: ActivityLogOptions = {}
): Promise<{ entries: ActivityEntry[]; total: number }> {
  const ready = await ensureActivityTable();
  if (!ready) return { entries: [], total: 0 };

  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (options.action) {
    conditions.push(`action = $${idx}`);
    values.push(options.action);
    idx++;
  }
  if (options.entityType) {
    conditions.push(`entity_type = $${idx}`);
    values.push(options.entityType);
    idx++;
  }
  if (options.from) {
    conditions.push(`created_at >= $${idx}`);
    values.push(options.from);
    idx++;
  }
  if (options.to) {
    conditions.push(`created_at <= $${idx}`);
    values.push(options.to + "T23:59:59Z");
    idx++;
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countQ = `SELECT COUNT(*)::int AS total FROM activity_log ${where}`;
  const countValues = [...values];

  const dataQ = `
    SELECT id, action, entity_type, entity_id, "user", details, created_at
    FROM activity_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  values.push(limit, offset);

  const [countRes, dataRes] = await Promise.all([
    sql.query(countQ, countValues),
    sql.query(dataQ, values),
  ]);

  return {
    entries: dataRes.rows as ActivityEntry[],
    total: countRes.rows[0]?.total ?? 0,
  };
}

/**
 * Recent activity entries for the dashboard widget.
 */
export async function getRecentActivity(
  limit: number = 5
): Promise<ActivityEntry[]> {
  const ready = await ensureActivityTable();
  if (!ready) return [];

  const result = await sql`
    SELECT id, action, entity_type, entity_id, "user", details, created_at
    FROM activity_log
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as ActivityEntry[];
}
