/**
 * Cart Reservation Service
 * 
 * Handles temporary inventory reservations for shopping carts.
 * Extracted from inventory.service.ts as part of Phase 2 refactoring.
 * 
 * Phase 2: Domain Service Extraction
 */

import { eq, and, sql, isNull } from 'drizzle-orm';
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
 * @param tx - Optional transaction object
 * @param skipValidation - Whether to skip stock validation
 * @returns Reservation ID and expiration timestamp
 */
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
        // Business logic: Validate stock availability
        // Only run validation if not skipped. 
        // When running in a transaction where we just released stock, standard validation 
        // (reading outside tx) might fail due to isolation.
        if (!skipValidation) {
            // Note: validateStockAvailability also needs to support tx if we want full atomicity reading stock!
            // But validateStockAvailability is imported. It likely just reads.
            const validations = await validateStockAvailability([{
                product_id: productId,
                quantity,
                variant_id: variantId
            }]);
            const [validation] = validations;

            if (!validation.available) {
                throw new Error(validation.message || 'Insufficient stock');
            }
        }

        // Query layer: Reserve stock (increase reserved_quantity)
        await transaction
            .update(inventory)
            .set({
                reserved_quantity: sql`${inventory.reserved_quantity} + ${quantity}`,
                updated_at: new Date(),
            })
            .where(
                variantId
                    ? eq(inventory.variant_id, variantId)
                    : and(
                        eq(inventory.product_id, productId),
                        isNull(inventory.variant_id)
                    )
            );

        // Business logic: Create reservation record
        const reservationId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        // Query layer: Update cart item with reservation details
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

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

    if (tx) {
        return execute(tx);
    } else {
        return db.transaction(execute);
    }
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
 * @param tx - Optional transaction object
 * @param forceRelease - Force release even without reservation_id (fixes phantom reservations)
 */
export async function releaseCartStock(cartItemId: string, tx?: any, forceRelease: boolean = false): Promise<void> {
    const execute = async (transaction: any) => {
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

        // Query layer: Get cart item with reservation
        const [item] = await transaction
            .select({
                product_id: cartItems.product_id,
                variant_id: cartItems.variant_id,
                quantity: cartItems.quantity,
                reservation_id: cartItems.reservation_id,
            })
            .from(cartItems)
            .where(eq(cartItems.id, cartItemId));

        // Business logic: Nothing to release if no product
        if (!item || !item.product_id) {
            return;
        }

        // FIX: Only skip release if no reservation AND not forced
        // This prevents phantom reservations from accumulating
        if (!forceRelease && !item.reservation_id) {
            logger.warn(`releaseCartStock: No reservation_id for cart item ${cartItemId}, skipping release`);
            return;
        }

        // Log the release operation for debugging
        logger.info(`Releasing ${item.quantity} units for cart item ${cartItemId} (product: ${item.product_id}, variant: ${item.variant_id})`);
    

        // Query layer: Release reservation (decrease reserved_quantity)
        // FIX: Support variants - use variant_id if present, otherwise product_id
        await transaction
            .update(inventory)
            .set({
                reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                updated_at: new Date(),
            })
            .where(
                item.variant_id
                    ? eq(inventory.variant_id, item.variant_id)
                    : and(
                        eq(inventory.product_id, item.product_id),
                        isNull(inventory.variant_id)
                    )
            );

        // Query layer: Clear reservation fields
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

/**
 * Extend cart reservation (called during checkout)
 * 
 * Business Logic:
 * - Extends expiration time for all items in cart
 * - Typically used when user starts checkout (extends to 60 min)
 * 
 * @param cartId - Cart ID
 * @param additionalMinutes - Time to extend (default: 60 for checkout)
 * @param tx - Optional transaction object
 */
export async function extendCartReservation(
    cartId: string,
    additionalMinutes: number = 60,
    tx?: any
): Promise<void> {
    const execute = async (transaction: any) => {
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

        // Business logic: Calculate new expiration time
        const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

        // Query layer: Update all cart items
        await transaction
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
    };

    if (tx) {
        return execute(tx);
    } else {
        // Simple update doesn't strictly need transaction but consistent API is good
        return execute(db);
    }
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

