-- ============================================
-- PHASE 3: DROP UNUSED TABLES
-- Migration Date: 31 Jan 2026
-- Impact: Requires minor code cleanup (comment out discount references)
-- Total Tables to Drop: 18 (including discount system)
-- ============================================

-- This migration removes tables that:
-- 1. Have zero records in production
-- 2. Have no active API routes OR are unused features
-- 3. Require minimal code cleanup (commenting out references)

-- ============================================
-- CATEGORY 1: BUNDLE SYSTEM (PARTIALLY IMPLEMENTED)
-- ============================================

-- 1. Bundles (Product bundles - commented out in schema)
DROP TABLE IF EXISTS bundles CASCADE;

-- 2. Bundle Items (Bundle components - commented out in schema)
DROP TABLE IF EXISTS bundle_items CASCADE;

-- ============================================
-- CATEGORY 2: ADVANCED INVENTORY (NOT IMPLEMENTED)
-- ============================================

-- 3. Inventory Transfers (Inter-location transfers)
DROP TABLE IF EXISTS inventory_transfers CASCADE;

-- 4. Production Orders (Manufacturing planning)
DROP TABLE IF EXISTS production_orders CASCADE;

-- ============================================
-- CATEGORY 3: SUPPORT SYSTEM (NOT IMPLEMENTED)
-- ============================================

-- 5. Tickets (Customer support tickets)
DROP TABLE IF EXISTS tickets CASCADE;

-- 6. Ticket Messages (Support conversation history)
DROP TABLE IF EXISTS ticket_messages CASCADE;

-- ============================================
-- CATEGORY 4: DISCOUNT SYSTEM (FULLY IMPLEMENTED BUT UNUSED)
-- ============================================
-- Note: Discount system has complete API/admin/frontend but 0 usage in production

-- 7. Main Discounts (Discount configurations)
DROP TABLE IF EXISTS discounts CASCADE;

-- 8. Discount Codes (Discount code management)
DROP TABLE IF EXISTS discount_codes CASCADE;

-- 9. Discount Usage (Usage tracking and limits)
DROP TABLE IF EXISTS discount_usage CASCADE;

-- 10. Discount Customers (Customer-specific discounts)
DROP TABLE IF EXISTS discount_customers CASCADE;

-- 11. Discount Products (Product-specific discounts)
DROP TABLE IF EXISTS discount_products CASCADE;

-- 12. Discount Collections (Collection-specific discounts)
DROP TABLE IF EXISTS discount_collections CASCADE;

-- 13. Discount Buy X Get Y Products (Advanced product rules)
DROP TABLE IF EXISTS discount_buy_x_products CASCADE;

-- 14. Discount Buy X Get Y Collections (Advanced collection rules)
DROP TABLE IF EXISTS discount_buy_x_collections CASCADE;

-- 15. Discount Get Y Products (Get Y product rules)
DROP TABLE IF EXISTS discount_get_y_products CASCADE;

-- 16. Discount Get Y Collections (Get Y collection rules)
DROP TABLE IF EXISTS discount_get_y_collections CASCADE;

-- 17. Discount Regions (Geographic restrictions)
DROP TABLE IF EXISTS discount_regions CASCADE;

-- 18. Discount Shipping Methods (Shipping method restrictions)
DROP TABLE IF EXISTS discount_shipping_methods CASCADE;

-- 19. Discount Shipping Zones (Shipping zone restrictions)
DROP TABLE IF EXISTS discount_shipping_zones CASCADE;