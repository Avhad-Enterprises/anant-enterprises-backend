/**
 * Inventory Transfer Service
 *
 * Manages stock movements between locations with full audit trail
 * Supports transfer creation, execution, and cancellation
 */

import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { inventoryTransfers } from '../shared/inventory-transfers.schema';
import { inventoryAdjustments } from '../shared/inventory-adjustments.schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../../utils';

// ============================================
// TRANSFER CREATION
// ============================================

/**
 * Create a stock transfer between locations
 */
export async function createTransfer(
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    reason: string,
    userId: string,
    notes?: string
): Promise<string> {
    return await db.transaction(async (tx) => {
        // Validate stock at source location
        const [sourceInventory] = await tx
            .select()
            .from(inventory)
            .where(
                and(
                    eq(inventory.product_id, productId),
                    eq(inventory.location_id, fromLocationId)
                )
            );

        if (!sourceInventory) {
            throw new Error(`Product not found at source location`);
        }

        const availableStock =
            sourceInventory.available_quantity - sourceInventory.reserved_quantity;

        if (availableStock < quantity) {
            throw new Error(
                `Insufficient stock at source. Available: ${availableStock}, Requested: ${quantity}`
            );
        }

        // Generate transfer number
        const transferNumber = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create transfer record
        const [transfer] = await tx
            .insert(inventoryTransfers)
            .values({
                transfer_number: transferNumber,
                from_location_id: fromLocationId,
                to_location_id: toLocationId,
                product_id: productId,
                quantity,
                reason,
                notes,
                status: 'pending',
                created_by: userId,
                updated_by: userId,
            })
            .returning();

        logger.info(`Transfer created: ${transferNumber}`, {
            transfer_id: transfer.id,
            product_id: productId,
            quantity,
        });

        return transfer.id;
    });
}

// ============================================
// TRANSFER EXECUTION
// ============================================

/**
 * Execute transfer - reduce from source, increase at destination
 */
export async function executeTransfer(
    transferId: string,
    userId: string
): Promise<void> {
    return await db.transaction(async (tx) => {
        // Get transfer
        const [transfer] = await tx
            .select()
            .from(inventoryTransfers)
            .where(eq(inventoryTransfers.id, transferId));

        if (!transfer) {
            throw new Error('Transfer not found');
        }

        if (transfer.status !== 'pending') {
            throw new Error(`Transfer already ${transfer.status}`);
        }

        // Reduce from source
        const [sourceInventory] = await tx
            .select()
            .from(inventory)
            .where(
                and(
                    eq(inventory.product_id, transfer.product_id),
                    eq(inventory.location_id, transfer.from_location_id)
                )
            );

        if (!sourceInventory) {
            throw new Error('Source inventory not found');
        }

        // Check available stock again (safety check)
        const availableStock = sourceInventory.available_quantity - sourceInventory.reserved_quantity;
        if (availableStock < transfer.quantity) {
            throw new Error(`Insufficient stock. Available: ${availableStock}, Required: ${transfer.quantity}`);
        }

        await tx
            .update(inventory)
            .set({
                available_quantity: sql`${inventory.available_quantity} - ${transfer.quantity}`,
                updated_at: new Date(),
                updated_by: userId,
            })
            .where(eq(inventory.id, sourceInventory.id));

        // Create adjustment record for source (decrease)
        await tx.insert(inventoryAdjustments).values({
            inventory_id: sourceInventory.id,
            adjustment_type: 'transfer_out',
            quantity_change: -transfer.quantity,
            before_quantity: sourceInventory.available_quantity,
            after_quantity: sourceInventory.available_quantity - transfer.quantity,
            reason: `Transfer to another location (${transfer.transfer_number})`,
            reference_type: 'inventory_transfer',
            reference_id: transfer.id,
            created_by: userId,
        });

        // Increase at destination (create if doesn't exist)
        const [destInventory] = await tx
            .select()
            .from(inventory)
            .where(
                and(
                    eq(inventory.product_id, transfer.product_id),
                    eq(inventory.location_id, transfer.to_location_id)
                )
            );

        if (destInventory) {
            // Update existing
            await tx
                .update(inventory)
                .set({
                    available_quantity: sql`${inventory.available_quantity} + ${transfer.quantity}`,
                    updated_at: new Date(),
                    updated_by: userId,
                })
                .where(eq(inventory.id, destInventory.id));

            // Create adjustment record for destination (increase)
            await tx.insert(inventoryAdjustments).values({
                inventory_id: destInventory.id,
                adjustment_type: 'transfer_in',
                quantity_change: transfer.quantity,
                before_quantity: destInventory.available_quantity,
                after_quantity: destInventory.available_quantity + transfer.quantity,
                reason: `Transfer from another location (${transfer.transfer_number})`,
                reference_type: 'inventory_transfer',
                reference_id: transfer.id,
                created_by: userId,
            });
        } else {
            // Create new inventory record at destination
            const [newInventory] = await tx.insert(inventory).values({
                product_id: transfer.product_id,
                location_id: transfer.to_location_id,
                product_name: sourceInventory.product_name,
                sku: sourceInventory.sku,
                available_quantity: transfer.quantity,
                reserved_quantity: 0,
                incoming_quantity: 0,
                condition: 'sellable',
                status: 'in_stock',
                updated_by: userId,
            }).returning();

            // Create adjustment record
            await tx.insert(inventoryAdjustments).values({
                inventory_id: newInventory.id,
                adjustment_type: 'transfer_in',
                quantity_change: transfer.quantity,
                before_quantity: 0,
                after_quantity: transfer.quantity,
                reason: `Initial stock from transfer (${transfer.transfer_number})`,
                reference_type: 'inventory_transfer',
                reference_id: transfer.id,
                created_by: userId,
            });
        }

        // Update transfer status
        await tx
            .update(inventoryTransfers)
            .set({
                status: 'completed',
                completed_at: new Date(),
                updated_at: new Date(),
                updated_by: userId,
            })
            .where(eq(inventoryTransfers.id, transferId));

        logger.info(`Transfer executed: ${transfer.transfer_number}`, {
            transfer_id: transferId,
            product_id: transfer.product_id,
            quantity: transfer.quantity,
        });
    });
}

