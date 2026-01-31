# Phase 2A: API Changes & Migration Guide

**Date:** 31 January 2026  
**Status:** ✅ Complete

---

## Summary

Phase 2A unified the inventory system by consolidating product and variant inventory tracking into a single `inventory` table. This document outlines all API changes and provides migration guidance for clients.

---

## Breaking Changes

### 1. Variant Inventory Endpoint REMOVED

**Removed Endpoint:**
```
POST /api/inventory/variants/:variantId/adjust
```

**Replacement:**
Use the unified inventory adjustment endpoint:
```
POST /api/inventory/:inventoryId/adjust
```

**Migration Steps:**
1. Query inventory table to get the inventory record ID for the variant:
   ```typescript
   const inventoryRecords = await fetch(`/api/inventory?variant_id=${variantId}`);
   const inventoryId = inventoryRecords[0].id;
   ```

2. Use the inventory ID to adjust:
   ```typescript
   await fetch(`/api/inventory/${inventoryId}/adjust`, {
     method: 'POST',
     body: JSON.stringify({
       quantity_change: 10,
       reason: 'Stock replenishment',
       reference_number: 'PO-12345'
     })
   });
   ```

### 2. Product Variant Response Schema Changed

**Field Removed:**
- `inventory_quantity` (number)

**Before (Phase 1):**
```json
{
  "id": "abc-123",
  "sku": "VAR-001",
  "option_name": "Size",
  "option_value": "Medium",
  "inventory_quantity": 50,
  "selling_price": "29.99"
}
```

**After (Phase 2A):**
```json
{
  "id": "abc-123",
  "sku": "VAR-001",
  "option_name": "Size",
  "option_value": "Medium",
  "selling_price": "29.99"
}
```

**Getting Variant Inventory:**
```typescript
// Query inventory table
const response = await fetch(`/api/inventory?variant_id=${variantId}`);
const inventoryRecords = response.data;

// Sum across all locations
const totalStock = inventoryRecords.reduce(
  (sum, record) => sum + record.available_quantity, 
  0
);
```

### 3. Inventory List API Now Includes Variants

**Endpoint:** `GET /api/inventory`

**Before:** Only returned product inventory (base products)

**After:** Returns both product AND variant inventory records

**Response Type Field:**
- `type: 'Base'` - Product inventory
- `type: 'Variant'` - Variant inventory

**Example Response:**
```json
{
  "data": [
    {
      "id": "inv-001",
      "product_id": "prod-123",
      "product_name": "T-Shirt - Red",
      "type": "Base",
      "available_quantity": 100,
      "location_name": "Main Warehouse"
    },
    {
      "id": "inv-002",
      "variant_id": "var-456",
      "product_name": "T-Shirt - Red - Size: Large",
      "type": "Variant",
      "available_quantity": 25,
      "location_name": "Main Warehouse"
    }
  ]
}
```

### 4. Inventory History API Unified

**Endpoint:** `GET /api/inventory/product/:productId/history`

**Before:** Returned separate sections for products and variants

**After:** Returns unified history with `target_name` field indicating whether adjustment was for base product or variant

**Response Changes:**
- `target_name: 'Base Product'` - Base product adjustment
- `target_name: 'Variant: Size - Large'` - Variant adjustment

---

## Non-Breaking Changes

### 1. Multi-Location Support for Variants

Variants now support multi-location inventory tracking (previously only default location).

**Query variant inventory across locations:**
```typescript
GET /api/inventory?variant_id={variantId}

Response:
[
  {
    "id": "inv-001",
    "variant_id": "var-123",
    "location_name": "Main Warehouse",
    "available_quantity": 50
  },
  {
    "id": "inv-002",
    "variant_id": "var-123",
    "location_name": "Retail Store",
    "available_quantity": 15
  }
]
```

### 2. Improved Stock Calculations

**Product Detail API** (`GET /api/products/slug/:slug`)

