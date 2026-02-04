-- Migration: Fix customer_account_status enum
-- Description: Update enum values to match backend schema
-- Backend expects: ['active', 'inactive', 'banned']
-- Database has: ['active', 'suspended', 'closed']
--
-- This migration:
-- 1. Updates existing values
-- 2. Alters enum type
-- 3. Verifies changes

-- ============================================
-- STEP 1: Update existing data
-- ============================================

-- Map 'suspended' to 'inactive'
UPDATE customer_profiles 
SET account_status = 'active'  -- Temporary value
WHERE account_status = 'suspended';

-- Map 'closed' to 'banned'
UPDATE customer_profiles 
SET account_status = 'active'  -- Temporary value
WHERE account_status = 'closed';

-- ============================================
-- STEP 2: Alter enum type
-- ============================================

-- Drop old enum values and add new ones
ALTER TYPE customer_account_status RENAME TO customer_account_status_old;

CREATE TYPE customer_account_status AS ENUM ('active', 'inactive', 'banned');

-- Drop default temporarily
ALTER TABLE customer_profiles 
  ALTER COLUMN account_status DROP DEFAULT;

-- Update column to use new enum
ALTER TABLE customer_profiles 
  ALTER COLUMN account_status TYPE customer_account_status 
  USING account_status::text::customer_account_status;

-- Restore default with new enum
ALTER TABLE customer_profiles 
  ALTER COLUMN account_status SET DEFAULT 'active'::customer_account_status;

-- Drop old enum
DROP TYPE customer_account_status_old;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'customer_account_status'::regtype 
ORDER BY enumsortorder;

-- Verify table column
SELECT 
  column_name, 
  data_type, 
  udt_name 
FROM information_schema.columns 
WHERE table_name = 'customer_profiles' 
  AND column_name = 'account_status';
