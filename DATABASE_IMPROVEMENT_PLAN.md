# Database Improvement Plan

**Last Updated:** 31 January 2026  
**Database:** Supabase PostgreSQL  
**Total Tables:** 46 Active Tables

---

## 📊 Current Database Overview

### Core E-commerce Tables
- Products, Product Variants, Product FAQs, Product Questions
- Orders, Order Items
- Carts, Cart Items
- Collections, Collection Products
- Reviews, Tags, Tiers (Categories)

### Inventory & Fulfillment
- Inventory, Inventory Locations, Inventory Adjustments
- Variant Inventory Adjustments

### Financial
- Payment Transactions, Payment Webhook Logs
- Invoices, Invoice Versions, Invoice Line Items

### User Management
- Users, Admin Profiles, Customer Profiles
- User Addresses, User Roles

### Access Control
- Roles, Permissions, Role Permissions
- Invitation (Admin invites)

### Content
- Blogs, Blog Subsections

### Communication
- Notifications, Notification Templates
- Notification Preferences, Notification Delivery Logs

### Utilities
- Uploads, Audit Logs, Email OTPs
- Wishlists, Wishlist Items

---

## 🎯 PHASE 1: Critical Fixes & Foreign Keys

**Priority:** 🔴 IMMEDIATE  
**Estimated Time:** 2-3 days  
**Impact:** High - Data Integrity

### 1.1 Add Missing Foreign Key Constraints

#### Cart Items Table
```sql
-- Add FK for reserved inventory location
ALTER TABLE cart_items 
ADD CONSTRAINT fk_cart_items_reserved_location 
FOREIGN KEY (reserved_from_location_id) 
REFERENCES inventory_locations(id) 
ON DELETE SET NULL;
```

#### Wishlist Items Table
```sql
-- Add FK for order reference
ALTER TABLE wishlist_items 
ADD CONSTRAINT fk_wishlist_items_order 
FOREIGN KEY (order_id) 
REFERENCES orders(id) 
ON DELETE SET NULL;
```

### 1.2 Add Unique Constraints

```sql
-- Prevent duplicate inventory records per product per location
ALTER TABLE inventory 
ADD CONSTRAINT uq_inventory_product_location 
UNIQUE (product_id, location_id);

-- Ensure unique product variants
ALTER TABLE product_variants 
ADD CONSTRAINT uq_variant_option 
UNIQUE (product_id, option_name, option_value);
```

### 1.3 Add Critical Indexes

```sql
-- Orders by user and status
CREATE INDEX idx_orders_user_status 
ON orders(user_id, order_status) 
WHERE is_deleted = false;

-- Orders by status and dates
CREATE INDEX idx_orders_status_dates 
ON orders(order_status, created_at DESC);

-- Cart items by cart
CREATE INDEX idx_cart_items_cart_id 
ON cart_items(cart_id) 
WHERE is_deleted = false;

-- Inventory by product and location
CREATE INDEX idx_inventory_product_location 
ON inventory(product_id, location_id);

-- Notifications by user and read status
CREATE INDEX idx_notifications_user_read 
ON notifications(user_id, is_read) 
WHERE deleted_at IS NULL;

-- Audit logs by user and timestamp
CREATE INDEX idx_audit_logs_user_timestamp 
ON audit_logs(user_id, timestamp DESC);

-- Products search vector (verify it exists)
CREATE INDEX IF NOT EXISTS idx_products_search_vector 
ON products USING gin(search_vector);
```

**Deliverables:**
- [ ] Migration script: `001_add_foreign_keys.sql`
- [ ] Migration script: `002_add_unique_constraints.sql`
- [ ] Migration script: `003_add_critical_indexes.sql`
- [ ] Test data integrity after migration
- [ ] Update Drizzle schema to reflect FK changes

---

## 🎯 PHASE 2: Normalization & Data Structure

**Priority:** 🟡 HIGH  
**Estimated Time:** 3-4 days  
**Impact:** High - Query Performance & Maintainability

### 2.1 Refactor Product Categories

**Current Issue:** Fixed 4-tier hierarchy with nullable columns
```
❌ products.category_tier_1
❌ products.category_tier_2
❌ products.category_tier_3
❌ products.category_tier_4
```

