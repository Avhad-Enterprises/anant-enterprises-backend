# Unused Tables Analysis - Database Migration Optimization

**Generated:** $(date)
**Database:** Supabase PostgreSQL
**Total Tables:** 84
**Empty Tables:** 53 (63%)
**Tables with Data:** 31 (37%)

---

## Executive Summary

Out of 84 total tables in the database:
- **53 tables have 0 rows** and are completely unused
- **31 tables contain data** and are actively used
- **4 empty tables have foreign key references** from tables with data (cannot be safely removed yet)
- **49 tables can be safely commented out** from migrations

---

## 🚨 CRITICAL: Tables with Dependencies (Cannot Comment Out Yet)

These empty tables have foreign key references from tables that contain data. They must remain until those references are removed:

| Table | Schema File | Referenced By | Reason |
|-------|-------------|---------------|--------|
| `bundles` | [src/features/bundles/shared/bundles.schema.ts](../src/features/bundles/shared/bundles.schema.ts) | `cart_items.bundle_id` | Carts use bundles |
| `discount_codes` | [src/features/discount/shared/discount-codes.schema.ts](../src/features/discount/shared/discount-codes.schema.ts) | `orders.discount_code_id` | Orders reference discount codes |
| `discounts` | [src/features/discount/shared/discount.schema.ts](../src/features/discount/shared/discount.schema.ts) | `orders.discount_id` | Orders reference discounts |
| `tax_rules` | [src/features/settings/shared/tax-rules.schema.ts](../src/features/settings/shared/tax-rules.schema.ts) | `orders.tax_rule_id` | Orders reference tax rules |

**Action Required:** Make these FK columns nullable in `orders` and `cart_items` tables first, then these can be commented out.

---

## ✅ Safe to Comment Out (49 Tables)

### Category 1: Catalogue System (3 tables) - HIGH PRIORITY
**Impact:** These are core features but completely unused. Safe to remove.

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `catalogues` | [src/features/catalogue/shared/catalogue.schema.ts](../src/features/catalogue/shared/catalogue.schema.ts) | 0 | 16 |
| `catalogue_rules` | [src/features/catalogue/shared/catalogue-rules.schema.ts](../src/features/catalogue/shared/catalogue-rules.schema.ts) | 0 | 5 |
| `catalogue_product_overrides` | [src/features/catalogue/shared/catalogue-overrides.schema.ts](../src/features/catalogue/shared/catalogue-overrides.schema.ts) | 0 | 8 |

**Files to Comment:**
```typescript
// src/features/catalogue/shared/catalogue.schema.ts
// src/features/catalogue/shared/catalogue-rules.schema.ts
// src/features/catalogue/shared/catalogue-overrides.schema.ts
```

---

### Category 2: Companies System (2 tables) - HIGH PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `companies` | [src/features/company/shared/company.schema.ts](../src/features/company/shared/company.schema.ts) | 0 | 14 |
| `company_rules` | [src/features/company/shared/company-rules.schema.ts](../src/features/company/shared/company-rules.schema.ts) | 0 | 5 |

**Files to Comment:**
```typescript
// src/features/company/shared/company.schema.ts
// src/features/company/shared/company-rules.schema.ts
```

---

### Category 3: Bundle Items (1 table) - MEDIUM PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `bundle_items` | [src/features/bundles/shared/bundle-items.schema.ts](../src/features/bundles/shared/bundle-items.schema.ts) | 0 | 10 |

**Note:** Parent `bundles` table cannot be removed due to FK dependency (see above).

**File to Comment:**
```typescript
// src/features/bundles/shared/bundle-items.schema.ts
```

---

### Category 4: Chatbot System (3 tables) - HIGH PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `chatbot_sessions` | [src/features/chatbot/shared/chatbot.schema.ts](../src/features/chatbot/shared/chatbot.schema.ts) | 0 | 10 |
| `chatbot_messages` | [src/features/chatbot/shared/chatbot.schema.ts](../src/features/chatbot/shared/chatbot.schema.ts) | 0 | 12 |
| `chatbot_documents` | [src/features/chatbot/shared/chatbot.schema.ts](../src/features/chatbot/shared/chatbot.schema.ts) | 0 | 18 |

