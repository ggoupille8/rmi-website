-- Migration 015: Add logo/showcase columns to clients table
-- Enables data-driven Client Showcase on landing page

ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_type TEXT NOT NULL DEFAULT 'svg';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS display_scale NUMERIC(3,1) NOT NULL DEFAULT 1.0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS needs_invert BOOLEAN NOT NULL DEFAULT TRUE;