**Solution:** Use flexible junction table
```sql
-- Create junction table
CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (product_id, tier_id)
);

-- Create index for queries
CREATE INDEX idx_product_categories_product ON product_categories(product_id);
CREATE INDEX idx_product_categories_tier ON product_categories(tier_id);
CREATE INDEX idx_product_categories_primary ON product_categories(product_id, is_primary);

-- Migrate existing data
INSERT INTO product_categories (product_id, tier_id, is_primary, sort_order)
SELECT id, category_tier_1, true, 1 FROM products WHERE category_tier_1 IS NOT NULL
UNION ALL
SELECT id, category_tier_2, false, 2 FROM products WHERE category_tier_2 IS NOT NULL
UNION ALL
SELECT id, category_tier_3, false, 3 FROM products WHERE category_tier_3 IS NOT NULL
UNION ALL
SELECT id, category_tier_4, false, 4 FROM products WHERE category_tier_4 IS NOT NULL;

-- Drop old columns (after verification)
ALTER TABLE products DROP COLUMN category_tier_1;
ALTER TABLE products DROP COLUMN category_tier_2;
ALTER TABLE products DROP COLUMN category_tier_3;
ALTER TABLE products DROP COLUMN category_tier_4;
```

### 2.2 Remove Redundant Denormalized Data

#### Cart Items - Remove Snapshot Fields
```sql
-- These should be fetched via JOIN from products table
-- Keep only for price snapshot at checkout time

-- Analysis needed: Determine if price history is required
-- Option A: Remove and always join with products
-- Option B: Only populate at checkout/order conversion
```

**Recommendation:** Keep `product_name`, `product_image_url`, `product_sku` but only populate when cart converts to order.

#### Order Items - Already Correct
✅ Order items correctly snapshot product data for historical purposes

### 2.3 Standardize Audit Metadata Fields

Create a consistent audit trail across all tables:

```sql
-- Tables to update with complete audit fields:

-- collections: Add updated_by, deleted_by, deleted_at
ALTER TABLE collections 
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- blogs: Add updated_by, deleted_by, deleted_at (has is_deleted)
ALTER TABLE blogs 
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;

-- reviews: Add created_by, updated_by, deleted_by, deleted_at
ALTER TABLE reviews 
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;

-- cart_items: Add created_by, updated_by, deleted_by
ALTER TABLE cart_items 
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN deleted_by UUID REFERENCES users(id);

-- order_items: Add all audit fields
ALTER TABLE order_items 
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;
```

**Deliverables:**
- [ ] Migration script: `004_create_product_categories_table.sql`
- [ ] Migration script: `005_migrate_product_categories_data.sql`
- [ ] Migration script: `006_standardize_audit_fields.sql`
- [ ] Update all API endpoints to use new category structure
- [ ] Update Drizzle schema
- [ ] Update product creation/update logic

---

## 🎯 PHASE 3: Security & Row Level Security (RLS)

**Priority:** 🔴 CRITICAL (for production)  
**Estimated Time:** 4-5 days  
**Impact:** Very High - Security

### 3.1 Enable RLS on User-Specific Tables

```sql
-- Orders: Users can see their own orders, admins see all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select_policy ON orders
FOR SELECT USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'super_admin')
  )
);

CREATE POLICY orders_insert_policy ON orders
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'super_admin')
  )
);

CREATE POLICY orders_update_policy ON orders
FOR UPDATE USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'super_admin')
  )
);
```

### 3.2 RLS Policies Needed For:

- [x] **orders** - Users see own, admins see all
- [x] **order_items** - Inherit from orders
- [x] **carts** - Users see own active cart
- [x] **cart_items** - Inherit from carts
- [x] **user_addresses** - Users manage own addresses
- [x] **wishlists** - Users see own wishlist
- [x] **wishlist_items** - Inherit from wishlists
- [x] **notifications** - Users see own notifications
- [x] **customer_profiles** - Users see own profile
- [x] **reviews** - Users see all, edit own
- [x] **product_questions** - Users see all, edit own

### 3.3 Admin-Only Tables (No User Access)

- [x] **admin_profiles**
- [x] **audit_logs**
- [x] **invitation**
- [x] **payment_transactions**
- [x] **payment_webhook_logs**
- [x] **inventory**
- [x] **inventory_adjustments**

