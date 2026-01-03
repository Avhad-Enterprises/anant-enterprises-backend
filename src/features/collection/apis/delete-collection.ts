/**
 * DELETE /api/collections/:id
 * Soft delete a collection
 * - Admin only
 * - Requires collections:delete permission
 * - Sets status to 'inactive'
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionCacheService } from '../services/collection-cache.service';

const paramsSchema = z.object({
    id: z.string().uuid('Invalid collection ID'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);

    // Check if collection exists
    const [collection] = await db
        .select({ id: collections.id, slug: collections.slug })
        .from(collections)
        .where(eq(collections.id, id))
        .limit(1);

    if (!collection) {
        throw new HttpException(404, 'Collection not found');
    }

    // Soft delete by setting status to inactive
    await db
        .update(collections)
        .set({
            status: 'inactive',
            updated_at: new Date(),
        })
        .where(eq(collections.id, id));

    // Invalidate all caches
    await collectionCacheService.invalidateCollectionById(id);
    await collectionCacheService.invalidateCollectionBySlug(collection.slug);
    await collectionCacheService.invalidateCache(); // Clear list caches

    return ResponseFormatter.success(
        res,
        null,
        'Collection deleted successfully'
    );
};

const router = Router();
router.delete('/:id', requireAuth, requirePermission('collections:delete'), handler);

export default router;
