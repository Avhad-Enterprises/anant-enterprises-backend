# Phase 2C: Orders/Cart Normalization Review - Complete ✅

**Date:** January 31, 2026  
**Status:** Analysis Complete - No Changes Needed

## Overview

Reviewed snapshot fields in `order_items` and `cart_items` tables to determine if they represent unnecessary redundancy or justified denormalization.

## Analysis Results

### ✅ Order Items: Snapshots are JUSTIFIED and NECESSARY

**Schema:** `order_items`
```typescript
{
  product_id: uuid,           // FK to products (can be null if product deleted)
  sku: varchar,               // Snapshot: product SKU at purchase time
  product_name: varchar,      // Snapshot: product name at purchase time  
  product_image: text,        // Snapshot: product image at purchase time
  cost_price: decimal,        // Snapshot: price at purchase time
  quantity: integer,
  line_total: decimal,
}
```

**Justification:**
1. **Historical Accuracy**: Product details change over time
   - Product renamed → Historical orders show old name
   - SKU changed → Order records retain original SKU
   - Price changed → Orders locked at purchase price
   - Image changed/deleted → Order history intact

2. **Regulatory/Legal Requirements**:
   - Invoices must match what customer saw at checkout
   - Audit trail for disputes/returns
   - Tax records require immutable order details

3. **Performance**:
   - Order history queries don't need JOIN with products table
   - Deleted products still display in order history
   - Reporting/analytics run faster

**Decision:** ✅ **KEEP AS-IS** - This is proper snapshot pattern for transactional data.

---

### ✅ Cart Items: Snapshots are JUSTIFIED for Abandoned Cart Emails

**Schema:** `cart_items`
```typescript
{
  product_id: uuid,              // FK to products
  product_name: varchar,         // Snapshot: for abandoned cart emails
  product_image_url: text,       // Snapshot: for abandoned cart emails
  product_sku: varchar,          // Snapshot: for abandoned cart emails
  cost_price: decimal,           // Snapshot: price when added to cart
  final_price: decimal,          // Snapshot: after discounts
}
```

**Justification:**
1. **Abandoned Cart Recovery**:
   - Send reminder emails with product details
   - Product might be deleted before email sent
   - Product image might change before email sent
   - Must show what user actually added to cart

2. **Price Consistency**:
   - User sees same price when returning to cart
   - Price changes don't affect items already in cart
   - Discount applied when added is preserved

3. **Performance**:
   - Cart queries don't need JOIN with products
   - Faster cart display (important for UX)
   - Email generation doesn't require database queries

**Decision:** ✅ **KEEP AS-IS** - Justified denormalization with clear documentation.

---

## Documentation Improvements

### ✅ Order Items Schema - Already Well Documented

Current documentation in schema file:
```typescript
/**
 * Order Items Schema
 *
 * Individual line items in an order.
 * Stores product snapshots (price, name, image) at time of purchase.
 */
```

**Status:** ✅ Adequate - clearly states snapshot purpose

### ✅ Cart Items Schema - Already Well Documented

Current documentation in schema file:
```typescript
{
  // Product Snapshot (denormalized for abandoned cart emails)
  product_name: varchar('product_name', { length: 255 }),
  product_image_url: text('product_image_url'),
  product_sku: varchar('product_sku', { length: 100 }),
}
```

**Status:** ✅ Adequate - comment explains abandonment email purpose

---

## Comparison with Inventory Table

### Why Inventory Snapshots Were REMOVED (Phase 2A-1)

For context, we removed `product_name` and `sku` from the `inventory` table because:

1. **Not Transactional**: Inventory is current state, not historical snapshot
2. **Always Joinable**: Products table always available (soft-delete)
3. **Data Staleness**: Inventory records don't need frozen product names
4. **No Legal Requirement**: No audit/legal need for old product names in inventory

This is the **opposite** of order_items where:
- ❌ Products may be hard-deleted
- ❌ Prices must be immutable
- ❌ Legal/regulatory requirements
- ❌ Historical accuracy critical