**Deliverables:**
- [ ] Migration script: `007_enable_rls_orders.sql`
- [ ] Migration script: `008_enable_rls_carts.sql`
- [ ] Migration script: `009_enable_rls_user_data.sql`
- [ ] Test RLS policies with different user roles
- [ ] Document RLS policies in API docs
- [ ] Update frontend auth logic if needed

---

## 🎯 PHASE 4: Cascade Delete Policies

**Priority:** 🟡 HIGH  
**Estimated Time:** 2-3 days  
**Impact:** Medium - Data Integrity

### 4.1 Define Cascade Behavior

#### User Deletion (Soft Delete Preferred)
```sql
-- When user is soft-deleted, handle related data:

-- KEEP: Orders (historical data)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_users_id_fk;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- CASCADE: Active carts (no longer needed)
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_users_id_fk;
ALTER TABLE carts ADD CONSTRAINT carts_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- CASCADE: User addresses
ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_users_id_fk;
ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- CASCADE: Wishlist
ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_users_id_fk;
ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- CASCADE: Notification preferences
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_users_id_fk;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- KEEP: Reviews (show as "Deleted User")
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_users_id_fk;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
```

#### Product Deletion
```sql
-- CASCADE: Inventory records
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_products_id_fk;
ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_products_id_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- CASCADE: Product FAQs
ALTER TABLE product_faqs DROP CONSTRAINT IF EXISTS product_faqs_product_id_products_id_fk;
ALTER TABLE product_faqs ADD CONSTRAINT product_faqs_product_id_products_id_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- CASCADE: Product variants
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_products_id_fk;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_id_products_id_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- SET NULL: Cart items (prevent cart breaking)
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_products_id_fk;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_products_id_fk 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- RESTRICT: Order items (cannot delete product with orders)
-- Or SET NULL if you want to allow deletion
```

**Deliverables:**
- [ ] Migration script: `010_add_cascade_policies.sql`
- [ ] Document cascade behavior in README
- [ ] Test deletion scenarios
- [ ] Update deletion logic in services

---

## 🎯 PHASE 5: Type & Consistency Improvements

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 3-4 days  
**Impact:** Medium - Consistency

### 5.1 Migrate Integer IDs to UUID

**Tables to Migrate:**
- `invitation` (currently INTEGER)
- `audit_logs` (currently INTEGER)
- `uploads` (currently INTEGER)
- `email_otps` (currently INTEGER)

```sql
-- Example for invitation table:
-- Step 1: Add new UUID column
ALTER TABLE invitation ADD COLUMN new_id UUID DEFAULT uuid_generate_v7();

-- Step 2: Update all foreign key references
-- (invitation doesn't have FKs pointing to it, so this is simpler)

-- Step 3: Drop old PK and rename
ALTER TABLE invitation DROP CONSTRAINT invitation_pkey;
ALTER TABLE invitation DROP COLUMN id;
ALTER TABLE invitation RENAME COLUMN new_id TO id;
ALTER TABLE invitation ADD PRIMARY KEY (id);
```

### 5.2 Migrate to timestamptz

```sql
-- Migrate all timestamp columns to timestamptz
-- Example for products table:
ALTER TABLE products 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE,
ALTER COLUMN deleted_at TYPE TIMESTAMP WITH TIME ZONE;

-- Repeat for all tables with timestamp columns
```

### 5.3 Complete Soft Delete Implementation

Add missing `deleted_by` columns:

```sql
-- blog_subsections
ALTER TABLE blog_subsections 
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;

-- tiers
ALTER TABLE tiers 
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;

-- tags
ALTER TABLE tags 
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;

-- user_addresses
ALTER TABLE user_addresses 
ADD COLUMN deleted_by UUID REFERENCES users(id),
ADD COLUMN deleted_at TIMESTAMP;
```

**Deliverables:**
- [ ] Migration script: `011_migrate_to_uuid.sql`
- [ ] Migration script: `012_migrate_to_timestamptz.sql`
- [ ] Migration script: `013_complete_soft_delete.sql`
- [ ] Update Drizzle schema types
- [ ] Test timestamp handling with different timezones

---

## 🎯 PHASE 6: Performance Optimization

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 3-4 days  
**Impact:** High - Performance

