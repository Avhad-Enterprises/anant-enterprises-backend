-- ============================================
-- PHASE 4: DROP REMAINING UNUSED TABLES (FINAL CLEANUP)
-- Migration Date: 31 Jan 2026
-- Impact: Zero functional impact (all tables have 0 records and no active usage)
-- Total Tables to Drop: 3
-- ============================================

-- This migration removes the final set of unused tables that:
-- 1. Have zero records in production
-- 2. Have no active implementation or API usage
-- 3. Are not referenced by any active features

-- TABLES KEPT (NOT DROPPED):
-- - email_otps: Has 15 records (OTP verification system in use)
-- - payment_webhook_logs: Active payment webhook handler uses this table

-- ============================================
-- CATEGORY 1: FAQ SYSTEM (NOT IMPLEMENTED)
-- ============================================

-- 1. FAQs - General FAQ system (separate from product_faqs which is active)
-- Note: product_faqs table is kept (has 6 records and active usage)
DROP TABLE IF EXISTS faqs CASCADE;

-- ============================================
-- CATEGORY 2: MEDIA MANAGEMENT (NOT IMPLEMENTED)
-- ============================================

-- 2. Entity Media - Media gallery associations
-- Note: MediaService exists but no actual usage in production
DROP TABLE IF EXISTS entity_media CASCADE;

-- ============================================
-- CATEGORY 3: PAYMENT METHODS (NOT IMPLEMENTED)
-- ============================================

-- 3. User Payment Methods - Saved payment methods
-- Note: Tokenized payment storage not implemented
DROP TABLE IF EXISTS user_payment_methods CASCADE;