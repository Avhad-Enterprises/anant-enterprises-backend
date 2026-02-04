# Inventory Reservation Bug Report

**Date:** February 3, 2026  
**Severity:** CRITICAL  
**Status:** IDENTIFIED - FIX PENDING

## Problem Summary

Phantom inventory reservations are accumulating in the database, causing cart quantity updates to fail even when sufficient physical stock exists.

## Symptoms

- User has 8 units in cart, available stock shows 32 units
- System reports "Only 4 units available" when trying to update to 9
- Database shows: `reserved_quantity=36` but only 8 units in active carts
- **28 units of phantom reservations** blocking legitimate orders

## Root Cause Analysis

### Database State
```sql
-- Current inventory state for variant 7f3b204e-9fa2-4151-94ea-f916c6351f87
available_quantity: 32
reserved_quantity: 36
unreserved_stock: -4 (32 - 36 = -4)

-- Active cart items for this variant
Total cart items: 1
Total quantity in carts: 8
Phantom reservations: 28 (36 - 8 = 28)
```

### Transaction Flow Issue

The bug occurs in [`update-cart-item.ts`](src/features/cart/apis/update-cart-item.ts) when users incrementally update quantities (1→2→3→4→5→6→7→8):

**Current Flow:**
```typescript
await db.transaction(async (tx) => {
    // 1. Lock cart item
    await tx.select().from(cartItems).where(eq(cartItems.id, itemId)).for('update');
    
    // 2. Check stock availability
    const [stockData] = await tx.select({
        totalStock: sql`${inventory.available_quantity} - ${inventory.reserved_quantity}`
    }).from(inventory).where(...).for('update');
    
    // 3. Validate: quantity must be <= totalStock + currentReservedQty
    if (quantity > (totalStock + currentReservedQty)) {
        throw new HttpException(400, `Insufficient stock...`);
    }
    
    // 4. Release OLD reservation
    await releaseCartStock(itemId, tx);
    
    // 5. Reserve NEW quantity
    await reserveCartStock(productId, quantity, itemId, timeout, tx, true, variantId);
});
```

### The Bug: Race Condition After Rollback

When a transaction **rolls back** (e.g., validation fails, network error):

1. ✅ **Release** executes: `reserved_quantity -= 8` (DB: 36 → 28)
2. ✅ **Validation** fails: Transaction throws error
3. ✅ **Rollback** occurs: Release is reverted (DB: 28 → 36 restored)
4. ❌ **BUT** the reservation metadata in `cart_items` table is NOT reverted
5. ❌ Next update attempt sees `reservation_id` exists, tries to release phantom reservation
6. ❌ `releaseCartStock()` succeeds but releases WRONG amount or NOTHING
7. ❌ New reservation is added, causing `reserved_quantity` to INCREASE instead of staying same

**Audit Log Evidence:**
```json
// Multiple failed attempts to update quantity to 9
{"action":"UPDATE","resource_type":"CART","timestamp":"2026-02-03 13:42:40","statusCode":400}
{"action":"UPDATE","resource_type":"CART","timestamp":"2026-02-03 13:42:39","statusCode":400}
{"action":"UPDATE","resource_type":"CART","timestamp":"2026-02-03 13:42:39","statusCode":400}
... (11 failed attempts)

// Successful incremental updates that worked
{"action":"UPDATE","resource_type":"SYSTEM","new_values":"{\"quantity\": 8}","statusCode":200}
{"action":"UPDATE","resource_type":"SYSTEM","new_values":"{\"quantity\": 7}","statusCode":200}
{"action":"UPDATE","resource_type":"SYSTEM","new_values":"{\"quantity\": 6}","statusCode":200}
```

### Secondary Issue: Reservation Metadata Inconsistency

The `cart_items` table has reservation metadata that can become inconsistent:

```typescript
// cart_items columns
reservation_id: string | null
reserved_at: timestamp | null  
reservation_expires_at: timestamp | null
```

**Problem:** When `releaseCartStock()` clears these fields but transaction rolls back:
- Fields are restored to old values
- But `inventory.reserved_quantity` is also restored
- Next update thinks reservation exists but may be stale/invalid

## Code Analysis

### releaseCartStock() - cart-reservation.service.ts (Lines 117-160)

