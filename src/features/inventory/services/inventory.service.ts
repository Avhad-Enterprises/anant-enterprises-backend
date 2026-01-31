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

import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { inventoryLocations } from '../shared/inventory-locations.schema';
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
 * Helper: Resolve location ID for inventory
 * Uses default location, or creates one if none exists
 */
async function resolveLocationForInventory(locationId?: string, createdBy?: string): Promise<string> {
    if (locationId) return locationId;

    // Find the DEFAULT location
    const [defaultLocation] = await db
        .select({ id: inventoryLocations.id })
        .from(inventoryLocations)
        .where(eq(inventoryLocations.is_default, true))
        .limit(1);

    if (defaultLocation) return defaultLocation.id;

    // Fallback: First active location
    const [activeLocation] = await db
        .select({ id: inventoryLocations.id })
        .from(inventoryLocations)
        .where(eq(inventoryLocations.is_active, true))
        .limit(1);

    if (activeLocation) return activeLocation.id;

    // Auto-create default location (safety fallback)
    const validUserId = createdBy ? await resolveValidUserId(createdBy) : null;
    const [newLocation] = await db
        .insert(inventoryLocations)
        .values({
            location_code: 'WH-MAIN',
            name: 'Main Warehouse',
            type: 'warehouse',
            is_active: true,
            is_default: true,
            created_by: validUserId,
        })
        .returning();

    logger.warn(`[Inventory] Auto-created default location: ${newLocation.name} (${newLocation.id})`);
    return newLocation.id;
}

/**
 * Create inventory entry for a product
 * 
 * Phase 2: Uses query layer and extracted location helper
 * Prevents duplicate inventory records, auto-resolves location
 */
export async function createInventoryForProduct(
    productId: string,
    initialQuantity: number = 0,
    createdBy?: string,
    locationId?: string,
    variantId?: string
) {
    // Query layer: Check for existing inventory
    // If variantId provided, check by variant. Otherwise check by product.
    const existing = variantId 
        ? await inventoryQueries.findInventoryByVariant(variantId)
        : await inventoryQueries.findInventoryByProduct(productId);
    
    if (existing.length > 0) {
        logger.info(`[Inventory] ${variantId ? 'Variant ' + variantId : 'Product ' + productId} already has inventory record ${existing[0].id}`);
        return existing[0];
    }

    // Business logic: Resolve location and user
    const targetLocationId = await resolveLocationForInventory(locationId, createdBy);
    const validUserId = createdBy ? await resolveValidUserId(createdBy) : null;

    // Query layer: Create inventory
    const created = await inventoryQueries.createInventory({
        // Respect XOR constraint: Mutually exclusive product_id and variant_id
        product_id: variantId ? undefined : productId,
        variant_id: variantId,
        location_id: targetLocationId,
        available_quantity: initialQuantity,
        status: getStatusFromQuantity(initialQuantity),
        condition: 'sellable',
        updated_by: validUserId || undefined,
    });

    // Create audit trail if user provided
    if (validUserId) {
        await adjustmentQueries.createAdjustment({
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
// RE-EXPORTS FROM DOMAIN SERVICES (Phase 2)
// ============================================

/**
 * Phase 2 Refactoring: Order and Cart operations extracted to separate services
 * Re-exported here for backward compatibility with existing APIs
 */

// Order Reservation Service
export {
    validateStockAvailability,
    reserveStockForOrder,
    fulfillOrderInventory,
    releaseReservation,
    processOrderReturn,
    logOrderPlacement,
} from './order-reservation.service';


// Cart Reservation Service
export {
    reserveCartStock,
    releaseCartStock,
    extendCartReservation,
    cleanupExpiredCartReservations,
} from './cart-reservation.service';