### 6.1 Add Composite Indexes

```sql
-- Order search and filtering
CREATE INDEX idx_orders_composite 
ON orders(user_id, order_status, payment_status, created_at DESC)
WHERE is_deleted = false;

-- Inventory queries
CREATE INDEX idx_inventory_composite 
ON inventory(location_id, status, condition);

-- Product filtering
CREATE INDEX idx_products_composite 
ON products(status, featured, created_at DESC) 
WHERE is_deleted = false;

-- User roles lookup
CREATE INDEX idx_user_roles_composite 
ON user_roles(user_id, role_id);

-- Payment transaction lookup
CREATE INDEX idx_payment_transactions_razorpay 
ON payment_transactions(razorpay_order_id, status);

-- Notification queries
CREATE INDEX idx_notifications_composite 
ON notifications(user_id, type, is_read, created_at DESC)
WHERE deleted_at IS NULL;

-- Cart active items
CREATE INDEX idx_cart_items_active 
ON cart_items(cart_id, product_id) 
WHERE is_deleted = false;
```

### 6.2 Create Database Views for Calculated Fields

Instead of storing calculated values in carts table:

```sql
CREATE OR REPLACE VIEW cart_totals AS
SELECT 
  c.id as cart_id,
  c.user_id,
  COALESCE(SUM(ci.line_subtotal), 0) as subtotal,
  COALESCE(SUM(ci.discount_amount), 0) as discount_total,
  c.giftcard_total,
  c.shipping_total,
  -- Tax calculation would go here
  COALESCE(SUM(ci.line_total), 0) + c.shipping_total - c.giftcard_total as grand_total
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id AND ci.is_deleted = false
WHERE c.is_deleted = false
GROUP BY c.id, c.user_id, c.giftcard_total, c.shipping_total;
```

### 6.3 Optimize Large Tables

```sql
-- Add partitioning for audit_logs (by month)
-- Add partitioning for notifications (by month)
-- Add partitioning for payment_webhook_logs (by month)

-- Example for audit_logs:
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

**Deliverables:**
- [ ] Migration script: `014_add_composite_indexes.sql`
- [ ] Migration script: `015_create_views.sql`
- [ ] Migration script: `016_setup_partitioning.sql` (optional)
- [ ] Performance testing before/after
- [ ] Update queries to use views where applicable

---

## 🎯 PHASE 7: Data Validation & Constraints

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 2-3 days  
**Impact:** Medium - Data Quality

### 7.1 Add JSON Schema Validation

```sql
-- Validate products.tags structure
ALTER TABLE products ADD CONSTRAINT check_tags_array
CHECK (jsonb_typeof(tags) = 'array');

-- Validate products.additional_images structure
ALTER TABLE products ADD CONSTRAINT check_additional_images
CHECK (
  jsonb_typeof(additional_images) = 'array' AND
  (SELECT bool_and(jsonb_typeof(value) = 'string') 
   FROM jsonb_array_elements(additional_images))
);

-- Validate orders.tags structure
ALTER TABLE orders ADD CONSTRAINT check_orders_tags
CHECK (jsonb_typeof(tags) = 'array');

-- Validate notification channels
ALTER TABLE notifications ADD CONSTRAINT check_channels
CHECK (
  jsonb_typeof(channels) = 'array' AND
  (SELECT bool_and(value::text IN ('"email"', '"sms"', '"in_app"', '"push"'))
   FROM jsonb_array_elements(channels))
);
```

### 7.2 Add Business Logic Constraints

```sql
-- Inventory: reserved cannot exceed available
ALTER TABLE inventory ADD CONSTRAINT check_inventory_reserved
CHECK (reserved_quantity <= available_quantity + reserved_quantity);

-- Orders: delivery_date must be after order creation
ALTER TABLE orders ADD CONSTRAINT check_delivery_after_creation
CHECK (delivery_date IS NULL OR delivery_date >= created_at);

-- Product variants: selling price should be positive
ALTER TABLE product_variants ADD CONSTRAINT check_selling_price_positive
CHECK (selling_price > 0);

