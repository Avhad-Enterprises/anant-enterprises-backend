/**
 * GET /api/products/search
 * Search products by full text (title, description), SKU, or tags
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { sql, eq, and, or, desc } from 'drizzle-orm';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { reviews } from '../../reviews/shared/reviews.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import {
    buildAverageRating,
    buildReviewCount,
    buildInventoryQuantity,
} from '../shared/query-builders';

const querySchema = paginationSchema.extend({
    q: z.string().min(1).describe('Search query'),
    status: z.enum(['draft', 'active', 'archived']).default('active'),
});

const handler = async (req: Request, res: Response) => {
    const { q, page, limit, status } = querySchema.parse(req.query);
    const offset = (page - 1) * limit;

    // Sanitize query for English dictionary search
    // Replace spaces with & for basic AND search, or | for OR
    // Here we use simple plainto_tsquery or similar behavior
    const searchQuery = q.trim();

    // conditions
    const conditions = [
        eq(products.is_deleted, false),
        eq(products.status, status)
    ];

    // Search Logic:
    // 1. Full Text Search on search_vector (title + description)
    // 2. Exact/Partial match on SKU
    // 3. JSONB value check on tags
    // We combine these with OR

    // For tsvector, we use @@ operator. 
    // plainto_tsquery('english', q) is safer than raw input
    const fullTextCondition = sql`${products.search_vector} @@ plainto_tsquery('english', ${searchQuery})`;

    // For SKU, simple ILIKE
    const skuCondition = sql`${products.sku} ILIKE ${`%${searchQuery}%`}`;

    // For Tags (JSONB), check if any tag element text matches partial query? 
    // Or just simple check if the query string exists in the text representation of tags
    const tagsCondition = sql`${products.tags}::text ILIKE ${`%${searchQuery}%`}`;

    // Combine search conditions
    const searchConditions = or(fullTextCondition, skuCondition, tagsCondition);
    if (searchConditions) {
        conditions.push(searchConditions);
    }

    // Execute Query
    const results = await db
        .select({
            id: products.id,
            slug: products.slug,
            product_title: products.product_title,
            selling_price: products.selling_price,
            compare_at_price: products.compare_at_price,
            primary_image_url: products.primary_image_url,
            category_tier_1: products.category_tier_1,
            tags: products.tags,
            rating: buildAverageRating(),
            reviews: buildReviewCount(),
            total_stock: buildInventoryQuantity(),
            // Add relevance score for sorting if needed, but standard order might be ok
            rank: sql<number>`ts_rank(${products.search_vector}, plainto_tsquery('english', ${searchQuery}))`,
            category_name: tiers.name
        })
        .from(products)
        .leftJoin(tiers, eq(products.category_tier_1, tiers.id))
        .leftJoin(
            reviews,
            and(
                eq(reviews.product_id, products.id),
                eq(reviews.status, 'approved'),
                eq(reviews.is_deleted, false)
            )
        )
        .where(and(...conditions))
        .groupBy(
            products.id,
            products.slug,
            products.product_title,
            products.selling_price,
            products.compare_at_price,
            products.primary_image_url,
            products.category_tier_1,
            products.tags,
            tiers.name
        )
        .orderBy(desc(sql`ts_rank(${products.search_vector}, plainto_tsquery('english', ${searchQuery}))`))
        .limit(limit)
        .offset(offset);

    // Get Total Count (approximate or separate query)
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions));

    const total = Number(countResult.count);
    const totalPages = Math.ceil(total / limit);

    // Transform to simple list item
    const data = results.map(p => ({
        id: p.id,
        slug: p.slug,
        name: p.product_title,
        price: Number(p.selling_price),
        originalPrice: p.compare_at_price ? Number(p.compare_at_price) : undefined,
        image: p.primary_image_url || '',
        rating: Number(p.rating),
        reviews: Number(p.reviews),
        inStock: Number(p.total_stock) > 0,
        tags: p.tags as string[],
        category: p.category_name, // Use name instead of ID
    }));

    return ResponseFormatter.success(res, {
        products: data,
        total,
        totalPages,
        page,
        limit
    }, 'Search results retrieved successfully');
};

const router = Router();
router.get('/products/search', (req, res, next) => {
    // This path in router.get is relative to the mount point in index.ts
    // If mounted at /products, this becomes /products/products/search which is WRONG
    // It should be just /search
    next();
});

// Since index.ts mounts at /products, we define route as /search
router.get('/search', handler);

export default router;
