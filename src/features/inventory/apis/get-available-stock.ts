/**
 * GET /api/inventory/product/:productId/available
 * Get real-time available stock for a product (total stock - reserved stock)
 * 
 * This endpoint is used by frontend to check stock availability before adding to cart
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { inventory } from '../shared/inventory.schema';
import { eq, sql } from 'drizzle-orm';

const paramsSchema = z.object({
    productId: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params as { productId: string };

        const validation = paramsSchema.safeParse({ productId });
        if (!validation.success) {
            throw new HttpException(400, 'Invalid product ID');
        }

        logger.info(`GET /api/inventory/product/${productId}/available`);

        // Query available stock (available_quantity - reserved_quantity)
        const [stockData] = await db
            .select({
                productId: inventory.product_id,
                totalStock: sql<number>`SUM(${inventory.available_quantity})`.as('total_stock'),
                reservedStock: sql<number>`SUM(${inventory.reserved_quantity})`.as('reserved_stock'),
                availableStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`.as('available_stock'),
            })
            .from(inventory)
            .where(eq(inventory.product_id, productId))
            .groupBy(inventory.product_id);

        if (!stockData) {
            // Product not found in inventory
            return ResponseFormatter.success(res, {
                productId,
                totalStock: 0,
                reservedStock: 0,
                availableStock: 0,
                inStock: false,
            }, 'Product not found in inventory');
        }

        const result = {
            productId: stockData.productId,
            totalStock: Number(stockData.totalStock) || 0,
            reservedStock: Number(stockData.reservedStock) || 0,
            availableStock: Number(stockData.availableStock) || 0,
            inStock: Number(stockData.availableStock) > 0,
        };

        return ResponseFormatter.success(res, result, 'Available stock retrieved successfully');
    } catch (error) {
        logger.error('Error in get-available-stock:', error);
        return next(error);
    }
};

const router = Router();
router.get('/product/:productId/available', handler);

export default router;
