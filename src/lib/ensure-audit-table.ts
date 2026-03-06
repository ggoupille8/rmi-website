import { sql } from "@vercel/postgres";

let tableVerified = false;

/**
 * Ensure the media_audit_log table exists in the database.
 * Runs CREATE TABLE IF NOT EXISTS on first call, then caches the result
 * so subsequent calls within the same serverless invocation are free.
 */
export async function ensureAuditTable(): Promise<void> {
  if (tableVerified) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS media_audit_log (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slot              VARCHAR(50) NOT NULL,
      action            VARCHAR(20) NOT NULL,
      previous_blob_url TEXT,
      previous_filename VARCHAR(255),
      new_blob_url      TEXT,
      new_filename      VARCHAR(255),
      performed_by      VARCHAR(100) DEFAULT 'admin',
      performed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      notes             TEXT
    )
  `);

  await sql.query(`CREATE INDEX IF NOT EXISTS idx_mal_slot ON media_audit_log(slot)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_mal_action ON media_audit_log(action)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_mal_performed_at ON media_audit_log(performed_at DESC)`);

  tableVerified = true;
}
