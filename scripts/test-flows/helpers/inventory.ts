/**
 * Inventory Test Helpers
 * Specialized helpers for testing inventory operations
 */

import { db } from '../../../src/database';
import { inventory } from '../../../src/features/inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../../../src/features/inventory/shared/inventory-adjustments.schema';
import { products } from '../../../src/features/product/shared/products.schema';
import { eq, and, sql } from 'drizzle-orm';

// ============================================
// INVENTORY QUERIES
// ============================================

export interface InventoryState {
    id: string;
    product_id: string;
    available_quantity: number;
    reserved_quantity: number;
    status: string;
    condition: string;
}

/**
 * Get current inventory state for a product
 */
export async function getInventoryState(productId: string): Promise<InventoryState | null> {
    const [inventoryRecord] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId))
        .limit(1);

    return inventoryRecord || null;
}

/**
 * Get stock calculation (available + reserved = total physical stock)
 */
export async function getStockCalculation(productId: string) {
    const state = await getInventoryState(productId);
    
    if (!state) {
        return {
            available: 0,
            reserved: 0,
            total: 0,
            status: 'out_of_stock',
        };
    }

    return {
        available: state.available_quantity,
        reserved: state.reserved_quantity,
        total: state.available_quantity + state.reserved_quantity,
        status: state.status,
    };
}

/**
 * Get inventory adjustment history
 */
export async function getInventoryHistory(inventoryId: string, limit = 10) {
    return await db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.inventory_id, inventoryId))
        .orderBy(sql`${inventoryAdjustments.adjusted_at} DESC`)
        .limit(limit);
}

/**
 * Get latest inventory adjustment
 */
export async function getLatestAdjustment(inventoryId: string) {
    const history = await getInventoryHistory(inventoryId, 1);
    return history[0] || null;
}

// ============================================
// INVENTORY ASSERTIONS
// ============================================

export interface StockExpectation {
    available: number;
    reserved: number;
    total?: number;
    status?: string;
}

/**
 * Assert inventory matches expected values
 */
export async function assertInventoryState(
    productId: string,
    expected: StockExpectation,
    message?: string
): Promise<void> {
    const actual = await getStockCalculation(productId);
    const prefix = message ? `${message}: ` : '';

    if (actual.available !== expected.available) {
        throw new Error(
            `${prefix}Expected available=${expected.available}, got ${actual.available}`
        );
    }

    if (actual.reserved !== expected.reserved) {
        throw new Error(
            `${prefix}Expected reserved=${expected.reserved}, got ${actual.reserved}`
        );
    }

    if (expected.total !== undefined && actual.total !== expected.total) {
        throw new Error(
            `${prefix}Expected total=${expected.total}, got ${actual.total}`
        );
    }

    if (expected.status && actual.status !== expected.status) {
        throw new Error(
            `${prefix}Expected status=${expected.status}, got ${actual.status}`
        );
    }

    console.log(`  ✅ ${prefix || 'Inventory state'} verified: available=${actual.available}, reserved=${actual.reserved}, total=${actual.total}`);
}

/**
 * Assert audit trail was created
 */
export async function assertAuditTrailCreated(
    inventoryId: string,
    expectedType: 'increase' | 'decrease' | 'correction' | 'write-off',
    expectedChange?: number
): Promise<void> {
    const latest = await getLatestAdjustment(inventoryId);

    if (!latest) {
        throw new Error('No audit trail found');
    }

    if (latest.adjustment_type !== expectedType) {
        throw new Error(
            `Expected adjustment type ${expectedType}, got ${latest.adjustment_type}`
        );
    }

    if (expectedChange !== undefined && latest.quantity_change !== expectedChange) {
        throw new Error(
            `Expected quantity change ${expectedChange}, got ${latest.quantity_change}`
        );
    }

    console.log(`  ✅ Audit trail verified: type=${latest.adjustment_type}, change=${latest.quantity_change}`);
}

/**
 * Assert stock calculation is correct (available + reserved)
 */
export async function assertStockCalculationLogic(productId: string): Promise<void> {
    const state = await getStockCalculation(productId);
    const expectedTotal = state.available + state.reserved;

    if (state.total !== expectedTotal) {
        throw new Error(
            `Stock calculation error: ${state.available} + ${state.reserved} should equal ${expectedTotal}, got ${state.total}`
        );
    }

    console.log(`  ✅ Stock calculation correct: ${state.available} + ${state.reserved} = ${state.total}`);
}

// ============================================
// INVENTORY SETUP HELPERS
// ============================================

/**
 * Set inventory to specific state (for testing)
 */
export async function setInventoryState(
    productId: string,
    available: number,
    reserved: number = 0
): Promise<string> {
    const [existing] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId))
        .limit(1);

    if (existing) {
        // Calculate total stock
        const totalStock = available + reserved;
        
        // Determine status based on total stock
        let status: 'in_stock' | 'low_stock' | 'out_of_stock';
        if (totalStock === 0) {
            status = 'out_of_stock';
        } else if (totalStock <= 10) {
            status = 'low_stock';
        } else {
            status = 'in_stock';
        }

        await db
            .update(inventory)
            .set({
                available_quantity: available,
                reserved_quantity: reserved,
                status: status,
                updated_at: new Date(),
            })
            .where(eq(inventory.id, existing.id));

        console.log(`  📦 Set inventory: available=${available}, reserved=${reserved}, status=${status}`);
        return existing.id;
    }

    throw new Error(`Inventory not found for product ${productId}`);
}

/**
 * Create inventory record if it doesn't exist
 */
export async function ensureInventoryExists(
    productId: string,
    locationId: string,
    initialStock: number = 0
): Promise<string> {
    const [existing] = await db
        .select()
        .from(inventory)
        .where(
            and(
                eq(inventory.product_id, productId),
                eq(inventory.location_id, locationId)
            )
        )
        .limit(1);

    if (existing) {
        return existing.id;
    }

    const [created] = await db
        .insert(inventory)
        .values({
            product_id: productId,
            location_id: locationId,
            available_quantity: initialStock,
            reserved_quantity: 0,
            incoming_quantity: 0,
            status: initialStock > 0 ? 'in_stock' : 'out_of_stock',
            condition: 'sellable',
        })
        .returning();

    return created.id;
}

// ============================================
// CONCURRENT TESTING HELPERS
// ============================================

/**
 * Run multiple operations concurrently
 */
export async function runConcurrent<T>(
    operations: Array<() => Promise<T>>,
    delayMs: number = 0
): Promise<T[]> {
    if (delayMs > 0) {
        // Stagger operations slightly to simulate real concurrency
        const promises = operations.map((op, index) => 
            new Promise<T>(resolve => {
                setTimeout(() => resolve(op()), index * delayMs);
            })
        );
        return Promise.all(promises);
    }

    return Promise.all(operations.map(op => op()));
}

/**
 * Simulate race condition by running operations simultaneously
 */
export async function simulateRaceCondition<T>(
    operation: () => Promise<T>,
    times: number
): Promise<{ results: T[]; errors: Error[] }> {
    const operations = Array(times).fill(null).map(() => 
        operation().catch(err => err as Error)
    );

    const outcomes = await Promise.all(operations);
    
    const results: T[] = [];
    const errors: Error[] = [];

    for (const outcome of outcomes) {
        if (outcome instanceof Error) {
            errors.push(outcome);
        } else {
            results.push(outcome);
        }
    }

    return { results, errors };
}

// ============================================
// WAIT HELPERS
// ============================================

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
    condition: () => Promise<boolean>,
    timeoutMs: number = 5000,
    checkIntervalMs: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Simple delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