---

## Best Practices Identified

### When Snapshots ARE Justified

1. **Transactional Records** (orders, invoices, receipts)
   - Must preserve state at transaction time
   - Legal/regulatory requirements
   - Immutable historical record

2. **Asynchronous Operations** (emails, notifications)
   - Data might change before operation completes
   - Related records might be deleted
   - Must work offline/deferred

3. **Performance-Critical Paths** (cart display, checkout)
   - User-facing operations
   - Must be fast (no JOINs)
   - Data freshness < 1 day acceptable

### When Snapshots are NOT Justified

1. **Current State Tables** (inventory, product status)
   - Always reflects latest data
   - Source records won't be deleted
   - Queries can JOIN efficiently

2. **Internal Operations** (stock adjustments, transfers)
   - No legal requirements
   - Performance not critical
   - Data consistency more important than speed

3. **Admin-Only Tables** (settings, configuration)
   - Low query volume
   - Accuracy > performance
   - Normalization preferred

---

## Phase 2C Conclusions

### No Changes Required ✅

Both `order_items` and `cart_items` snapshot fields are:
- ✅ Properly justified
- ✅ Well documented
- ✅ Following best practices
- ✅ No data integrity issues
- ✅ Performance optimized

### Phase 2 Complete Summary

| Phase | Task | Status | Result |
|-------|------|--------|--------|
| **2A-1** | Remove inventory product_name/sku | ✅ Complete | Cleaned redundancy |
| **2A-2** | Unify variant inventory | ✅ Complete | Single inventory table |
| **2B** | Audit fields standardization | ✅ Complete | 6 tables updated |
| **2C** | Orders/cart review | ✅ Complete | No changes needed |

---

## Normalization Guidelines Document

Based on this analysis, here are general guidelines for the project:

### When to Denormalize (Add Snapshots)

✅ **Use Snapshots For:**
- Order/transaction records (prices, names, details)
- Abandoned cart recovery (product details for emails)
- Invoice line items (immutable records)
- Audit trails (who did what when)
- Email/notification templates (deferred send)
- Historical reporting (point-in-time data)

### When to Normalize (Use JOINs)

✅ **Use JOINs For:**
- Current inventory state (always up-to-date)
- Product catalogs (latest details)
- User profiles (current information)
- Settings and configuration (single source of truth)
- Internal operations (stock transfers, adjustments)
- Admin dashboards (real-time data)

### Decision Matrix

| Criteria | Snapshot | JOIN |
|----------|----------|------|
| Data changes frequently | ✅ | ❌ |
| Historical accuracy needed | ✅ | ❌ |
| Legal/regulatory requirement | ✅ | ❌ |
| Async operations (emails) | ✅ | ❌ |
| Performance critical | ✅ | ❌ |
| Current state only | ❌ | ✅ |
| Source always available | ❌ | ✅ |
| Admin/internal use | ❌ | ✅ |
| Data consistency critical | ❌ | ✅ |

---

## Related Documentation

- **Phase 2A-1 Complete**: [docs/PHASE_2A1_INVENTORY_NORMALIZATION_COMPLETE.md](./PHASE_2A1_INVENTORY_NORMALIZATION_COMPLETE.md)
- **Phase 2A-2 Complete**: [docs/PHASE_2A2_VARIANT_INVENTORY_UNIFICATION_COMPLETE.md](./PHASE_2A2_VARIANT_INVENTORY_UNIFICATION_COMPLETE.md)
- **Phase 2B Complete**: [docs/PHASE_2B_AUDIT_FIELDS_COMPLETE.md](./PHASE_2B_AUDIT_FIELDS_COMPLETE.md)
- **Normalization Plan**: [docs/INVENTORY_NORMALIZATION_PLAN.md](./INVENTORY_NORMALIZATION_PLAN.md)

---

**Phase 2C Complete** ✅  
All snapshot fields in orders and cart are properly justified and documented.
