/**
 * GET /api/collections
 * Get all active collections
 * - Public access
 * - Returns active collections only
 * - Pagination support
 * - Optional type filter
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, count, desc } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';

const querySchema = z.object({
    type: z.enum(['manual', 'automated']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});

interface CollectionListItem {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    bannerImage: string | null;
    mobileBannerImage: string | null;
}

const handler = async (req: Request, res: Response) => {
    const { type, page, limit, sort } = querySchema.parse(req.query);

    // Build conditions
    const conditions = [eq(collections.status, 'active')];

    if (type) {
        conditions.push(eq(collections.type, type));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(collections)
        .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Determine sort order
    let orderBy;
    switch (sort) {
        case 'oldest':
            orderBy = collections.created_at;
            break;
        case 'title':
            orderBy = collections.title;
            break;
        case 'newest':
        default:
            orderBy = desc(collections.created_at);
            break;
    }

    // Get collections
    const collectionsData = await db
        .select({
            id: collections.id,
            title: collections.title,
            slug: collections.slug,
            description: collections.description,
            banner_image_url: collections.banner_image_url,
            mobile_banner_image_url: collections.mobile_banner_image_url,
        })
        .from(collections)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

    // Format response
    const formattedCollections: CollectionListItem[] = collectionsData.map(col => ({
        id: col.id,
        title: col.title,
        slug: col.slug,
        description: col.description,
        bannerImage: col.banner_image_url,
        mobileBannerImage: col.mobile_banner_image_url,
    }));

    return ResponseFormatter.success(res, {
        collections: formattedCollections,
        total,
        totalPages,
        currentPage: page,
    }, 'Collections retrieved successfully');
};

const router = Router();
router.get('/', handler);

export default router;
