/**
 * Inventory Service
 *
 * Shared business logic for inventory operations.
 */

import { eq, and, desc, ilike, sql, count } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { products } from '../../product/shared/product.schema';
import { users } from '../../user/shared/user.schema';
import type {
    InventoryListParams,
    InventoryWithProduct,
    AdjustInventoryDto,
    UpdateInventoryDto,
    InventoryHistoryItem,
} from '../shared/interface';

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

    if (location) {
        conditions.push(ilike(inventory.location, `%${location}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(inventory)
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
            location: inventory.location,
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
            location: inventory.location,
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
        .where(eq(inventory.id, id));

    return item as InventoryWithProduct | undefined;
}

/**
 * Update inventory fields (condition, location, incoming stock)
 */
export async function updateInventory(id: string, data: UpdateInventoryDto, updatedBy: string) {
    const updates: any = {
        updated_at: new Date(),
        updated_by: updatedBy,
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

        // Update inventory
        const [updated] = await tx
            .update(inventory)
            .set({
                available_quantity: quantityAfter,
                status: getStatusFromQuantity(quantityAfter),
                updated_at: new Date(),
                updated_by: adjustedBy,
            })
            .where(eq(inventory.id, id))
            .returning();

        // Create adjustment record
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
                adjusted_by: adjustedBy,
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
    createdBy?: string
) {
    const [created] = await db
        .insert(inventory)
        .values({
            product_id: productId,
            product_name: productName,
            sku: sku,
            available_quantity: initialQuantity,
            status: getStatusFromQuantity(initialQuantity),
            condition: 'sellable',
            updated_by: createdBy,
        })
        .returning();

    return created;
}
