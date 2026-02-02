/**
 * POST /api/inventory/backfill
 * Create inventory records for existing products that don't have one
 * 
 * This is a one-time admin operation to populate inventory for existing products.
 * Safe to run multiple times - only creates records for products without inventory.
 */

import { Router, Response, NextFunction } from 'express';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { products } from '../../product/shared/products.schema';
import { inventoryLocations } from '../shared/inventory-locations.schema';
import { sql, eq } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        logger.info('Starting inventory backfill...');

        // Find all products that don't have an inventory record
        const productsWithoutInventory = await db
            .select({
                id: products.id,
                product_title: products.product_title,
                sku: products.sku,
            })
            .from(products)
            .where(
                sql`${products.id} NOT IN (SELECT product_id FROM inventory WHERE product_id IS NOT NULL)`
            );

        if (productsWithoutInventory.length === 0) {
            logger.info('No products need inventory backfill');
            return ResponseFormatter.success(res, {
                created: 0,
                message: 'All products already have inventory records',
            });
        }

        logger.info(`Found ${productsWithoutInventory.length} products without inventory`);

        // Get default location
        const defaultLocation = await db
            .select()
            .from(inventoryLocations)
            .where(eq(inventoryLocations.is_active, true))
            .limit(1);

        if (defaultLocation.length === 0) {
            throw new Error('No active inventory location found. Please create a location first.');
        }

        // Create inventory records for each product
        const inventoryRecords = productsWithoutInventory.map(product => ({
            product_id: product.id,
            location_id: defaultLocation[0].id,
            product_name: product.product_title,
            sku: product.sku,
            available_quantity: 0,
            reserved_quantity: 0,
            incoming_quantity: 0,
            condition: 'sellable' as const,
            status: 'out_of_stock' as const,
        }));

        // Batch insert
        await db.insert(inventory).values(inventoryRecords);

        logger.info(`Created ${inventoryRecords.length} inventory records`);

        ResponseFormatter.success(res, {
            created: inventoryRecords.length,
            products: productsWithoutInventory.map(p => ({
                id: p.id,
                name: p.product_title,
                sku: p.sku,
            })),
        }, `Created inventory for ${inventoryRecords.length} products`);
        return;
    } catch (error) {
        logger.error('Error in inventory backfill:', error);
        next(error);
        return;
    }
};

const router = Router();
router.post('/backfill', requireAuth, requirePermission('inventory:create'), handler);

export default router;