**File to Comment:**
```typescript
// src/features/chatbot/shared/chatbot.schema.ts (entire file)
```

---

### Category 5: Discount System (13 tables!) - CRITICAL PRIORITY ⚠️
**Impact:** 13 empty tables consuming significant schema space

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `discount_buy_x_collections` | [src/features/discount/shared/discount-advanced.schema.ts](../src/features/discount/shared/discount-advanced.schema.ts) | 0 | 2 |
| `discount_buy_x_products` | [src/features/discount/shared/discount-advanced.schema.ts](../src/features/discount/shared/discount-advanced.schema.ts) | 0 | 2 |
| `discount_collections` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_customers` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_daily_usage` | [src/features/discount/shared/discount-usage.schema.ts](../src/features/discount/shared/discount-usage.schema.ts) | 0 | 4 |
| `discount_exclusions` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 4 |
| `discount_get_y_collections` | [src/features/discount/shared/discount-advanced.schema.ts](../src/features/discount/shared/discount-advanced.schema.ts) | 0 | 2 |
| `discount_get_y_products` | [src/features/discount/shared/discount-advanced.schema.ts](../src/features/discount/shared/discount-advanced.schema.ts) | 0 | 2 |
| `discount_products` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_regions` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 3 |
| `discount_segments` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_shipping_methods` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_shipping_zones` | [src/features/discount/shared/discount-items.schema.ts](../src/features/discount/shared/discount-items.schema.ts) | 0 | 2 |
| `discount_usage` | [src/features/discount/shared/discount-usage.schema.ts](../src/features/discount/shared/discount-usage.schema.ts) | 0 | 14 |

**Files to Comment (Keep discount.schema.ts and discount-codes.schema.ts due to FK):**
```typescript
// src/features/discount/shared/discount-advanced.schema.ts (4 tables)
// src/features/discount/shared/discount-items.schema.ts (9 tables)  
// src/features/discount/shared/discount-usage.schema.ts (discount_usage + discount_daily_usage)
```

---

### Category 6: Gift Cards (3 tables) - HIGH PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `gift_cards` | [src/features/giftcards/shared/gift-cards.schema.ts](../src/features/giftcards/shared/gift-cards.schema.ts) | 0 | 39 |
| `gift_card_templates` | [src/features/giftcards/shared/gift-card-templates.schema.ts](../src/features/giftcards/shared/gift-card-templates.schema.ts) | 0 | 24 |
| `gift_card_transactions` | [src/features/giftcards/shared/gift-card-transactions.schema.ts](../src/features/giftcards/shared/gift-card-transactions.schema.ts) | 0 | 15 |

**Files to Comment:**
```typescript
// src/features/giftcards/shared/gift-cards.schema.ts
// src/features/giftcards/shared/gift-card-templates.schema.ts
// src/features/giftcards/shared/gift-card-transactions.schema.ts
```

---

### Category 7: Wishlist (2 tables) - MEDIUM PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `wishlists` | [src/features/wishlist/shared/wishlist.schema.ts](../src/features/wishlist/shared/wishlist.schema.ts) | 0 | 6 |
| `wishlist_items` | [src/features/wishlist/shared/wishlist-items.schema.ts](../src/features/wishlist/shared/wishlist-items.schema.ts) | 0 | 7 |

**Files to Comment:**
```typescript
// src/features/wishlist/shared/wishlist.schema.ts
// src/features/wishlist/shared/wishlist-items.schema.ts
```

---

### Category 8: Reviews & Questions (2 tables) - LOW PRIORITY
**Note:** May be needed soon for product reviews feature

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `reviews` | [src/features/reviews/shared/reviews.schema.ts](../src/features/reviews/shared/reviews.schema.ts) | 0 | 14 |
| `product_questions` | [src/features/reviews/shared/product-questions.schema.ts](../src/features/reviews/shared/product-questions.schema.ts) | 0 | 11 |

**Files to Comment (optional):**
```typescript
// src/features/reviews/shared/reviews.schema.ts
// src/features/reviews/shared/product-questions.schema.ts
```

---

### Category 9: Tickets System (2 tables) - MEDIUM PRIORITY

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `tickets` | [src/features/tickets/shared/tickets.schema.ts](../src/features/tickets/shared/tickets.schema.ts) | 0 | 27 |
| `ticket_messages` | [src/features/tickets/shared/ticket-messages.schema.ts](../src/features/tickets/shared/ticket-messages.schema.ts) | 0 | 14 |

**Files to Comment:**
```typescript
// src/features/tickets/shared/tickets.schema.ts
// src/features/tickets/shared/ticket-messages.schema.ts
```

---

### Category 10: Inventory (3 tables) - LOW PRIORITY
**Note:** May be needed for inventory management feature

| Table | Schema File | Row Count | Columns |
|-------|-------------|-----------|---------|
| `inventory_transfers` | [src/features/inventory/shared/inventory-transfers.schema.ts](../src/features/inventory/shared/inventory-transfers.schema.ts) | 0 | 19 |
| `location_allocation_rules` | [src/features/inventory/shared/location-allocation-rules.schema.ts](../src/features/inventory/shared/location-allocation-rules.schema.ts) | 0 | 12 |
| `production_orders` | [src/features/inventory/shared/production-orders.schema.ts](../src/features/inventory/shared/production-orders.schema.ts) | 0 | 23 |

**Files to Comment (optional):**
```typescript
// src/features/inventory/shared/inventory-transfers.schema.ts
// src/features/inventory/shared/location-allocation-rules.schema.ts
// src/features/inventory/shared/production-orders.schema.ts
```

---

### Category 11: User & Profiles (5 tables) - MIXED PRIORITY

| Table | Schema File | Row Count | Columns | Priority |
|-------|-------------|-----------|---------|----------|
| `admin_profiles` | [src/features/user/shared/admin-profiles.schema.ts](../src/features/user/shared/admin-profiles.schema.ts) | 0 | 9 | LOW - Keep (admins needed) |
| `business_customer_profiles` | [src/features/user/shared/business-profiles.schema.ts](../src/features/user/shared/business-profiles.schema.ts) | 0 | 32 | HIGH - Comment (B2B not used) |
| `customer_statistics` | [src/features/user/shared/customer-statistics.schema.ts](../src/features/user/shared/customer-statistics.schema.ts) | 0 | 20 | MEDIUM - Comment (analytics unused) |
| `user_payment_methods` | [src/features/user/shared/payment-methods.schema.ts](../src/features/user/shared/payment-methods.schema.ts) | 0 | 25 | LOW - Keep (payments coming soon) |
| `sessions` | [src/features/profile/shared/sessions.schema.ts](../src/features/profile/shared/sessions.schema.ts) | 0 | 11 | LOW - Keep (auth needed) |

**Files to Comment:**
```typescript
// src/features/user/shared/business-profiles.schema.ts (B2B not used)
// src/features/user/shared/customer-statistics.schema.ts (analytics unused)
```

---

### Category 12: Misc Tables (9 tables)

| Table | Schema File | Row Count | Columns | Priority |
|-------|-------------|-----------|---------|----------|
| `blog_subsections` | [src/features/blog/shared/blog-subsections.schema.ts](../src/features/blog/shared/blog-subsections.schema.ts) | 0 | 6 | HIGH - Comment |
| `collection_rules` | [src/features/collection/shared/collection-rules.schema.ts](../src/features/collection/shared/collection-rules.schema.ts) | 0 | 5 | MEDIUM - Comment |
| `countries` | *Missing schema file* | 0 | 10 | **KEEP - Reference data** |
| `currencies` | [src/features/settings/shared/currencies.schema.ts](../src/features/settings/shared/currencies.schema.ts) | 0 | 14 | **KEEP - Reference data** |
| `entity_media` | [src/features/media-manager/shared/entity-media.schema.ts](../src/features/media-manager/shared/entity-media.schema.ts) | 0 | 12 | LOW - Keep (media needed) |
| `faqs` | [src/features/faq/shared/faq.schema.ts](../src/features/faq/shared/faq.schema.ts) | 0 | 11 | MEDIUM - Comment |
| `notification_preferences` | [src/features/notifications/shared/notification-preferences.schema.ts](../src/features/notifications/shared/notification-preferences.schema.ts) | 0 | 13 | LOW - Keep (notifs active) |
| `payment_webhook_logs` | [src/features/payments/shared/webhook-logs.schema.ts](../src/features/payments/shared/webhook-logs.schema.ts) | 0 | 12 | LOW - Keep (payments coming) |
| `regions` | *Missing schema file* | 0 | 6 | **KEEP - Reference data** |

**Files to Comment:**
```typescript
// src/features/blog/shared/blog-subsections.schema.ts
// src/features/collection/shared/collection-rules.schema.ts
// src/features/faq/shared/faq.schema.ts
```

---

## 📊 Tables Currently in Use (31 tables with data)

These tables are actively used and should NOT be commented out:

### Core Business Tables
- `users` (76 rows)
- `customer_profiles` (75 rows)
- `products` (49 rows)
- `product_variants` (data exists)
- `orders` (13 rows)
- `order_items` (18 rows)
- `inventory` (49 rows)
- `inventory_locations` (1 row)

### Collections & Media
- `collections` (26 rows)
- `collection_products` (88 rows)
- `uploads` (238 rows)
- `tags` (1 row)

### Shopping & Cart
- `carts` (6 rows)
- `cart_items` (17 rows)
- `addresses` (55 rows)

### Blog & Content
- `blogs` (1 row)
- `product_faqs` (data exists)

### Notifications
- `notifications` (8 rows)
- `notification_templates` (17 rows)
- `notification_delivery_logs` (data exists)

### Payments & Transactions
- `payment_transactions` (13 rows)
- `tiers` (3 rows)

### Inventory Management
- `inventory_adjustments` (data exists)
- `variant_inventory_adjustments` (data exists)

### RBAC System
- `roles` (3 rows)
- `permissions` (36 rows)
- `role_permissions` (38 rows)

### Admin & System
- `invitations` (1 row)
- `email_otps` (data exists)
- `audit_logs` (data exists)

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate (High Priority) - 21 Tables
Comment out these tables to immediately reduce schema complexity by 25%:

1. **Catalogue System** (3 tables)
2. **Companies** (2 tables)
3. **Chatbot** (3 tables)
4. **Gift Cards** (3 tables)
5. **Discount Advanced** (13 tables - requires FK changes first)

**Estimated Time:** 2 hours (including FK nullable changes)

### Phase 2: Medium Priority - 8 Tables
Comment after verifying no upcoming features need them:

1. **Bundles** (1 table - bundle_items)
2. **Wishlists** (2 tables)
3. **Tickets** (2 tables)
4. **Blog Subsections** (1 table)
5. **Collection Rules** (1 table)
6. **FAQs** (1 table)

**Estimated Time:** 1 hour

### Phase 3: Low Priority (Optional) - 7 Tables
Consider commenting if these features won't be built soon:

1. **Reviews & Questions** (2 tables)
2. **Inventory Advanced** (3 tables)
3. **Customer Statistics** (1 table)
4. **Business Profiles** (1 table)

**Estimated Time:** 30 minutes

### Phase 4: Keep Commented (Do Not Migrate)
Total reduction: **36 tables (43% of database)**

---

## 🔧 Implementation Steps

### Step 1: Make Foreign Keys Nullable

```typescript
// In src/features/orders/shared/orders.schema.ts
discount_id: uuid('discount_id').references(() => discounts.id),
// Change to:
discount_id: uuid('discount_id').references(() => discounts.id).nullable(),

