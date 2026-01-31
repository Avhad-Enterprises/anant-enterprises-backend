# Inventory & Data Normalization Plan

**Created:** 31 January 2026  
**Status:** Analysis Complete - Ready for Implementation  
**Priority:** HIGH - Addressing redundancy and data integrity issues

---

## Executive Summary

After comprehensive analysis of inventory-related schemas and database tables, several critical redundancy and normalization issues have been identified:

### 🔴 Critical Issues Found

1. **Product Variants Inventory Duplication**
   - `product_variants.inventory_quantity` exists but should use `inventory` table
   - Variant inventory tracked separately from main inventory system
   - No multi-location support for variants

2. **Inventory Table Redundancy**
   - `inventory.product_name` duplicates `products.product_title`
   - `inventory.sku` duplicates `products.sku`
   - Denormalization justified for reporting but needs documentation

3. **Cart Items Snapshot Redundancy**
   - `cart_items.product_name` duplicates `products.product_title`
   - `cart_items.product_image_url` duplicates `products.primary_image_url`
   - `cart_items.product_sku` duplicates `products.sku`
   - Justified for abandoned cart emails but poorly documented

4. **Missing Audit Fields (Phase 2 Remainder)**
   - Several tables lack standardized `created_by`, `updated_by`, `deleted_by` fields
   - Inconsistent soft delete patterns

---

## Database Analysis Summary

### Tables Analyzed (46 total)

#### Inventory-Related Tables (6)
1. **inventory** (81 rows)
   - Links: `products`, `inventory_locations`, `users`
   - Has: `product_name`, `sku` (redundant)
   - Missing: variant support

2. **product_variants** (25 rows)
   - Has: `inventory_quantity` ⚠️ CRITICAL ISSUE
   - Should use: `inventory` table instead
   - Missing: location tracking

3. **inventory_adjustments** (272 rows)
   - Links to: `inventory` table only
   - Missing: variant inventory adjustment support

4. **variant_inventory_adjustments** (21 rows)
   - Separate adjustment tracking for variants
   - Indicates variant inventory is tracked separately ⚠️

5. **inventory_locations** (2 rows)
   - Only used by main `inventory` table
   - Not used by `product_variants`

6. **inventory_transfers** (0 rows - schema only)
   - Not yet implemented in drizzle.ts

#### Product Tables (2)
1. **products** (82 rows)
   - Removed: `inventory_quantity` (good!)
   - Has: category tier system (working well)
   - Links: 4-tier category structure

2. **product_variants** (25 rows)
   - Has: independent pricing ✅
   - Has: `inventory_quantity` ⚠️ SHOULD BE REMOVED

#### Transaction Tables (2)
1. **cart_items** (232 rows)
   - Redundant fields: `product_name`, `product_image_url`, `product_sku`
   - Purpose: Abandoned cart recovery emails
   - Status: Justified but needs documentation

2. **order_items** (168 rows)
   - Redundant fields: `sku`, `product_name`, `product_image`
   - Purpose: Historical record (prices change)
   - Status: Justified and necessary ✅

---

## Detailed Issues & Solutions

### Issue 1: Product Variant Inventory Duplication

**Current State:**
```typescript
// product_variants table
inventory_quantity: integer('inventory_quantity').default(0).notNull()

// inventory table
product_id: uuid('product_id')  // Only references products, not variants
available_quantity: integer('available_quantity')
location_id: uuid('location_id')  // Multi-location support
```

**Problem:**
- Variants store inventory in their own table (`product_variants.inventory_quantity`)
- Main products use the `inventory` table with multi-location support
- Inconsistent inventory tracking across product types
- Cannot track variant inventory by location
- Duplicate adjustment tables needed (`inventory_adjustments` vs `variant_inventory_adjustments`)

**Solution: Unified Inventory System**

Add variant support to the `inventory` table:

```typescript
// inventory table - AFTER changes
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey(),
  product_id: uuid('product_id').references(() => products.id),
  variant_id: uuid('variant_id').references(() => productVariants.id), // NEW
  location_id: uuid('location_id').references(() => inventoryLocations.id),
  
  // REMOVE these redundant fields (Phase 2):
  // product_name: varchar('product_name'),  // Can join to products
  // sku: varchar('sku'),  // Can join to products/variants
  
  available_quantity: integer('available_quantity'),
  reserved_quantity: integer('reserved_quantity'),
  // ... rest of fields
});

// product_variants table - AFTER changes
export const productVariants = pgTable('product_variants', {
  // ... other fields
  
  // REMOVE this field:
  // inventory_quantity: integer('inventory_quantity')
  
  // Inventory now queried from inventory table:
  // SELECT SUM(available_quantity) FROM inventory WHERE variant_id = ?
});
```

