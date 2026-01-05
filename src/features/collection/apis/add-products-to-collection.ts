/**
 * POST /api/collections/:id/products
 * Add product(s) to collection
 * - Admin only
 * - Requires collections:update permission
 * - Supports single or bulk add
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';
import { products } from '../../product/shared/product.schema';
import { collectionCacheService } from '../services/collection-cache.service';

const paramsSchema = z.object({
    id: uuidSchema,
});

const bodySchema = z.object({
    productIds: z.array(uuidSchema).min(1, 'At least one product ID is required'),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { id: collectionId } = paramsSchema.parse(req.params);
    const { productIds } = bodySchema.parse(req.body);

    // Check if collection exists
    const [collection] = await db
        .select({ id: collections.id, slug: collections.slug })
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);

    if (!collection) {
        throw new HttpException(404, 'Collection not found');
    }

    // Verify all products exist and are active
    const existingProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(and(
            eq(products.status, 'active'),
            eq(products.is_deleted, false)
        ));

    const existingProductIds = new Set(existingProducts.map(p => p.id));
    const invalidIds = productIds.filter(id => !existingProductIds.has(id));

    if (invalidIds.length > 0) {
        throw new HttpException(400, `Invalid or inactive product IDs: ${invalidIds.join(', ')}`);
    }

    // Get max position for ordering
    const [maxPosResult] = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(${collectionProducts.position}), 0)` })
        .from(collectionProducts)
        .where(eq(collectionProducts.collection_id, collectionId));

    const maxPosition = maxPosResult?.maxPos || 0;

    // Check for existing product-collection associations
    const existing = await db
        .select({ product_id: collectionProducts.product_id })
        .from(collectionProducts)
        .where(eq(collectionProducts.collection_id, collectionId));

    const existingAssociations = new Set(existing.map(e => e.product_id));
    const newProductIds = productIds.filter(id => !existingAssociations.has(id));

    if (newProductIds.length === 0) {
        throw new HttpException(400, 'All products are already in this collection');
    }

    // Insert new associations with incremental positions
    const values = newProductIds.map((productId, index) => ({
        collection_id: collectionId,
        product_id: productId,
        position: maxPosition + index + 1,
    }));

    await db.insert(collectionProducts).values(values);

    // Update collection's updated_at
    await db
        .update(collections)
        .set({ updated_at: new Date() })
        .where(eq(collections.id, collectionId));

    // Invalidate cache
    await collectionCacheService.invalidateCollectionById(collectionId);
    await collectionCacheService.invalidateCollectionBySlug(collection.slug);

    return ResponseFormatter.success(
        res,
        {
            addedCount: newProductIds.length,
            skippedCount: productIds.length - newProductIds.length,
            addedProductIds: newProductIds,
        },
        `${newProductIds.length} product(s) added to collection`,
        201
    );
};

const router = Router();
router.post('/:id/products', requireAuth, requirePermission('collections:update'), handler);

export default router;
