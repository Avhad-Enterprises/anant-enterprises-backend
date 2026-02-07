/**
 * GET /api/admin/orders/products/search
 * Admin: Search products for order creation
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { ilike, or, eq, sql, and, isNull } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../../product/shared/products.schema';
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
            name: products.product_title,
            sku: products.sku,
            description: products.short_description,
            image: products.primary_image_url,
            price: products.selling_price,
            cost_price: products.cost_price,
            weight: products.weight,
            is_active: sql<boolean>`${products.status} = 'active'`,
        })
        .from(products)
        .where(
            or(
                ilike(products.product_title, searchPattern),
                ilike(products.sku, searchPattern)
            )
        )
        .limit(limit);

    // Get inventory and variant info for each product
    const enrichedProducts = await Promise.all(
        productResults.map(async (product) => {
            // 1. Get Base Product Inventory (Specific available at product level)
            // We filter by variant_id IS NULL to ensure we only get the base product's specific inventory,
            // avoiding double-counting if variant rows also have product_id set.
            const [baseStockResult] = await db
                .select({
                    total_available: sql<number>`COALESCE(SUM(${inventory.available_quantity}), 0)::int`,
                    total_reserved: sql<number>`COALESCE(SUM(${inventory.reserved_quantity}), 0)::int`,
                })
                .from(inventory)
                .where(and(
                    eq(inventory.product_id, product.id),
                    isNull(inventory.variant_id)
                ));

            console.log(`[DEBUG] Product: ${product.name} (${product.id})`);
            console.log(`[DEBUG] Base Stock Result:`, baseStockResult);
            console.log(`[DEBUG] Query params: product_id=${product.id}, variant_id=NULL`);

            const baseAvailable = baseStockResult?.total_available || 0;
            const baseReserved = baseStockResult?.total_reserved || 0;
            const specificBaseStock = Math.max(0, baseAvailable - baseReserved);

            return {
                ...product,
                stock_quantity: specificBaseStock,
                available_stock: baseAvailable,
                reserved_stock: baseReserved,
                in_stock: specificBaseStock > 0,
            };
        })
    );

    return ResponseFormatter.success(res, {
        products: enrichedProducts,
        total: enrichedProducts.length,
    }, 'Products retrieved successfully');
};

const router = Router();
// Match the frontend API_ROUTES.ORDERS.SEARCH_PRODUCTS (updated to be specific)
router.get('/admin/orders/products/search', requireAuth, requirePermission('orders:read'), handler);

export default router;
