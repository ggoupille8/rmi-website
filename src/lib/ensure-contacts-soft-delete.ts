import { sql } from "@vercel/postgres";

let migrationVerified = false;

/**
 * Ensure the soft delete columns exist on the contacts table.
 * Runs ALTER TABLE IF NOT EXISTS on first call, then caches the result
 * so subsequent calls within the same serverless invocation are free.
 */
export async function ensureContactsSoftDelete(): Promise<void> {
  if (migrationVerified) return;

  await sql.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);
  await sql.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts (deleted_at) WHERE deleted_at IS NULL`);

  migrationVerified = true;
}
