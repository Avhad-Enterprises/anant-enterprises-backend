# Backend Normalization Fixes - Implementation Plan

## User Feedback Incorporated:
1. ✅ `inventory` table has `product_name` and `sku` which are not needed (remove redundancy)
2. ✅ Check orders and other tables for normalization issues

## Priority Order (Based on Impact):

### Phase 2A-1: Remove Redundant Fields from Inventory Table (HIGH PRIORITY)
**Status:** Ready to implement
**Impact:** Improves data integrity, reduces storage

**Fields to Remove:**
- `inventory.product_name` - Redundant with `products.product_title`
- `inventory.sku` - Redundant with `products.sku` or `product_variants.sku`

**Reasoning:**
- These fields can become stale if product is renamed
- Adds unnecessary maintenance burden
- Can always JOIN to get current product name/SKU
- Reporting can use materialized views if performance is critical

**Migration Steps:**
1. Verify all queries that use these fields
2. Update services to JOIN with products table
3. Create migration to drop columns
4. Test inventory reports

---

### Phase 2A-2: Variant Inventory Unification (ALREADY IN PROGRESS)
**Status:** Already documented in INVENTORY_NORMALIZATION_PLAN.md
**Impact:** Critical - unifies inventory system

**Tasks:**
1. ✅ Add `variant_id` to inventory table
2. ✅ Migrate variant inventory data
3. ✅ Remove `inventory_quantity` from product_variants
4. ✅ Drop variant_inventory_adjustments table

---

### Phase 2B: Orders Table Normalization Review

**Current Analysis Needed:**
- Check if `order_items` has appropriate snapshots (JUSTIFIED for historical accuracy)
- Verify `orders` table doesn't have redundant customer info
- Confirm payment information is properly normalized

**Expected Result:** Orders are likely already properly normalized (snapshots are intentional)

---

### Phase 2C: Other Tables Review

**Tables to Check:**
1. **cart_items** - Product snapshots (JUSTIFIED for abandoned cart emails)
2. **collections** - Check for redundant product data
3. **wishlists** - Check if storing redundant product info
4. **reviews** - Verify product snapshots

---

## Implementation Order:

1. **Today:** Remove inventory.product_name and inventory.sku (Phase 2A-1)
2. **Today:** Continue with variant inventory unification (Phase 2A-2)
3. **Tomorrow:** Review orders normalization (Phase 2B)
4. **Later:** Other tables review (Phase 2C)

---

## Next Action:
Start with Phase 2A-1 - Remove redundant fields from inventory table