discount_code_id: varchar('discount_code_id', { length: 255 }).references(() => discountCodes.code),
// Change to:
discount_code_id: varchar('discount_code_id', { length: 255 }).references(() => discountCodes.code).nullable(),

tax_rule_id: uuid('tax_rule_id').references(() => taxRules.id),
// Change to:
tax_rule_id: uuid('tax_rule_id').references(() => taxRules.id).nullable(),

// In src/features/cart/shared/cart-items.schema.ts
bundle_id: uuid('bundle_id').references(() => bundles.id),
// Change to:
bundle_id: uuid('bundle_id').references(() => bundles.id).nullable(),
```

### Step 2: Comment Out Schema Files

Example for [src/features/chatbot/shared/chatbot.schema.ts](../src/features/chatbot/shared/chatbot.schema.ts):

```typescript
/*
 * COMMENTED OUT - Table not in use as of [DATE]
 * Reason: Chatbot feature not implemented yet
 * Can be uncommented when chatbot development begins
 * 
 * Original schema below:
 */
// import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
// ... rest of file
```

### Step 3: Update Database Schema Index

Find the main schema index file (likely `src/database/schema/index.ts` or similar) and comment out the imports:

```typescript
// Core tables (keep)
export * from '../../features/user/shared/user.schema';
export * from '../../features/product/shared/product.schema';
// ... other active tables

