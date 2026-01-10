/**
 * GET /api/products/search/autocomplete
 * Fast search suggestions for autocomplete
 * - Returns top 8 product title matches
 * - Includes category suggestions
 * - Optimized for speed
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { sql, eq, and, or } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { getSearchTerms, buildProductSearchConditions, calculateRelevanceScore } from '../shared/search-utils';

const querySchema = z.object({
    q: z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(10).default(8),
});

interface AutocompleteResult {
    type: 'product' | 'category';
    value: string;
    slug?: string;
    image?: string | null;
    price?: string;
}

const handler = async (req: Request, res: Response) => {
    const { q, limit } = querySchema.parse(req.query);

    // Use shared search logic
    const terms = getSearchTerms(q);
    const { exactMatch, allTermsMatch, anyTermMatch, searchPattern } = buildProductSearchConditions(q, terms);

    // Combine logic
    const whereClause = and(
        eq(products.status, 'active'),
        eq(products.is_deleted, false),
        or(exactMatch, allTermsMatch, anyTermMatch)
    );

    // Search products by title (fast query with limit)
    const productResults = await db
        .select({
            id: products.id,
            title: products.product_title,
            slug: products.slug,
            image: products.primary_image_url,
            price: products.selling_price,
            relevance: calculateRelevanceScore(searchPattern, terms).as('relevance')
        })
        .from(products)
        .where(whereClause)
        .orderBy(sql`relevance DESC`, products.product_title)
        .limit(limit);

    // Get unique categories from matching products
    // We can use the same fuzzy logic to find relevant categories
    const categoryResults = await db
        .selectDistinct({
            category: products.category_tier_1,
        })
        .from(products)
        .where(and(
            eq(products.status, 'active'),
            eq(products.is_deleted, false),
            or(exactMatch, allTermsMatch, anyTermMatch)
        ))
        .limit(3);

    // Format results
    const suggestions: AutocompleteResult[] = [];

    // Add category suggestions first (more prominent)
    for (const cat of categoryResults) {
        if (cat.category) {
            suggestions.push({
                type: 'category',
                value: cat.category,
            });
        }
    }

    // Add product suggestions
    for (const prod of productResults) {
        suggestions.push({
            type: 'product',
            value: prod.title,
            slug: prod.slug,
            image: prod.image,
            price: prod.price,
        });
    }

    return ResponseFormatter.success(res, {
        query: q,
        suggestions,
        count: suggestions.length,
    }, 'Autocomplete suggestions retrieved');
};

const router = Router();
router.get('/search/autocomplete', handler);

export default router;
