# Query Layer API Reference

## Overview

The query layer provides pure data access functions for inventory operations. These functions handle all direct database interactions and should be used by the service layer for data operations.

## Design Principles

1. **Pure Data Access:** No business logic, only database operations
2. **Type Safety:** All parameters and return types are strictly typed
3. **Composability:** Small, focused functions that can be combined
4. **Transaction-Aware:** Can be used inside or outside transactions
5. **Error-Free:** Let database errors propagate naturally

---

## Inventory Queries (`inventory.queries.ts`)

### Read Operations

#### `findInventoryById(id: string)`
Find a single inventory record by ID.

```typescript
const item = await findInventoryById('uuid-here');
// Returns: Inventory | undefined
```

#### `findInventoryByProduct(productId: string)`
Find all inventory records for a product (including variants).

```typescript
const items = await findInventoryByProduct('product-uuid');
// Returns: Inventory[]
```

#### `findInventoryByVariant(variantId: string)`
Find all inventory records for a specific variant.

```typescript
const items = await findInventoryByVariant('variant-uuid');
// Returns: Inventory[]
```

#### `findInventoryByProductAndLocation(productId, locationId)`
Find inventory for a product at a specific location.

```typescript
const item = await findInventoryByProductAndLocation('product-uuid', 'location-uuid');
// Returns: Inventory | undefined
```

#### `findInventoryByVariantAndLocation(variantId, locationId)`
Find inventory for a variant at a specific location.

```typescript
const item = await findInventoryByVariantAndLocation('variant-uuid', 'location-uuid');
// Returns: Inventory | undefined
```

#### `findInventoryList(params: InventoryListParams)`
**Complex Query:** Get paginated inventory list with filtering and sorting.

**Supported Filters:**
- `search` - Search product name or SKU (ILIKE)
- `condition` - Filter by condition enum
- `status` - Filter by status enum
- `location` - Filter by location name (ILIKE)
- `category` - Filter by category tier ID
- `startDate` / `endDate` - Filter by updated_at range
- `quickFilter` - Predefined filters:
  - `'low-stock'` - 1-10 units available
  - `'zero-available'` - 0 units available
  - `'blocked'` - Has reserved quantity > 0
  - `'recently-updated'` - Updated in last 24 hours

**Supported Sorting:**
- `sortBy`: `'product_name'` | `'available_quantity'` | `'updated_at'` | `'reserved_quantity'`
- `sortOrder`: `'asc'` | `'desc'`

**Pagination:**
- `page` - Page number (1-indexed)
- `limit` - Items per page

```typescript
const items = await findInventoryList({
  search: 'widget',
  condition: 'sellable',
  status: 'in_stock',
  sortBy: 'available_quantity',
  sortOrder: 'asc',
  page: 1,
  limit: 20
});
// Returns: InventoryWithProduct[]
```

#### `countInventory(params: InventoryListParams)`
Count inventory items with same filters as `findInventoryList`.

```typescript
const total = await countInventory({ status: 'low_stock' });
// Returns: number
```

#### `findInventoryByIdWithDetails(id: string)`
Get inventory with full product/variant/location details (JOINs).

```typescript
const details = await findInventoryByIdWithDetails('uuid-here');
// Returns: { 
//   ...inventory fields,
//   product_title, product_sku,
//   variant_sku, variant_option_name, variant_option_value,
//   location_name, location_code
// }
```

---

### Write Operations

#### `createInventory(data)`
Create a new inventory record.

```typescript
const newItem = await createInventory({
  product_id: 'uuid',          // or variant_id
  location_id: 'uuid',
  available_quantity: 100,
  reserved_quantity: 0,
  incoming_quantity: 0,
  condition: 'sellable',       // 'sellable' | 'damaged' | 'quarantined' | 'expired'
  status: 'in_stock',          // 'in_stock' | 'low_stock' | 'out_of_stock'
  created_by: 'user-uuid',
  updated_by: 'user-uuid'
});
```

#### `updateInventoryById(id, data)`
Update inventory fields.

```typescript
const updated = await updateInventoryById('uuid', {
  available_quantity: 50,
  status: 'low_stock',
  updated_by: 'user-uuid'
});
```

#### `incrementAvailableQuantity(id, amount)`
Atomically increment available quantity.

```typescript
const updated = await incrementAvailableQuantity('uuid', 10);
// SQL: available_quantity = available_quantity + 10
```

