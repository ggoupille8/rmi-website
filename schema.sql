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
