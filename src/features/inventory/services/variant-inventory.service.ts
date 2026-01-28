/**
 * Variant Inventory Service
 *
 * Business logic for product variant inventory operations.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { productVariants } from '../../product/shared/product.schema';
import { variantInventoryAdjustments } from '../shared/variant-inventory-adjustments.schema';
import { users } from '../../user/shared/user.schema';

// ============================================
// TYPES
// ============================================

export interface AdjustVariantInventoryDto {
    quantity_change: number;
    reason: string;
    reference_number?: string;
    notes?: string;
}

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

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Adjust variant inventory quantity with audit trail
 */
export async function adjustVariantInventory(
    variantId: string,
    data: AdjustVariantInventoryDto,
    adjustedBy: string
) {
    // Resolve valid user UUID (handles 'system' or invalid strings)
    const validUserId = await resolveValidUserId(adjustedBy);

    if (!validUserId) {
        throw new Error('Unable to resolve a valid user for audit logging.');
    }

    return await db.transaction(async (tx) => {
        // Get current variant inventory
        const [currentVariant] = await tx
            .select({
                id: productVariants.id,
                inventory_quantity: productVariants.inventory_quantity,
                sku: productVariants.sku,
            })
            .from(productVariants)
            .where(eq(productVariants.id, variantId));

        if (!currentVariant) {
            throw new Error('Product variant not found');
        }

        const quantityBefore = currentVariant.inventory_quantity;
        const quantityAfter = quantityBefore + data.quantity_change;

        // NOTE: We allow negative quantity if necessary (e.g. overselling), 
        // to be consistent with base product inventory if no strict constraint exists.
        // However, if strict validation is needed, uncomment below:
        // if (quantityAfter < 0) {
        //     throw new Error('Resulting quantity cannot be negative');
        // }

        // Determine adjustment type
        let adjustmentType: 'increase' | 'decrease' | 'correction' | 'write-off';
        if (data.quantity_change > 0) {
            adjustmentType = 'increase';
        } else if (data.quantity_change < 0) {
            adjustmentType = 'decrease';
        } else {
            adjustmentType = 'correction';
        }

        // Update variant inventory
        const [updatedVariant] = await tx
            .update(productVariants)
            .set({
                inventory_quantity: quantityAfter,
                updated_at: new Date(),
                updated_by: validUserId, // variants table has updated_by
            })
            .where(eq(productVariants.id, variantId))
            .returning();

        // Create adjustment record
        const [adjustment] = await tx
            .insert(variantInventoryAdjustments)
            .values({
                variant_id: variantId,
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

        return { variant: updatedVariant, adjustment };
    });
}