```typescript
export async function releaseCartStock(cartItemId: string, tx?: any): Promise<void> {
    const execute = async (transaction: any) => {
        // Get cart item with reservation
        const [item] = await transaction
            .select({
                product_id: cartItems.product_id,
                variant_id: cartItems.variant_id,
                quantity: cartItems.quantity,
                reservation_id: cartItems.reservation_id,
            })
            .from(cartItems)
            .where(eq(cartItems.id, cartItemId));

        // Nothing to release if no reservation
        if (!item || !item.product_id || !item.reservation_id) {
            return; // ❌ SILENTLY RETURNS - May skip release when it shouldn't
        }

        // Release reservation
        await transaction
            .update(inventory)
            .set({
                reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                updated_at: new Date(),
            })
            .where(
                item.variant_id
                    ? eq(inventory.variant_id, item.variant_id)
                    : and(eq(inventory.product_id, item.product_id), isNull(inventory.variant_id))
            );

        // Clear reservation fields
        await transaction
            .update(cartItems)
            .set({
                reservation_id: null,
                reserved_at: null,
                reservation_expires_at: null,
            })
            .where(eq(cartItems.id, cartItemId));
    };
}
```

**Issues:**
1. ❌ Returns early if `reservation_id` is null, but `reserved_quantity` might still be non-zero
2. ❌ No validation that release amount matches actual inventory state
3. ❌ No logging of release operations for debugging
4. ❌ Rollback can leave metadata inconsistent with inventory

### reserveCartStock() - cart-reservation.service.ts (Lines 33-99)

```typescript
export async function reserveCartStock(
    productId: string,
    quantity: number,
    cartItemId: string,
    expirationMinutes: number = 30,
    tx?: any,
    skipValidation: boolean = false,
    variantId?: string | null
): Promise<{ reservation_id: string; expires_at: Date }> {
    const execute = async (transaction: any) => {
        // Skip validation in transaction
        if (!skipValidation) {
            const validations = await validateStockAvailability([{
                product_id: productId,
                quantity,
                variant_id: variantId
            }]);
            // ...
        }

        // Reserve stock
        await transaction
            .update(inventory)
            .set({
                reserved_quantity: sql`${inventory.reserved_quantity} + ${quantity}`, // ❌ ALWAYS ADDS
                updated_at: new Date(),
            })
            .where(
                variantId
                    ? eq(inventory.variant_id, variantId)
                    : and(eq(inventory.product_id, productId), isNull(inventory.variant_id))
            );

        // Create reservation record
        const reservationId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        await transaction
            .update(cartItems)
            .set({
                reservation_id: reservationId,
                reserved_at: new Date(),
                reservation_expires_at: expiresAt,
            })
            .where(eq(cartItems.id, cartItemId));

        return { reservation_id: reservationId, expires_at: expiresAt };
    };
}
```

**Issues:**
1. ❌ Always ADDS to `reserved_quantity` without checking previous state
2. ❌ If release fails or is skipped, this creates duplicate reservations
3. ❌ No idempotency - running twice reserves twice

## How Phantom Reservations Accumulate

### Scenario: User Updates Cart 1→2→3→4→5→6→7→8

**Update 1→2 (SUCCESS):**
```
Release: reserved_quantity 1 → 0
Reserve: reserved_quantity 0 → 2
Result: ✅ reserved_quantity = 2 (CORRECT)
```

**Update 2→3 (SUCCESS):**
```
Release: reserved_quantity 2 → 0
Reserve: reserved_quantity 0 → 3
Result: ✅ reserved_quantity = 3 (CORRECT)
```

**Update 3→4 (VALIDATION FAILS - Transaction Rollback):**
```
Release: reserved_quantity 3 → 0 (EXECUTED)
Validation: FAILS - throws error
Rollback: reserved_quantity restored to 3
BUT: reservation_id in cart_items might be partially updated
Result: ⚠️ reserved_quantity = 3, but cart shows quantity=3
```

**Update 3→4 (RETRY - SUCCESS):**
```
Release: Sees reservation_id exists, tries to release 3 units
        But reserved_quantity is already 3, so: 3 → 0
Reserve: reserved_quantity 0 → 4
Result: ✅ reserved_quantity = 4 (CORRECT)
```

**Update 4→5 (NETWORK ERROR - Partial Rollback):**
```
Release: reserved_quantity 4 → 0 (EXECUTED)
Reserve: reserved_quantity 0 → 5 (EXECUTED)
Network error before commit
Rollback: reserved_quantity restored to 4
BUT: cart_items.reservation_id may have new UUID
Result: ❌ reserved_quantity = 4, but cart thinks it has NEW reservation
```

