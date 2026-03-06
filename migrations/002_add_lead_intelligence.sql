-- Lead intelligence data — admin only, never shown to submitter
-- Foreign key to contacts table (id field)
CREATE TABLE IF NOT EXISTS lead_intelligence (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- IP & Network
  ip_address            VARCHAR(45),           -- IPv4 or IPv6
  ip_type               VARCHAR(20),           -- residential, business, mobile, datacenter, vpn, tor
  isp_name              VARCHAR(255),          -- e.g. "Ford Motor Company", "Comcast Business"
  isp_org               VARCHAR(255),          -- ASN organization name
  asn                   VARCHAR(20),           -- Autonomous System Number

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
  device_type           VARCHAR(20),           -- desktop, mobile, tablet
  screen_width          INTEGER,
  screen_height         INTEGER,
  viewport_width        INTEGER,
  viewport_height       INTEGER,
  device_pixel_ratio    DECIMAL(4,2),
  color_depth           INTEGER,
  touch_support         BOOLEAN,
  hardware_concurrency  INTEGER,               -- CPU cores
  device_memory         DECIMAL(4,1),          -- GB (approximate)

  -- Network quality
  connection_type       VARCHAR(20),           -- 4g, 3g, wifi, ethernet, unknown
  connection_downlink   DECIMAL(8,2),          -- Mbps
  save_data_mode        BOOLEAN DEFAULT FALSE,

  -- Language & locale
  browser_language      VARCHAR(20),
  timezone_offset       INTEGER,               -- minutes from UTC

  -- Traffic source
  referrer_url          TEXT,
  referrer_domain       VARCHAR(255),
  traffic_source        VARCHAR(20),           -- organic, direct, referral, social, paid
  utm_source            VARCHAR(100),
  utm_medium            VARCHAR(100),
  utm_campaign          VARCHAR(100),
  entry_url             TEXT,

  -- Behavioral signals (collected before submit)
  session_duration_ms   INTEGER,               -- ms from page load to submit
  time_to_first_key_ms  INTEGER,               -- ms from page load to first keystroke
  time_on_form_ms       INTEGER,               -- ms from first field focus to submit
  scroll_depth_pct      INTEGER,               -- 0-100, max scroll before submit
  field_edit_count      INTEGER,               -- total corrections across all fields
  message_length        INTEGER,               -- character count of message field
  optional_fields_filled INTEGER,              -- count of non-required fields completed
  paste_detected        BOOLEAN DEFAULT FALSE, -- any paste events on email/phone
  tab_blur_count        INTEGER DEFAULT 0,     -- times user switched away from tab
  idle_periods          INTEGER DEFAULT 0,     -- pauses > 10s during form fill
  return_visitor        BOOLEAN DEFAULT FALSE, -- localStorage first-visit flag

  -- Submission context
  submitted_at_local    TIMESTAMP WITH TIME ZONE, -- client local time
  day_of_week           INTEGER,               -- 0=Sunday, 6=Saturday
  hour_of_day           INTEGER,               -- 0-23 local hour
  is_business_hours     BOOLEAN,               -- Mon-Fri 7AM-6PM submitter timezone

  -- Bot & spam signals
  honeypot_triggered    BOOLEAN DEFAULT FALSE,
  submission_speed_ms   INTEGER,               -- time from page load to submit (< 3000 = suspect)
  is_vpn                BOOLEAN DEFAULT FALSE,
  is_datacenter_ip      BOOLEAN DEFAULT FALSE,
  is_tor                BOOLEAN DEFAULT FALSE,
  bot_score             INTEGER DEFAULT 0,     -- 0-100, higher = more likely bot

  -- AI enrichment results
  lead_quality          VARCHAR(10),           -- hot, warm, cold, spam
  quality_reasoning     TEXT,
  ai_summary            TEXT,                  -- 2-3 sentence plain English read
  project_type          VARCHAR(50),           -- piping, ductwork, equipment, specialty, unknown
  urgency_signal        VARCHAR(20),           -- emergency, planned, exploratory
  facility_type         VARCHAR(50),           -- hospital, industrial, commercial, residential, unknown
  location_mentioned    VARCHAR(100),          -- city/region extracted from message
  scope_signals         TEXT,                  -- free text: size indicators, GC relationship, etc.
  ai_flags              TEXT,                  -- anything suspicious or noteworthy

  -- Company verification (web search)
  company_verified      BOOLEAN,
  company_verify_source TEXT,                  -- URL or "no results"
  company_context       TEXT,                  -- "ABC Mechanical — licensed HVAC contractor, Livonia MI"

  -- Email validation
  email_domain_type     VARCHAR(20),           -- corporate, free (gmail/yahoo), disposable, unknown
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
