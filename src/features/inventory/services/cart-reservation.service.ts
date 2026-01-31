/**
 * Cart Reservation Service
 * 
 * Handles temporary inventory reservations for shopping carts.
 * Extracted from inventory.service.ts as part of Phase 2 refactoring.
 * 
 * Phase 2: Domain Service Extraction
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { logger } from '../../../utils';
import { validateStockAvailability } from './order-reservation.service';

// ============================================
// CART RESERVATION OPERATIONS
// ============================================

/**
 * Reserve stock for a cart item (with timeout)
 * 
 * Business Logic:
 * - Validates stock availability first
 * - Creates temporary reservation with expiration
 * - Increases reserved_quantity atomically
 * - Updates cart item with reservation details
 * 
 * @param productId - Product to reserve
 * @param quantity - Quantity to reserve
 * @param cartItemId - Cart item ID for tracking
 * @param expirationMinutes - Timeout in minutes (default: 30)
 * @returns Reservation ID and expiration timestamp
 */
export async function reserveCartStock(
    productId: string,
    quantity: number,
    cartItemId: string,
    expirationMinutes: number = 30
): Promise<{ reservation_id: string; expires_at: Date }> {
    return await db.transaction(async (tx) => {
        // Business logic: Validate stock availability
        const validations = await validateStockAvailability([{ product_id: productId, quantity }]);
        const [validation] = validations;

        if (!validation.available) {
            throw new Error(validation.message || 'Insufficient stock');
        }

        // Query layer: Reserve stock (increase reserved_quantity)
        await tx
            .update(inventory)
            .set({
                reserved_quantity: sql`${inventory.reserved_quantity} + ${quantity}`,
                updated_at: new Date(),
            })
            .where(eq(inventory.product_id, productId));

        // Business logic: Create reservation record
        const reservationId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        // Query layer: Update cart item with reservation details
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

        await tx
            .update(cartItems)
            .set({
                reservation_id: reservationId,
                reserved_at: new Date(),
                reservation_expires_at: expiresAt,
            })
            .where(eq(cartItems.id, cartItemId));

        return { reservation_id: reservationId, expires_at: expiresAt };
    });
}

/**
 * Release stock reservation for a cart item
 * 
 * Business Logic:
 * - Decreases reserved_quantity
 * - Clears reservation fields from cart item
 * - Safe to call even if no reservation exists
 * 
 * @param cartItemId - Cart item ID
 */
export async function releaseCartStock(cartItemId: string): Promise<void> {
    return await db.transaction(async (tx) => {
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

        // Query layer: Get cart item with reservation
        const [item] = await tx
            .select({
                product_id: cartItems.product_id,
                quantity: cartItems.quantity,
                reservation_id: cartItems.reservation_id,
            })
            .from(cartItems)
            .where(eq(cartItems.id, cartItemId));

        // Business logic: Nothing to release if no reservation
        if (!item || !item.product_id || !item.reservation_id) {
            return;
        }

        // Query layer: Release reservation (decrease reserved_quantity)
        await tx
            .update(inventory)
            .set({
                reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                updated_at: new Date(),
            })
            .where(eq(inventory.product_id, item.product_id));

        // Query layer: Clear reservation fields
        await tx
            .update(cartItems)
            .set({
                reservation_id: null,
                reserved_at: null,
                reservation_expires_at: null,
            })
            .where(eq(cartItems.id, cartItemId));
    });
}

/**
 * Extend cart reservation (called during checkout)
 * 
 * Business Logic:
 * - Extends expiration time for all items in cart
 * - Typically used when user starts checkout (extends to 60 min)
 * 
 * @param cartId - Cart ID
 * @param additionalMinutes - Time to extend (default: 60 for checkout)
 */
export async function extendCartReservation(
    cartId: string,
    additionalMinutes: number = 60
): Promise<void> {
    const { cartItems } = await import('../../cart/shared/cart-items.schema');

    // Business logic: Calculate new expiration time
    const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

    // Query layer: Update all cart items
    await db
        .update(cartItems)
        .set({
            reservation_expires_at: newExpiresAt,
        })
        .where(
            and(
                eq(cartItems.cart_id, cartId),
                eq(cartItems.is_deleted, false)
            )
        );
}

/**
 * Cleanup expired cart reservations (called by cron job)
 * 
 * Business Logic:
 * - Finds all expired reservations
 * - Releases reserved_quantity back to inventory
 * - Clears reservation from cart items
 * - Returns count of cleaned up items for monitoring
 * 
 * @returns Count of cleaned up items
 */
export async function cleanupExpiredCartReservations(): Promise<number> {
    const { cartItems } = await import('../../cart/shared/cart-items.schema');

    // Query layer: Find expired items
    const expiredItems = await db
        .select({
            id: cartItems.id,
            product_id: cartItems.product_id,
            quantity: cartItems.quantity,
            reservation_id: cartItems.reservation_id,
        })
        .from(cartItems)
        .where(
            and(
                sql`${cartItems.reservation_expires_at} IS NOT NULL`,
                sql`${cartItems.reservation_expires_at} < NOW()`
            )
        );

    if (expiredItems.length === 0) {
        return 0;
    }

    // Release each expired reservation
    for (const item of expiredItems) {
        if (!item.product_id) continue;

        await db.transaction(async (tx) => {
            // Query layer: Release from inventory
            await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    updated_at: new Date(),
                })
                .where(eq(inventory.product_id, item.product_id!));

            // Query layer: Clear reservation from cart item
            await tx
                .update(cartItems)
                .set({
                    reservation_id: null,
                    reserved_at: null,
                    reservation_expires_at: null,
                })
                .where(eq(cartItems.id, item.id));
        });
    }

    logger.info(`[CartReservation] Cleaned up ${expiredItems.length} expired cart reservations`);

    return expiredItems.length;
}
