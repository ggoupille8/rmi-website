-- Migration 016: Borrowing Base Certificate table
-- Stores monthly BBC data extracted via OCR from scanned PDF submissions

CREATE TABLE IF NOT EXISTS borrowing_base (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  gross_ar NUMERIC(14,2),
  ar_over_90 NUMERIC(14,2),
  eligible_ar NUMERIC(14,2),
  ar_advance_rate NUMERIC(5,4),
  ar_availability NUMERIC(14,2),
  gross_inventory NUMERIC(14,2),
  inventory_advance_rate NUMERIC(5,4),
  inventory_availability NUMERIC(14,2),
  total_borrowing_base NUMERIC(14,2),
  amount_borrowed NUMERIC(14,2),
  excess_availability NUMERIC(14,2),
  raw_data JSONB,
  source_file TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date)
);