**Migration Steps:**

1. **Add `variant_id` column to `inventory` table**
   ```sql
   ALTER TABLE inventory 
   ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;
   ```

2. **Create unique constraint** (product_id + variant_id + location_id)
   ```sql
   -- Drop existing constraint
   ALTER TABLE inventory DROP CONSTRAINT IF EXISTS uq_inventory_product_location;
   
   -- Add new constraint allowing variant_id
   ALTER TABLE inventory ADD CONSTRAINT uq_inventory_product_variant_location 
   UNIQUE (product_id, variant_id, location_id);
   ```

3. **Migrate variant inventory data**
   ```sql
   -- For each variant with inventory, create inventory records
   INSERT INTO inventory (id, product_id, variant_id, location_id, available_quantity, sku, product_name)
   SELECT 
     uuid_generate_v7(),
     pv.product_id,
     pv.id as variant_id,
     (SELECT id FROM inventory_locations WHERE is_default = true LIMIT 1),
     pv.inventory_quantity,
     pv.sku,
     p.product_title || ' - ' || pv.option_value
   FROM product_variants pv
   JOIN products p ON pv.product_id = p.id
   WHERE pv.inventory_quantity > 0;
   ```

4. **Add CHECK constraint** to ensure either product_id OR variant_id (not both)
   ```sql
   ALTER TABLE inventory ADD CONSTRAINT check_inventory_product_or_variant
   CHECK (
     (product_id IS NOT NULL AND variant_id IS NULL) OR 
     (product_id IS NULL AND variant_id IS NOT NULL)
   );
   ```

5. **Merge adjustment tables**
   ```sql
   -- Migrate variant_inventory_adjustments to inventory_adjustments
   INSERT INTO inventory_adjustments (
     id, inventory_id, adjustment_type, quantity_change, reason,
     quantity_before, quantity_after, adjusted_by, adjusted_at, notes
   )
   SELECT 
     via.id,
     i.id as inventory_id,
     via.adjustment_type,
     via.quantity_change,
     via.reason,
     via.quantity_before,
     via.quantity_after,
     via.adjusted_by,
     via.adjusted_at,
     via.notes
   FROM variant_inventory_adjustments via
   JOIN inventory i ON i.variant_id = via.variant_id;
   
   -- Drop old table
   DROP TABLE variant_inventory_adjustments;
   ```

6. **Remove `inventory_quantity` from `product_variants`**
   ```sql
   ALTER TABLE product_variants DROP COLUMN inventory_quantity;
   ```

**Impact:**
- ✅ Unified inventory tracking for products and variants
- ✅ Multi-location support for variants
- ✅ Simpler codebase (one adjustment system)
- ✅ Better inventory reporting across all SKUs
- ⚠️ Requires API updates to query inventory table
- ⚠️ Breaking change - requires frontend updates

---

### Issue 2: Inventory Table Redundant Fields

**Current State:**
```typescript
export const inventory = pgTable('inventory', {
  product_id: uuid('product_id'),
  product_name: varchar('product_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull(),
  // ... other fields
});
```

**Problem:**
- `product_name` duplicates `products.product_title`
- `sku` duplicates `products.sku` (or `product_variants.sku`)
- Data can become stale if product is renamed
- No clear documentation on WHY these exist

**Analysis:**

These fields are **justified denormalization** for:
1. **Reporting Performance** - Inventory reports need product name without JOIN
2. **Historical Accuracy** - If product is renamed, old inventory records keep original name
3. **Data Warehouse** - Easier ETL without complex joins

**Decision: KEEP BUT DOCUMENT**

**Solution:**

