/**
 * Inventory Service
 *
 * Shared business logic for inventory operations.
 */

import { eq, and, desc, ilike, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import { logger } from '../../../utils';
import type {
    InventoryListParams,
    InventoryWithProduct,
    AdjustInventoryDto,
    UpdateInventoryDto,
    InventoryHistoryItem,
} from '../shared/interface';
import { logger } from 'src/utils';

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
 * Cache for system user ID to avoid repeated database lookups
 */
let cachedSystemUserId: string | null = null;

/**
 * Get a valid user UUID for audit logging.
 * If the provided userId is invalid, falls back to the first admin user in the database.
 */
async function resolveValidUserId(userId: string | null | undefined): Promise<string | null> {
    // If valid UUID, use it
    if (isValidUUID(userId)) {
        return userId!;
    }

    // Return cached system user if available
    if (cachedSystemUserId) {
        return cachedSystemUserId;
    }

    // Fallback: find a valid admin user from the database
    try {
        const [fallbackUser] = await db
            .select({ id: users.id })
            .from(users)
            .limit(1);

        if (fallbackUser?.id) {
            cachedSystemUserId = fallbackUser.id;
            return cachedSystemUserId;
        }
    } catch (error) {
        console.error('Failed to resolve fallback user:', error);
    }

    return null;
}

/**
 * Get paginated list of inventory items with product details
 */
export async function getInventoryList(params: InventoryListParams) {
    const { page = 1, limit = 20, search, condition, status, location } = params;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (search) {
        conditions.push(
            sql`(${inventory.product_name} ILIKE ${`%${search}%`} OR ${inventory.sku} ILIKE ${`%${search}%`})`
        );
    }

    if (condition) {
        conditions.push(eq(inventory.condition, condition as any));
    }

    if (status) {
        conditions.push(eq(inventory.status, status as any));
    }

    // TODO: location filter requires location_id (UUID) instead of location name
    // Admin panel currently sends location names, need locations API first
    // if (location) {
    //     conditions.push(eq(inventory.location_id, location));
    // }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(inventory)
        .leftJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .where(whereClause);

    const total = countResult?.total ?? 0;

    // Get items with product join
    const items = await db
        .select({
            id: inventory.id,
            product_id: inventory.product_id,
            product_name: inventory.product_name,
            sku: inventory.sku,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity,
            incoming_quantity: inventory.incoming_quantity,
            incoming_po_reference: inventory.incoming_po_reference,
            incoming_eta: inventory.incoming_eta,
            condition: inventory.condition,
            status: inventory.status,
            location_id: inventory.location_id, // Changed from inventory.location
            updated_by: inventory.updated_by,
            created_at: inventory.created_at,
            updated_at: inventory.updated_at,
            // Join product for thumbnail (category/brand not in products schema)
            thumbnail: products.primary_image_url,
            category: sql<string | null>`NULL::text`,
            brand: sql<string | null>`NULL::text`,
        })
        .from(inventory)
        .leftJoin(products, eq(inventory.product_id, products.id))
        .leftJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .where(whereClause)
        .orderBy(desc(inventory.updated_at))
        .limit(limit)
        .offset(offset);

    return {
        items: items as InventoryWithProduct[],
        total,
        page,
        limit,
    };
}

/**
 * Get single inventory item by ID with product details
 */
export async function getInventoryById(id: string) {
    const [item] = await db
        .select({
            id: inventory.id,
            product_id: inventory.product_id,
            product_name: inventory.product_name,
            sku: inventory.sku,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity,
            incoming_quantity: inventory.incoming_quantity,
            incoming_po_reference: inventory.incoming_po_reference,
            incoming_eta: inventory.incoming_eta,
            condition: inventory.condition,
            status: inventory.status,
            location_id: inventory.location_id, // Changed from inventory.location
            updated_by: inventory.updated_by,
            created_at: inventory.created_at,
            updated_at: inventory.updated_at,
            thumbnail: products.primary_image_url,
            category: sql<string | null>`NULL::text`,
            brand: sql<string | null>`NULL::text`,
            updated_by_name: users.name,
        })
        .from(inventory)
        .leftJoin(products, eq(inventory.product_id, products.id))
        .leftJoin(users, eq(inventory.updated_by, users.id))
        .leftJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .where(eq(inventory.id, id));

    return item as InventoryWithProduct | undefined;
}

/**
 * Update inventory fields (condition, location, incoming stock)
 */
export async function updateInventory(id: string, data: UpdateInventoryDto, updatedBy: string) {
    // Resolve valid user UUID (handles 'system' or invalid strings)
    const validUserId = await resolveValidUserId(updatedBy);

    const updates: any = {
        updated_at: new Date(),
        updated_by: validUserId, // Can be null if no valid user found (nullable column)
    };

    if (data.condition !== undefined) updates.condition = data.condition;
    if (data.location !== undefined) updates.location = data.location;
    if (data.incoming_quantity !== undefined) updates.incoming_quantity = data.incoming_quantity;
    if (data.incoming_po_reference !== undefined) updates.incoming_po_reference = data.incoming_po_reference;
    if (data.incoming_eta !== undefined) updates.incoming_eta = new Date(data.incoming_eta);

    const [updated] = await db
        .update(inventory)
        .set(updates)
        .where(eq(inventory.id, id))
        .returning();

    return updated;
}

/**
 * Adjust inventory quantity with audit trail
 */
export async function adjustInventory(id: string, data: AdjustInventoryDto, adjustedBy: string) {
    // Resolve valid user UUID (handles 'system' or invalid strings)
    const validUserId = await resolveValidUserId(adjustedBy);

    if (!validUserId) {
        throw new Error('Unable to resolve a valid user for audit logging. Please ensure at least one user exists in the database.');
    }

    return await db.transaction(async (tx) => {
        // Get current inventory
        const [current] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.id, id));

        if (!current) {
            throw new Error('Inventory item not found');
        }

        const quantityBefore = current.available_quantity;
        const quantityAfter = quantityBefore + data.quantity_change;

        if (quantityAfter < 0) {
            throw new Error('Resulting quantity cannot be negative');
        }

        // Determine adjustment type
        let adjustmentType: 'increase' | 'decrease' | 'correction' | 'write-off';
        if (data.quantity_change > 0) {
            adjustmentType = 'increase';
        } else if (data.quantity_change < 0) {
            adjustmentType = 'decrease';
        } else {
            adjustmentType = 'correction';
        }

        // Update inventory - updated_by can be null (nullable column)
        const [updated] = await tx
            .update(inventory)
            .set({
                available_quantity: quantityAfter,
                status: getStatusFromQuantity(quantityAfter),
                updated_at: new Date(),
                updated_by: validUserId,
            })
            .where(eq(inventory.id, id))
            .returning();

        // Create adjustment record - adjusted_by is NOT NULL so we use validUserId
        const [adjustment] = await tx
            .insert(inventoryAdjustments)
            .values({
                inventory_id: id,
                adjustment_type: adjustmentType,
                quantity_change: data.quantity_change,
                reason: data.reason,
                reference_number: data.reference_number,
                quantity_before: quantityBefore,
                quantity_after: quantityAfter,
                adjusted_by: validUserId,
                notes: data.notes,
            })
            .returning();

        return { inventory: updated, adjustment };
    });
}

