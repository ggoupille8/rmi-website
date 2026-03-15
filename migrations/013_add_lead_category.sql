-- Add category column to contacts for lead classification
-- Values: 'lead' (default), 'employment_verification', 'vendor', 'spam', 'other'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'lead';

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