1. **Add schema documentation**
   ```typescript
   export const inventory = pgTable('inventory', {
     // ... other fields
     
     // DENORMALIZED FIELDS (Performance optimization)
     // These duplicate data from products/variants tables for reporting speed.
     // Sync strategy: Update on product update via trigger or application code.
     // Use Case: Inventory reports, adjustments, audit logs without JOINs.
     product_name: varchar('product_name', { length: 255 }).notNull()
       .$comment('Denormalized from products.product_title for reporting performance'),
     sku: varchar('sku', { length: 100 }).notNull()
       .$comment('Denormalized from products.sku or product_variants.sku'),
   });
   ```

2. **Create sync function** (optional - for data integrity)
   ```sql
   -- PostgreSQL trigger to keep inventory.product_name in sync
   CREATE OR REPLACE FUNCTION sync_inventory_product_name()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE inventory 
     SET product_name = NEW.product_title
     WHERE product_id = NEW.id;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   CREATE TRIGGER trigger_sync_inventory_product_name
   AFTER UPDATE OF product_title ON products
   FOR EACH ROW
   EXECUTE FUNCTION sync_inventory_product_name();
   ```

3. **Add to Phase 7 (Data Validation)**
   - Add CHECK constraint: `product_name IS NOT NULL`
   - Add CHECK constraint: `sku IS NOT NULL`
   - Add validation in application code

**Status:** Accepted as intentional denormalization ✅

---

### Issue 3: Cart Items Product Snapshot

**Current State:**
```typescript
export const cartItems = pgTable('cart_items', {
  product_id: uuid('product_id'),
  
  // Product Snapshot (denormalized)
  product_name: varchar('product_name', { length: 255 }),
  product_image_url: text('product_image_url'),
  product_sku: varchar('product_sku', { length: 100 }),
});
```

**Problem:**
- Redundant data that can go stale
- Purpose unclear from schema alone
- No documentation on sync strategy

**Analysis:**

These fields are **justified for business logic**:
1. **Abandoned Cart Emails** - Need product details even if product is deleted
2. **Price History** - Track what user saw at time of adding to cart
3. **Analytics** - Cart behavior analysis without complex joins

**Decision: KEEP BUT DOCUMENT**

**Solution:**

1. **Add schema documentation**
   ```typescript
   export const cartItems = pgTable('cart_items', {
     // ... other fields
     
     // PRODUCT SNAPSHOT FIELDS
     // Purpose: Abandoned cart recovery emails, analytics
     // Populated at time of adding to cart (not synced)
     // Allows cart recovery even if product is deleted/renamed
     product_name: varchar('product_name', { length: 255 })
       .$comment('Snapshot for abandoned cart emails'),
     product_image_url: text('product_image_url')
       .$comment('Snapshot for abandoned cart emails'),
     product_sku: varchar('product_sku', { length: 100 })
       .$comment('Snapshot for cart analytics'),
   });
   ```

2. **Add application-level sync logic**
   - When adding item to cart: Copy product details from products table
   - When product is updated: Do NOT update cart_items (intentional)
   - When product is deleted: Keep cart_items snapshot (for email recovery)

**Status:** Accepted as intentional snapshot ✅

---

### Issue 4: Order Items Product Snapshot

**Current State:**
```typescript
export const orderItems = pgTable('order_items', {
  product_id: uuid('product_id'),
  
  // Product Snapshot
  sku: varchar('sku', { length: 100 }),
  product_name: varchar('product_name', { length: 255 }).notNull(),
  product_image: text('product_image'),
  cost_price: decimal('cost_price'),
});
```

**Analysis:**

This is **essential denormalization** for:
1. **Historical Accuracy** - Orders must show what customer actually bought
2. **Legal Compliance** - Invoice generation requires frozen data
3. **Price Changes** - Product prices change, but order should remain fixed
4. **Product Deletion** - Order history preserved even if product deleted

**Decision: KEEP AS-IS ✅**

This is correct database design for transactional systems.

**Status:** Working correctly, no changes needed ✅

---

## Phase 2 Remaining Tasks: Audit Fields Standardization

### Current State Analysis

**Tables WITH Complete Audit Fields:**
- ✅ `users` - has created_by, updated_by, deleted_by
- ✅ `carts` - has created_by, updated_by, deleted_by
- ✅ `roles` - has created_by, updated_by, deleted_by
- ✅ `products` - has created_by, updated_by, deleted_by
- ✅ `product_variants` - has created_by, updated_by, deleted_by
- ✅ `orders` - has created_by, updated_by, deleted_by
- ✅ `blogs` - has created_by

