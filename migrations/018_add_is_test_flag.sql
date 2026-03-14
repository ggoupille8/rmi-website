-- Add is_test flag to contacts and quotes tables
-- Test/automated submissions (Playwright, unit tests) are tagged so they
-- can be filtered out of dashboards and reports.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes   ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_contacts_is_test ON contacts (is_test) WHERE is_test = TRUE;
CREATE INDEX IF NOT EXISTS idx_quotes_is_test   ON quotes   (is_test) WHERE is_test = TRUE;