// ============================================
// TRANSFER CANCELLATION
// ============================================

/**
 * Cancel a pending transfer
 */
export async function cancelTransfer(
    transferId: string,
    userId: string,
    reason?: string
): Promise<void> {
    return await db.transaction(async (tx) => {
        const [transfer] = await tx
            .select()
            .from(inventoryTransfers)
            .where(eq(inventoryTransfers.id, transferId));

        if (!transfer) {
            throw new Error('Transfer not found');
        }

        if (transfer.status !== 'pending') {
            throw new Error(`Cannot cancel transfer with status: ${transfer.status}`);
        }

        await tx
            .update(inventoryTransfers)
            .set({
                status: 'cancelled',
                cancelled_at: new Date(),
                notes: reason ? `${transfer.notes || ''}\nCancellation reason: ${reason}` : transfer.notes,
                updated_at: new Date(),
                updated_by: userId,
            })
            .where(eq(inventoryTransfers.id, transferId));

        logger.info(`Transfer cancelled: ${transfer.transfer_number}`, {
            transfer_id: transferId,
            reason,
        });
    });
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get transfer by ID
 */
export async function getTransferById(transferId: string) {
    const [transfer] = await db
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.id, transferId));

    return transfer;
}

/**
 * List all transfers with optional filters
 */
export async function listTransfers(filters?: {
    status?: string;
    from_location_id?: string;
    to_location_id?: string;
    product_id?: string;
    limit?: number;
}) {
    let query = db.select().from(inventoryTransfers);

    if (filters?.status) {
        query = query.where(eq(inventoryTransfers.status, filters.status)) as any;
    }

    if (filters?.from_location_id) {
        query = query.where(eq(inventoryTransfers.from_location_id, filters.from_location_id)) as any;
    }

    if (filters?.to_location_id) {
        query = query.where(eq(inventoryTransfers.to_location_id, filters.to_location_id)) as any;
    }

    if (filters?.product_id) {
        query = query.where(eq(inventoryTransfers.product_id, filters.product_id)) as any;
    }

    const transfers = await query.limit(filters?.limit || 100);

    return transfers;
}