#### `decrementAvailableQuantity(id, amount)`
Atomically decrement available quantity (floor at 0).

```typescript
const updated = await decrementAvailableQuantity('uuid', 5);
// SQL: available_quantity = GREATEST(0, available_quantity - 5)
```

#### `incrementReservedQuantity(id, amount)`
Atomically increment reserved quantity (for reservations).

```typescript
const updated = await incrementReservedQuantity('uuid', 3);
```

#### `decrementReservedQuantity(id, amount)`
Atomically decrement reserved quantity (floor at 0).

```typescript
const updated = await decrementReservedQuantity('uuid', 3);
```

#### `adjustQuantities(id, availableDelta, reservedDelta)`
Adjust both quantities in a single update.

```typescript
const updated = await adjustQuantities('uuid', -5, 5);
// Move 5 units from available to reserved
```

#### `updateInventoryStatus(id)`
Auto-update status based on current available quantity.

**Logic:**
- `0` → `'out_of_stock'`
- `1-10` → `'low_stock'`
- `11+` → `'in_stock'`

```typescript
const updated = await updateInventoryStatus('uuid');
```

---

## Adjustment Queries (`adjustment.queries.ts`)

### Read Operations

#### `findAdjustmentById(id: string)`
Find a single adjustment record by ID.

```typescript
const adjustment = await findAdjustmentById('uuid-here');
// Returns: InventoryAdjustment | undefined
```

#### `findAdjustmentHistory(inventoryId, limit = 50)`
Get adjustment history for an inventory item.

```typescript
const history = await findAdjustmentHistory('inventory-uuid', 100);
// Returns: InventoryAdjustment[]
// Ordered by: adjusted_at DESC
```

#### `findAdjustmentHistoryByProduct(productId, page = 1, limit = 50)`
Get paginated adjustment history for a product (includes all variants).

**Returns Complex Query Results:**
- All standard adjustment fields
- `product_name` - Composite name (includes variant info)
- `sku` - Product or variant SKU
- `product_id`, `variant_id`, `location_id`

```typescript
const history = await findAdjustmentHistoryByProduct('product-uuid', 1, 20);
// Returns: InventoryHistoryItem[]
```

#### `countAdjustmentsByProduct(productId)`
Count adjustments for a product (for pagination).

```typescript
const total = await countAdjustmentsByProduct('product-uuid');
// Returns: number
```

#### `findAdjustmentsByType(adjustmentType, limit = 50)`
Filter adjustments by type.

```typescript
const adjustments = await findAdjustmentsByType('increase', 100);
// adjustmentType: 'increase' | 'decrease' | 'correction' | 'write-off'
```

#### `findAdjustmentsByReference(referenceNumber)`
Find adjustments by reference number (e.g., PO number).

```typescript
const adjustments = await findAdjustmentsByReference('PO-12345');
```

#### `findRecentAdjustments(limit = 100)`
Get adjustments from the last 24 hours.

```typescript
const recent = await findRecentAdjustments(50);
// Includes product/variant name via JOIN
```

#### `getAdjustmentSummaryByType(startDate?, endDate?)`
Get aggregated adjustment statistics by type.

**Returns:**
```typescript
{
  adjustment_type: 'increase' | 'decrease' | 'correction' | 'write-off',
  count: number,
  total_increase: number,
  total_decrease: number
}[]
```

```typescript
const summary = await getAdjustmentSummaryByType(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

---

### Write Operations

#### `createAdjustment(data)`
Create a new adjustment record.

**Required Fields:**
- `inventory_id` - UUID of inventory item
- `adjustment_type` - Type enum
- `quantity_change` - Positive or negative number
- `quantity_before` - Snapshot before change
- `quantity_after` - Snapshot after change
- `reason` - Required explanation
- `adjusted_by` - User UUID

**Optional Fields:**
- `reference_number` - External reference (PO, invoice, etc.)
- `notes` - Additional notes

```typescript
const adjustment = await createAdjustment({
  inventory_id: 'uuid',
  adjustment_type: 'increase',
  quantity_change: 50,
  quantity_before: 100,
  quantity_after: 150,
  reason: 'Received new shipment',
  reference_number: 'PO-12345',
  notes: 'From warehouse A',
  adjusted_by: 'user-uuid'
});
```

#### `createAdjustmentsBulk(adjustments[])`
Create multiple adjustments in a single query.

```typescript
const adjustments = await createAdjustmentsBulk([
  { /* adjustment 1 */ },
  { /* adjustment 2 */ },
  { /* adjustment 3 */ }
]);
// Returns: InventoryAdjustment[]
```

#### `updateAdjustmentNotes(id, notes)`
Update notes on an existing adjustment.

```typescript
const updated = await updateAdjustmentNotes('uuid', 'Updated notes here');
```

---

## Type Definitions

### Enum Values

```typescript
// Inventory Condition
type InventoryCondition = 'sellable' | 'damaged' | 'quarantined' | 'expired';