**Tables MISSING Audit Fields:**
- ⚠️ `inventory` - has updated_by, missing created_by, deleted_by
- ⚠️ `inventory_locations` - has created_by, missing updated_by, deleted_by
- ⚠️ `inventory_adjustments` - has adjusted_by, approved_by, missing standard fields
- ⚠️ `collections` - has created_by, missing updated_by, deleted_by
- ⚠️ `tags` - has created_by, missing updated_by, deleted_by
- ⚠️ `uploads` - has created_by, updated_by, deleted_by but inconsistent naming
- ⚠️ `tiers` - missing all audit fields
- ⚠️ `permissions` - missing all audit fields

### Standardization Strategy

**Standard Audit Pattern:**
```typescript
// Every table should have:
{
  created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  
  // For soft-deletable tables only:
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_by: uuid('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  deleted_at: timestamp('deleted_at'),
}
```

**Exceptions:**
- **Junction tables** (user_roles, role_permissions) - Have `assigned_by` instead of created_by
- **Log tables** (audit_logs, payment_webhook_logs) - Read-only, no update/delete fields
- **System tables** (permissions, notification_templates) - May skip user tracking

---

## Implementation Plan

### Phase 2A: Variant Inventory Unification (3-4 days)

**Priority:** HIGH  
**Impact:** Breaking change - requires API updates

#### Tasks:

1. **Schema Changes**
   - [ ] Add `variant_id` FK to `inventory` table
   - [ ] Drop unique constraint `uq_inventory_product_location`
   - [ ] Add new constraint `uq_inventory_product_variant_location`
   - [ ] Add CHECK constraint `check_inventory_product_or_variant`

2. **Data Migration**
   - [ ] Create inventory records for all product variants
   - [ ] Migrate `variant_inventory_adjustments` to `inventory_adjustments`
   - [ ] Verify data integrity

3. **Schema Cleanup**
   - [ ] Remove `inventory_quantity` from `product_variants`
   - [ ] Drop `variant_inventory_adjustments` table
   - [ ] Update drizzle schema files

4. **API Updates**
   - [ ] Update inventory query functions to support variants
   - [ ] Update adjustment endpoints to use unified system
   - [ ] Update product variant CRUD to query inventory table
   - [ ] Add migration guides for frontend team

5. **Testing**
   - [ ] Test variant inventory creation
   - [ ] Test adjustments for variants
   - [ ] Test multi-location variant inventory
   - [ ] Test edge cases (deleted variants, etc.)

**Deliverables:**
- Migration: `0017_unify_variant_inventory.sql`
- Updated schemas: `inventory.schema.ts`, `product.schema.ts`
- API changes: Inventory service, Product service
- Documentation: `VARIANT_INVENTORY_MIGRATION.md`

---

### Phase 2B: Audit Fields Standardization (2-3 days)

**Priority:** MEDIUM  
**Impact:** Non-breaking - adds fields only

#### Tasks:

1. **Identify Missing Fields**
   - [ ] Audit all 46 tables for missing created_by/updated_by/deleted_by
   - [ ] Categorize: needs all, needs some, needs none (exceptions)

2. **Schema Updates**
   - [ ] Add missing fields to identified tables
   - [ ] Add FK constraints to users table
   - [ ] Add indexes on audit fields for reporting

3. **Data Backfill** (optional)
   - [ ] Decide if existing records need backfill
   - [ ] Create backfill script if needed

4. **Application Updates**
   - [ ] Update API middleware to auto-populate audit fields
   - [ ] Update all CREATE/UPDATE/DELETE operations
   - [ ] Add validation tests

**Deliverables:**
- Migration: `0018_standardize_audit_fields.sql`
- Updated schemas: Multiple `*.schema.ts` files
- Middleware: `audit-fields.middleware.ts`
- Documentation: `AUDIT_FIELDS_STANDARD.md`

---

### Phase 2C: Documentation & Denormalization Strategy (1 day)

**Priority:** LOW  
**Impact:** Documentation only

#### Tasks:

1. **Schema Documentation**
   - [ ] Add `.$comment()` to all denormalized fields
   - [ ] Document sync strategies
   - [ ] Add JSDoc comments explaining trade-offs

2. **Create Guidelines**
   - [ ] When to denormalize (performance, history, snapshots)
   - [ ] When NOT to denormalize
   - [ ] How to maintain denormalized data

