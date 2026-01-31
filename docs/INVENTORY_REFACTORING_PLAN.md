# Inventory Feature Refactoring Plan

**Date:** January 31, 2026  
**Current State:** 1,179-line monolithic service file  
**Goal:** Modular, maintainable architecture following best practices

---

## Current State Analysis

### File Structure
```
inventory/
├── services/
│   ├── inventory.service.ts          (1,179 lines) ⚠️ TOO BIG
│   ├── inventory-transfer.service.ts (324 lines) ✅ Good
│   └── location-allocation.service.ts (227 lines) ✅ Good
├── apis/ (12 files)
│   └── Most are thin wrappers calling service functions
└── shared/
    ├── interface.ts
    └── *.schema.ts
```

### Functions in inventory.service.ts (16 total)

**Query/Read Operations (3):**
1. `getInventoryList()` - Get paginated inventory with complex filtering
2. `getInventoryById()` - Get single inventory record
3. `getInventoryHistory()` - Get adjustment history for inventory
4. `getInventoryHistoryByProductId()` - Get adjustments by product

**Write/Update Operations (2):**
5. `updateInventory()` - Update inventory record
6. `adjustInventory()` - Create adjustment with stock change

**Product Creation (1):**
7. `createInventoryForProduct()` - Initialize inventory when product created

**Order Operations (4):**
8. `validateStockAvailability()` - Check if product can be ordered
9. `reserveStockForOrder()` - Lock stock for order
10. `fulfillOrderInventory()` - Mark stock as shipped
11. `releaseReservation()` - Cancel order reservation
12. `processOrderReturn()` - Handle return to stock

**Cart Operations (4):**
13. `reserveCartStock()` - Lock stock for 30 min
14. `releaseCartStock()` - Release cart reservation
15. `extendCartReservation()` - Extend timeout for checkout
16. `cleanupExpiredCartReservations()` - Cron job cleanup

**Helper Functions (2):**
- `isValidUUID()` - UUID validation
- `resolveValidUserId()` - Get valid user for audit

---

## Problems Identified

### 1. ⚠️ God Object Anti-Pattern
- Single file handles: queries, writes, orders, carts, validation, cleanup
- Violates Single Responsibility Principle
- Difficult to test individual concerns
- Hard to maintain and extend

### 2. ⚠️ Business Logic in Service Layer
- APIs are thin wrappers (just validation + service call)
- No clear separation between:
  - Data access (queries)
  - Business logic (validation, calculations)
  - Orchestration (transactions)

### 3. ⚠️ Tight Coupling
- Cart operations mixed with inventory operations
- Order operations mixed with inventory operations
- Makes changes risky (cascading effects)

### 4. ⚠️ Difficult to Test
- 1,179 lines = hard to mock dependencies
- Complex query logic embedded in functions
- No separation of concerns for unit testing

### 5. ⚠️ Poor Code Discoverability
- Where do I add a new query?
- Where do I add cart logic vs order logic?
- No clear architectural guidance

---

## Refactoring Strategy

### Option A: Query Layer + Domain Services (RECOMMENDED)

**Structure:**
```
inventory/
├── queries/
│   ├── inventory.queries.ts       - Pure data access
│   ├── adjustment.queries.ts      - Adjustment queries
│   └── reservation.queries.ts     - Reservation queries
├── services/
│   ├── inventory.service.ts       - Core inventory business logic
│   ├── order-reservation.service.ts   - Order-specific logic
│   ├── cart-reservation.service.ts    - Cart-specific logic
│   ├── inventory-transfer.service.ts  - (keep as-is)
│   └── location-allocation.service.ts - (keep as-is)
├── validators/
│   └── inventory.validators.ts    - Validation logic
└── apis/ (keep as-is, update imports)
```

**Benefits:**
- ✅ Clear separation: queries vs business logic vs validation
- ✅ Easier to test (mock query layer)
- ✅ Domain-driven: cart, orders, inventory are separate concerns
- ✅ Scalable: add new queries without touching business logic
- ✅ Follows CQRS pattern (Command Query Responsibility Segregation)

