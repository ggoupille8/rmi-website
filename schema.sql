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
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common media queries
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_slot ON media(slot);
