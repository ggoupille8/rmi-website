-- Migration: Add media_audit_log table for full audit trail
-- Tracks every media change: uploads, reverts, deletes, restores

CREATE TABLE IF NOT EXISTS media_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  slot              VARCHAR(50) NOT NULL,
  action            VARCHAR(20) NOT NULL,

  -- Before state
  previous_blob_url TEXT,
  previous_filename VARCHAR(255),

  -- After state
  new_blob_url      TEXT,
  new_filename      VARCHAR(255),

  -- Who and when
  performed_by      VARCHAR(100) DEFAULT 'admin',
  performed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notes
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_mal_slot ON media_audit_log(slot);
CREATE INDEX IF NOT EXISTS idx_mal_action ON media_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_mal_performed_at ON media_audit_log(performed_at DESC);
