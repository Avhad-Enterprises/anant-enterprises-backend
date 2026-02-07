/**
 * Order Reservation Service
 * 
 * Handles inventory operations related to order processing.
 * Extracted from inventory.service.ts as part of Phase 2 refactoring.
 * 
 * Phase 2: Domain Service Extraction
 */

import { eq, sql, and, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { products } from '../../product/shared/products.schema';
import type { StockValidationResult } from '../shared/interface';
import { logger } from '../../../utils';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate if a string is a valid UUID
 */
function isValidUUID(str: string | null | undefined): boolean {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Cache for system user ID
 */
let cachedSystemUserId: string | null = null;

/**
 * Resolve valid user ID for audit logging
 */
async function resolveValidUserId(userId: string | null | undefined): Promise<string | null> {
    if (isValidUUID(userId)) {
        return userId!;
    }

    if (cachedSystemUserId) {
        return cachedSystemUserId;
    }

    try {
        const { users } = await import('../../user/shared/user.schema');
        const [fallbackUser] = await db
            .select({ id: users.id })
            .from(users)
            .limit(1);

        if (fallbackUser?.id) {
            cachedSystemUserId = fallbackUser.id;
            return cachedSystemUserId;
        }
    } catch (error) {
        // Failed to resolve fallback user
    }

    return null;
}

/**
 * Get status from quantity
 */
function getStatusFromQuantity(quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= 10) return 'low_stock';
    return 'in_stock';
}

// ============================================
// ORDER RESERVATION OPERATIONS
// ============================================

/**
 * Validate if stock is available for given products
 * 
 * Business Logic:
 * - Checks available vs reserved quantity
 * - Returns detailed validation results for each item
 * 
 * @param items - Array of products with quantities to validate
 * @returns Array of validation results
 */
export async function validateStockAvailability(
    items: Array<{ product_id: string; quantity: number; variant_id?: string | null }>
): Promise<StockValidationResult[]> {
    const results: StockValidationResult[] = [];

    // Import productVariants for variant -> product lookup
    const { productVariants } = await import('../../product/shared/product-variants.schema');

    for (const item of items) {
        // Support Variant-Specific Filter (Mutual Exclusivity)
        const isVariant = !!item.variant_id;
        const inventoryFilter = isVariant
            ? eq(inventory.variant_id, item.variant_id!)
            : and(
                eq(inventory.product_id, item.product_id),
                isNull(inventory.variant_id)
            );

        let stock: {
            product_id: string | null;
            variant_id: string | null;
            available_quantity: number;
            reserved_quantity: number;
            product_name: string | null;
        } | undefined;

        if (isVariant) {
            // For variants: join inventory -> productVariants -> products
            const [variantStock] = await db
                .select({
                    product_id: inventory.product_id,
                    variant_id: inventory.variant_id,
                    available_quantity: inventory.available_quantity,
                    reserved_quantity: inventory.reserved_quantity,
                    product_name: products.product_title,
                })
                .from(inventory)
                .innerJoin(productVariants, eq(inventory.variant_id, productVariants.id))
                .innerJoin(products, eq(productVariants.product_id, products.id))
                .where(and(
                    inventoryFilter,
                    sql`${products.status} != 'archived'`
                ));
            stock = variantStock;
        } else {
            // For base products: direct join inventory -> products
            const [baseStock] = await db
                .select({
                    product_id: inventory.product_id,
                    variant_id: inventory.variant_id,
                    available_quantity: inventory.available_quantity,
                    reserved_quantity: inventory.reserved_quantity,
                    product_name: products.product_title,
                })
                .from(inventory)
                .leftJoin(products, eq(inventory.product_id, products.id))
                .where(and(
                    inventoryFilter,
                    sql`${products.status} != 'archived'`
                ));
            stock = baseStock;
        }

        // Business logic: Validate stock not found
        if (!stock) {
            results.push({
                available: false,
                product_id: item.product_id,
                requested_quantity: item.quantity,
                available_quantity: 0,
                reserved_quantity: 0,
                message: 'Product not found in inventory',
            });
            continue;
        }

        // Business logic: Calculate actual availability
        const actuallyAvailable = stock.available_quantity - stock.reserved_quantity;
        const isAvailable = actuallyAvailable >= item.quantity;

        results.push({
            available: isAvailable,
            product_id: item.product_id,
            requested_quantity: item.quantity,
            available_quantity: stock.available_quantity,
            reserved_quantity: stock.reserved_quantity,
            product_name: stock.product_name || undefined,
            message: isAvailable
                ? undefined
                : `${stock.product_name || 'Product'}: Only ${actuallyAvailable} units available (requested ${item.quantity})`,
        });
    }

    return results;
}

/**
 * Reserve stock for an order (increases reserved_quantity)
 * 
 * Business Logic:
 * - Validates stock availability first
 * - Increases reserved_quantity atomically
 * - Creates audit trail
 * - Supports overselling if allowed
 * 
 * Must be called within a transaction or will create its own
 * 
 * @param items - Products to reserve
 * @param orderId - Order ID for reference
 * @param userId - User creating the reservation
 * @param allowOverselling - Whether to allow reserving more than available
 */
export async function reserveStockForOrder(
    items: Array<{ product_id: string; quantity: number; variant_id?: string | null }>,
    orderId: string,
    userId: string,
    allowOverselling: boolean = false
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    // Business logic: Validate stock availability
    const validations = await validateStockAvailability(items);
    const failures = validations.filter((v) => !v.available);

    if (failures.length > 0) {
        const messages = failures.map((f) => f.message).join('; ');
        if (!allowOverselling) {
            throw new Error(`Insufficient stock: ${messages}`);
        }
        // If overselling allowed, just log it
        logger.warn(`[OrderReservation] Overselling allowed for order ${orderId}. Issues: ${messages}`);
    }

    // Reserve stock for each item
    // NOTE: No transaction wrapper to avoid serialization conflicts on concurrent reservations
    // The UPDATE is atomic at row level: reserved_quantity = reserved_quantity + N
    for (const item of items) {
        // Support Variant-Specific Filter (Mutual Exclusivity)
        const inventoryFilter = item.variant_id
            ? eq(inventory.variant_id, item.variant_id)
            : and(
                eq(inventory.product_id, item.product_id),
                isNull(inventory.variant_id)
            )!;

        // Query layer: Update reserved quantity atomically
        // PHASE 1: Track movement timestamp
        const [updated] = await db
            .update(inventory)
            .set({
                reserved_quantity: sql`${inventory.reserved_quantity} + ${item.quantity}`,
                last_stock_movement_at: new Date(), // PHASE 1
                updated_at: new Date(),
                updated_by: validUserId,
            })
            .where(inventoryFilter)
            .returning();

        if (!updated) {
            throw new Error(`Failed to reserve stock for product ${item.product_id}`);
        }

        // Query layer: Create audit record
        await db.insert(inventoryAdjustments).values({
            inventory_id: updated.id,
            adjustment_type: 'correction',
            quantity_change: 0,
            reason: `Stock reserved for order`,
            reference_number: orderId,
            quantity_before: updated.available_quantity,
            quantity_after: updated.available_quantity,
            adjusted_by: validUserId!,
            notes: `Reserved ${item.quantity} units (reserved_quantity: ${updated.reserved_quantity - item.quantity} -> ${updated.reserved_quantity})`,
        });
    }
}

/**
 * Fulfill order inventory (decreases available_quantity AND reserved_quantity)
 * 
 * Business Logic:
 * - Called when order is shipped/fulfilled
 * - Reduces both available and reserved quantities
 * - Updates status based on new quantity
 * - Creates audit trail
 * - Validates no negative stock (unless allowed)
 * 
 * @param orderId - Order ID to fulfill
 * @param userId - User fulfilling the order
 * @param allowNegative - Whether to allow negative stock
 */
export async function fulfillOrderInventory(
    orderId: string,
    userId: string,
    allowNegative: boolean = false
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    if (!validUserId) {
        throw new Error('Valid user ID required for inventory fulfillment');
    }

    return await db.transaction(async (tx) => {
        // Dynamic import to avoid circular dependency
        const { orderItems } = await import('../../orders/shared/order-items.schema');
        const { orders } = await import('../../orders/shared/orders.schema');

        // Query layer: Get order items
        const items = await tx
            .select({
                product_id: orderItems.product_id,
                variant_id: orderItems.variant_id,
                quantity: orderItems.quantity,
                product_name: orderItems.product_name,
            })
            .from(orderItems)
            .where(eq(orderItems.order_id, orderId));

        if (items.length === 0) {
            throw new Error('No order items found');
        }

        // Query layer: Get order number for reference
        const [order] = await tx
            .select({ order_number: orders.order_number })
            .from(orders)
            .where(eq(orders.id, orderId));

        if (!order) {
            throw new Error('Order not found');
        }

        // Fulfill each item
        for (const item of items) {
            if (!item.product_id) continue;

            // Support Variant-Specific Filter
            const inventoryFilter = item.variant_id
                ? eq(inventory.variant_id, item.variant_id)
                : and(
                    eq(inventory.product_id, item.product_id),
                    isNull(inventory.variant_id)
                );

            // Query layer: Get current inventory
            const [current] = await tx
                .select()
                .from(inventory)
                .where(inventoryFilter);

            if (!current) {
                throw new Error(`Inventory not found for product ${item.product_name}`);
            }

            // Business logic: Calculate new quantity
            const quantityBefore = current.available_quantity;
            const quantityAfter = quantityBefore - item.quantity;

            // Business logic: Validate no negative stock
            if (quantityAfter < 0 && !allowNegative) {
                throw new Error(
                    `Insufficient stock for ${item.product_name}: available=${quantityBefore}, needed=${item.quantity}`
                );
            }

            if (quantityAfter < 0 && allowNegative) {
                logger.warn(`[OrderReservation] Order ${orderId} fulfillment resulted in negative stock for ${item.product_name}: ${quantityAfter}`);
            }

            // Query layer: Update inventory - reduce both available and reserved
            // PHASE 1: Also update analytics fields
            const now = new Date();
            const [updated] = await tx
                .update(inventory)
                .set({
                    available_quantity: quantityAfter,
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    status: getStatusFromQuantity(quantityAfter),

                    // PHASE 1: Analytics updates
                    total_sold: sql`${inventory.total_sold} + ${item.quantity}`,
                    total_fulfilled: sql`${inventory.total_fulfilled} + 1`,
                    last_stock_movement_at: now,
                    last_sale_at: now,

                    updated_at: now,
                    updated_by: validUserId,
                })
                .where(inventoryFilter)
                .returning();

            // Query layer: Create audit record
            await tx.insert(inventoryAdjustments).values({
                inventory_id: updated.id,
                adjustment_type: 'decrease',
                quantity_change: -item.quantity,
                reason: `Order ${order.order_number} shipped`,
                reference_number: order.order_number,
                quantity_before: quantityBefore,
                quantity_after: quantityAfter,
                adjusted_by: validUserId,
                notes: `Fulfilled ${item.quantity} units`,
            });
        }
    });
}

/**
 * Release stock reservation (decreases reserved_quantity)
 * 
 * Business Logic:
 * - Called when order is cancelled before shipment
 * - Only reduces reserved_quantity (available_quantity unchanged)
 * - Creates audit trail
 * 
 * @param orderId - Order ID to release reservation for
 * @param userId - User releasing the reservation
 */
export async function releaseReservation(
    orderId: string,
    userId: string
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    if (!validUserId) {
        throw new Error('Valid user ID required for reservation release');
    }

    return await db.transaction(async (tx) => {
        // Dynamic import to avoid circular dependency
        const { orderItems } = await import('../../orders/shared/order-items.schema');
        const { orders } = await import('../../orders/shared/orders.schema');

        // Query layer: Get order items
        const items = await tx
            .select({
                product_id: orderItems.product_id,
                variant_id: orderItems.variant_id,
                quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.order_id, orderId));

        if (items.length === 0) {
            throw new Error('No order items found');
        }

        // Query layer: Get order number
        const [order] = await tx
            .select({ order_number: orders.order_number })
            .from(orders)
            .where(eq(orders.id, orderId));

        // Release reservation for each item
        for (const item of items) {
            if (!item.product_id) continue;

            const inventoryFilter = item.variant_id
                ? eq(inventory.variant_id, item.variant_id)
                : and(
                    eq(inventory.product_id, item.product_id),
                    isNull(inventory.variant_id)
                );

            // Query layer: Get current inventory
            const [current] = await tx
                .select()
                .from(inventory)
                .where(inventoryFilter);

            if (!current) continue;

            // Query layer: Update - reduce reserved_quantity only
            // PHASE 1: Track movement timestamp
            const [updated] = await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    last_stock_movement_at: new Date(), // PHASE 1
                    updated_at: new Date(),
                    updated_by: validUserId,
                })
                .where(inventoryFilter)
                .returning();

            // Query layer: Create audit record
            await tx.insert(inventoryAdjustments).values({
                inventory_id: updated.id,
                adjustment_type: 'correction',
                quantity_change: 0,
                reason: `Order ${order?.order_number || orderId} cancelled`,
                reference_number: order?.order_number || orderId,
                quantity_before: current.available_quantity,
                quantity_after: current.available_quantity,
                adjusted_by: validUserId,
                notes: `Released ${item.quantity} units reservation`,
            });
        }
    });
}

