-- Migration: make email optional, add phone column to contacts table
-- This aligns the database with the frontend/backend change allowing
-- submissions with either email OR phone (not both required).

ALTER TABLE contacts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
