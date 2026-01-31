-- ============================================
-- PHASE 2: DROP UNUSED TABLES
-- Migration Date: 31 Jan 2026
-- Impact: Zero functional impact (all tables have 0 records)
-- Total Tables to Drop: 16 (updated - kept reviews, product_questions, wishlists, wishlist_items)
-- ============================================

-- This migration removes tables that:
-- 1. Have zero records in production
-- 2. Have no active API routes
-- 3. Have no service layer implementation
-- 4. Were planned features that were never built

-- ============================================
-- CATEGORY 1: B2B FEATURES (NOT IMPLEMENTED)
-- ============================================

-- 1. Business Customer Profiles (B2B customers)
DROP TABLE IF EXISTS business_customer_profiles CASCADE;

-- 2. Companies (B2B company grouping)
DROP TABLE IF EXISTS companies CASCADE;

-- 3. Company Rules (Auto-assignment rules for B2B)
DROP TABLE IF EXISTS company_rules CASCADE;

-- 4. Catalogues (Custom pricing for B2B)
DROP TABLE IF EXISTS catalogues CASCADE;

-- 5. Catalogue Rules (Auto-assignment for catalogues)
DROP TABLE IF EXISTS catalogue_rules CASCADE;

-- 6. Catalogue Product Overrides (Product-level custom pricing)
DROP TABLE IF EXISTS catalogue_product_overrides CASCADE;

-- ============================================
-- CATEGORY 2: CUSTOMER ENGAGEMENT (KEPT)
-- ============================================
-- KEPT: reviews, product_questions, wishlists, wishlist_items (actively used)

-- ============================================
-- CATEGORY 3: SETTINGS & CONFIGURATION (NOT IMPLEMENTED)
-- ============================================

-- 7. Customer Statistics (Analytics and LTV tracking)
DROP TABLE IF EXISTS customer_statistics CASCADE;

-- ============================================
-- CATEGORY 4: SETTINGS & CONFIGURATION (NOT IMPLEMENTED)
-- ============================================

-- 8. Currencies (Multi-currency support)
DROP TABLE IF EXISTS currencies CASCADE;

-- 9. Countries (Country configuration)
DROP TABLE IF EXISTS countries CASCADE;

-- 10. Regions (State/Province settings)
DROP TABLE IF EXISTS regions CASCADE;

-- 11. Tax Rules (Automated tax calculation)
DROP TABLE IF EXISTS tax_rules CASCADE;

-- ============================================
-- CATEGORY 5: CHATBOT SYSTEM (NOT IMPLEMENTED)
-- ============================================

-- 12. Chatbot Documents (Knowledge base for chatbot)
DROP TABLE IF EXISTS chatbot_documents CASCADE;

-- 13. Chatbot Sessions (Chat sessions)
DROP TABLE IF EXISTS chatbot_sessions CASCADE;

-- 14. Chatbot Messages (Chat message history)
DROP TABLE IF EXISTS chatbot_messages CASCADE;

-- ============================================
-- CATEGORY 6: GIFT CARDS (NOT IMPLEMENTED)
-- ============================================

-- 15. Gift Cards (Digital gift card system)
DROP TABLE IF EXISTS gift_cards CASCADE;

-- 16. Gift Card Transactions (Gift card usage tracking)
DROP TABLE IF EXISTS gift_card_transactions CASCADE;

-- 17. Gift Card Templates (Gift card design templates)
DROP TABLE IF EXISTS gift_card_templates CASCADE;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after migration to verify table count:
-- SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
-- Expected result: 44 tables (65 - 21 = 44)
