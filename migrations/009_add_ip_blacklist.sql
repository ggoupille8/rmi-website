-- IP blacklist table with auto-ban support
-- Tracks blocked IPs, reasons, expiry, and attempt counts

CREATE TABLE IF NOT EXISTS ip_blacklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      VARCHAR(45) NOT NULL,
  reason          TEXT NOT NULL,
  blocked_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at      TIMESTAMP WITH TIME ZONE,  -- null = permanent
  auto_banned     BOOLEAN DEFAULT FALSE,     -- true = system banned, false = manual
  submission_count INTEGER DEFAULT 0,        -- how many times they tried after being banned
  metadata        JSONB                      -- store the last intelligence payload for evidence
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ipb_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ipb_expires ON ip_blacklist(expires_at);
