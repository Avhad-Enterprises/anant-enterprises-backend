/**
 * Inventory Service
 *
 * Shared business logic for inventory operations.
 * 
 * Phase 1 Refactoring: Query Layer Extraction
 * - Delegated data access to query layer
 * - Focused on business logic and validation
 * - Reduced from 1,179 lines (work in progress)
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import type {
    InventoryListParams,
    InventoryWithProduct,
    AdjustInventoryDto,
    UpdateInventoryDto,
    InventoryHistoryItem,
} from '../shared/interface';
import { logger } from '../../../utils';

// Phase 1: Import query layer functions
import * as inventoryQueries from '../queries/inventory.queries';
import * as adjustmentQueries from '../queries/adjustment.queries';

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
        // Failed to resolve fallback user
    }

    return null;
}

/**
 * Get paginated list of inventory items with product details
 * 
 * Phase 1: Delegated to query layer (inventory.queries.ts)
 * Business logic: Pagination calculation and response formatting
 */
export async function getInventoryList(params: InventoryListParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    // Query layer: Data access
    const items = await inventoryQueries.findInventoryList(params);
    const total = await inventoryQueries.countInventory(params);
    
    // Business logic: Format response with pagination metadata
    return {
        items,
        total,
        page,
        limit,
    };
}

/**
 * Get single inventory item by ID with product details
 * 
 * Phase 1: Delegated to query layer
 */
export async function getInventoryById(id: string) {
    const item = await inventoryQueries.findInventoryByIdWithDetails(id);
    
    if (!item) return undefined;
    
    // Business logic: Format response
    return {
        id: item.id,
        product_id: item.variant_id || item.product_id,
        product_name: item.variant_id 
            ? `${item.product_title} - ${item.variant_option_name}: ${item.variant_option_value}`
            : item.product_title,
        sku: item.variant_sku || item.product_sku,
        location_id: item.location_id,
        available_quantity: item.available_quantity,
        reserved_quantity: item.reserved_quantity,
        incoming_quantity: item.incoming_quantity,
        incoming_po_reference: item.incoming_po_reference,
        incoming_eta: item.incoming_eta,
        condition: item.condition,
        status: item.status,
        location: item.location_name,
        updated_by: item.updated_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        thumbnail: undefined,
        category: undefined,
        brand: undefined,
        updated_by_name: undefined
    } as InventoryWithProduct;
}

/**
 * Update inventory fields (condition, location, incoming stock)
 * 
 * Phase 1: Using query layer for database operations
 */
export async function updateInventory(id: string, data: UpdateInventoryDto, updatedBy: string) {
    // Business logic: Validate and resolve user ID
    const validUserId = await resolveValidUserId(updatedBy);

    const updates: any = {
        updated_by: validUserId,
    };

    if (data.condition !== undefined) updates.condition = data.condition;
    if (data.location !== undefined) updates.location_id = data.location;
    if (data.incoming_quantity !== undefined) updates.incoming_quantity = data.incoming_quantity;
    if (data.incoming_po_reference !== undefined) updates.incoming_po_reference = data.incoming_po_reference;
    if (data.incoming_eta !== undefined) updates.incoming_eta = new Date(data.incoming_eta);

    // Query layer: Update database
    const updated = await inventoryQueries.updateInventoryById(id, updates);

    return updated;
}

/**
 * Adjust inventory quantity with audit trail
 * 
 * Phase 1: Using query layer for database operations
 * Business logic: validation, type determination, notifications
 */