3. **Database Diagram**
   - [ ] Update ERD with new inventory structure
   - [ ] Highlight denormalized fields
   - [ ] Add legend explaining patterns

**Deliverables:**
- Documentation: `DENORMALIZATION_GUIDE.md`
- Updated: `DATABASE_DIAGRAM.png`
- Code comments in schema files

---

## Risk Analysis

### High Risk Changes

1. **Variant Inventory Migration**
   - **Risk:** Data loss if migration script fails
   - **Mitigation:** Backup database, test on staging, phased rollout
   - **Rollback:** Keep `product_variants.inventory_quantity` temporarily

2. **Breaking API Changes**
   - **Risk:** Frontend/mobile apps break
   - **Mitigation:** API versioning, deprecation notices, migration period
   - **Rollback:** Keep old endpoints temporarily

### Medium Risk Changes

1. **Audit Fields Backfill**
   - **Risk:** Performance impact on large tables
   - **Mitigation:** Batch updates, off-peak hours
   - **Rollback:** Easy - drop columns if needed

### Low Risk Changes

1. **Documentation Updates**
   - **Risk:** None
   - **Mitigation:** N/A
   - **Rollback:** N/A

---

## Success Metrics

### Phase 2A Success Criteria

- [ ] All product variants have inventory records in `inventory` table
- [ ] Zero `product_variants` records with `inventory_quantity` field
- [ ] All variant adjustments migrated to `inventory_adjustments`
- [ ] Multi-location inventory works for variants
- [ ] No data loss (verified via checksum)
- [ ] API tests pass for variant inventory queries
- [ ] Frontend team confirms no breaking issues

### Phase 2B Success Criteria

- [ ] All tables have appropriate audit fields
- [ ] All audit FKs point to users table
- [ ] Middleware auto-populates audit fields on all operations
- [ ] Audit reports can track who created/modified/deleted records
- [ ] No performance degradation from new indexes

### Phase 2C Success Criteria

- [ ] All denormalized fields have documentation
- [ ] Team understands when to denormalize
- [ ] ERD updated and accurate
- [ ] No questions about "why is this field duplicated?"

---

## Estimated Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **2A - Variant Inventory** | Schema + Migration + API | 3-4 days | None |
| **2B - Audit Fields** | Schema + Middleware | 2-3 days | None (can run parallel) |
| **2C - Documentation** | Docs + Diagrams | 1 day | 2A, 2B (needs final schemas) |
| **TOTAL** | | **6-8 days** | |

**Recommended Order:**
1. Start 2A and 2B in parallel (different team members)
2. Complete 2C after both finish
3. Full integration testing
4. Staged rollout

---

## Open Questions

1. **Variant Inventory Migration Timing**
   - Should we keep `product_variants.inventory_quantity` temporarily during transition?
   - How long should API deprecation period be?

2. **Denormalized Field Sync**
   - Should we use database triggers or application code to sync `inventory.product_name`?
   - What's the performance impact of triggers?

3. **Audit Field Backfill**
   - Should we backfill `created_by` for existing records?
   - How to determine who created old records (use first admin user?)

4. **Testing Strategy**
   - Full regression tests or focused testing on changed areas?
   - Need to test all 25 existing variants individually?

---

## Next Steps

**Immediate Actions:**

1. **Get Approval** on this plan from stakeholders
2. **Create Database Backup** before any changes
3. **Set Up Staging Environment** with production data copy
4. **Assign Tasks** to team members
5. **Schedule Implementation** with agreed timeline

**Review Points:**

- After schema changes (before data migration)
- After data migration (before removing old fields)
- After API updates (before frontend changes)
- After full testing (before production deploy)

---

## Conclusion

The inventory normalization plan addresses critical redundancy issues while preserving intentional denormalization where justified. The most impactful change is unifying product and variant inventory tracking, which will:

- ✅ Simplify codebase (one inventory system)
- ✅ Enable multi-location tracking for variants
- ✅ Improve reporting consistency
- ✅ Reduce maintenance burden

Combined with audit field standardization, this will create a more maintainable and scalable database structure.

**Recommendation:** Proceed with Phase 2A (Variant Inventory) first as it has the highest impact, then tackle 2B (Audit Fields) and 2C (Documentation) in parallel or sequence based on team capacity.