The `total_stock` field now accurately sums:
- Base product inventory across all locations
- Variant inventory across all locations

**Before (Phase 1):**
```sql
-- Separate queries and manual addition
SELECT SUM(inventory.available_quantity) FROM inventory WHERE product_id = ?
+ 
SELECT SUM(product_variants.inventory_quantity) FROM product_variants WHERE product_id = ?
```

**After (Phase 2A):**
```sql
-- Single unified query
SELECT SUM(inventory.available_quantity) 
FROM inventory 
WHERE product_id = ? 
   OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)
```

---

## Migration Checklist

### Backend (Already Complete ✅)
- [x] Update `inventory` table schema (add `variant_id` FK)
- [x] Migrate variant inventory data (25 variants)
- [x] Migrate variant adjustments (23 records)
- [x] Remove `inventory_quantity` from `product_variants`
- [x] Drop `variant_inventory_adjustments` table
- [x] Update inventory service queries
- [x] Remove deprecated API endpoints
- [x] Update product detail queries

### Frontend (TODO)
- [ ] **Admin Panel:**
  - [ ] Update variant inventory display (query from inventory table)
  - [ ] Remove old variant adjustment forms
  - [ ] Update inventory adjustment to use unified endpoint
  - [ ] Test variant inventory management

- [ ] **E-Commerce Site:**
  - [ ] Update product detail page (remove `inventory_quantity` field)
  - [ ] Update cart availability checks
  - [ ] Update checkout stock validation
  - [ ] Test variant selection and stock display

### Testing (TODO)
- [ ] Test variant inventory queries
- [ ] Test variant stock adjustments
- [ ] Test multi-location variant inventory
- [ ] Test product detail stock calculations
- [ ] Test cart/checkout with variants
- [ ] Test low stock notifications for variants

---

## Database Schema Changes

### Tables Modified

**inventory:**
```sql
-- Added column
variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE

-- Modified constraints
CHECK ((product_id IS NOT NULL AND variant_id IS NULL) OR 
       (product_id IS NULL AND variant_id IS NOT NULL))

UNIQUE (product_id, variant_id, location_id)

-- New indexes
CREATE INDEX inventory_variant_idx ON inventory(variant_id);
CREATE INDEX inventory_variant_location_idx ON inventory(variant_id, location_id);
```

**product_variants:**
```sql
-- Removed column
-- inventory_quantity INTEGER (moved to inventory table)
```

**variant_inventory_adjustments:**
```sql
-- Table dropped entirely (data migrated to inventory_adjustments)
DROP TABLE variant_inventory_adjustments CASCADE;
```

---

## Code Examples

### Query Variant Inventory (New Pattern)

**TypeScript:**
```typescript
import { db } from './database';
import { inventory } from './inventory.schema';
import { eq, sum } from 'drizzle-orm';

// Get total variant stock across all locations
async function getVariantStock(variantId: string): Promise<number> {
  const result = await db
    .select({
      total: sum(inventory.available_quantity)
    })
    .from(inventory)
    .where(eq(inventory.variant_id, variantId))
    .groupBy(inventory.variant_id);
  
  return Number(result[0]?.total ?? 0);
}

// Get variant stock by location
async function getVariantStockByLocation(variantId: string) {
  return await db
    .select({
      location_id: inventory.location_id,
      location_name: inventoryLocations.name,
      available_quantity: inventory.available_quantity,
      reserved_quantity: inventory.reserved_quantity
    })
    .from(inventory)
    .leftJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
    .where(eq(inventory.variant_id, variantId));
}
```

### Adjust Variant Inventory (New Pattern)

