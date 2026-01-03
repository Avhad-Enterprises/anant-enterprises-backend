/**
 * GET /api/collections/featured
 * Get featured collections
 * - Public access
 * - Returns top 5 featured collections
 * - Uses tags field to identify featured collections
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(10).default(5),
});

interface FeaturedCollectionItem {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    bannerImage: string | null;
    mobileBannerImage: string | null;
    productCount: number;
}

const handler = async (req: Request, res: Response) => {
    const { limit } = querySchema.parse(req.query);

    // Get featured collections (containing "featured" tag in tags array)
    const featuredCollections = await db
        .select({
            id: collections.id,
            title: collections.title,
            slug: collections.slug,
            description: collections.description,
            banner_image_url: collections.banner_image_url,
            mobile_banner_image_url: collections.mobile_banner_image_url,

            // Product count via subquery
            product_count: sql<number>`(
                SELECT COUNT(*)::int
                FROM ${collectionProducts}
                WHERE ${collectionProducts.collection_id} = ${collections.id}
            )`,
        })
        .from(collections)
        .where(and(
            eq(collections.status, 'active'),
            sql`${collections.tags} @> '["featured"]'::jsonb`
        ))
        .limit(limit);

    // Format response
    const formattedCollections: FeaturedCollectionItem[] = featuredCollections.map(col => ({
        id: col.id,
        title: col.title,
        slug: col.slug,
        description: col.description,
        bannerImage: col.banner_image_url,
        mobileBannerImage: col.mobile_banner_image_url,
        productCount: Number(col.product_count) || 0,
    }));

    return ResponseFormatter.success(
        res,
        formattedCollections,
        'Featured collections retrieved successfully'
    );
};

const router = Router();
router.get('/featured', handler);

export default router;
