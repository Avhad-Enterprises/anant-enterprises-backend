# Inventory Management & Stock Handling Logic

This document outlines the architecture, logic, and safety mechanisms implemented in the Inventory Service (`inventory.service.ts`).

## 1. Core Concepts

The inventory system tracks two key metrics for every product:
*   **Available Quantity**: The total physical stock currently in the warehouse (according to system records).
*   **Reserved Quantity**: The portion of the Available Quantity that has been "promised" to active orders but not yet shipped.

**Effective Sellable Stock** = `Available Quantity` - `Reserved Quantity`

### Why separate Reserved Quantity?
This prevents double-selling. When a user creates an order, we *reserve* the stock immediately. We don't deduct it from "Available" until the item is actually shipped (Fulfilled). This allows us to cancel orders easily (just release reservation) without messing up audit trails of physical stock movements.

## 2. Order Lifecycle & Inventory

1.  **Order Creation (Reservation)**
    *   **Action**: `reserveStockForOrder`
    *   **Logic**:
        *   Checks `(Available - Reserved) >= Requested`.
        *   If valid: Increases `reserved_quantity` by `Requested`.
        *   StartDB Transaction ensures no other request steals the stock during check.
    *   **Result**: `Available` stays same, `Reserved` goes up.

2.  **Order Fulfillment (shipping)**
    *   **Action**: `fulfillOrderInventory`
    *   **Logic**:
        *   Decreases `available_quantity` by `Shipped Amount`.
        *   Decreases `reserved_quantity` by `Shipped Amount` (releasing the hold).
    *   **Result**: Both counts drop. This represents physical stock leaving the warehouse.

3.  **Order Cancellation**
    *   **Action**: `releaseReservation`
    *   **Logic**:
        *   Decreases `reserved_quantity` by `Requested`.
    *   **Result**: Available stock becomes sellable again.

## 3. Negative Inventory & Overselling Policy

By default, the system enforces **Strict Inventory Control**.
*   **Customer Orders**: Cannot be created if `(Available - Reserved) < Requested`.
*   **Adjustments**: Cannot set stock to negative.

### Admin Override (Overselling)
We support "Overselling" for business flexibility (e.g., Backorders, Admin corrections, High-priority manual orders).

*   **Mechanism**: Functions `reserveStockForOrder`, `fulfillOrderInventory`, and `adjustInventory` accept an `allowNegative` (or `allowOverselling`) boolean flag.
*   **Behavior**:
    *   If `true`, the system **Logs a Warning** instead of throwing an Error.
    *   Stock levels are allowed to drop below zero (e.g., Available: -5).
    *   This represents a "Backorder" state where the business owes items to customers that it doesn't physically have.

### Usage
*   **Admin Panel**: "Create Order" flows automatically enable `allowOverselling` to ensure Admins are never blocked by system discrepancies.
*   **Storefront**: Always enforces strict checks (no `allowOverselling`).

## 4. Concurrency & Race Conditions

To prevent "phantom inventory" (selling the same item to 2 people at the same ms):

1.  **Database Transactions**: All inventory operations run inside `db.transaction()`.
2.  **Atomic Updates**: We use SQL atomic operators specifically for reservations.
    *   *Correct*: `SET reserved_quantity = reserved_quantity + 5`
    *   *Incorrect*: `SET reserved_quantity = 15` (calculated in JS)
    
    This ensures that if two requests run precisely at the same time:
    *   Req A: Reserve 5 (Current: 0 -> 5)
    *   Req B: Reserve 5 (Current: 5 -> 10)
    
    Both will succeed if stock is sufficient, or fail if not. There is no "overwriting" of the value.

## 5. Audit Trail

All changes to inventory are logged in the `inventory_adjustments` table with:
*   `adjustment_type`: 'increase', 'decrease', 'correction'
*   `quantity_before` / `quantity_after`
*   `reference_number`: Order ID or PO Number
*   `adjusted_by`: User ID of the person/system making the change.

## 6. Edge Case Handling

| Scenario | Handling |
| :--- | :--- |
| **Negative Result** | Throws Error (400) unless `allowNegative` is true. |
| **Stock Discrepancy** | Use `adjustInventory` with `adjustment_type: correction` to reset counts. |
| **Order Cancelled** | `releaseReservation` automatically returns stock to pool. |
| **System Crash** | DB Constraints ensure `Reserved` never stays "stuck" if transaction fails (Rollback). |

---

**Developer Note**:
When modifying `inventory.service.ts`, always ensure you use **Atomic Updates** (`sql\`` increments) rather than reading->modifying->writing values, to maintain thread safety.