/**
 * Get inventory adjustment history
 */
export async function getInventoryHistory(inventoryId: string, limit: number = 50) {
    const history = await db
        .select({
            id: inventoryAdjustments.id,
            adjustment_type: inventoryAdjustments.adjustment_type,
            quantity_change: inventoryAdjustments.quantity_change,
            reason: inventoryAdjustments.reason,
            reference_number: inventoryAdjustments.reference_number,
            quantity_before: inventoryAdjustments.quantity_before,
            quantity_after: inventoryAdjustments.quantity_after,
            adjusted_by: inventoryAdjustments.adjusted_by,
            adjusted_at: inventoryAdjustments.adjusted_at,
            notes: inventoryAdjustments.notes,
            adjusted_by_name: users.name,
        })
        .from(inventoryAdjustments)
        .leftJoin(users, eq(inventoryAdjustments.adjusted_by, users.id))
        .where(eq(inventoryAdjustments.inventory_id, inventoryId))
        .orderBy(desc(inventoryAdjustments.adjusted_at))
        .limit(limit);

    return history as InventoryHistoryItem[];
}

/**
 * Helper: Determine status from quantity
 */
function getStatusFromQuantity(quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= 10) return 'low_stock';
    return 'in_stock';
}

/**
 * Create inventory entry for a product
 */
