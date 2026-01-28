/**
 * DELETE /api/products/:id
 * Soft delete product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';

import { RequestWithUser } from '../../../interfaces';
import { uuidSchema } from '../../../utils';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { softDeleteProduct } from '../shared/queries';
import { productCacheService } from '../services/product-cache.service';
import { decrementTierUsage } from '../../tiers/services/tier-sync.service';
import { decrementTagUsage } from '../../tags/services/tag-sync.service';

const paramsSchema = z.object({
  id: uuidSchema,
});

async function deleteProduct(
  id: string,
  deletedBy: string
): Promise<{ sku: string; slug: string }> {
  // Use shared soft delete query
  // Note: We don't need findProductById check separately if we trust the update returns null if not found,
  // but preserving the 404 behavior is good practice if needed before action.
  // However, for efficiency, we can try to update directly.
  
  const deletedProduct = await softDeleteProduct(id, deletedBy);

  if (!deletedProduct) {
      // If null, it means product didn't exist or was already deleted (if query filters is_deleted)
      // But softDeleteProduct query doesn't filter is_deleted in update, so standard update behavior.
      throw new HttpException(404, 'Product not found');
  }

  // Decrement tier usage counts
  await decrementTierUsage([
    deletedProduct.category_tier_1,
    deletedProduct.category_tier_2,
    deletedProduct.category_tier_3,
    deletedProduct.category_tier_4,
  ]);

  // Decrement tag usage counts
  const tags = (deletedProduct.tags as string[]) || [];
  if (tags.length > 0) {
    await decrementTagUsage(tags);
  }

  return { sku: deletedProduct.sku, slug: deletedProduct.slug };
}

const handler = async (req: RequestWithUser, res: Response) => {
  const { id } = paramsSchema.parse(req.params);
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const { sku, slug } = await deleteProduct(id, userId);

  // Invalidate cache for deleted product
  await productCacheService.invalidateProduct(id, sku, slug);

  ResponseFormatter.success(res, null, 'Product deleted successfully');
};

const router = Router();
router.delete(
  '/:id',
  requireAuth,
  requirePermission('products:delete'),
  validationMiddleware(paramsSchema, 'params'),
  handler
);

export default router;
