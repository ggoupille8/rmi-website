-- Migration 011: Job tracking tables for WIP spreadsheet sync
-- Replaces the unused migration 003 schema (three-source reconciliation)
-- with a simpler model synced directly from RMI Job W.I.P.xlsm

-- Drop old unused tables from migration 003 (never populated)
DROP TABLE IF EXISTS job_discrepancies CASCADE;
DROP TABLE IF EXISTS job_files CASCADE;
DROP TABLE IF EXISTS job_financials CASCADE;
DROP TABLE IF EXISTS job_name_variants CASCADE;
DROP TABLE IF EXISTS sync_runs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- ─────────────────────────────────────────────
-- JOBS: Synced from RMI Job W.I.P.xlsm
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id              SERIAL PRIMARY KEY,
  job_number      VARCHAR(10) NOT NULL UNIQUE,  -- e.g., "260201"
  year            INTEGER NOT NULL,             -- extracted from job number or sheet tab
  description     TEXT,                         -- "CMS DIG 2026 Maint."
  customer_name   VARCHAR(255),                 -- "CMS", "Direct", "John E. Green"
  job_type        VARCHAR(10),                  -- "TM" or "LS"
  section         VARCHAR(30),                  -- "T&M", "T&M/Small", "Lump Sum"
  contract_value  DECIMAL(12,2),                -- dollar amount for LS; NULL for TM
  timing          VARCHAR(50),                  -- "01-01 to 12-31"
  close_date      VARCHAR(50),                  -- month ending close date
  po_number       VARCHAR(100),                 -- "Various", "1425073-3082", etc.
  taxable         VARCHAR(10),                  -- "Y", "N", "N / Y"
  general_contractor VARCHAR(255),              -- GC contact name
  project_manager VARCHAR(10),                  -- "GG", "MD", "RG", "SB"
  status          VARCHAR(20) NOT NULL DEFAULT 'open', -- "open", "closed", "written_up"
  is_hidden       BOOLEAN DEFAULT false,        -- hidden rows (reserved numbers)
  has_folder      BOOLEAN DEFAULT false,        -- matched to Awarded Contracts folder
  folder_name     TEXT,                         -- full folder name from Awarded Contracts
  source_row      INTEGER,                      -- row number in the spreadsheet
  source_sheet    VARCHAR(10),                  -- sheet tab name ("2026")
  synced_at       TIMESTAMP DEFAULT NOW(),      -- last sync timestamp
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_year ON jobs(year);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_name);
CREATE INDEX IF NOT EXISTS idx_jobs_pm ON jobs(project_manager);
CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);

-- ─────────────────────────────────────────────
-- SYNC LOG: Tracks each sync run
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_log (
  id              SERIAL PRIMARY KEY,
  sync_type       VARCHAR(20) NOT NULL,         -- "full", "incremental"
  source_file     VARCHAR(255),                 -- file path on server
  file_modified   TIMESTAMP,                    -- last modified time of source file
  jobs_total      INTEGER DEFAULT 0,
  jobs_created    INTEGER DEFAULT 0,
  jobs_updated    INTEGER DEFAULT 0,
  jobs_unchanged  INTEGER DEFAULT 0,
  errors          TEXT,                          -- JSON array of error messages
  duration_ms     INTEGER,
  status          VARCHAR(20) DEFAULT 'success', -- "success", "partial", "failed"
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- JOB FLAGS: Data quality flags
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_flags (
  id              SERIAL PRIMARY KEY,
  job_id          INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  flag_type       VARCHAR(50) NOT NULL,         -- "missing_po", "duplicate_customer", "no_folder", "missing_description"
  message         TEXT,
  resolved        BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_flags_job ON job_flags(job_id);
CREATE INDEX IF NOT EXISTS idx_job_flags_resolved ON job_flags(resolved);
