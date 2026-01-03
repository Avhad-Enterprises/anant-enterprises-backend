/**
 * POST /api/collections
 * Create new collection
 * - Admin only
 * - Requires collections:create permission
 * - Validates slug uniqueness
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections, type NewCollection } from '../shared/collection.schema';
import { collectionCacheService } from '../services/collection-cache.service';

const createSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    slug: z.string()
        .min(1, 'Slug is required')
        .max(255, 'Slug too long')
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
    description: z.string().optional(),
    type: z.enum(['manual', 'automated']).default('manual'),
    status: z.enum(['draft', 'active', 'inactive']).default('draft'),
    sort_order: z.enum(['best-selling', 'price-asc', 'price-desc', 'manual', 'created-desc', 'created-asc']).default('manual'),
    banner_image_url: z.string().optional(),
    mobile_banner_image_url: z.string().optional(),
    meta_title: z.string().max(255).optional(),
    meta_description: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const validatedData = createSchema.parse(req.body);

    // Check slug uniqueness
    const [existing] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.slug, validatedData.slug))
        .limit(1);

    if (existing) {
        throw new HttpException(400, 'Collection with this slug already exists');
    }

    // Create collection
    const newCollectionData: NewCollection = {
        ...validatedData,
        created_by: req.userId, // From auth middleware
    };

    const [newCollection] = await db
        .insert(collections)
        .values(newCollectionData)
        .returning();

    // Invalidate cache
    await collectionCacheService.invalidateCache();

    return ResponseFormatter.success(
        res,
        {
            id: newCollection.id,
            title: newCollection.title,
            slug: newCollection.slug,
            description: newCollection.description,
            type: newCollection.type,
            status: newCollection.status,
            bannerImage: newCollection.banner_image_url,
            mobileBannerImage: newCollection.mobile_banner_image_url,
            createdAt: newCollection.created_at,
        },
        'Collection created successfully',
        201
    );
};

const router = Router();
router.post('/', requireAuth, requirePermission('collections:create'), handler);

export default router;
