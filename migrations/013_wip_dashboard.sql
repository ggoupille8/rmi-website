-- Migration 013: WIP Dashboard — Snapshots, Totals, PM Users
-- Created: 2026-03-12

-- ─────────────────────────────────────────────
-- WIP SNAPSHOTS: One row per job per month
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wip_snapshots (
  id                    SERIAL PRIMARY KEY,
  snapshot_date         DATE NOT NULL,
  snapshot_year         INTEGER NOT NULL,
  snapshot_month        INTEGER NOT NULL,
  job_number            VARCHAR(20) NOT NULL,
  description           TEXT,
  project_manager       VARCHAR(10),
  is_hidden_in_source   BOOLEAN DEFAULT FALSE,

  -- Contract
  contract_amount       DECIMAL(14,2),
  change_orders         DECIMAL(14,2),
  pending_change_orders DECIMAL(14,2),
  revised_contract      DECIMAL(14,2),

  -- Estimates
  original_estimate     DECIMAL(14,2),
  estimate_changes      DECIMAL(14,2),
  pending_co_estimates  DECIMAL(14,2),
  revised_estimate      DECIMAL(14,2),

  -- Profitability
  gross_profit          DECIMAL(14,2),
  gross_margin_pct      DECIMAL(8,6),

  -- Progress
  pct_complete          DECIMAL(8,6),
  earned_revenue        DECIMAL(14,2),
  costs_to_date         DECIMAL(14,2),
  gross_profit_to_date  DECIMAL(14,2),

  -- Backlog
  backlog_revenue       DECIMAL(14,2),
  costs_to_complete     DECIMAL(14,2),
  backlog_profit        DECIMAL(14,2),

  -- Billing
  billings_to_date      DECIMAL(14,2),
  revenue_billing_excess DECIMAL(14,2),
  invoicing_remaining   DECIMAL(14,2),
  revenue_excess        DECIMAL(14,2),
  billings_excess       DECIMAL(14,2),

  -- Metadata
  source_file           VARCHAR(255),
  source_tab            VARCHAR(50),
  source_row            INTEGER,
  imported_at           TIMESTAMP DEFAULT NOW(),

  UNIQUE(snapshot_year, snapshot_month, job_number)
);

CREATE INDEX IF NOT EXISTS idx_wip_snap_date ON wip_snapshots(snapshot_year, snapshot_month);
CREATE INDEX IF NOT EXISTS idx_wip_snap_job ON wip_snapshots(job_number);
CREATE INDEX IF NOT EXISTS idx_wip_snap_pm ON wip_snapshots(project_manager);
CREATE INDEX IF NOT EXISTS idx_wip_snap_date_pm ON wip_snapshots(snapshot_year, snapshot_month, project_manager);

-- ─────────────────────────────────────────────
-- WIP SNAPSHOT TOTALS: Summary row per month
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wip_snapshot_totals (
  id                    SERIAL PRIMARY KEY,
  snapshot_year         INTEGER NOT NULL,
  snapshot_month        INTEGER NOT NULL,
  contract_amount       DECIMAL(14,2),
  change_orders         DECIMAL(14,2),
  pending_change_orders DECIMAL(14,2),
  revised_contract      DECIMAL(14,2),
  original_estimate     DECIMAL(14,2),
  estimate_changes      DECIMAL(14,2),
  revised_estimate      DECIMAL(14,2),
  gross_profit          DECIMAL(14,2),
  earned_revenue        DECIMAL(14,2),
  costs_to_date         DECIMAL(14,2),
  gross_profit_to_date  DECIMAL(14,2),
  backlog_revenue       DECIMAL(14,2),
  costs_to_complete     DECIMAL(14,2),
  backlog_profit        DECIMAL(14,2),
  billings_to_date      DECIMAL(14,2),
  revenue_billing_excess DECIMAL(14,2),
  invoicing_remaining   DECIMAL(14,2),
  revenue_excess        DECIMAL(14,2),
  billings_excess       DECIMAL(14,2),
  job_count             INTEGER,
  imported_at           TIMESTAMP DEFAULT NOW(),

  UNIQUE(snapshot_year, snapshot_month)
);

-- ─────────────────────────────────────────────
-- PM USERS: Project manager authentication
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_users (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(10) NOT NULL UNIQUE,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255),
  password_hash     VARCHAR(255),
  role              VARCHAR(20) DEFAULT 'pm',
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW(),
  last_login        TIMESTAMP
);

-- Seed PM users (passwords will be set via admin action)
INSERT INTO pm_users (code, name, role) VALUES
  ('GG', 'Graham Goupille', 'admin'),
  ('RG', 'Rich Goupille', 'pm'),
  ('MD', 'Mark Donnal', 'pm'),
  ('SB', 'Scott Brown', 'pm')
ON CONFLICT (code) DO NOTHING;
