/**
 * PUT /api/collections/:id
 * Update existing collection
 * - Admin only
 * - Requires collections:update permission
 * - Partial updates allowed
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionCacheService } from '../services/collection-cache.service';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid collection ID'),
});

const updateSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    slug: z.string()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
        .optional(),
    description: z.string().optional().nullable(),
    type: z.enum(['manual', 'automated']).optional(),
    status: z.enum(['draft', 'active', 'inactive']).optional(),
    sort_order: z.enum(['best-selling', 'price-asc', 'price-desc', 'manual', 'created-desc', 'created-asc']).optional(),
    banner_image_url: z.string().optional().nullable(),
    mobile_banner_image_url: z.string().optional().nullable(),
    meta_title: z.string().max(255).optional().nullable(),
    meta_description: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const validatedData = updateSchema.parse(req.body);

    // Check if collection exists
    const [existing] = await db
        .select()
        .from(collections)
        .where(eq(collections.id, id))
        .limit(1);

    if (!existing) {
        throw new HttpException(404, 'Collection not found');
    }

    // If updating slug, check uniqueness
    if (validatedData.slug && validatedData.slug !== existing.slug) {
        const [slugExists] = await db
            .select({ id: collections.id })
            .from(collections)
            .where(and(
                eq(collections.slug, validatedData.slug),
            ))
            .limit(1);

        if (slugExists && slugExists.id !== id) {
            throw new HttpException(400, 'Collection with this slug already exists');
        }
    }

    // Update collection
    const [updatedCollection] = await db
        .update(collections)
        .set({
            ...validatedData,
            updated_at: new Date(),
        })
        .where(eq(collections.id, id))
        .returning();

    // Invalidate cache
    await collectionCacheService.invalidateCollectionById(id);
    if (validatedData.slug) {
        await collectionCacheService.invalidateCollectionBySlug(validatedData.slug);
    }
    if (existing.slug) {
        await collectionCacheService.invalidateCollectionBySlug(existing.slug);
    }

    return ResponseFormatter.success(
        res,
        {
            id: updatedCollection.id,
            title: updatedCollection.title,
            slug: updatedCollection.slug,
            description: updatedCollection.description,
            type: updatedCollection.type,
            status: updatedCollection.status,
            bannerImage: updatedCollection.banner_image_url,
            mobileBannerImage: updatedCollection.mobile_banner_image_url,
            updatedAt: updatedCollection.updated_at,
        },
        'Collection updated successfully'
    );
};

const router = Router();
router.put('/:id', requireAuth, requirePermission('collections:update'), handler);

export default router;