### Option B: Fat API Files (NOT RECOMMENDED)

Move all logic directly into API files. Would result in:
- ❌ Code duplication (multiple APIs need same queries)
- ❌ No reusability (can't call from other features)
- ❌ Violates DRY principle
- ❌ Still no clear structure for complex logic

---

## Detailed Refactoring Plan

### Phase 1: Extract Query Layer ✅ RECOMMENDED FIRST

**Goal:** Separate data access from business logic

**Step 1.1: Create `queries/inventory.queries.ts`**

```typescript
/**
 * Pure data access functions for inventory table
 * No business logic, just database queries
 */

// Read Operations
export async function findInventoryById(id: string)
export async function findInventoryByProduct(productId: string)
export async function findInventoryByProductAndLocation(productId: string, locationId: string)
export async function findInventoryList(filters: InventoryFilters, pagination: Pagination)
export async function countInventory(filters: InventoryFilters)

// Write Operations  
export async function createInventory(data: NewInventory)
export async function updateInventory(id: string, data: PartialInventory)
export async function incrementQuantity(id: string, amount: number)
export async function decrementQuantity(id: string, amount: number)
```

**Step 1.2: Create `queries/adjustment.queries.ts`**

```typescript
// Adjustment history queries
export async function findAdjustmentHistory(inventoryId: string, limit: number)
export async function findAdjustmentsByProduct(productId: string, page: number, limit: number)
export async function createAdjustment(data: NewAdjustment)
export async function countAdjustments(filters: AdjustmentFilters)
```

**Step 1.3: Create `queries/reservation.queries.ts`**

```typescript
// Reservation-specific queries
export async function findReservationByOrder(orderId: string)
export async function findExpiredCartReservations()
export async function updateReservationQuantity(inventoryId: string, delta: number)
export async function clearReservation(reservationId: string)
```

**Benefits of Query Layer:**
- ✅ Single place to optimize database queries
- ✅ Easy to add indexes based on actual queries
- ✅ Testable with mock database
- ✅ Reusable across services
- ✅ Clear API for data access

---

### Phase 2: Split Domain Services ✅ COMPLETE (January 2025)

**Status:** ✅ **COMPLETE** - All 9 functions extracted, build passing

**Results:**
- ✅ Created `order-reservation.service.ts` (504 lines, 5 functions)
- ✅ Created `cart-reservation.service.ts` (225 lines, 4 functions)
- ✅ Refactored `inventory.service.ts` (963 → 416 lines, -56.8%)
- ✅ Added re-exports for backward compatibility
- ✅ Refactored `createInventoryForProduct()` to use query layer
- ✅ Build: 0 errors

**Details:** See [PHASE_2_DOMAIN_SERVICES_COMPLETE.md](./refactoring/PHASE_2_DOMAIN_SERVICES_COMPLETE.md)

**Goal:** Separate cart, order, and inventory concerns

**Step 2.1: Create `services/order-reservation.service.ts`** ✅

Move order-specific functions:
- `validateStockAvailability()` ✅
- `reserveStockForOrder()` ✅
- `fulfillOrderInventory()` ✅
- `releaseReservation()` ✅
- `processOrderReturn()` ✅

```typescript
/**
 * Order Reservation Service
 * Handles inventory reservations for orders
 */
import * as inventoryQueries from '../queries/inventory.queries';
import * as reservationQueries from '../queries/reservation.queries';

export async function validateStockAvailability(...)
export async function reserveStockForOrder(...)
export async function fulfillOrderInventory(...)
export async function releaseOrderReservation(...)
export async function processOrderReturn(...)
```

**Step 2.2: Create `services/cart-reservation.service.ts`** ✅

Move cart-specific functions:
- `reserveCartStock()` ✅
- `releaseCartStock()` ✅
- `extendCartReservation()` ✅
- `cleanupExpiredCartReservations()` ✅

```typescript
/**
 * Cart Reservation Service
 * Handles temporary 30-min reservations for carts
 */
import * as inventoryQueries from '../queries/inventory.queries';
import * as reservationQueries from '../queries/reservation.queries';

export async function reserveCartStock(...)
export async function releaseCartStock(...)
export async function extendCartReservation(...)
export async function cleanupExpiredReservations(...)
```

**Step 2.3: Refactor `services/inventory.service.ts`** ✅

Keep only core inventory operations:
- `getInventoryList()` - Use inventoryQueries ✅
- `getInventoryById()` - Use inventoryQueries ✅
- `updateInventory()` - Use inventoryQueries ✅
- `adjustInventory()` - Use adjustmentQueries ✅
- `getInventoryHistory()` - Use adjustmentQueries ✅
- `createInventoryForProduct()` - Use inventoryQueries ✅

**Result:** Reduced from 963 lines to **416 lines** (-56.8%) ✅

---

### Phase 3: Extract Validators (Optional Enhancement)

**Goal:** Separate validation logic for reusability

**Create `validators/inventory.validators.ts`**

```typescript
/**
 * Validation functions for inventory operations
 * Pure functions with no database access
 */

export function validateQuantity(quantity: number): ValidationResult
export function validateStockLevel(available: number, reserved: number, requested: number)
export function validateReservationExpiry(expiresAt: Date)
export function validateInventoryStatus(status: string)
```

**Benefits:**
- ✅ Reusable across services
- ✅ Easy to unit test (no mocks needed)
- ✅ Clear business rules in one place
- ✅ Can be used in frontend validation too

---

### Phase 4: Update API Files

**Goal:** Update imports and maintain thin controller pattern

**Before:**
```typescript
import { getInventoryList } from '../services/inventory.service';
```

**After:**
```typescript
import { getInventoryList } from '../services/inventory.service';
// Service internally uses queries
```

**No changes needed in API files** - services maintain same public interface.

---

## Migration Strategy

### Step-by-Step Implementation

**Week 1: Query Layer**
1. Create `queries/` folder
2. Create `inventory.queries.ts` with all SELECT queries
3. Create `adjustment.queries.ts` with adjustment queries
4. Create `reservation.queries.ts` with reservation queries
5. Add unit tests for query functions

**Week 2: Refactor Core Service**
1. Update `inventory.service.ts` to use query layer
2. Remove direct `db.select()` calls
3. Keep business logic, delegate data access
4. Run integration tests

**Week 3: Split Domain Services**
1. Create `order-reservation.service.ts`
2. Move order functions from inventory.service
3. Update order APIs to use new service
4. Test order flows

**Week 4: Cart Reservation Service**
1. Create `cart-reservation.service.ts`
2. Move cart functions from inventory.service
3. Update cart APIs to use new service
4. Test cart flows

**Week 5: Extract Validators (Optional)**
1. Create `validators/` folder
2. Extract validation logic
3. Update services to use validators
4. Add unit tests for validators

**Week 6: Cleanup & Documentation**
1. Remove old code
2. Update API documentation
3. Add architecture decision records
4. Update developer onboarding docs

---

## Benefits Summary

### Before (Current State)
- ❌ 1,179-line monolithic service
- ❌ Mixed concerns (cart, orders, inventory)
- ❌ Difficult to test
- ❌ Hard to maintain
- ❌ Tight coupling
- ❌ No clear architecture

### After (Refactored)
- ✅ ~300-400 line core service
- ✅ Clear separation of concerns
- ✅ Domain-driven structure
- ✅ Easy to test (unit + integration)
- ✅ Loose coupling via query layer
- ✅ CQRS pattern (commands vs queries)
- ✅ Scalable architecture
- ✅ Clear onboarding path for new devs

---

## Example: Before vs After

### Before (Current)
```typescript
// inventory.service.ts (1,179 lines)
export async function reserveStockForOrder(...) {
  // Direct database access
  const inventory = await db.select()
    .from(inventory)
    .where(eq(inventory.product_id, productId));
  
  // Business logic
  if (inventory.available < quantity) {
    throw new Error('Insufficient stock');
  }
  
  // Write operation
  await db.update(inventory)
    .set({ reserved_quantity: sql`...` })
    .where(eq(inventory.id, inventoryId));
}
```

### After (Refactored)
```typescript
// queries/inventory.queries.ts (~200 lines)
export async function findInventoryByProduct(productId: string) {
  return db.select()
    .from(inventory)
    .where(eq(inventory.product_id, productId));
}

export async function incrementReserved(id: string, amount: number) {
  return db.update(inventory)
    .set({ reserved_quantity: sql`${inventory.reserved_quantity} + ${amount}` })
    .where(eq(inventory.id, id));
}

// services/order-reservation.service.ts (~200 lines)
import * as inventoryQueries from '../queries/inventory.queries';
import * as validators from '../validators/inventory.validators';

export async function reserveStockForOrder(...) {
  // Query layer
  const inventory = await inventoryQueries.findInventoryByProduct(productId);
  
  // Validation layer
  validators.validateStockLevel(inventory.available, inventory.reserved, quantity);
  
  // Business logic
  await inventoryQueries.incrementReserved(inventory.id, quantity);
}
```

**Benefits Demonstrated:**
- ✅ `inventoryQueries` is reusable
- ✅ `validators` can be unit tested
- ✅ Service focuses on orchestration
- ✅ Clear separation of concerns
- ✅ Easy to mock for testing

---

## Recommended Implementation Order

**Priority 1: Query Layer (Week 1-2)**
- Highest impact
- Enables all other refactoring
- Improves testability immediately
- Low risk (queries don't change)

**Priority 2: Split Domain Services (Week 3-4)**
- High impact on maintainability
- Clear ownership boundaries
- Easier code review process

**Priority 3: Validators (Week 5)**
- Nice to have
- Can be deferred if timeline tight
- Easy to add later

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:** 
- Keep service public APIs identical
- Add deprecation warnings
- Gradual migration with feature flags

### Risk 2: Performance Regression
**Mitigation:**
- Benchmark before and after
- Add query performance monitoring
- Optimize query layer if needed

### Risk 3: Team Learning Curve
**Mitigation:**
- Pair programming sessions
- Architecture decision records
- Code review guidelines
- Documentation updates

### Risk 4: Testing Gaps
**Mitigation:**
- Maintain integration test suite
- Add unit tests for query layer
- Test coverage reports
- Gradual rollout with QA

---

## Success Metrics

### Code Quality
- [ ] Service file < 500 lines
- [ ] Function complexity < 20 (cyclomatic)
- [ ] Test coverage > 80%
- [ ] Zero circular dependencies

### Performance
- [ ] API response time < 200ms (p95)
- [ ] Database query time < 50ms (p95)
- [ ] No N+1 query problems

### Developer Experience
- [ ] New dev onboarding < 2 hours
- [ ] Clear where to add new features
- [ ] Code review time < 30 min
- [ ] Confidence in making changes

---

## Next Steps

**Immediate:**
1. ✅ Review this plan with team
2. ✅ Get approval for refactoring timeline
3. ✅ Create tickets for Week 1 work
4. ✅ Set up feature branch

**This Sprint:**
1. Create query layer structure
2. Extract read operations
3. Add query layer tests
4. Update 1-2 service functions to use queries

**Next Sprint:**
1. Complete query layer migration
2. Split order-reservation.service
3. Update order APIs
4. Integration testing

---

## Related Documentation

- **Phase 2 Normalization**: [docs/PHASE_2B_AUDIT_FIELDS_COMPLETE.md](./PHASE_2B_AUDIT_FIELDS_COMPLETE.md)
- **Inventory API Reference**: [src/features/inventory/API_REFERENCE.md](../src/features/inventory/API_REFERENCE.md)
- **Architecture Guidelines**: (TBD - create after refactoring)

---

**Recommendation:** Start with **Phase 1 (Query Layer)** this sprint. It's low-risk, high-impact, and enables all future refactoring.
