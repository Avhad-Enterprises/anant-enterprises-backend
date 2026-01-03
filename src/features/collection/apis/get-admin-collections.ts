/**
 * GET /api/admin/collections
 * Get all collections for admin
 * - Admin only
 * - Requires collections:read permission
 * - Returns ALL statuses (not just active)
 * - Includes product count per collection
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, count, sql, desc, ilike } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';

const querySchema = z.object({
    status: z.enum(['draft', 'active', 'inactive']).optional(),
    type: z.enum(['manual', 'automated']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest', 'title']).default('newest'),
});

interface AdminCollectionItem {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    type: string;
    status: string;
    productCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { status, type, search, page, limit, sort } = querySchema.parse(req.query);

    // Build base query for getting collections with product count
    // We'll use a CTE (Common Table Expression) for cleaner query
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

    // Build where conditions
    const conditions: any[] = [];

    if (status) {
        conditions.push(eq(collections.status, status));
    }

    if (type) {
        conditions.push(eq(collections.type, type));
    }

    if (search) {
        conditions.push(ilike(collections.title, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
        .select({ total: count() })
        .from(collections)
        .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Get collections with product count
    const collectionsData = await db
        .select({
            id: collections.id,
            title: collections.title,
            slug: collections.slug,
            description: collections.description,
            type: collections.type,
            status: collections.status,
            created_at: collections.created_at,
            updated_at: collections.updated_at,

            // Product count via subquery
            product_count: sql<number>`(
                SELECT COUNT(*)::int
                FROM ${collectionProducts}
                WHERE ${collectionProducts.collection_id} = ${collections.id}
            )`,
        })
        .from(collections)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

    // Format response
    const formattedCollections: AdminCollectionItem[] = collectionsData.map(col => ({
        id: col.id,
        title: col.title,
        slug: col.slug,
        description: col.description,
        type: col.type,
        status: col.status,
        productCount: Number(col.product_count) || 0,
        createdAt: col.created_at,
        updatedAt: col.updated_at,
    }));

    return ResponseFormatter.success(res, {
        collections: formattedCollections,
        total,
        totalPages,
        currentPage: page,
    }, 'Admin collections retrieved successfully');
};

const router = Router();
router.get('/admin/collections', requireAuth, requirePermission('collections:read'), handler);

export default router;
