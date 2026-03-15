-- Add forwarded_at timestamp to contacts table
-- Tracks when a lead was forwarded to sales (fab@rmi-llc.net)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_forwarded_at ON contacts(forwarded_at) WHERE forwarded_at IS NOT NULL;
