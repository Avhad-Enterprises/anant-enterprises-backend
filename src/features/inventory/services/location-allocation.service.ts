/**
 * Location Allocation Service
 *
 * Smart fulfillment routing - selects optimal warehouse to fulfill orders
 * Supports multiple strategies: nearest, highest stock, lowest cost, manual
 */

import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { locationAllocationRules } from '../shared/location-allocation-rules.schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { logger } from '../../../utils';

// ============================================
// TYPES
// ============================================

export interface AllocationRequest {
    product_id: string;
    quantity: number;
    shipping_address?: {
        state?: string;
        country?: string;
        postal_code?: string;
    };
}

export interface AllocationResult {
    location_id: string;
    location_name: string;
    location_code: string;
    available_quantity: number;
    allocated: boolean;
}

// ============================================
// CORE ALLOCATION FUNCTIONS
// ============================================

/**
 * Find optimal location to fulfill a single order item
 */
export async function allocateLocation(
    request: AllocationRequest
): Promise<AllocationResult | null> {
    // Step 1: Get all locations with sufficient stock
    const locationsWithStock = await db
        .select({
            location_id: inventory.location_id,
            location_name: inventoryLocations.name,
            location_code: inventoryLocations.location_code,
            available_quantity: sql<number>`${inventory.available_quantity} - ${inventory.reserved_quantity}`,
            is_active: inventoryLocations.is_active,
        })
        .from(inventory)
        .innerJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .where(
            and(
                eq(inventory.product_id, request.product_id),
                eq(inventoryLocations.is_active, true),
                sql`${inventory.available_quantity} - ${inventory.reserved_quantity} >= ${request.quantity}`
            )
        );

    if (locationsWithStock.length === 0) {
        logger.warn(`No location has stock for product ${request.product_id}`);
        return null;
    }

    // Step 2: Get applicable allocation rules (sorted by priority)
    const rules = await db
        .select()
        .from(locationAllocationRules)
        .where(eq(locationAllocationRules.is_active, true))
        .orderBy(locationAllocationRules.priority);

    // Step 3: Apply rules to select location
    for (const rule of rules) {
        // Check if rule conditions match
        if (!matchesConditions(rule.conditions, request)) {
            continue;
        }

        // Apply strategy
        const selectedLocation = applyStrategy(
            rule.strategy,
            locationsWithStock,
            rule.location_ids,
            request
        );

        if (selectedLocation) {
            logger.info(`Allocated from location ${selectedLocation.location_code} via rule: ${rule.rule_name}`);
            return {
                ...selectedLocation,
                allocated: true,
            };
        }
    }

    // Step 4: Fallback - use location with highest stock
    const fallback = locationsWithStock.reduce((prev, curr) =>
        curr.available_quantity > prev.available_quantity ? curr : prev
    );

    logger.info(`Allocated from location ${fallback.location_code} (fallback - highest stock)`);

    return {
        location_id: fallback.location_id,
        location_name: fallback.location_name,
        location_code: fallback.location_code,
        available_quantity: fallback.available_quantity,
        allocated: true,
    };
}

/**
 * Allocate multiple items (for full order)
 * Returns map of product_id -> allocation result
 */
export async function allocateOrder(
    items: AllocationRequest[]
): Promise<Map<string, AllocationResult>> {
    const allocations = new Map<string, AllocationResult>();

    for (const item of items) {
        const allocation = await allocateLocation(item);
        if (allocation) {
            allocations.set(item.product_id, allocation);
        } else {
            logger.error(`Failed to allocate stock for product: ${item.product_id}`);
        }
    }

    return allocations;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if rule conditions match the request
 */
function matchesConditions(conditions: any, request: AllocationRequest): boolean {
    // If no conditions, rule applies to everything
    if (!conditions || Object.keys(conditions).length === 0) {
        return true;
    }

    // Example condition matching (extend as needed):
    // - shipping_zone: "east", "west", "central"
    // - product_category: extracted from product
    // - min_order_value: total order value

    // For now, simplified - always match
    // In production, implement actual condition logic
    return true;
}

/**
 * Apply allocation strategy to select best location
 */
function applyStrategy(
    strategy: string,
    locations: any[],
    preferredLocationIds: string[],
    request: AllocationRequest
): any | null {
    switch (strategy) {
        case 'manual':
            // Use only locations in preferredLocationIds
            const manualLocation = locations.find((loc) =>
                preferredLocationIds.includes(loc.location_id)
            );
            return manualLocation || null;

        case 'highest_stock':
            // Select location with most available stock
            const highestStock = locations.reduce((prev, curr) =>
                curr.available_quantity > prev.available_quantity ? curr : prev
            );
            return highestStock;

        case 'nearest':
            // Would require geocoding customer address
            // For now, fallback to first preferred location
            const nearestLocation = locations.find((loc) =>
                preferredLocationIds.includes(loc.location_id)
            );
            return nearestLocation || null;

        case 'lowest_cost':
            // Would require shipping cost calculation
            // For now, use first location
            return locations[0] || null;

        case 'round_robin':
            // Rotate through available locations
            // For now, use random
            return locations[Math.floor(Math.random() * locations.length)] || null;

        default:
            logger.warn(`Unknown allocation strategy: ${strategy}`);
            return null;
    }
}

/**
 * Get all stock for a product across locations
 */
export async function getProductStockByLocation(productId: string) {
    return await db
        .select({
            location_id: inventory.location_id,
            location_name: inventoryLocations.name,
            location_code: inventoryLocations.location_code,
            available_quantity: inventory.available_quantity,
            reserved_quantity: inventory.reserved_quantity,
            status: inventory.status,
            is_active: inventoryLocations.is_active,
        })
        .from(inventory)
        .innerJoin(inventoryLocations, eq(inventory.location_id, inventoryLocations.id))
        .where(eq(inventory.product_id, productId));
}
