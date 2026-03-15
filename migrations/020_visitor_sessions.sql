-- Visitor session tracking for analytics intelligence
-- Lightweight per-visit records with IP geo + device fingerprint

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Session identity
  session_id      VARCHAR(64) NOT NULL,        -- Client-generated session ID
  visitor_id      VARCHAR(64),                 -- Persistent visitor ID (localStorage)
  visit_number    INTEGER DEFAULT 1,           -- Nth visit for this visitor

  -- Request data
  ip_address      VARCHAR(45),
  user_agent      TEXT,
  page_path       VARCHAR(500),
  referrer_url    TEXT,
  referrer_domain VARCHAR(255),

  -- Geo (from IP lookup)
  geo_city        VARCHAR(100),
  geo_region      VARCHAR(100),
  geo_country     VARCHAR(10),
  geo_lat         DECIMAL(9,6),
  geo_lng         DECIMAL(9,6),
  geo_postal      VARCHAR(20),
  geo_timezone    VARCHAR(50),

  -- Network
  isp_org         VARCHAR(255),
  asn             VARCHAR(20),
  ip_type         VARCHAR(20),               -- residential, business, mobile, datacenter, vpn, tor
  is_vpn          BOOLEAN DEFAULT FALSE,
  is_datacenter   BOOLEAN DEFAULT FALSE,
  is_bot          BOOLEAN DEFAULT FALSE,

  -- Device fingerprint (from client)
  device_type     VARCHAR(20),               -- desktop, mobile, tablet
  screen_width    INTEGER,
  screen_height   INTEGER,
  viewport_width  INTEGER,
  viewport_height INTEGER,
  browser_name    VARCHAR(50),
  browser_version VARCHAR(20),
  os_name         VARCHAR(50),
  os_version      VARCHAR(20),
  language        VARCHAR(20),
  timezone        VARCHAR(50),
  touch_support   BOOLEAN,
  device_memory   DECIMAL(4,1),
  hardware_cores  INTEGER,
  pixel_ratio     DECIMAL(4,2),
  color_depth     INTEGER,
  connection_type VARCHAR(20),

  -- Behavioral (updated via beacon)
  scroll_depth    INTEGER DEFAULT 0,         -- 0-100%
  time_on_page_ms INTEGER DEFAULT 0,
  engaged         BOOLEAN DEFAULT FALSE,     -- >10s or scroll >25%
  interactions    INTEGER DEFAULT 0,         -- clicks + key presses
  sections_viewed TEXT[],                    -- array of section IDs viewed
  cta_clicks      INTEGER DEFAULT 0,
  form_started    BOOLEAN DEFAULT FALSE,
  exit_intent     BOOLEAN DEFAULT FALSE,

  -- UTM tracking
  utm_source      VARCHAR(100),
  utm_medium      VARCHAR(100),
  utm_campaign    VARCHAR(100),
  utm_term        VARCHAR(100),
  utm_content     VARCHAR(100),

  -- Classification
  traffic_class   VARCHAR(20) DEFAULT 'unknown' -- prospect, suspicious, bot, unknown
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_vs_created_at ON visitor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vs_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_vs_visitor_id ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_vs_ip_address ON visitor_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_vs_geo_city ON visitor_sessions(geo_city);
CREATE INDEX IF NOT EXISTS idx_vs_geo_region ON visitor_sessions(geo_region);
CREATE INDEX IF NOT EXISTS idx_vs_traffic_class ON visitor_sessions(traffic_class);
CREATE INDEX IF NOT EXISTS idx_vs_engaged ON visitor_sessions(engaged) WHERE engaged = TRUE;
CREATE INDEX IF NOT EXISTS idx_vs_ip_type ON visitor_sessions(ip_type);
