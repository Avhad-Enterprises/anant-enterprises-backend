/**
 * Adjustment Queries
 * 
 * Pure data access layer for inventory adjustment operations.
 * Handles inventory_adjustments table queries.
 * 
 * Phase 1: Query Layer Extraction
 */

import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { inventory } from '../shared/inventory.schema';
import { products, productVariants } from '../../product/shared/product.schema';
import type { InventoryHistoryItem } from '../shared/interface';

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Find adjustment by ID
 */
export async function findAdjustmentById(id: string) {
    const [result] = await db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.id, id));
    
    return result;
}

/**
 * Get adjustment history for an inventory record
 */
export async function findAdjustmentHistory(inventoryId: string, limit: number = 50) {
    return db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.inventory_id, inventoryId))
        .orderBy(desc(inventoryAdjustments.adjusted_at))
        .limit(limit);
}

/**
 * Get adjustment history by product ID (includes all variants)
 */
export async function findAdjustmentHistoryByProduct(
    productId: string,
    page: number = 1,
    limit: number = 50
) {
    const offset = (page - 1) * limit;
    
    const query = sql`
        SELECT
            ia.id,
            ia.inventory_id,
            ia.adjustment_type,
            ia.quantity_change,
            ia.reason,
            ia.reference_number,
            ia.notes,
            ia.adjusted_by,
            ia.adjusted_at,
            i.product_id,
            i.variant_id,
            i.location_id,
            CASE
                WHEN i.variant_id IS NOT NULL THEN CONCAT(p.product_title, ' - ', pv.option_name, ': ', pv.option_value)
                ELSE p.product_title
            END as product_name,
            CASE
                WHEN i.variant_id IS NOT NULL THEN pv.sku
                ELSE p.sku
            END as sku
        FROM ${inventoryAdjustments} ia
        INNER JOIN ${inventory} i ON ia.inventory_id = i.id
        LEFT JOIN ${products} p ON i.product_id = p.id
        LEFT JOIN ${productVariants} pv ON i.variant_id = pv.id
        WHERE i.product_id = ${productId}
        ORDER BY ia.adjusted_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `;
    
    const result = await db.execute(query);
    
    return result.rows.map(row => ({
        id: row.id,
        inventory_id: row.inventory_id,
        adjustment_type: row.adjustment_type,
        quantity_change: row.quantity_change,
        reason: row.reason,
        reference_number: row.reference_number,
        notes: row.notes,
        adjusted_by: row.adjusted_by,
        adjusted_at: new Date(row.adjusted_at as string),
        product_id: row.product_id,
        variant_id: row.variant_id,
        location_id: row.location_id,
        product_name: row.product_name,
        sku: row.sku
    })) as unknown as InventoryHistoryItem[];
}

/**
 * Count adjustments for a product
 */
export async function countAdjustmentsByProduct(productId: string): Promise<number> {
    const countQuery = sql`
        SELECT COUNT(*) as total
        FROM ${inventoryAdjustments} ia
        INNER JOIN ${inventory} i ON ia.inventory_id = i.id
        WHERE i.product_id = ${productId}
    `;
    
    const result = await db.execute(countQuery);
    return Number(result.rows[0]?.total || 0);
}

/**
 * Get adjustments by type
 */
export async function findAdjustmentsByType(
    adjustmentType: 'increase' | 'decrease' | 'correction' | 'write-off',
    limit: number = 50
) {
    return db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.adjustment_type, adjustmentType))
        .orderBy(desc(inventoryAdjustments.adjusted_at))
        .limit(limit);
}

/**
 * Get adjustments by reference (e.g., order_id, transfer_id)
 */
export async function findAdjustmentsByReference(
    referenceNumber: string
) {
    return db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.reference_number, referenceNumber))
        .orderBy(desc(inventoryAdjustments.adjusted_at));
}

/**
 * Get recent adjustments (last 24 hours)
 */
export async function findRecentAdjustments(limit: number = 100) {
    const query = sql`
        SELECT
            ia.*,
            i.product_id,
            i.variant_id,
            CASE
                WHEN i.variant_id IS NOT NULL THEN CONCAT(p.product_title, ' - ', pv.option_name, ': ', pv.option_value)
                ELSE p.product_title
            END as product_name
        FROM ${inventoryAdjustments} ia
        INNER JOIN ${inventory} i ON ia.inventory_id = i.id
        LEFT JOIN ${products} p ON i.product_id = p.id
        LEFT JOIN ${productVariants} pv ON i.variant_id = pv.id
        WHERE ia.adjusted_at >= (NOW() - INTERVAL '24 HOURS')
        ORDER BY ia.adjusted_at DESC
        LIMIT ${limit}
    `;
    
    const result = await db.execute(query);
    return result.rows;
}

/**
 * Get adjustment summary by type (for reporting)
 */
export async function getAdjustmentSummaryByType(
    startDate?: Date,
    endDate?: Date
) {
    const query = sql`
        SELECT
            adjustment_type,
            COUNT(*) as count,
            SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as total_increase,
            SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as total_decrease
        FROM ${inventoryAdjustments}
        WHERE 1=1
        ${startDate ? sql`AND adjusted_at >= ${startDate}` : sql``}
        ${endDate ? sql`AND adjusted_at <= ${endDate}` : sql``}
        GROUP BY adjustment_type
        ORDER BY count DESC
    `;
    
    const result = await db.execute(query);
    return result.rows;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create adjustment record
 */
export async function createAdjustment(data: {
    inventory_id: string;
    adjustment_type: 'increase' | 'decrease' | 'correction' | 'write-off';
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    reason: string;
    reference_number?: string;
    notes?: string;
    adjusted_by: string;
}) {
    const [result] = await db
        .insert(inventoryAdjustments)
        .values(data)
        .returning();
    
    return result;
}

/**
 * Create multiple adjustments (bulk operation)
 */
export async function createAdjustmentsBulk(
    adjustments: Array<{
        inventory_id: string;
        adjustment_type: 'increase' | 'decrease' | 'correction' | 'write-off';
        quantity_change: number;
        quantity_before: number;
        quantity_after: number;
        reason: string;
        reference_number?: string;
        notes?: string;
        adjusted_by: string;
    }>
) {
    return db
        .insert(inventoryAdjustments)
        .values(adjustments)
        .returning();
}

/**
 * Update adjustment notes
 */
export async function updateAdjustmentNotes(id: string, notes: string) {
    const [result] = await db
        .update(inventoryAdjustments)
        .set({ notes })
        .where(eq(inventoryAdjustments.id, id))
        .returning();
    
    return result;
}
