-- Vercel Postgres schema for quote submissions
-- Run this in your Vercel Postgres database

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  service_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_service_type ON quotes(service_type);

-- Contacts submissions (contact form)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254),
  phone VARCHAR(50),
  message TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'contact',
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'new',
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Media table (image overrides for landing page slots)
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot VARCHAR(100) UNIQUE NOT NULL,       -- e.g., "hero-1", "service-pipe-insulation-1", "project-henry-ford"
  category VARCHAR(50) NOT NULL,           -- "hero", "service", "project", "cta", "logo"
  blob_url TEXT NOT NULL,                  -- Vercel Blob URL
  file_name VARCHAR(255) NOT NULL,         -- Original filename for reference
  file_size INTEGER NOT NULL,              -- Bytes
  width INTEGER,                           -- Image dimensions (optional)
  height INTEGER,                          -- Image dimensions (optional)
  alt_text TEXT,                           -- Alt text for accessibility
  variants JSONB,                          -- Responsive variant URLs: {"480w": "url", "960w": "url", "1920w": "url"}
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common media queries
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_slot ON media(slot);

-- Lead intelligence data — admin only, never shown to submitter
-- Foreign key to contacts table (id field)
CREATE TABLE IF NOT EXISTS lead_intelligence (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- IP & Network
  ip_address            VARCHAR(45),
  ip_type               VARCHAR(20),
  isp_name              VARCHAR(255),
  isp_org               VARCHAR(255),
  asn                   VARCHAR(20),

  -- Geolocation (IP-derived)
  geo_city              VARCHAR(100),
  geo_region            VARCHAR(100),
  geo_country           VARCHAR(10),
  geo_lat               DECIMAL(9,6),
  geo_lng               DECIMAL(9,6),
  geo_timezone          VARCHAR(50),
  geo_postal            VARCHAR(20),

  -- Device & Browser
  user_agent            TEXT,
  browser_name          VARCHAR(50),
  browser_version       VARCHAR(20),
  os_name               VARCHAR(50),
  os_version            VARCHAR(20),
  device_type           VARCHAR(20),
  screen_width          INTEGER,
  screen_height         INTEGER,
  viewport_width        INTEGER,
  viewport_height       INTEGER,
  device_pixel_ratio    DECIMAL(4,2),
  color_depth           INTEGER,
  touch_support         BOOLEAN,
  hardware_concurrency  INTEGER,
  device_memory         DECIMAL(4,1),

  -- Network quality
  connection_type       VARCHAR(20),
  connection_downlink   DECIMAL(8,2),
  save_data_mode        BOOLEAN DEFAULT FALSE,

  -- Language & locale
  browser_language      VARCHAR(20),
  timezone_offset       INTEGER,

  -- Traffic source
  referrer_url          TEXT,
  referrer_domain       VARCHAR(255),
  traffic_source        VARCHAR(20),
  utm_source            VARCHAR(100),
  utm_medium            VARCHAR(100),
  utm_campaign          VARCHAR(100),
  entry_url             TEXT,

  -- Behavioral signals (collected before submit)
  session_duration_ms   INTEGER,
  time_to_first_key_ms  INTEGER,
  time_on_form_ms       INTEGER,
  scroll_depth_pct      INTEGER,
  field_edit_count      INTEGER,
  message_length        INTEGER,
  optional_fields_filled INTEGER,
  paste_detected        BOOLEAN DEFAULT FALSE,
  tab_blur_count        INTEGER DEFAULT 0,
  idle_periods          INTEGER DEFAULT 0,
  return_visitor        BOOLEAN DEFAULT FALSE,

  -- Submission context
  submitted_at_local    TIMESTAMP WITH TIME ZONE,
  day_of_week           INTEGER,
  hour_of_day           INTEGER,
  is_business_hours     BOOLEAN,

  -- Bot & spam signals
  honeypot_triggered    BOOLEAN DEFAULT FALSE,
  submission_speed_ms   INTEGER,
  is_vpn                BOOLEAN DEFAULT FALSE,
  is_datacenter_ip      BOOLEAN DEFAULT FALSE,
  is_tor                BOOLEAN DEFAULT FALSE,
  bot_score             INTEGER DEFAULT 0,

  -- AI enrichment results
  lead_quality          VARCHAR(10),
  quality_reasoning     TEXT,
  ai_summary            TEXT,
  project_type          VARCHAR(50),
  urgency_signal        VARCHAR(20),
  facility_type         VARCHAR(50),
  location_mentioned    VARCHAR(100),
  scope_signals         TEXT,
  ai_flags              TEXT,

  -- Company verification (web search)
  company_verified      BOOLEAN,
  company_verify_source TEXT,
  company_context       TEXT,

  -- Email validation
  email_domain_type     VARCHAR(20),
  email_mx_valid        BOOLEAN,
  disposable_email      BOOLEAN DEFAULT FALSE,

  -- Metadata
  enriched_at           TIMESTAMP WITH TIME ZONE,
  enrichment_version    VARCHAR(10) DEFAULT '1.0',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_li_contact_id    ON lead_intelligence(contact_id);
CREATE INDEX IF NOT EXISTS idx_li_lead_quality  ON lead_intelligence(lead_quality);
CREATE INDEX IF NOT EXISTS idx_li_bot_score     ON lead_intelligence(bot_score);
CREATE INDEX IF NOT EXISTS idx_li_submitted_at  ON lead_intelligence(submitted_at_local);
CREATE INDEX IF NOT EXISTS idx_li_geo_city      ON lead_intelligence(geo_city);
CREATE INDEX IF NOT EXISTS idx_li_isp_org       ON lead_intelligence(isp_org);

-- ─────────────────────────────────────────────
-- JOBS: Core job records (canonical from job list)
-- Three-source reconciliation: P:\ job list (rank 1), WIP Excel (rank 2), folder structure (rank 3)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  job_number            VARCHAR(20) NOT NULL,         -- raw: "260518"
  job_number_normalized VARCHAR(20) NOT NULL,         -- normalized: "260518" (strips dashes, spaces)
  year                  INTEGER NOT NULL,             -- 26 → 2026
  sequence              VARCHAR(10),                  -- "0518" portion

  -- Project identity
  project_name_canonical VARCHAR(255) NOT NULL,       -- from job list (authoritative)
  client_code           VARCHAR(50),                  -- "MCS", "HFH", "FORD" etc.

  -- Status
  status                VARCHAR(20) DEFAULT 'active', -- active, complete, cancelled, unknown
  confidence_score      INTEGER DEFAULT 100,          -- 0-100, how certain we are this is clean data
  needs_review          BOOLEAN DEFAULT FALSE,        -- flag for manual reconciliation

  -- Source tracking
  in_job_list           BOOLEAN DEFAULT FALSE,        -- found in P:\ root job list
  in_wip                BOOLEAN DEFAULT FALSE,        -- found in WIP accounting files
  has_folder            BOOLEAN DEFAULT FALSE,        -- folder exists in Awarded Contracts

  -- Folder path (relative to P:\Awarded Contracts\)
  folder_name           VARCHAR(500),                 -- raw folder name as-seen
  folder_path           TEXT,                         -- full path

  -- Timestamps
  first_seen_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_number_norm ON jobs(job_number_normalized);
CREATE INDEX IF NOT EXISTS idx_jobs_year            ON jobs(year);
CREATE INDEX IF NOT EXISTS idx_jobs_status          ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_needs_review    ON jobs(needs_review);
CREATE INDEX IF NOT EXISTS idx_jobs_confidence      ON jobs(confidence_score);

-- ─────────────────────────────────────────────
-- JOB NAME VARIANTS: All names seen across sources
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_name_variants (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source    VARCHAR(20) NOT NULL,       -- 'joblist', 'wip', 'folder'
  raw_name  VARCHAR(500) NOT NULL,
  seen_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jnv_job_id ON job_name_variants(job_id);

-- ─────────────────────────────────────────────
-- JOB FINANCIALS: From WIP Excel (per month tab)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_financials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Source tracking
  wip_year            INTEGER NOT NULL,
  wip_month           INTEGER NOT NULL,             -- 1-12
  source_filename     VARCHAR(255),                 -- e.g. "WIP 2026.xlsx"

  -- Financial fields (all nullable — not every row has every column)
  contract_amount     DECIMAL(12,2),
  billed_to_date      DECIMAL(12,2),
  costs_to_date       DECIMAL(12,2),
  remaining           DECIMAL(12,2),
  gross_margin        DECIMAL(12,2),
  gross_margin_pct    DECIMAL(5,2),
  wip_status          VARCHAR(50),                  -- raw status string from spreadsheet

  -- Extraction metadata
  raw_row_data        JSONB,                        -- full row as-extracted, for audit
  confidence_score    INTEGER DEFAULT 100,          -- how clean was the extraction
  extraction_notes    TEXT,                         -- any anomalies noted during parse

  -- Timestamps
  extracted_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jf_job_id   ON job_financials(job_id);
CREATE INDEX IF NOT EXISTS idx_jf_year     ON job_financials(wip_year);
CREATE INDEX IF NOT EXISTS idx_jf_month    ON job_financials(wip_year, wip_month);

-- ─────────────────────────────────────────────
-- JOB FILES: File inventory from Awarded Contracts
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  filename        VARCHAR(500) NOT NULL,
  file_extension  VARCHAR(20),
  file_type       VARCHAR(20),       -- excel, pdf, word, image, other
  file_size_bytes INTEGER,
  relative_path   TEXT,              -- path relative to job folder root
  last_modified   TIMESTAMP WITH TIME ZONE,

  -- Parse state
  parsed          BOOLEAN DEFAULT FALSE,
  parse_attempted BOOLEAN DEFAULT FALSE,
  parse_error     TEXT,

  first_seen_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jfiles_job_id    ON job_files(job_id);
CREATE INDEX IF NOT EXISTS idx_jfiles_type      ON job_files(file_type);
CREATE INDEX IF NOT EXISTS idx_jfiles_parsed    ON job_files(parsed);

-- ─────────────────────────────────────────────
-- JOB DISCREPANCIES: Every anomaly ever detected
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_discrepancies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID REFERENCES jobs(id) ON DELETE SET NULL,

  discrepancy_type    VARCHAR(50) NOT NULL,
  -- Types: 'number_mismatch', 'orphaned_folder', 'orphaned_job_list',
  --        'orphaned_wip', 'name_drift', 'financial_change',
  --        'closed_with_activity', 'active_not_in_wip', 'format_inconsistency'

  source_a            VARCHAR(20),       -- 'joblist', 'wip', 'folder'
  value_a             TEXT,              -- what source A says
  source_b            VARCHAR(20),
  value_b             TEXT,              -- what source B says

  auto_resolved       BOOLEAN DEFAULT FALSE,
  resolution          TEXT,              -- how it was resolved
  resolution_method   VARCHAR(20),       -- 'auto', 'manual', 'pending'

  flagged_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at         TIMESTAMP WITH TIME ZONE,
  resolved_by         VARCHAR(50)        -- 'system' or admin user identifier
);

CREATE INDEX IF NOT EXISTS idx_disc_job_id         ON job_discrepancies(job_id);
CREATE INDEX IF NOT EXISTS idx_disc_type           ON job_discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_disc_resolved       ON job_discrepancies(auto_resolved);
CREATE INDEX IF NOT EXISTS idx_disc_pending_review ON job_discrepancies(resolution_method)
  WHERE resolution_method = 'pending';

-- ─────────────────────────────────────────────
-- SYNC RUNS: Full audit trail of every sync
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_runs (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  started_at                      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at                    TIMESTAMP WITH TIME ZONE,
  status                          VARCHAR(20) DEFAULT 'running',
  -- Statuses: running, complete, failed, partial

  -- Counters
  jobs_total                      INTEGER DEFAULT 0,
  jobs_new                        INTEGER DEFAULT 0,
  jobs_updated                    INTEGER DEFAULT 0,
  files_total                     INTEGER DEFAULT 0,
  files_new                       INTEGER DEFAULT 0,
  discrepancies_found             INTEGER DEFAULT 0,
  discrepancies_auto_resolved     INTEGER DEFAULT 0,
  discrepancies_pending_review    INTEGER DEFAULT 0,

  -- Source data
  sync_source                     VARCHAR(50) DEFAULT 'office-agent',
  agent_version                   VARCHAR(20),

  -- Full report for debugging
  raw_report                      JSONB,
  error_log                       JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_status     ON sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_sync_started_at ON sync_runs(started_at);

-- Media audit log — tracks every media change for full audit trail
CREATE TABLE IF NOT EXISTS media_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  slot              VARCHAR(50) NOT NULL,        -- e.g. "hero-1", "project-henry-ford"
  action            VARCHAR(20) NOT NULL,        -- 'upload', 'revert', 'delete', 'restore'

  -- Before state
  previous_blob_url TEXT,                        -- URL of the image BEFORE the change (null for first upload)
  previous_filename VARCHAR(255),

  -- After state
  new_blob_url      TEXT,                        -- URL of the image AFTER the change (null for delete)
  new_filename      VARCHAR(255),

  -- Who and when
  performed_by      VARCHAR(100) DEFAULT 'admin',
  performed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Notes
  notes             TEXT                         -- optional context
);

CREATE INDEX IF NOT EXISTS idx_mal_slot ON media_audit_log(slot);
CREATE INDEX IF NOT EXISTS idx_mal_action ON media_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_mal_performed_at ON media_audit_log(performed_at DESC);

-- Lead drafts: AI-generated response drafts awaiting admin approval
CREATE TABLE IF NOT EXISTS lead_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  draft_subject   TEXT NOT NULL,
  draft_body      TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'edited', 'skipped'
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at         TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ld_contact_id ON lead_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_ld_status ON lead_drafts(status);
