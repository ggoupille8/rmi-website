-- Expand lead_intelligence with JSONB columns for maximum intelligence collection
-- Run after 002_add_lead_intelligence.sql

ALTER TABLE lead_intelligence
  ADD COLUMN IF NOT EXISTS browser_fingerprint JSONB,
  ADD COLUMN IF NOT EXISTS screen_info JSONB,
  ADD COLUMN IF NOT EXISTS timezone_info JSONB,
  ADD COLUMN IF NOT EXISTS network_deep JSONB,
  ADD COLUMN IF NOT EXISTS performance_timing JSONB,
  ADD COLUMN IF NOT EXISTS page_context JSONB,
  ADD COLUMN IF NOT EXISTS media_capabilities JSONB,
  ADD COLUMN IF NOT EXISTS storage_probes JSONB,
  ADD COLUMN IF NOT EXISTS canvas_fingerprint VARCHAR(20),
  ADD COLUMN IF NOT EXISTS webgl_info JSONB,
  ADD COLUMN IF NOT EXISTS font_hash VARCHAR(20),
  ADD COLUMN IF NOT EXISTS advanced_behavioral JSONB,
  ADD COLUMN IF NOT EXISTS submission_meta JSONB;
