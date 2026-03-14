-- Migration 013: Fix "undefined" string values in jobs_master
-- Root cause: cellString() in import-job-master.ts used String(cell.v)
-- which converts JS undefined to the literal string "undefined".

-- Step 1: NULL out "undefined" strings in text columns
UPDATE jobs_master SET description = NULL WHERE description = 'undefined';
UPDATE jobs_master SET customer_name_raw = NULL WHERE customer_name_raw = 'undefined';
UPDATE jobs_master SET project_manager = NULL WHERE project_manager = 'undefined';
UPDATE jobs_master SET contract_type = NULL WHERE contract_type = 'undefined';
UPDATE jobs_master SET general_contractor = NULL WHERE general_contractor = 'undefined';
UPDATE jobs_master SET tax_status = 'unknown' WHERE tax_status = 'undefined';
UPDATE jobs_master SET timing = NULL WHERE timing = 'undefined';
UPDATE jobs_master SET po_number = NULL WHERE po_number = 'undefined';

-- Step 2: NULL out customer_id for jobs pointing to the bogus "undefined" customer
UPDATE jobs_master
SET customer_id = NULL
WHERE customer_id = (
  SELECT id FROM customers WHERE canonical_name = 'undefined'
);

-- Step 3: Remove the bogus customer record itself
DELETE FROM customer_aliases WHERE customer_id = (
  SELECT id FROM customers WHERE canonical_name = 'undefined'
);
DELETE FROM customers WHERE canonical_name = 'undefined';
