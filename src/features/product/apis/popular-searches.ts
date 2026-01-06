/**
 * GET /api/products/search/popular
 * Get popular/trending search terms
 * - Returns most frequent searches
 * - Can be pre-computed or cached
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { desc, sql, eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(20).default(10),
});

// In-memory search tracking (should be moved to Redis/DB for production)
const searchCounts = new Map<string, number>();

// Function to track a search (call this from search endpoint)
export function trackSearch(query: string) {
    const normalized = query.toLowerCase().trim();
    if (normalized.length > 2) {
        searchCounts.set(normalized, (searchCounts.get(normalized) || 0) + 1);
    }
}

// Get top searches
function getTopSearches(limit: number): { term: string; count: number }[] {
    const entries = Array.from(searchCounts.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, limit).map(([term, count]) => ({ term, count }));
}

const handler = async (req: Request, res: Response) => {
    const { limit } = querySchema.parse(req.query);

    // Get trending searches
    const trendingSearches = getTopSearches(limit);

    // If no search data, provide default popular categories
    if (trendingSearches.length < 5) {
        // Fallback: get top categories as suggestions
        const categories = await db
            .select({
                category: products.category_tier_1,
                count: sql<number>`COUNT(*)`,
            })
            .from(products)
            .where(and(
                eq(products.status, 'active'),
                eq(products.is_deleted, false),
                sql`${products.category_tier_1} IS NOT NULL`
            ))
            .groupBy(products.category_tier_1)
            .orderBy(desc(sql`COUNT(*)`))
            .limit(limit);

        const categoryTerms = categories.map(c => ({
            term: c.category as string,
            count: Number(c.count),
            type: 'category' as const,
        }));

        return ResponseFormatter.success(res, {
            searches: categoryTerms,
            source: 'categories',
        }, 'Popular categories retrieved');
    }

    return ResponseFormatter.success(res, {
        searches: trendingSearches.map(s => ({ ...s, type: 'search' as const })),
        source: 'trending',
    }, 'Popular searches retrieved');
};

const router = Router();
router.get('/search/popular', handler);

export default router;
