/**
 * GET /api/categories/:categoryId/products
 * Get products by category
 * - Public access
 * - Matches category slug to category_tier_1 or category_tier_2
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
import { optionalUuidSchema } from '../../../utils/validation/common-schemas';

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(6),
    exclude: optionalUuidSchema,
});

// Helper function to match category slug
function categoryMatches(categorySlug: string, dbCategory: string | null): boolean {
    if (!dbCategory) return false;
    const slug = dbCategory.toLowerCase().replace(/\s+/g, '-');
    return slug === categorySlug.toLowerCase();
}

const handler = async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { limit, exclude } = querySchema.parse(req.query);

    // Build where conditions
    const conditions = [
        eq(products.status, 'active'),
        eq(products.is_deleted, false),
    ];

    // Exclude specific product if provided
    if (exclude) {
        conditions.push(ne(products.id, exclude));
    }

    // Fetch all products and filter by category slug matching
    const categoryProducts = await db
        .select({
            id: products.id,
            product_title: products.product_title,
            secondary_title: products.secondary_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            category_tier_1: products.category_tier_1,
            category_tier_2: products.category_tier_2,
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
        .limit(limit * 2); // Fetch extra to filter by category matching

    // Filter by category slug matching
    const filteredProducts = categoryProducts
        .filter(
            (product) =>
                categoryMatches(categoryId, product.category_tier_1) ||
                categoryMatches(categoryId, product.category_tier_2)
        )
        .slice(0, limit);

    // Format results
    const formattedResults = filteredProducts.map((product) => ({
        id: product.id,
        product_title: product.product_title,
        secondary_title: product.secondary_title,
        selling_price: product.selling_price,
        compare_at_price: product.compare_at_price,
        primary_image_url: product.primary_image_url,
        tags: (product.tags as any[]) || [],
        rating: Number(product.rating) || 0,
        review_count: Number(product.review_count) || 0,
    }));

    return ResponseFormatter.success(
        res,
        formattedResults,
        `Found ${formattedResults.length} products in category`
    );
};

const router = Router();
router.get('/:categoryId/products', handler);

export default router;
