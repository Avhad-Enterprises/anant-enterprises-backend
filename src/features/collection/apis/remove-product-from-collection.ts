/**
 * DELETE /api/collections/:id/products/:productId
 * Remove product from collection
 * - Admin only
 * - Requires collections:update permission
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException, uuidSchema } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { collectionProducts } from '../shared/collection-products.schema';
import { collectionCacheService } from '../services/collection-cache.service';

const paramsSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { id: collectionId, productId } = paramsSchema.parse(req.params);

  // Check if collection exists
  const [collection] = await db
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) {
    throw new HttpException(404, 'Collection not found');
  }

  // Check if product is in collection
  const [association] = await db
    .select()
    .from(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collection_id, collectionId),
        eq(collectionProducts.product_id, productId)
      )
    )
    .limit(1);

  if (!association) {
    throw new HttpException(404, 'Product not found in this collection');
  }

  // Delete association
  await db
    .delete(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collection_id, collectionId),
        eq(collectionProducts.product_id, productId)
      )
    );

  // Update collection's updated_at
  await db
    .update(collections)
    .set({ updated_at: new Date() })
    .where(eq(collections.id, collectionId));

  // Invalidate cache
  await collectionCacheService.invalidateCollectionById(collectionId);
  await collectionCacheService.invalidateCollectionBySlug(collection.slug);

  return ResponseFormatter.success(res, null, 'Product removed from collection successfully');
};

const router = Router();
router.delete(
  '/:id/products/:productId',
  requireAuth,
  requirePermission('collections:update'),
  handler
);

export default router;
