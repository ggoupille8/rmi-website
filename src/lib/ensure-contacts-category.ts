import { sql } from "@vercel/postgres";

let migrationVerified = false;

/**
 * Ensure the category column exists on the contacts table.
 * Runs ALTER TABLE IF NOT EXISTS on first call, then caches the result
 * so subsequent calls within the same serverless invocation are free.
 */
export async function ensureContactsCategory(): Promise<void> {
  if (migrationVerified) return;

  await sql.query(
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'lead'`
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category)`
  );

  migrationVerified = true;
}
