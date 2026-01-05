/**
 * PUT /api/collections/:id/products/reorder
 * Reorder products within a collection
 * - Admin only
 * - Requires collections:update permission
 * - Bulk update positions
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';
import { collectionCacheService } from '../services/collection-cache.service';
import { uuidSchema } from '../../../utils/validation/common-schemas';

const paramsSchema = z.object({
    id: uuidSchema,
});

const bodySchema = z.object({
    products: z.array(z.object({
        productId: uuidSchema,
        position: z.number().int().min(1, 'Position must be at least 1'),
    })).min(1, 'At least one product is required'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id: collectionId } = paramsSchema.parse(req.params);
    const { products } = bodySchema.parse(req.body);

    // Check if collection exists
    const [collection] = await db
        .select({ id: collections.id, slug: collections.slug })
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);

    if (!collection) {
        throw new HttpException(404, 'Collection not found');
    }

    // Verify all products are in the collection
    const existingAssociations = await db
        .select({ product_id: collectionProducts.product_id })
        .from(collectionProducts)
        .where(eq(collectionProducts.collection_id, collectionId));

    const existingProductIds = new Set(existingAssociations.map(a => a.product_id));
    const invalidProducts = products.filter(p => !existingProductIds.has(p.productId));

    if (invalidProducts.length > 0) {
        throw new HttpException(400, `Products not found in collection: ${invalidProducts.map(p => p.productId).join(', ')}`);
    }

    // Update positions in a transaction
    await db.transaction(async (tx) => {
        for (const { productId, position } of products) {
            await tx
                .update(collectionProducts)
                .set({ position })
                .where(and(
                    eq(collectionProducts.collection_id, collectionId),
                    eq(collectionProducts.product_id, productId)
                ));
        }

        // Update collection's updated_at
        await tx
            .update(collections)
            .set({ updated_at: new Date() })
            .where(eq(collections.id, collectionId));
    });

    // Invalidate cache
    await collectionCacheService.invalidateCollectionById(collectionId);
    await collectionCacheService.invalidateCollectionBySlug(collection.slug);

    return ResponseFormatter.success(
        res,
        { reorderedCount: products.length },
        `${products.length} product(s) reordered successfully`
    );
};

const router = Router();
router.put('/:id/products/reorder', requireAuth, requirePermission('collections:update'), handler);

export default router;
