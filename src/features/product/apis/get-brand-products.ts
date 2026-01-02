/**
 * GET /api/brands/:brandId/products
 * Get products by brand
 * - Public access
 * - Matches brand slug
 * - Returns active products
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, ne, sql } from 'drizzle-orm';
import { Request } from 'express';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

const paramsSchema = z.object({
    brandId: z.string().min(1, 'Brand ID is required'),
});

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(6),
    exclude: z.string().uuid().optional(),
});

const handler = async (req: Request, res: Response) => {
    const { brandId } = req.params;
    const { limit, exclude } = querySchema.parse(req.query);

    // Build where conditions
    const conditions = [
        eq(products.brand_slug, brandId),
        eq(products.status, 'active'),
        eq(products.is_deleted, false),
    ];

    // Exclude specific product if provided
    if (exclude) {
        conditions.push(ne(products.id, exclude));
    }

    // Fetch brand products
    const brandProducts = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            secondary_title: products.secondary_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            brand_name: products.brand_name,
            tags: products.tags,

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
        })
        .from(products)
        .where(and(...conditions))
        .orderBy(products.created_at)
        .limit(limit);

    // Format results
    const formattedResults = brandProducts.map((product) => ({
        id: product.id,
        product_title: product.product_title,
        secondary_title: product.secondary_title,
        selling_price: product.selling_price,
        compare_at_price: product.compare_at_price,
        primary_image_url: product.primary_image_url,
        brand_name: product.brand_name,
        tags: (product.tags as any[]) || [],
        rating: Number(product.rating) || 0,
        review_count: Number(product.review_count) || 0,
    }));

    return ResponseFormatter.success(
        res,
        formattedResults,
        `Found ${formattedResults.length} products from brand`
    );
};

const router = Router();
router.get('/:brandId/products', handler);

export default router;