export async function createInventoryForProduct(
    productId: string,
    productName: string,
    sku: string,
    initialQuantity: number = 0,
    createdBy?: string,
    locationId?: string
) {
    // Resolve valid user UUID if provided
    const validUserId = createdBy ? await resolveValidUserId(createdBy) : null;

    // If no location provided, get the first active location from database
    let resolvedLocationId = locationId;
    if (!resolvedLocationId) {
        const { inventoryLocations } = await import('../shared/inventory-locations.schema');
        // Get first active location (no is_default column exists)
        const [activeLocation] = await db
            .select({ id: inventoryLocations.id })
            .from(inventoryLocations)
            .where(eq(inventoryLocations.is_active, true))
            .limit(1);

        if (activeLocation) {
            resolvedLocationId = activeLocation.id;
        } else {
            // If no active location, get any location
            const [anyLocation] = await db
                .select({ id: inventoryLocations.id })
                .from(inventoryLocations)
                .limit(1);

            if (!anyLocation) {
                throw new Error('No inventory location found. Please create a location first.');
            }
            resolvedLocationId = anyLocation.id;
        }
    }

    const [created] = await db
        .insert(inventory)
        .values({
            product_id: productId,
            location_id: defaultLocation.id,
            product_name: productName,
            sku: sku,
            location_id: resolvedLocationId,
            available_quantity: initialQuantity,
            status: getStatusFromQuantity(initialQuantity),
            condition: 'sellable',
            updated_by: validUserId,
        })
        .returning();

    return created;
}

// ============================================
// ORDER-INVENTORY INTEGRATION
// ============================================

/**
 * Validate if stock is available for given products
 * @returns Array of validation results
 */
export async function validateStockAvailability(
    items: Array<{ product_id: string; quantity: number }>
): Promise<import('../shared/interface').StockValidationResult[]> {
    const results: import('../shared/interface').StockValidationResult[] = [];

    for (const item of items) {
        const [stock] = await db
            .select({
                product_id: inventory.product_id,
                available_quantity: inventory.available_quantity,
                reserved_quantity: inventory.reserved_quantity,
                product_name: inventory.product_name,
            })
            .from(inventory)
            .where(eq(inventory.product_id, item.product_id));

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

        const actuallyAvailable = stock.available_quantity - stock.reserved_quantity;
        const isAvailable = actuallyAvailable >= item.quantity;

        results.push({
            available: isAvailable,
            product_id: item.product_id,
            requested_quantity: item.quantity,
            available_quantity: stock.available_quantity,
            reserved_quantity: stock.reserved_quantity,
            product_name: stock.product_name,
            message: isAvailable
                ? undefined
                : `${stock.product_name}: Only ${actuallyAvailable} units available (requested ${item.quantity})`,
        });
    }

    return results;
}

/**
 * Reserve stock for an order (increases reserved_quantity)
 * Must be called within a transaction
 */
