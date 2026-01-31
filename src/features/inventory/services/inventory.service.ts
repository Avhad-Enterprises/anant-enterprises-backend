/**
 * Inventory Service
 *
 * Shared business logic for inventory operations.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { products, productVariants } from '../../product/shared/product.schema';
// REMOVED: variantInventoryAdjustments (Phase 2A - unified into inventory table)
import { users } from '../../user/shared/user.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import type {
    InventoryListParams,
    InventoryWithProduct,
    AdjustInventoryDto,
    UpdateInventoryDto,
    InventoryHistoryItem,
} from '../shared/interface';
// // import { notificationService } from '../../notifications/services/notification.service';
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
 */
/**
 * Get paginated list of inventory items with product details (Unified: Base + Variants)
 */
export async function getInventoryList(params: InventoryListParams) {
    const { page = 1, limit = 20, search, condition, status, location: locationName, category, quickFilter, startDate, endDate } = params;
    const offset = (page - 1) * limit;

    // Helper to build search clause
    const searchClause = search ? `%${search}%` : null;
    const locationClause = locationName ? `%${locationName}%` : null;

    // Helper to build date range clause
    const startDateDate = startDate ? new Date(startDate) : null;
    const endDateDate = endDate ? new Date(endDate) : null;

    // 3. Dynamic Store/Order configuration
    // 3. Dynamic Store/Order configuration
    // Default sort: updated_at DESC
    let orderByClause = sql`updated_at DESC`;

    if (params.sortBy) {
        const direction = params.sortOrder === 'asc' ? sql`ASC` : sql`DESC`;

        switch (params.sortBy) {
            case 'product_name':
            case 'productName':
            case 'productname':
                orderByClause = sql`product_name ${direction}`;
                break;
            case 'available_quantity':
            case 'available':
            case 'availablequantity':
                orderByClause = sql`available_quantity ${direction}`;
                break;
            case 'last_updated':
            case 'lastUpdated':
            case 'lastupdated':
            case 'updated_at':
                orderByClause = sql`updated_at ${direction}`;
                break;
            case 'reserved_quantity':
            case 'committed':
            case 'reservedquantity':
                orderByClause = sql`reserved_quantity ${direction}`;
                break;
        }
    }

    // Phase 2A: Unified query for products AND variants (via inventory.variant_id)
    // Both products and variants are now tracked in the inventory table
    const query = sql`
        SELECT
            i.id,
            CASE 
                WHEN i.variant_id IS NOT NULL THEN i.variant_id
                ELSE i.product_id
            END as product_id,
            CASE
                WHEN i.variant_id IS NOT NULL THEN CONCAT(p.product_title, ' - ', pv.option_name, ': ', pv.option_value)
                ELSE p.product_title
            END as product_name,
            CASE
                WHEN i.variant_id IS NOT NULL THEN pv.sku
                ELSE p.sku
            END as sku,
            i.location_id,
            i.available_quantity,
            i.reserved_quantity,
            i.incoming_quantity,
            i.incoming_po_reference,
            i.incoming_eta,
            i.condition::text as condition,
            i.status::text as status,
            il.name as location_name,
            t.name as category_name,
            i.updated_by,
            i.created_at,
            i.updated_at,
            CASE
                WHEN i.variant_id IS NOT NULL THEN COALESCE(pv.thumbnail_url, p.primary_image_url)
                ELSE p.primary_image_url
            END as thumbnail,
            CASE 
                WHEN i.variant_id IS NOT NULL THEN 'Variant'
                ELSE 'Base'
            END as type
        FROM ${inventory} i
        LEFT JOIN ${products} p ON i.product_id = p.id OR (i.variant_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM ${productVariants} WHERE id = i.variant_id AND product_id = p.id
        ))
        LEFT JOIN ${productVariants} pv ON i.variant_id = pv.id
        LEFT JOIN ${tiers} t ON p.category_tier_1 = t.id
        LEFT JOIN ${inventoryLocations} il ON i.location_id = il.id
        WHERE 1=1
        ${search ? sql`AND (p.product_title ILIKE ${searchClause} OR p.sku ILIKE ${searchClause} OR pv.sku ILIKE ${searchClause})` : sql``}
        ${condition ? sql`AND i.condition = ${condition}` : sql``}
        ${status ? sql`AND i.status = ${status}` : sql``}
        ${locationName ? sql`AND il.name ILIKE ${locationClause}` : sql``}
        ${category ? sql`AND t.id = ${category}` : sql``}
        ${startDateDate ? sql`AND i.updated_at >= ${startDateDate}` : sql``}
        ${endDateDate ? sql`AND i.updated_at <= ${endDateDate}` : sql``}
        ${quickFilter === 'low-stock' ? sql`AND i.available_quantity <= 10 AND i.available_quantity > 0` : sql``}
        ${quickFilter === 'zero-available' ? sql`AND i.available_quantity = 0` : sql``}
        ${quickFilter === 'blocked' ? sql`AND i.reserved_quantity > 0` : sql``}
        ${quickFilter === 'recently-updated' ? sql`AND i.updated_at >= (NOW() - INTERVAL '24 HOURS')` : sql``}
        ORDER BY ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await db.execute(query);

    // Phase 2A: Simplified count query (no UNION needed)
    const countQuery = sql`
        SELECT COUNT(*) as total
        FROM ${inventory} i
        LEFT JOIN ${products} p ON i.product_id = p.id OR (i.variant_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM ${productVariants} WHERE id = i.variant_id AND product_id = p.id
        ))
        LEFT JOIN ${productVariants} pv ON i.variant_id = pv.id
        LEFT JOIN ${tiers} t ON p.category_tier_1 = t.id
        LEFT JOIN ${inventoryLocations} il ON i.location_id = il.id
        WHERE 1=1
        ${search ? sql`AND (p.product_title ILIKE ${searchClause} OR p.sku ILIKE ${searchClause} OR pv.sku ILIKE ${searchClause})` : sql``}
        ${condition ? sql`AND i.condition = ${condition}` : sql``}
        ${status ? sql`AND i.status = ${status}` : sql``}
        ${locationName ? sql`AND il.name ILIKE ${locationClause}` : sql``}
        ${category ? sql`AND t.id = ${category}` : sql``}
        ${startDateDate ? sql`AND i.updated_at >= ${startDateDate}` : sql``}
        ${endDateDate ? sql`AND i.updated_at <= ${endDateDate}` : sql``}
        ${quickFilter === 'low-stock' ? sql`AND i.available_quantity <= 10 AND i.available_quantity > 0` : sql``}
        ${quickFilter === 'zero-available' ? sql`AND i.available_quantity = 0` : sql``}
        ${quickFilter === 'blocked' ? sql`AND i.reserved_quantity > 0` : sql``}
        ${quickFilter === 'recently-updated' ? sql`AND i.updated_at >= (NOW() - INTERVAL '24 HOURS')` : sql``}
    `;

    const countResult = await db.execute(countQuery);
    const total = Number(countResult.rows[0]?.total || 0);

    // Map result to match interface (handling any raw SQL quirks)
    const items = result.rows.map(row => ({
        id: row.id,
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku,
        location_id: row.location_id,
        available_quantity: row.available_quantity,
        reserved_quantity: row.reserved_quantity,
        incoming_quantity: row.incoming_quantity,
        incoming_po_reference: row.incoming_po_reference,
        incoming_eta: row.incoming_eta ? new Date(row.incoming_eta as string) : undefined,
        condition: row.condition,
        status: row.status,
        location: row.location_name,
        updated_by: row.updated_by,
        created_at: new Date(row.created_at as string),
        updated_at: new Date(row.updated_at as string),
        thumbnail: row.thumbnail,
        type: row.type, // Pass the type (Base/Variant) to frontend
        category: row.category_name,
        brand: undefined
    }));

    return {
        items: items as unknown as InventoryWithProduct[],
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
            product_name: products.product_title, // Use fresh name from products
            sku: products.sku,                    // Use fresh SKU from products
            location_id: inventory.location_id,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity,
            incoming_quantity: inventory.incoming_quantity,
            incoming_po_reference: inventory.incoming_po_reference,
            incoming_eta: inventory.incoming_eta,
            condition: inventory.condition,
            status: inventory.status,
            location: inventoryLocations.name,
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
    // Phase 3: location is now location_id (UUID)
    if (data.location !== undefined) updates.location_id = data.location;
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
/**
 * Adjust inventory quantity with audit trail
 */
export async function adjustInventory(
    id: string,
    data: AdjustInventoryDto,
    adjustedBy: string,
    allowNegative: boolean = false
) {
    // Resolve valid user UUID (handles 'system' or invalid strings)
    const validUserId = await resolveValidUserId(adjustedBy);

    if (!validUserId) {
        throw new Error('Unable to resolve a valid user for audit logging.');
    }

    const result = await db.transaction(async (tx) => {
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

        if (quantityAfter < 0 && !allowNegative) {
            throw new Error(`Resulting quantity cannot be negative (current: ${quantityBefore}, change: ${data.quantity_change})`);
        }

        if (quantityAfter < 0 && allowNegative) {
            logger.warn(`[Inventory] Item ${current.id} adjusted to negative quantity: ${quantityAfter}`);
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

    // Post-transaction notifications
    try {
        const { inventory: updated } = result;

        // Check for Low Stock Alert
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
 * Get inventory adjustment history by Product ID with pagination
 * Phase 2A: Unified system - both products and variants use inventory_adjustments table
 */
export async function getInventoryHistoryByProductId(
    productId: string,
    page: number = 1,
    limit: number = 20
) {
    const offset = (page - 1) * limit;

    // Phase 2A: Single unified query - variants are tracked via inventory.variant_id
    const query = sql`
        SELECT
            ia.id,
            ia.adjustment_type,
            ia.quantity_change,
            ia.reason,
            ia.reference_number,
            ia.quantity_before,
            ia.quantity_after,
            ia.adjusted_by,
            ia.adjusted_at,
            ia.notes,
            CASE
                WHEN i.variant_id IS NOT NULL THEN CONCAT('Variant: ', pv.option_name, ' - ', pv.option_value)
                ELSE 'Base Product'
            END as target_name,
            CASE
                WHEN i.variant_id IS NOT NULL THEN pv.sku
                ELSE i.sku
            END as variant_sku,
            u.name as adjusted_by_name
        FROM ${inventoryAdjustments} ia
        JOIN ${inventory} i ON ia.inventory_id = i.id
        LEFT JOIN ${productVariants} pv ON i.variant_id = pv.id
        LEFT JOIN ${users} u ON ia.adjusted_by = u.id
        WHERE (i.product_id = ${productId} OR (i.variant_id IS NOT NULL AND pv.product_id = ${productId}))
        ORDER BY ia.adjusted_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await db.execute(query);

    // Get total count
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryAdjustments)
        .innerJoin(inventory, eq(inventoryAdjustments.inventory_id, inventory.id))
        .leftJoin(productVariants, eq(inventory.variant_id, productVariants.id))
        .where(sql`(${inventory.product_id} = ${productId} OR (${inventory.variant_id} IS NOT NULL AND ${productVariants.product_id} = ${productId}))`);

    const total = Number(countResult?.count ?? 0);

    const items = result.rows.map((row: any) => ({
        ...row,
        // Ensure timestamp is treated as UTC
        adjusted_at: typeof row.adjusted_at === 'string' && !row.adjusted_at.endsWith('Z')
            ? new Date(row.adjusted_at + 'Z')
            : new Date(row.adjusted_at)
    }));

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