/**
 * Process order return (restock inventory)
 * 
 * Business Logic:
 * - Called when order is returned or cancelled after shipping
 * - Increases available_quantity (restocking)
 * - Updates status based on new quantity
 * - Creates audit trail
 * - Can skip restocking if specified
 * 
 * @param orderId - Order ID to process return for
 * @param userId - User processing the return
 * @param restock - Whether to restock inventory (default: true)
 */
export async function processOrderReturn(
    orderId: string,
    userId: string,
    restock: boolean = true
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    if (!validUserId) {
        throw new Error('Valid user ID required for return processing');
    }

    return await db.transaction(async (tx) => {
        // Dynamic import to avoid circular dependency
        const { orderItems } = await import('../../orders/shared/order-items.schema');
        const { orders } = await import('../../orders/shared/orders.schema');

        // Query layer: Get order items
        const items = await tx
            .select({
                product_id: orderItems.product_id,
                variant_id: orderItems.variant_id,
                quantity: orderItems.quantity,
                product_name: orderItems.product_name,
            })
            .from(orderItems)
            .where(eq(orderItems.order_id, orderId));

        if (items.length === 0) {
            throw new Error('No order items found');
        }

        // Query layer: Get order info
        const [order] = await tx
            .select({ order_number: orders.order_number })
            .from(orders)
            .where(eq(orders.id, orderId));

        // Process each item
        for (const item of items) {
            if (!item.product_id) continue;

            const inventoryFilter = item.variant_id
                ? eq(inventory.variant_id, item.variant_id)
                : and(
                    eq(inventory.product_id, item.product_id),
                    isNull(inventory.variant_id)
                );

            // Business logic: Check if restocking is enabled
            if (restock) {
                // Query layer: Get current inventory
                const [current] = await tx
                    .select()
                    .from(inventory)
                    .where(inventoryFilter);

                if (!current) {
                    logger.warn(`[OrderReservation] Skipping return for ${item.product_name}: Inventory record not found`);
                    continue;
                }

                // Business logic: Calculate new quantity
                const quantityAfter = current.available_quantity + item.quantity;

                // Query layer: Update inventory - increase available_quantity
                const [updated] = await tx
                    .update(inventory)
                    .set({
                        available_quantity: quantityAfter,
                        status: getStatusFromQuantity(quantityAfter),
                        updated_at: new Date(),
                        updated_by: validUserId,
                    })
                    .where(inventoryFilter)
                    .returning();

                // Query layer: Create audit record
                await tx.insert(inventoryAdjustments).values({
                    inventory_id: updated.id,
                    adjustment_type: 'increase',
                    quantity_change: item.quantity,
                    reason: `Order ${order?.order_number || orderId} returned`,
                    reference_number: order?.order_number || orderId,
                    quantity_before: current.available_quantity,
                    quantity_after: quantityAfter,
                    adjusted_by: validUserId,
                    notes: `Restocked ${item.quantity} units from return`,
                });
            }
        }
    });
}

