import { sql } from "@vercel/postgres";

let tableVerified = false;

/**
 * Ensure the media table exists in the database.
 * Runs CREATE TABLE IF NOT EXISTS on first call, then caches the result
 * so subsequent calls within the same serverless invocation are free.
 */
export async function ensureMediaTable(): Promise<void> {
  if (tableVerified) return;

  await sql.query(`
    CREATE TABLE IF NOT EXISTS media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slot VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(50) NOT NULL,
      blob_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      alt_text TEXT,
      variants JSONB,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Add variants column if table already exists but column is missing
  // (handles upgrading existing installations)
  try {
    await sql.query(`
      ALTER TABLE media ADD COLUMN IF NOT EXISTS variants JSONB
    `);
  } catch {
    // Column already exists or ALTER not supported — safe to ignore
  }

  // Ensure indexes exist
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_media_category ON media(category)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_media_slot ON media(slot)`);

  tableVerified = true;
}