**Update 4→5 (RETRY):**
```
Release: Sees NEW reservation_id (from failed attempt)
        Tries to release 4 units: 4 → 0
Reserve: Adds 5 units: 0 → 5
Result: ✅ reserved_quantity = 5 (CORRECT)
```

**Update 5→6 (DOUBLE RESERVE BUG):**
```
Release: reservation_id is null somehow (bug in earlier rollback)
        Early return - NOTHING RELEASED
Reserve: Adds 6 units: 5 + 6 → 11
Result: ❌ reserved_quantity = 11 (WRONG! Should be 6)
```

After several such failures, we get:
- Cart shows: 8 units
- Inventory shows: `reserved_quantity = 36`
- Phantom reservations: **28 units**

## Impact Assessment

### Immediate Impact
- ✅ **Physical stock**: 32 units available
- ❌ **System thinks**: Only 4 units available (32 - 36 + 8 = 4)
- ❌ **Customer experience**: Cannot add 1 more unit despite 32 in stock
- ❌ **Revenue loss**: Legitimate orders blocked

### System-Wide Risk
- Affects ALL products with variants
- Accumulates over time with each failed transaction
- No automatic cleanup mechanism for phantom reservations
- Requires manual database intervention to fix

## Recommended Fixes

### Fix 1: Atomic Release+Reserve Operation (RECOMMENDED)

Replace separate release/reserve with single atomic operation:

