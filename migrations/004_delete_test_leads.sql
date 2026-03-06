-- Migration 004: Delete test leads from contacts table
-- Test submissions (test@example.com, john@example.com) pollute dashboard stats
-- lead_intelligence has ON DELETE CASCADE from contacts, so child rows auto-delete

DELETE FROM contacts
WHERE email IN ('test@example.com', 'john@example.com');

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM contacts;
-- SELECT COUNT(*) FROM contacts WHERE email IN ('test@example.com', 'john@example.com');
-- Expected: 0 test leads remaining