export async function adjustInventory(
    id: string,
    data: AdjustInventoryDto,
    adjustedBy: string,
    allowNegative: boolean = false
) {
    // Business logic: Validate and resolve user ID
    const validUserId = await resolveValidUserId(adjustedBy);

    if (!validUserId) {
        throw new Error('Unable to resolve a valid user for audit logging.');
    }

    // Transaction: ensures consistency between inventory and adjustments
    const result = await db.transaction(async (tx) => {
        // Query layer: Get current inventory
        const current = await inventoryQueries.findInventoryById(id);

        if (!current) {
            throw new Error('Inventory item not found');
        }

        const quantityBefore = current.available_quantity;
        const quantityAfter = quantityBefore + data.quantity_change;

        // Business logic: Validate quantity constraints
        if (quantityAfter < 0 && !allowNegative) {
            throw new Error(`Resulting quantity cannot be negative (current: ${quantityBefore}, change: ${data.quantity_change})`);
        }

        if (quantityAfter < 0 && allowNegative) {
            logger.warn(`[Inventory] Item ${current.id} adjusted to negative quantity: ${quantityAfter}`);
        }

        // Business logic: Determine adjustment type
        let adjustmentType: 'increase' | 'decrease' | 'correction' | 'write-off';
        if (data.quantity_change > 0) {
            adjustmentType = 'increase';
        } else if (data.quantity_change < 0) {
            adjustmentType = 'decrease';
        } else {
            adjustmentType = 'correction';
        }

        // Query layer: Update inventory (using raw query for transaction)
        const updated = await inventoryQueries.updateInventoryById(id, {
            available_quantity: quantityAfter,
            status: getStatusFromQuantity(quantityAfter),
            updated_by: validUserId,
        });

        // Query layer: Create adjustment record
        const adjustment = await adjustmentQueries.createAdjustment({
            inventory_id: id,
            adjustment_type: adjustmentType,
            quantity_change: data.quantity_change,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            reason: data.reason,
            reference_number: data.reference_number,
            notes: data.notes,
            adjusted_by: validUserId,
        });

        return { inventory: updated, adjustment };
    });

    // Business logic: Post-transaction notifications
    try {
        const { inventory: updated } = result;

        if (updated.status === 'low_stock' || updated.status === 'out_of_stock') {
            logger.warn(`LOW STOCK ALERT: Inventory ${updated.id} is ${updated.status}`);
        }
    } catch (error) {
        logger.error('Failed to process inventory notifications', error);
    }

    return result;
}

/**
 * Get inventory adjustment history
 * 
 * Phase 1: Delegated to query layer
 */
export async function getInventoryHistory(inventoryId: string, limit: number = 50) {
    // Query layer: Fetch adjustment history
    const history = await adjustmentQueries.findAdjustmentHistory(inventoryId, limit);
    
    return history as InventoryHistoryItem[];
}

/**
 * Get inventory adjustment history by Product ID with pagination
 * 
 * Phase 1: Delegated to query layer
 * Business logic: Pagination metadata formatting
 */
export async function getInventoryHistoryByProductId(
    productId: string,
    page: number = 1,
    limit: number = 20
) {
    // Query layer: Fetch adjustment history with product details
    const items = await adjustmentQueries.findAdjustmentHistoryByProduct(productId, page, limit);
    const total = await adjustmentQueries.countAdjustmentsByProduct(productId);

    // Business logic: Format response with pagination metadata
    return {
        items: items as InventoryHistoryItem[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
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
 * Uses the default location and prevents duplicate inventory records.
 * Product name and SKU are queried via JOIN, not stored in inventory table.
 */
export async function createInventoryForProduct(
    productId: string,
    initialQuantity: number = 0,
    createdBy?: string,
    locationId?: string
) {
    // Step 1: Check if inventory already exists for this product (prevent duplicates)
    const [existing] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId))
        .limit(1);

    if (existing) {
        // Return existing inventory record instead of creating duplicate
        console.info(`[Inventory] Product ${productId} already has inventory record ${existing.id}`);
        return existing;
    }

    // Resolve valid user UUID if provided
    const validUserId = createdBy ? await resolveValidUserId(createdBy) : null;

    // Step 2: Resolve Location - Use default location first
    let targetLocationId = locationId;

    if (!targetLocationId) {
        // Find the DEFAULT location (not just any active one)
        const [defaultLocation] = await db
            .select({ id: inventoryLocations.id })
            .from(inventoryLocations)
            .where(eq(inventoryLocations.is_default, true))
            .limit(1);

        if (defaultLocation) {
            targetLocationId = defaultLocation.id;
        } else {
            // Fallback: Find first active location
            const [activeLocation] = await db
                .select({ id: inventoryLocations.id })
                .from(inventoryLocations)
                .where(eq(inventoryLocations.is_active, true))
                .limit(1);

            if (activeLocation) {
                targetLocationId = activeLocation.id;
            } else {
                // Auto-create a default location if none exists (Safety fallback)
                const [newLocation] = await db
                    .insert(inventoryLocations)
                    .values({
                        location_code: 'WH-MAIN',
                        name: 'Main Warehouse',
                        type: 'warehouse',
                        is_active: true,
                        is_default: true, // Set as default
                        created_by: validUserId,
                    })
                    .returning();

                targetLocationId = newLocation.id;
                console.warn(`[Inventory] Auto-created default location: ${newLocation.name} (${newLocation.id})`);
            }
        }
    }

    if (!targetLocationId) {
        throw new Error('No inventory location found. Please create a location first.');
    }

    // Step 3: Create inventory record
    const [created] = await db
        .insert(inventory)
        .values({
            product_id: productId,
            // Removed: product_name, sku (always JOINed from products table)
            location_id: targetLocationId,
            available_quantity: initialQuantity,
            status: getStatusFromQuantity(initialQuantity),
            condition: 'sellable',
            updated_by: validUserId,
        })
        .returning();

    // Log initial inventory creation
    if (validUserId) {
        await db.insert(inventoryAdjustments).values({
            inventory_id: created.id,
            adjustment_type: 'correction',
            quantity_change: initialQuantity,
            reason: 'Initial inventory creation',
            quantity_before: 0,
            quantity_after: initialQuantity,
            adjusted_by: validUserId,
            notes: 'System generated initial record',
        });
    }

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
                product_name: products.product_title,
            })
            .from(inventory)
            .leftJoin(products, eq(inventory.product_id, products.id))
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
 * Must be called within a transaction
 */
