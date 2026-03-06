-- Migration 005: Delete duplicate Stephen Sumpter record
-- Two identical submissions on Mar 5, 2026 (3 seconds apart) — keep the newer one,
-- delete the older one (id: d5a4e7bc-2f23-430f-8da3-caea09099bf8)

DELETE FROM contacts
WHERE id = 'd5a4e7bc-2f23-430f-8da3-caea09099bf8';

-- Verification query (run after migration):
-- SELECT COUNT(*) FROM contacts WHERE email = 'ssumpter@wpcgroup.us';
-- Expected: 1
