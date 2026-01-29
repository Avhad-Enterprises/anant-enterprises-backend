/**
 * GET /api/admin/orders/products/search
 * Admin: Search products for order creation
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { ilike, or, eq, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../../product/shared/product.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const querySchema = z.object({
    search: z.string().min(1),
    limit: z.coerce.number().min(1).max(50).default(20),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { search, limit } = querySchema.parse(req.query);

    // Search products by name or SKU
    const searchPattern = `%${search}%`;

    const productResults = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            description: products.description,
            image: products.image_url,
            price: products.price,
            cost_price: products.cost_price,
            weight: products.weight,
            is_active: products.is_active,
        })
        .from(products)
        .where(
            or(
                ilike(products.name, searchPattern),
                ilike(products.sku, searchPattern)
            )
        )
        .limit(limit);

    // Get inventory for each product
    const enrichedProducts = await Promise.all(
        productResults.map(async (product) => {
            // Get total available stock across all locations
            const [stockResult] = await db
                .select({
                    total_available: sql<number>`COALESCE(SUM(${inventory.available_quantity}), 0)::int`,
                    total_reserved: sql<number>`COALESCE(SUM(${inventory.reserved_quantity}), 0)::int`,
                })
                .from(inventory)
                .where(eq(inventory.product_id, product.id));

            return {
                ...product,
                available_stock: stockResult?.total_available || 0,
                reserved_stock: stockResult?.total_reserved || 0,
                in_stock: (stockResult?.total_available || 0) > 0,
            };
        })
    );

    return ResponseFormatter.success(res, {
        products: enrichedProducts,
        total: enrichedProducts.length,
    }, 'Products retrieved successfully');
};

const router = Router();
router.get('/admin/orders/products/search', requireAuth, requirePermission('orders:read'), handler);

export default router;
