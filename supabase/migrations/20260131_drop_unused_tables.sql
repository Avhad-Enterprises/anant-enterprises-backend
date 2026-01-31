-- Migration: Drop 19 Unused Empty Tables
-- Date: 2026-01-31
-- Description: Safely removes 19 empty tables that were commented out in Drizzle schema
-- Tables: catalogues(3), companies(2), chatbot(3), gift_cards(3), wishlists(2), 
--         tickets(2), reviews(2), bundles(1), production_orders(1)

-- ============================================================================
-- PHASE 1: Drop Foreign Key Constraints from Active Tables
-- ============================================================================
-- These active tables have FK references to tables we're dropping

-- Drop FK from cart_items to bundles
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_bundle_id_bundles_id_fk;

-- Drop FK from orders to gift_cards
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_giftcard_code_gift_cards_code_fk;

-- Drop FK from gift_card_transactions to orders (reverse)
-- This will be handled when we drop gift_card_transactions table

-- ============================================================================
-- PHASE 2: Drop Child/Junction Tables First (No Incoming FKs from Active Tables)
-- ============================================================================

-- Catalogue System (0 rows each)
DROP TABLE IF EXISTS catalogue_product_overrides CASCADE;
DROP TABLE IF EXISTS catalogue_rules CASCADE;

-- Company System (0 rows each)
DROP TABLE IF EXISTS company_rules CASCADE;

-- Chatbot System (0 rows each)
DROP TABLE IF EXISTS chatbot_messages CASCADE;

-- Gift Card System (0 rows each)
DROP TABLE IF EXISTS gift_card_transactions CASCADE;

-- Wishlist System (0 rows each)
DROP TABLE IF EXISTS wishlist_items CASCADE;

-- Ticket System (0 rows each)
DROP TABLE IF EXISTS ticket_messages CASCADE;

-- Bundle System (0 rows each)
DROP TABLE IF EXISTS bundle_items CASCADE;

-- ============================================================================
-- PHASE 3: Drop Parent Tables
-- ============================================================================

-- Catalogue parent (0 rows)
DROP TABLE IF EXISTS catalogues CASCADE;

-- Company parent (0 rows)
DROP TABLE IF EXISTS companies CASCADE;

-- Chatbot parents (0 rows each)
DROP TABLE IF EXISTS chatbot_sessions CASCADE;
DROP TABLE IF EXISTS chatbot_documents CASCADE;

-- Gift Card parents (0 rows each)
DROP TABLE IF EXISTS gift_card_templates CASCADE;
DROP TABLE IF EXISTS gift_cards CASCADE;

-- Wishlist parent (0 rows)
DROP TABLE IF EXISTS wishlists CASCADE;

-- Ticket parent (0 rows)
DROP TABLE IF EXISTS tickets CASCADE;

-- Bundle parent (0 rows)
DROP TABLE IF EXISTS bundles CASCADE;

-- ============================================================================
-- PHASE 4: Drop Standalone Tables
-- ============================================================================

-- Review system (0 rows each)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS product_questions CASCADE;

-- Production system (0 rows)
DROP TABLE IF EXISTS production_orders CASCADE;

-- ============================================================================
-- PHASE 5: Drop Related Enums (if not used elsewhere)
-- ============================================================================

-- Catalogue enums
DROP TYPE IF EXISTS catalogue_status CASCADE;
DROP TYPE IF EXISTS catalogue_adjustment_type CASCADE;
DROP TYPE IF EXISTS catalogue_rule_match_type CASCADE;

-- Company enums
DROP TYPE IF EXISTS company_user_assignment_type CASCADE;
DROP TYPE IF EXISTS company_match_type CASCADE;

-- Gift Card enums
DROP TYPE IF EXISTS gift_card_status CASCADE;
DROP TYPE IF EXISTS gift_card_character_set CASCADE;
DROP TYPE IF EXISTS gift_card_transaction_type CASCADE;
DROP TYPE IF EXISTS gift_card_delivery_method CASCADE;
DROP TYPE IF EXISTS gift_card_source CASCADE;

-- Bundle enums
DROP TYPE IF EXISTS bundle_type CASCADE;
DROP TYPE IF EXISTS bundle_status CASCADE;

-- Ticket enums
DROP TYPE IF EXISTS ticket_priority CASCADE;
DROP TYPE IF EXISTS ticket_status CASCADE;
DROP TYPE IF EXISTS ticket_channel CASCADE;
DROP TYPE IF EXISTS ticket_source CASCADE;
DROP TYPE IF EXISTS ticket_message_sender_type CASCADE;

-- Review enums
DROP TYPE IF EXISTS review_status CASCADE;
DROP TYPE IF EXISTS question_status CASCADE;

-- Production enums
DROP TYPE IF EXISTS production_status CASCADE;
DROP TYPE IF EXISTS production_priority CASCADE;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Dropped Tables: 19
-- Dropped Enums: 22
-- Foreign Keys Removed: 2 (from active tables)
-- 
-- All tables were empty (0 rows), making this a safe cleanup operation.
-- ============================================================================