```typescript
// In update-cart-item.ts
await db.transaction(async (tx) => {
    // ... locks and validation ...

    // ATOMIC: Adjust reservation in one operation
    if (CART_RESERVATION_CONFIG.ENABLED && cartItem.product_id) {
        const oldQuantity = cartItem.quantity || 0;
        const quantityDelta = quantity - oldQuantity;

        if (quantityDelta !== 0) {
            // Single atomic update - no separate release/reserve
            await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} + ${quantityDelta})`,
                    updated_at: new Date(),
                })
                .where(
                    cartItem.variant_id
                        ? eq(inventory.variant_id, cartItem.variant_id)
                        : and(eq(inventory.product_id, cartItem.product_id), isNull(inventory.variant_id))
                );

            // Update reservation metadata
            await tx
                .update(cartItems)
                .set({
                    reservation_id: crypto.randomUUID(),
                    reserved_at: new Date(),
                    reservation_expires_at: new Date(Date.now() + 30 * 60 * 1000),
                })
                .where(eq(cartItems.id, itemId));
        }
    }

    // Update cart item
    await tx.update(cartItems).set({ quantity, ... });
});
```

**Benefits:**
- ✅ Single atomic operation - no partial state
- ✅ Rollback restores everything correctly
- ✅ No phantom reservations
- ✅ Idempotent - safe to retry

### Fix 2: Force Release Without reservation_id Check

```typescript
// In releaseCartStock()
export async function releaseCartStock(cartItemId: string, tx?: any, forceRelease: boolean = false): Promise<void> {
    const execute = async (transaction: any) => {
        const [item] = await transaction
            .select({
                product_id: cartItems.product_id,
                variant_id: cartItems.variant_id,
                quantity: cartItems.quantity,
                reservation_id: cartItems.reservation_id,
            })
            .from(cartItems)
            .where(eq(cartItems.id, cartItemId));

        if (!item || !item.product_id) {
            return;
        }

        // ONLY skip if NO reservation AND not forced
        if (!forceRelease && !item.reservation_id) {
            logger.warn(`releaseCartStock: No reservation_id for cart item ${cartItemId}, skipping release`);
            return;
        }

        // ALWAYS release the quantity from the cart item
        logger.info(`Releasing ${item.quantity} units for cart item ${cartItemId} (variant: ${item.variant_id})`);

        await transaction
            .update(inventory)
            .set({
                reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                updated_at: new Date(),
            })
            .where(
                item.variant_id
                    ? eq(inventory.variant_id, item.variant_id)
                    : and(eq(inventory.product_id, item.product_id), isNull(inventory.variant_id))
            );

        // Clear reservation fields
        await transaction
            .update(cartItems)
            .set({
                reservation_id: null,
                reserved_at: null,
                reservation_expires_at: null,
            })
            .where(eq(cartItems.id, cartItemId));
    };

    if (tx) {
        return execute(tx);
    } else {
        return db.transaction(execute);
    }
}
```

Then call with `forceRelease=true` in update-cart-item:
```typescript
await releaseCartStock(itemId, tx, true); // Force release regardless of reservation_id
```

### Fix 3: Inventory Reconciliation Script

Create a cleanup script to fix existing phantom reservations:

```typescript
// scripts/fix-phantom-reservations.ts
async function fixPhantomReservations() {
    const phantomReservations = await db.execute(sql`
        SELECT 
            i.id as inventory_id,
            i.product_id,
            i.variant_id,
            i.reserved_quantity as inventory_reserved,
            COALESCE(SUM(ci.quantity), 0) as actual_cart_quantity,
            i.reserved_quantity - COALESCE(SUM(ci.quantity), 0) as phantom_amount
        FROM inventory i
        LEFT JOIN cart_items ci ON (
            (i.variant_id IS NOT NULL AND ci.variant_id = i.variant_id) OR
            (i.variant_id IS NULL AND ci.product_id = i.product_id AND ci.variant_id IS NULL)
        ) AND ci.is_deleted = false
        JOIN carts c ON ci.cart_id = c.id AND c.cart_status = 'active'
        WHERE i.reserved_quantity > 0
        GROUP BY i.id, i.product_id, i.variant_id, i.reserved_quantity
        HAVING i.reserved_quantity > COALESCE(SUM(ci.quantity), 0)
    `);

    console.log(`Found ${phantomReservations.rows.length} items with phantom reservations`);

    for (const row of phantomReservations.rows) {
        const { inventory_id, actual_cart_quantity, phantom_amount } = row;
        
        console.log(`Fixing inventory ${inventory_id}: Reducing reserved_quantity by ${phantom_amount}`);

        await db
            .update(inventory)
            .set({
                reserved_quantity: actual_cart_quantity,
                updated_at: new Date(),
            })
            .where(eq(inventory.id, inventory_id));
    }

    console.log('✅ Phantom reservations fixed');
}
```

## Testing Plan

### Test Case 1: Incremental Cart Updates
```
1. Add variant to cart (quantity=1)
2. Update to 2, 3, 4, 5, 6, 7, 8
3. Verify reserved_quantity matches cart quantity after each update
4. Check no phantom reservations exist
```

### Test Case 2: Failed Transaction Handling
```
1. Add variant to cart (quantity=5)
2. Simulate validation failure during update to 10
3. Retry update to 10
4. Verify reserved_quantity = 10 (not 15 or 20)
```

### Test Case 3: Concurrent Updates
```
1. Two users add same variant to their carts
2. Both update quantities simultaneously
3. Verify reserved_quantity = sum of both cart quantities
4. No phantom reservations
```

### Test Case 4: Cleanup Script
```
1. Create phantom reservations manually
2. Run reconciliation script
3. Verify reserved_quantity matches active cart totals
4. No active carts affected
```

## Immediate Action Required

### Quick Fix (Applied Immediately)
1. Run reconciliation script to fix current phantom reservations
2. Deploy Fix #2 (force release) to prevent new phantoms

### Long-term Fix (Next Sprint)
1. Implement Fix #1 (atomic operation)
2. Add comprehensive logging
3. Add monitoring/alerts for phantom reservations
4. Schedule daily reconciliation job

## Reconciliation Query

```sql
-- Find phantom reservations
SELECT 
    i.id,
    i.variant_id,
    i.available_quantity,
    i.reserved_quantity,
    COALESCE(SUM(ci.quantity), 0) as cart_total,
    i.reserved_quantity - COALESCE(SUM(ci.quantity), 0) as phantom
FROM inventory i
LEFT JOIN cart_items ci ON i.variant_id = ci.variant_id AND ci.is_deleted = false
LEFT JOIN carts c ON ci.cart_id = c.id AND c.cart_status = 'active'
WHERE i.variant_id = '7f3b204e-9fa2-4151-94ea-f916c6351f87'
GROUP BY i.id, i.variant_id, i.available_quantity, i.reserved_quantity;

-- Fix specific variant
UPDATE inventory
SET reserved_quantity = 8, -- Match actual cart quantity
    updated_at = NOW()
WHERE variant_id = '7f3b204e-9fa2-4151-94ea-f916c6351f87';
```

---

**Report Generated:** 2026-02-03 19:15:00  
**Priority:** P0 - Critical  
**Assigned To:** Backend Team  
**ETA for Fix:** Immediate (Quick Fix), 2 days (Long-term Fix)