export async function reserveStockForOrder(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string,
    userId: string
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    return await db.transaction(async (tx) => {
        // Step 1: Validate stock availability
        const validations = await validateStockAvailability(items);
        const failures = validations.filter((v) => !v.available);

        if (failures.length > 0) {
            const messages = failures.map((f) => f.message).join('; ');
            throw new Error(`Insufficient stock: ${messages}`);
        }

        // Step 2: Reserve stock for each item
        for (const item of items) {
            const [updated] = await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`${inventory.reserved_quantity} + ${item.quantity}`,
                    updated_at: new Date(),
                    updated_by: validUserId,
                })
                .where(eq(inventory.product_id, item.product_id))
                .returning();

            if (!updated) {
                throw new Error(`Failed to reserve stock for product ${item.product_id}`);
            }

            // Create audit record
            await tx.insert(inventoryAdjustments).values({
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
    });
}

/**
 * Fulfill order inventory (decreases available_quantity AND reserved_quantity)
 * Called when order is shipped
 */
export async function fulfillOrderInventory(
    orderId: string,
    userId: string
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    if (!validUserId) {
        throw new Error('Valid user ID required for inventory fulfillment');
    }

    return await db.transaction(async (tx) => {
        // Dynamic import to avoid circular dependency
        const { orderItems } = await import('../../orders/shared/order-items.schema');
        const { orders } = await import('../../orders/shared/orders.schema');

        // Get order items
        const items = await tx
            .select({
                product_id: orderItems.product_id,
                quantity: orderItems.quantity,
                product_name: orderItems.product_name,
            })
            .from(orderItems)
            .where(eq(orderItems.order_id, orderId));

        if (items.length === 0) {
            throw new Error('No order items found');
        }

        // Get order number for reference
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

            // Get current inventory
            const [current] = await tx
                .select()
                .from(inventory)
                .where(eq(inventory.product_id, item.product_id));

            if (!current) {
                throw new Error(`Inventory not found for product ${item.product_name}`);
            }

            const quantityBefore = current.available_quantity;
            const quantityAfter = quantityBefore - item.quantity;

            if (quantityAfter < 0) {
                throw new Error(
                    `Insufficient stock for ${item.product_name}: available=${quantityBefore}, needed=${item.quantity}`
                );
            }

            // Update inventory: reduce both available and reserved
            const [updated] = await tx
                .update(inventory)
                .set({
                    available_quantity: quantityAfter,
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    status: getStatusFromQuantity(quantityAfter),
                    updated_at: new Date(),
                    updated_by: validUserId,
                })
                .where(eq(inventory.product_id, item.product_id))
                .returning();

            // Create adjustment record
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
 * Called when order is cancelled before shipment
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

        // Get order items
        const items = await tx
            .select({
                product_id: orderItems.product_id,
                quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.order_id, orderId));

        if (items.length === 0) {
            throw new Error('No order items found');
        }

        // Get order number
        const [order] = await tx
            .select({ order_number: orders.order_number })
            .from(orders)
            .where(eq(orders.id, orderId));

        // Release reservation for each item
        for (const item of items) {
            if (!item.product_id) continue;

            const [current] = await tx
                .select()
                .from(inventory)
                .where(eq(inventory.product_id, item.product_id));

            if (!current) continue;

            // Update: reduce reserved_quantity only
            const [updated] = await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    updated_at: new Date(),
                    updated_by: validUserId,
                })
                .where(eq(inventory.product_id, item.product_id))
                .returning();

            // Create adjustment record
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

// ============================================
// CART RESERVATION SYSTEM (Phase 2)
// ============================================

/**
 * Reserve stock for a cart item (with timeout)
 * @param productId - Product to reserve
 * @param quantity - Quantity to reserve
 * @param cartItemId - Cart item ID for tracking
 * @param expirationMinutes - Timeout in minutes (default: 30)
 */
export async function reserveCartStock(
    productId: string,
    quantity: number,
    cartItemId: string,
    expirationMinutes: number = 30
): Promise<{ reservation_id: string; expires_at: Date }> {
    return await db.transaction(async (tx) => {
        // Step 1: Validate stock availability
        const validations = await validateStockAvailability([{ product_id: productId, quantity }]);
        const [validation] = validations;

        if (!validation.available) {
            throw new Error(validation.message || 'Insufficient stock');
        }

        // Step 2: Reserve stock
        await tx
            .update(inventory)
            .set({
                reserved_quantity: sql`${inventory.reserved_quantity} + ${quantity}`,
                updated_at: new Date(),
            })
            .where(eq(inventory.product_id, productId));

        // Step 3: Create reservation record in cart_items
        const reservationId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

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
 * @param cartItemId - Cart item ID
 */
export async function releaseCartStock(cartItemId: string): Promise<void> {
    return await db.transaction(async (tx) => {
        const { cartItems } = await import('../../cart/shared/cart-items.schema');

        // Get cart item with reservation
        const [item] = await tx
            .select({
                product_id: cartItems.product_id,
                quantity: cartItems.quantity,
                reservation_id: cartItems.reservation_id,
            })
            .from(cartItems)
            .where(eq(cartItems.id, cartItemId));

        if (!item || !item.product_id || !item.reservation_id) {
            return; // Nothing to release
        }

        // Release reservation
        await tx
            .update(inventory)
            .set({
                reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                updated_at: new Date(),
            })
            .where(eq(inventory.product_id, item.product_id));

        // Clear reservation fields
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
 * @param cartId - Cart ID
 * @param additionalMinutes - Time to extend (default: 60 for checkout)
 */
export async function extendCartReservation(
    cartId: string,
    additionalMinutes: number = 60
): Promise<void> {
    const { cartItems } = await import('../../cart/shared/cart-items.schema');

    const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

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
 * Returns count of cleaned up items
 */
export async function cleanupExpiredCartReservations(): Promise<number> {
    const { cartItems } = await import('../../cart/shared/cart-items.schema');

    // Find expired items
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
        const productId = item.product_id; // TypeScript narrows this to string

        await db.transaction(async (tx) => {
            // Release from inventory
            await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    updated_at: new Date(),
                })
                .where(eq(inventory.product_id, productId));

            // Clear reservation from cart item
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

    logger.info(`Cleaned up ${expiredItems.length} expired cart reservations`);
    return expiredItems.length;
}