// Inventory Status
type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Adjustment Type
type AdjustmentType = 'increase' | 'decrease' | 'correction' | 'write-off';
```

### Key Interfaces

```typescript
interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  condition?: InventoryCondition;
  status?: InventoryStatus;
  location?: string;
  category?: string;
  quickFilter?: 'low-stock' | 'zero-available' | 'blocked' | 'recently-updated';
  startDate?: string;
  endDate?: string;
  sortBy?: 'product_name' | 'available_quantity' | 'updated_at' | 'reserved_quantity';
  sortOrder?: 'asc' | 'desc';
}
```

---

## Usage Patterns

### Pattern 1: Read Then Update
```typescript
// Service Layer
const item = await inventoryQueries.findInventoryById(id);
if (!item) throw new Error('Not found');

// Business logic
const newQuantity = item.available_quantity + delta;

// Update
await inventoryQueries.updateInventoryById(id, {
  available_quantity: newQuantity,
  updated_by: userId
});
```

### Pattern 2: Atomic Operations
```typescript
// Prefer atomic operations when possible
await inventoryQueries.incrementAvailableQuantity(id, 10);

// Instead of:
const item = await findInventoryById(id);
await updateInventoryById(id, { 
  available_quantity: item.available_quantity + 10 
});
```

### Pattern 3: Transaction Usage
```typescript
// Service Layer
await db.transaction(async (tx) => {
  // Query layer functions work inside transactions
  const item = await inventoryQueries.findInventoryById(id);
  
  // Multiple operations
  await inventoryQueries.updateInventoryById(id, data1);
  await adjustmentQueries.createAdjustment(data2);
  
  // Rollback on any error
});
```

### Pattern 4: Pagination
```typescript
// Service Layer
const items = await inventoryQueries.findInventoryList(params);
const total = await inventoryQueries.countInventory(params);

return {
  items,
  total,
  page: params.page || 1,
  limit: params.limit || 20,
  totalPages: Math.ceil(total / (params.limit || 20))
};
```

---

## Performance Notes

1. **Indexes Used:**
   - `inventory.id` (PK)
   - `inventory.product_id`
   - `inventory.variant_id`
   - `inventory.location_id`
   - `inventoryAdjustments.inventory_id`
   - `inventoryAdjustments.adjusted_at`

2. **Complex Queries:**
   - `findInventoryList` - Can be slow with many filters
   - `countInventory` - Uses same filters, may benefit from index on filtered columns

3. **Optimization Opportunities:**
   - Add database indexes for common filters (condition, status)
   - Cache frequently accessed inventory items
   - Use read replicas for reporting queries

---

## Error Handling

Query functions let database errors propagate naturally. The service layer should handle:

1. **Not Found:** Check for `undefined` return values
2. **Constraint Violations:** Catch unique constraint errors
3. **Foreign Key Errors:** Validate references before insert
4. **Transaction Errors:** Wrap in try/catch, let transaction rollback

```typescript
// Service Layer Example
try {
  const item = await inventoryQueries.findInventoryById(id);
  if (!item) {
    throw new Error('Inventory item not found');
  }
  // ... business logic
} catch (error) {
  logger.error('Inventory operation failed', error);
  throw error; // Re-throw after logging
}
```

---

## Migration Notes

### From Old Service Layer
```typescript
// BEFORE (inventory.service.ts)
const [item] = await db
  .select()
  .from(inventory)
  .where(eq(inventory.id, id));

// AFTER (use query layer)
const item = await inventoryQueries.findInventoryById(id);
```

### Complex Queries
```typescript
// BEFORE (170 lines of SQL in service)
const query = sql`SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ... OFFSET ...`;
const result = await db.execute(query);

// AFTER (delegate to query layer)
const items = await inventoryQueries.findInventoryList(params);
```

---

**Last Updated:** December 2024
**Phase:** Phase 1 - Query Layer Extraction Complete
