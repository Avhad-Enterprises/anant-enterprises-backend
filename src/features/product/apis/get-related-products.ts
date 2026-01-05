/**
 * GET /api/products/:productId/related
 * Get related products based on category
 * - Public access
 * - Returns products from same category
 * - Excludes current product
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, ne, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { reviews } from '../../reviews/shared/reviews.schema';

const paramsSchema = z.object({
    productId: uuidSchema,
});

const querySchema = z.object({
    limit: z.preprocess((val) => (val ? Number(val) : 4), z.number().int().min(1).max(20)),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { productId } = req.params;
    const { limit } = querySchema.parse(req.query);

    // Get the current product's category
    const [currentProduct] = await db
        .select({
            category_tier_1: products.category_tier_1,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

    if (!currentProduct) {
        throw new HttpException(404, 'Product not found');
    }

    // Get related products from same category
    const relatedProducts = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
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
        .where(
            and(
                eq(products.category_tier_1, currentProduct.category_tier_1 || ''),
                ne(products.id, productId),
                eq(products.status, 'active'),
                eq(products.is_deleted, false)
            )
        )
        .orderBy(sql`RANDOM()`) // Random selection for variety
        .limit(limit);

    // Format results
    const formattedResults = relatedProducts.map((product) => ({
        ...product,
        tags: (product.tags as any[]) || [],
        rating: Number(product.rating) || 0,
        review_count: Number(product.review_count) || 0,
    }));

    return ResponseFormatter.success(res, formattedResults, 'Related products retrieved successfully');
};

const router = Router();
router.get(
    '/:productId/related',
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
