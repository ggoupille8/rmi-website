-- Migration 014: Financial System Tables
-- Creates tables for: customers, vendors, materials, pricing, jobs master,
-- invoices, line items, purchase log legacy, and financial report storage

-- ============================================
-- REFERENCE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  short_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_aliases (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  alias_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL UNIQUE,
  unit TEXT,
  tax_category TEXT NOT NULL DEFAULT 'installed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_prices (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  price NUMERIC(12,4),
  price_date DATE,
  book_price NUMERIC(12,4),
  book_price_note TEXT,
  is_special_pricing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_id, vendor_id)
);

-- ============================================
-- JOB MASTER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS jobs_master (
  id SERIAL PRIMARY KEY,
  job_number TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  customer_id INTEGER REFERENCES customers(id),
  customer_name_raw TEXT,
  contract_type TEXT,
  variable TEXT,
  timing TEXT,
  close_date DATE,
  po_number TEXT,
  tax_status TEXT NOT NULL DEFAULT 'unknown',
  tax_exemption_type TEXT,
  general_contractor TEXT,
  project_manager TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  source_tab TEXT,
  source_row INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_number, year)
);

CREATE INDEX IF NOT EXISTS idx_jobs_master_number ON jobs_master(job_number);
CREATE INDEX IF NOT EXISTS idx_jobs_master_year ON jobs_master(year);
CREATE INDEX IF NOT EXISTS idx_jobs_master_customer ON jobs_master(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_master_pm ON jobs_master(project_manager);
CREATE INDEX IF NOT EXISTS idx_jobs_master_tax ON jobs_master(tax_status);

-- ============================================
-- INVOICE / PURCHASE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  job_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  tax_override TEXT,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_number);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,4) NOT NULL,
  price_per_item NUMERIC(12,4) NOT NULL,
  total_cost NUMERIC(12,2),
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  tax_rate NUMERIC(5,4) DEFAULT 0.06,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  is_special_pricing BOOLEAN DEFAULT FALSE,
  tax_override BOOLEAN,
  notes TEXT,
  source_row INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_line_items_material ON invoice_line_items(material_id);

-- ============================================
-- PURCHASE LOG (legacy import)
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_log_legacy (
  id SERIAL PRIMARY KEY,
  description TEXT,
  quantity NUMERIC(12,4),
  price_per_item NUMERIC(12,4),
  total_cost NUMERIC(12,2),
  purchase_date DATE,
  vendor TEXT,
  invoice_number TEXT,
  job_number TEXT,
  notes TEXT,
  is_special_pricing BOOLEAN DEFAULT FALSE,
  source_row INTEGER,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FINANCIAL REPORTS (from PDF parsing)
-- ============================================

CREATE TABLE IF NOT EXISTS ar_aging (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type TEXT DEFAULT 'standard',
  customer_name TEXT NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  days_30 NUMERIC(12,2) DEFAULT 0,
  days_60 NUMERIC(12,2) DEFAULT 0,
  days_90 NUMERIC(12,2) DEFAULT 0,
  days_120_plus NUMERIC(12,2) DEFAULT 0,
  retainage NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  source_file TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balance_sheet (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type TEXT DEFAULT 'standard',
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC(14,2) NOT NULL,
  source_file TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income_statement (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type TEXT DEFAULT 'standard',
  account_number TEXT,
  account_name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  ytd_amount NUMERIC(14,2),
  source_file TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);
