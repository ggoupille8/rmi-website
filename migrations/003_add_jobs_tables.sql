-- Migration 003: Jobs, financials, files, discrepancies, and sync tracking
-- Three-source reconciliation: P:\ job list (rank 1), WIP Excel (rank 2), folder structure (rank 3)

-- ─────────────────────────────────────────────
-- JOBS: Core job records (canonical from job list)
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
