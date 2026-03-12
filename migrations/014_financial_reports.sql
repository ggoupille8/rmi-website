-- Migration 014: Financial report snapshots (AR Aging, Balance Sheet, Income Statement)
-- Stores parsed PDF data for cross-validation with WIP data

-- ─────────────────────────────────────────────
-- AR AGING SNAPSHOTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_aging_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date     DATE NOT NULL,           -- "Aging As of Date" from report header
  generated_date  DATE,                    -- date report was generated (page header)
  source_filename VARCHAR(500) NOT NULL,
  variant         VARCHAR(100),            -- 'standard', 'post AJEs', 'close out'

  -- Report totals (for quick access and validation)
  total_amount    DECIMAL(14,2) NOT NULL,
  total_current   DECIMAL(14,2) NOT NULL,
  total_over_30   DECIMAL(14,2) NOT NULL,
  total_over_60   DECIMAL(14,2) NOT NULL,
  total_over_90   DECIMAL(14,2) NOT NULL,
  total_over_120  DECIMAL(14,2) NOT NULL,
  total_retainage DECIMAL(14,2) NOT NULL,

  customer_count  INTEGER NOT NULL,

  imported_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by     VARCHAR(100) DEFAULT 'manual',

  UNIQUE(report_date, variant)
);

CREATE TABLE IF NOT EXISTS ar_aging_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID NOT NULL REFERENCES ar_aging_snapshots(id) ON DELETE CASCADE,

  customer_name   VARCHAR(255) NOT NULL,
  customer_code   VARCHAR(50),             -- e.g., "ALCOPROD", "DTE", "JOHNGREE"
  customer_phone  VARCHAR(20),

  total_amount    DECIMAL(14,2) NOT NULL,
  current_amount  DECIMAL(14,2) NOT NULL,
  over_30         DECIMAL(14,2) NOT NULL,
  over_60         DECIMAL(14,2) NOT NULL,
  over_90         DECIMAL(14,2) NOT NULL,
  over_120        DECIMAL(14,2) NOT NULL,
  retainage       DECIMAL(14,2) NOT NULL,

  -- Derived
  total_past_due  DECIMAL(14,2) GENERATED ALWAYS AS (over_30 + over_60 + over_90 + over_120) STORED,

  UNIQUE(snapshot_id, customer_name)
);

CREATE INDEX IF NOT EXISTS idx_ar_entries_snapshot ON ar_aging_entries(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ar_snapshots_date ON ar_aging_snapshots(report_date);


-- ─────────────────────────────────────────────
-- BALANCE SHEET SNAPSHOTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS balance_sheet_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date     DATE NOT NULL,           -- from header, e.g., "December 31, 2025"
  source_filename VARCHAR(500) NOT NULL,
  variant         VARCHAR(100),            -- 'standard', 'post AJEs', 'close out'

  -- Key totals for quick access
  total_assets         DECIMAL(14,2),
  total_liabilities    DECIMAL(14,2),
  total_equity         DECIMAL(14,2),
  net_income           DECIMAL(14,2),

  -- Reconciliation accounts (extracted for quick tie-out)
  ar_balance           DECIMAL(14,2),      -- 1-1100
  ar_retainage         DECIMAL(14,2),      -- 1-1110
  costs_in_excess      DECIMAL(14,2),      -- 1-1500 (Revenue in Excess)
  billings_in_excess   DECIMAL(14,2),      -- 1-2200

  account_count        INTEGER NOT NULL,

  imported_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by     VARCHAR(100) DEFAULT 'manual',

  UNIQUE(report_date, variant)
);

CREATE TABLE IF NOT EXISTS balance_sheet_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID NOT NULL REFERENCES balance_sheet_snapshots(id) ON DELETE CASCADE,

  account_number  VARCHAR(20),             -- e.g., "1-1100" (NULL for subtotals)
  account_name    VARCHAR(255) NOT NULL,
  amount          DECIMAL(14,2) NOT NULL,

  -- Classification
  section         VARCHAR(50) NOT NULL,    -- 'current_assets', 'long_term_assets', 'current_liabilities', 'long_term_liabilities', 'equity'
  is_subtotal     BOOLEAN DEFAULT FALSE,   -- true for "Total X" lines
  line_order      INTEGER NOT NULL,        -- preserve original order

  UNIQUE(snapshot_id, account_number) -- only for non-subtotal lines
);

CREATE INDEX IF NOT EXISTS idx_bs_entries_snapshot ON balance_sheet_entries(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_bs_snapshots_date ON balance_sheet_snapshots(report_date);
CREATE INDEX IF NOT EXISTS idx_bs_entries_account ON balance_sheet_entries(account_number);


-- ─────────────────────────────────────────────
-- INCOME STATEMENT SNAPSHOTS
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS income_statement_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_end_date DATE NOT NULL,           -- "For the Period Ended [Date]"
  source_filename VARCHAR(500) NOT NULL,
  variant         VARCHAR(100),            -- 'standard', 'post AJEs', 'close out'

  -- Key totals (YTD balance column)
  total_income         DECIMAL(14,2),
  total_cost_of_sales  DECIMAL(14,2),
  gross_margin         DECIMAL(14,2),
  total_expenses       DECIMAL(14,2),
  net_income           DECIMAL(14,2),

  account_count        INTEGER NOT NULL,

  imported_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by     VARCHAR(100) DEFAULT 'manual',

  UNIQUE(period_end_date, variant)
);

CREATE TABLE IF NOT EXISTS income_statement_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID NOT NULL REFERENCES income_statement_snapshots(id) ON DELETE CASCADE,

  account_number  VARCHAR(20),             -- e.g., "1-4000" (NULL for subtotals)
  account_name    VARCHAR(255) NOT NULL,

  current_activity DECIMAL(14,2),          -- this period's activity (may be NULL)
  current_balance  DECIMAL(14,2),          -- YTD balance (may be NULL)

  -- Classification
  section         VARCHAR(50) NOT NULL,    -- 'income', 'cost_of_sales', 'expenses', 'other_income'
  is_subtotal     BOOLEAN DEFAULT FALSE,
  line_order      INTEGER NOT NULL,

  UNIQUE(snapshot_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_is_entries_snapshot ON income_statement_entries(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_is_snapshots_date ON income_statement_snapshots(period_end_date);
