/**
 * GET /api/products/search
 * Search products by query
 * - Public access
 * - Searches in title, subtitle, category, SKU
 * - Returns active products only
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, or, sql, ilike } from 'drizzle-orm';
import { ResponseFormatter, searchSchema } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { inventory } from '../../inventory/shared/inventory.schema';

const querySchema = searchSchema.extend({
    category: z.string().optional(),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(50)),
});

const handler = async (req: Request, res: Response) => {
    const { q, category, limit } = querySchema.parse(req.query);

    // Build where conditions
    const searchPattern = `%${q}%`;
    const conditions = [
        eq(products.status, 'active'),
        eq(products.is_deleted, false),
        or(
            ilike(products.product_title, searchPattern),
            ilike(products.secondary_title, searchPattern),
            ilike(products.category_tier_1, searchPattern),
            ilike(products.category_tier_2, searchPattern),
            ilike(products.sku, searchPattern)
        ),
    ];

    // Add category filter if provided
    if (category) {
        conditions.push(
            or(
                ilike(products.category_tier_1, `%${category}%`),
                ilike(products.category_tier_2, `%${category}%`)
            )
        );
    }

    // Search products with computed fields
    const searchResults = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            secondary_title: products.secondary_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            category_tier_1: products.category_tier_1,
            sku: products.sku,

            // Computed: Average rating
            rating: sql<number>`(
        SELECT COALESCE(AVG(${reviews.rating}), 0)
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,

            // Computed: Review count
            review_count: sql<number>`(
        SELECT COUNT(${reviews.id})
        FROM ${reviews}
        WHERE ${reviews.product_id} = ${products.id}
          AND ${reviews.status} = 'approved'
          AND ${reviews.is_deleted} = false
      )`,

            // Computed: Stock availability
            total_stock: sql<number>`(
        SELECT COALESCE(SUM(${inventory.available_quantity}), 0)
        FROM ${inventory}
        WHERE ${inventory.product_id} = ${products.id}
      )`,
        })
        .from(products)
        .where(and(...conditions))
        .orderBy(
            // Exact matches first
            sql`CASE WHEN ${products.product_title} ILIKE ${q + '%'} THEN 0 ELSE 1 END`,
            products.product_title
        )
        .limit(limit);

    // Format results
    const formattedResults = searchResults.map((product) => ({
        ...product,
        rating: Number(product.rating) || 0,
        review_count: Number(product.review_count) || 0,
        inStock: (product.total_stock || 0) > 0,
    }));

    return ResponseFormatter.success(
        res,
        formattedResults,
        `Found ${formattedResults.length} products`
    );
};

const router = Router();
router.get('/search', handler);

export default router;