-- Payment transactions: refund amount cannot exceed payment amount
ALTER TABLE payment_transactions ADD CONSTRAINT check_refund_amount
CHECK (refund_amount IS NULL OR refund_amount <= amount);
```

### 7.3 Add Missing NOT NULL Constraints

```sql
-- Add NOT NULL where logically required
ALTER TABLE order_items ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN cost_price SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN line_total SET NOT NULL;

ALTER TABLE cart_items ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE cart_items ALTER COLUMN cost_price SET NOT NULL;

-- Verify and add more based on business logic
```

**Deliverables:**
- [ ] Migration script: `017_add_json_validation.sql`
- [ ] Migration script: `018_add_business_constraints.sql`
- [ ] Migration script: `019_add_not_null_constraints.sql`
- [ ] Test constraint violations
- [ ] Update error handling in APIs

---

## 🎯 PHASE 8: Documentation & Cleanup

**Priority:** 🔵 LOW  
**Estimated Time:** 2-3 days  
**Impact:** Low - Maintainability

### 8.1 Add Table Comments

```sql
-- Add descriptions to all tables
COMMENT ON TABLE products IS 'Core product catalog with variants support';
COMMENT ON TABLE orders IS 'Customer orders with payment and fulfillment tracking';
COMMENT ON TABLE inventory IS 'Real-time inventory tracking across multiple locations';
COMMENT ON TABLE users IS 'User accounts supporting both customers and admins';

-- Add column comments for complex fields
COMMENT ON COLUMN products.search_vector IS 'Generated tsvector for full-text search';
COMMENT ON COLUMN orders.razorpay_order_id IS 'Razorpay payment gateway order identifier';
COMMENT ON COLUMN carts.applied_discount_codes IS 'Array of applied discount code objects with details';
```

### 8.2 Create Database Diagram

Generate comprehensive ERD showing:
- All tables and relationships
- Primary keys and foreign keys
- Indexes
- Constraints

### 8.3 Create Migration Rollback Scripts

For each migration, create corresponding rollback:
- `001_add_foreign_keys.sql` → `rollback_001.sql`
- `002_add_unique_constraints.sql` → `rollback_002.sql`
- etc.

### 8.4 Create Database Seed Scripts

```sql
-- Seed essential data
-- Default roles
INSERT INTO roles (name, description, is_system_role) VALUES
('super_admin', 'Full system access', true),
('admin', 'Admin access', true),
('customer', 'Customer access', true);

-- Default permissions
-- Default notification templates
-- Default inventory locations
```

**Deliverables:**
- [ ] Add comments to all tables and complex columns
- [ ] Generate ERD diagram
- [ ] Create rollback scripts for all migrations
- [ ] Create seed data scripts
- [ ] Update project documentation

---

## 📊 Migration Execution Strategy

### Pre-Migration Checklist
- [ ] Full database backup
- [ ] Test migrations on staging/development
- [ ] Notify team of scheduled maintenance
- [ ] Prepare rollback plan
- [ ] Monitor database performance metrics

### Execution Order
1. Run Phase 1 migrations (critical fixes)
2. Verify data integrity
3. Run Phase 2 migrations (normalization)
4. Update application code for category changes
5. Run Phase 3 migrations (RLS)
6. Test authentication and authorization
7. Run Phase 4-8 migrations incrementally

### Post-Migration Checklist
- [ ] Verify all foreign keys
- [ ] Check query performance
- [ ] Test application functionality
- [ ] Monitor error logs
- [ ] Update API documentation

---

## 🔍 Monitoring & Maintenance

### Queries to Monitor
```sql
-- Check for missing indexes (slow queries)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' 
ORDER BY abs(correlation) DESC;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for unused indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 📝 Notes

- **Phase 2 Items (Deferred):** Discounts, discount codes, bundles, tax rules, giftcards tables
- All migrations should be reversible
- Test thoroughly in development before production
- Consider downtime requirements for each phase
- Update Drizzle schema after each phase

**Total Estimated Time:** 20-30 days (across all phases)
**Priority Order:** Phase 1 → Phase 3 → Phase 4 → Phase 2 → Phase 6 → Phase 5 → Phase 7 → Phase 8

---

## 🚀 Getting Started

To begin Phase 1, see migration scripts in:
```
/migrations/phase-1/001_add_foreign_keys.sql
```

For questions or issues, refer to the database team lead.
