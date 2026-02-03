/**
 * Inventory Queries
 * 
 * Pure data access layer for inventory table operations.
 * No business logic - just database queries.
 * 
 * Phase 1: Query Layer Extraction
 * Extracted from inventory.service.ts (1,179 lines → query layer)
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { products } from '../../product/shared/products.schema';
import { productVariants } from '../../product/shared/product-variants.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import type { InventoryListParams, InventoryWithProduct } from '../shared/interface';

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Find inventory record by ID
 */
export async function findInventoryById(id: string) {
    const [result] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, id));
    
    return result;
}

/**
 * Find inventory record by product ID (base product)
 */
export async function findInventoryByProduct(productId: string) {
    return db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId));
}

/**
 * Find inventory record by variant ID
 */
export async function findInventoryByVariant(variantId: string) {
    return db
        .select()
        .from(inventory)
        .where(eq(inventory.variant_id, variantId));
}

/**
 * Find inventory record by product and location
 */
export async function findInventoryByProductAndLocation(
    productId: string,
    locationId: string
) {
    const [result] = await db
        .select()
        .from(inventory)
        .where(
            and(
                eq(inventory.product_id, productId),
                eq(inventory.location_id, locationId)
            )
        );
    
    return result;
}

/**
 * Find inventory record by variant and location
 */
export async function findInventoryByVariantAndLocation(
    variantId: string,
    locationId: string
) {
    const [result] = await db
        .select()
        .from(inventory)
        .where(
            and(
                eq(inventory.variant_id, variantId),
                eq(inventory.location_id, locationId)
            )
        );
    
    return result;
}

/**
 * Get paginated inventory list with complex filtering
 * Supports products and variants (unified via inventory.variant_id)
 */
export async function findInventoryList(params: InventoryListParams) {
    const {
        page = 1,
        limit = 20,
        search,
        condition,
        status,
        location: locationName,
        category,
        quickFilter,
        startDate,
        endDate,
        sortBy,
        sortOrder
    } = params;
    
    const offset = (page - 1) * limit;
    
    // Build search clauses
    const searchClause = search ? `%${search}%` : null;
    const locationClause = locationName ? `%${locationName}%` : null;
    
    // Build date range
    const startDateDate = startDate ? new Date(startDate) : null;
    const endDateDate = endDate ? new Date(endDate) : null;
    
    // Build order by clause
    let orderByClause = sql`updated_at DESC`;
    
    if (sortBy) {
        const direction = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;
        
        switch (sortBy) {
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
    
    // Main query: Unified products + variants
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
        AND p.status != 'archived'
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
    
    // Map raw results to interface
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
        type: row.type,
        category: row.category_name,
        brand: undefined
    }));
    
    return items as unknown as InventoryWithProduct[];
}

/**
 * Count inventory records with same filters as findInventoryList
 */
export async function countInventory(params: InventoryListParams): Promise<number> {
    const {
        search,
        condition,
        status,
        location: locationName,
        category,
        quickFilter,
        startDate,
        endDate
    } = params;
    
    const searchClause = search ? `%${search}%` : null;
    const locationClause = locationName ? `%${locationName}%` : null;
    const startDateDate = startDate ? new Date(startDate) : null;
    const endDateDate = endDate ? new Date(endDate) : null;
    
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
        AND p.status != 'archived'
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
    return Number(countResult.rows[0]?.total || 0);
}

/**
 * Get inventory by ID with full details (including product/variant info)
 */
export async function findInventoryByIdWithDetails(id: string) {
    const result = await db
        .select({
            id: inventory.id,
            product_id: inventory.product_id,
            variant_id: inventory.variant_id,
            location_id: inventory.location_id,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity,
            incoming_quantity: inventory.incoming_quantity,
            incoming_po_reference: inventory.incoming_po_reference,
            incoming_eta: inventory.incoming_eta,
            condition: inventory.condition,
            status: inventory.status,
            created_at: inventory.created_at,
            updated_at: inventory.updated_at,
            created_by: inventory.created_by,
            updated_by: inventory.updated_by,
            // Location details
            location_name: inventoryLocations.name,
            location_code: inventoryLocations.location_code,
            // Product details
            product_title: products.product_title,
            product_sku: products.sku,
            // Variant details  
            variant_sku: productVariants.sku,
            variant_option_name: productVariants.option_name,
            variant_option_value: productVariants.option_value,
        })
        .from(inventory)
        .leftJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .leftJoin(products, eq(inventory.product_id, products.id))
        .leftJoin(productVariants, eq(inventory.variant_id, productVariants.id))
        .where(
            and(
                eq(inventory.id, id),
                sql`${products.status} != 'archived'`
            )
        );
    
    return result[0];
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create new inventory record
 */
export async function createInventory(data: {
    product_id?: string;
    variant_id?: string;
    location_id: string;
    available_quantity: number;
    reserved_quantity?: number;
    incoming_quantity?: number;
    condition: 'sellable' | 'damaged' | 'quarantined' | 'expired';
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    created_by?: string;
    updated_by?: string;
}) {
    const [result] = await db
        .insert(inventory)
        .values(data)
        .returning();
    
    return result;
}

/**
 * Update inventory record
 */
export async function updateInventoryById(
    id: string,
    data: Partial<{
        available_quantity: number;
        reserved_quantity: number;
        incoming_quantity: number;
        incoming_po_reference: string;
        incoming_eta: Date;
        condition: 'sellable' | 'damaged' | 'quarantined' | 'expired';
        status: 'in_stock' | 'low_stock' | 'out_of_stock';
        updated_by: string;
        location_id: string;
    }>
) {
    const [result] = await db
        .update(inventory)
        .set({
            ...data,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Increment available quantity
 */
export async function incrementAvailableQuantity(id: string, amount: number) {
    const [result] = await db
        .update(inventory)
        .set({
            available_quantity: sql`${inventory.available_quantity} + ${amount}`,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Decrement available quantity
 */
export async function decrementAvailableQuantity(id: string, amount: number) {
    const [result] = await db
        .update(inventory)
        .set({
            available_quantity: sql`GREATEST(0, ${inventory.available_quantity} - ${amount})`,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Increment reserved quantity
 */
export async function incrementReservedQuantity(id: string, amount: number) {
    const [result] = await db
        .update(inventory)
        .set({
            reserved_quantity: sql`${inventory.reserved_quantity} + ${amount}`,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Decrement reserved quantity
 */
export async function decrementReservedQuantity(id: string, amount: number) {
    const [result] = await db
        .update(inventory)
        .set({
            reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} - ${amount})`,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Adjust both available and reserved quantities in a single update
 */
export async function adjustQuantities(
    id: string,
    availableDelta: number,
    reservedDelta: number
) {
    const [result] = await db
        .update(inventory)
        .set({
            available_quantity: sql`GREATEST(0, ${inventory.available_quantity} + ${availableDelta})`,
            reserved_quantity: sql`GREATEST(0, ${inventory.reserved_quantity} + ${reservedDelta})`,
            updated_at: new Date(),
        })
        .where(eq(inventory.id, id))
        .returning();
    
    return result;
}

/**
 * Update status based on available quantity
 */
export async function updateInventoryStatus(id: string) {
    const record = await findInventoryById(id);
    if (!record) return null;
    
    let newStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    
    if (record.available_quantity === 0) {
        newStatus = 'out_of_stock';
    } else if (record.available_quantity <= 10) {
        newStatus = 'low_stock';
    } else {
        newStatus = 'in_stock';
    }
    
    if (record.status !== newStatus) {
        return updateInventoryById(id, { status: newStatus });
    }
    
    return record;
}
