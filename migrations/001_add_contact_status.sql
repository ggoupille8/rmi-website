-- Migration: Add lead status tracking to contacts table
-- Run against Vercel Postgres to add status, notes, and updated_at columns

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set existing records to "new" status (default handles this, but explicit for clarity)
UPDATE contacts SET status = 'new' WHERE status IS NULL;
UPDATE contacts SET updated_at = created_at WHERE updated_at IS NULL;

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