export async function reserveStockForOrder(
    items: Array<{ product_id: string; quantity: number }>,
    orderId: string,
    userId: string,
    allowOverselling: boolean = false
): Promise<void> {
    const validUserId = await resolveValidUserId(userId);

    return await db.transaction(async (tx) => {
        // Step 1: Validate stock availability
        const validations = await validateStockAvailability(items);
        const failures = validations.filter((v) => !v.available);

        if (failures.length > 0) {
            const messages = failures.map((f) => f.message).join('; ');
            if (!allowOverselling) {
                throw new Error(`Insufficient stock: ${messages}`);
            }
            // If overselling allowed, just log it
            console.warn(`[Inventory] Overselling allowed for order ${orderId}. Issues: ${messages}`);
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

            if (quantityAfter < 0 && !allowNegative) {
                throw new Error(
                    `Insufficient stock for ${item.product_name}: available=${quantityBefore}, needed=${item.quantity}`
                );
            }

            if (quantityAfter < 0 && allowNegative) {
                logger.warn(`[Inventory] Order ${orderId} fulfillment resulted in negative stock for ${item.product_name}: ${quantityAfter}`);
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

/**
 * Process order return (restock inventory)
 * Called when order is returned or cancelled after shipping
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

        // Get order info
        const [order] = await tx
            .select({ order_number: orders.order_number })
            .from(orders)
            .where(eq(orders.id, orderId));

        // Process each item
        for (const item of items) {
            if (!item.product_id) continue;

            if (restock) {
                // Get current inventory
                const [current] = await tx
                    .select()
                    .from(inventory)
                    .where(eq(inventory.product_id, item.product_id));

                if (!current) {
                    logger.warn(`[Inventory] Skipping return for ${item.product_name}: Inventory record not found`);
                    continue;
                }

                const quantityAfter = current.available_quantity + item.quantity;

                // Update inventory: increase available_quantity
                const [updated] = await tx
                    .update(inventory)
                    .set({
                        available_quantity: quantityAfter,
                        status: getStatusFromQuantity(quantityAfter),
                        updated_at: new Date(),
                        updated_by: validUserId,
                    })
                    .where(eq(inventory.product_id, item.product_id))
                    .returning();

                // Create adjustment record
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

        await db.transaction(async (tx) => {
            // Release from inventory
            await tx
                .update(inventory)
                .set({
                    reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${item.quantity})`,
                    updated_at: new Date(),
                })
                .where(eq(inventory.product_id, item.product_id!));

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

    console.info(`Cleaned up ${expiredItems.length} expired cart reservations`);

    return expiredItems.length;
}