// Commented out - unused tables
// export * from '../../features/chatbot/shared/chatbot.schema';
// export * from '../../features/catalogue/shared/catalogue.schema';
// export * from '../../features/giftcards/shared/gift-cards.schema';
// ... etc
```

### Step 4: Run Drizzle Push

```bash
# This will sync the schema to match your TypeScript definitions
npm run db:push
# or
npx drizzle-kit push
```

---

## ⚠️ Important Notes

1. **Backup First:** Take a database snapshot before making changes
2. **FK Dependencies:** Must resolve foreign key references before dropping tables
3. **Drizzle Behavior:** Commenting out schema files won't drop tables automatically - you'll need to manually drop them or run migrations
4. **Reversible:** Keep commented code in version control for easy restoration
5. **Team Communication:** Notify team before removing schemas to avoid confusion

---

## 📈 Expected Benefits

After commenting out 36 unused tables:

✅ **Reduced Schema Complexity:** 84 → 48 tables (43% reduction)
✅ **Easier Code Navigation:** Fewer schema files to review
✅ **Faster Type Generation:** Drizzle generates types for fewer tables
✅ **Clearer Intent:** Schema reflects actually implemented features
✅ **Easier RLS Management:** 84 RLS violations → ~48 to fix (43% fewer)
✅ **Faster Database Operations:** Fewer tables in query planner
✅ **Simpler Migrations:** Future migrations won't carry unused schemas

---

## 🔍 Verification Query

After making changes, verify table counts:

```sql
-- Check remaining empty tables
SELECT COUNT(*) as empty_tables
FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_stat_user_tables s 
    WHERE s.schemaname = t.schemaname 
      AND s.relname = t.tablename 
      AND s.n_live_tup > 0
  );

-- Should return much lower number after cleanup
```

---

## 📝 Files Summary

**Total Schema Files:** 65
**Files to Comment (Phase 1-3):** 36 files
**Files to Keep:** 29 files

**High Priority Files to Comment (21 tables):**
- `src/features/catalogue/*.schema.ts` (3 files)
- `src/features/company/*.schema.ts` (2 files)
- `src/features/chatbot/shared/chatbot.schema.ts` (1 file)
- `src/features/giftcards/*.schema.ts` (3 files)
- `src/features/discount/shared/discount-advanced.schema.ts` (1 file)
- `src/features/discount/shared/discount-items.schema.ts` (1 file)
- `src/features/discount/shared/discount-usage.schema.ts` (1 file)

---

**End of Analysis**