**TypeScript:**
```typescript
import { adjustInventory } from './inventory.service';

// Old way (DEPRECATED - endpoint removed):
// POST /api/inventory/variants/:variantId/adjust

// New way:
// 1. Get inventory record ID
const inventoryRecords = await db
  .select()
  .from(inventory)
  .where(eq(inventory.variant_id, variantId))
  .where(eq(inventory.location_id, locationId));

const inventoryId = inventoryRecords[0].id;

// 2. Adjust using unified endpoint
await adjustInventory(inventoryId, {
  quantity_change: 10,
  reason: 'Stock replenishment',
  reference_number: 'PO-12345',
  notes: 'Received from supplier'
}, userId);
```

### Create Variant with Initial Stock (New Pattern)

**TypeScript:**
```typescript
import { db } from './database';
import { productVariants, inventory } from './schemas';

const newVariant = await db.transaction(async (tx) => {
  // 1. Create variant (no inventory_quantity field)
  const [variant] = await tx
    .insert(productVariants)
    .values({
      product_id: productId,
      option_name: 'Size',
      option_value: 'Large',
      sku: 'PROD-LG',
      selling_price: '29.99',
      // inventory_quantity: 100, // REMOVED - use inventory table
    })
    .returning();

  // 2. Create inventory record (if initial stock provided)
  if (initialStock > 0) {
    await tx
      .insert(inventory)
      .values({
        variant_id: variant.id,
        location_id: defaultLocationId,
        available_quantity: initialStock,
        status: 'in_stock',
        condition: 'sellable'
      });
  }

  return variant;
});
```

---

## API Documentation Updates

### GET /api/inventory

**Query Parameters (New):**
- `variant_id` (UUID) - Filter by variant ID

**Response Schema (Updated):**
```typescript
{
  data: Array<{
    id: string;
    product_id?: string;    // NULL for variants
    variant_id?: string;    // NULL for products
    product_name: string;   // Includes variant options for variants
    sku: string;
    type: 'Base' | 'Variant';  // NEW FIELD
    available_quantity: number;
    reserved_quantity: number;
    location_name: string;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    // ... other fields
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### POST /api/inventory/:inventoryId/adjust

**Now supports both products and variants** (previously only products)

**Request Body:**
```typescript
{
  quantity_change: number;  // +10 for increase, -5 for decrease
  reason: string;           // Required: reason for adjustment
  reference_number?: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    inventory: { /* updated inventory record */ },
    adjustment: { /* adjustment record */ }
  }
}
```

---

## Rollback Procedure

If issues occur, follow these steps:

### 1. Restore variant_inventory_adjustments table
```sql
-- Restore from backup (21 records)
-- Run: pg_restore or manual INSERT
```

### 2. Restore inventory_quantity column
```sql
ALTER TABLE product_variants 
ADD COLUMN inventory_quantity INTEGER DEFAULT 0;

-- Populate from inventory table
UPDATE product_variants pv
SET inventory_quantity = COALESCE((
  SELECT SUM(available_quantity) 
  FROM inventory 
  WHERE variant_id = pv.id
), 0);
```

### 3. Revert schema changes
```sql
-- Remove variant_id support from inventory
ALTER TABLE inventory DROP COLUMN variant_id;
ALTER TABLE inventory 
  ADD CONSTRAINT uq_inventory_product_location 
  UNIQUE (product_id, location_id);
```

### 4. Restore API endpoints
- Uncomment `adjust-variant-inventory.ts`
- Uncomment `variant-inventory.service.ts`
- Restore imports in inventory index

---

## Support

For questions or issues related to Phase 2A migration:
- Check error logs: `/logs/`
- Database issues: Contact DB admin
- API issues: Review [PHASE2A_COMPLETION.md](./PHASE2A_COMPLETION.md)

---

## Next Steps

**Phase 2B** (Pending): Audit Fields Standardization
- Add missing `created_by`, `updated_by`, `deleted_by` to 8 tables
- Standardize audit pattern across all tables

**Phase 2C** (Pending): Documentation
- Add schema comments to denormalized fields
- Create DENORMALIZATION_GUIDE.md
- Update ERD with unified inventory structure
