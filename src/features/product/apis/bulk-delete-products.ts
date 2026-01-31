/**
 * POST /api/products/bulk-delete
 * Bulk soft delete products (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { productCacheService } from '../services/product-cache.service';
import { softDeleteProduct } from '../shared/queries';
import { decrementTierUsage } from '../../tiers/services/tier-sync.service';
import { decrementTagUsage } from '../../tags/services/tag-sync.service';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { ids } = req.body;
  const userId = req.userId;
  
  let deletedCount = 0;
  const errors: string[] = [];

  // TODO: Can be optimized with a single transaction/query if needed, 
  // but looping ensures all side effects (cache, tier usage) are handled safely via existing logic.
  for (const id of ids) {
    try {
      const deletedProduct = await softDeleteProduct(id, userId!);

      if (deletedProduct) {
        deletedCount++;

        // Side effects
        // 1. Decrement Tier Usage
        await decrementTierUsage([
          deletedProduct.category_tier_1,
          deletedProduct.category_tier_2,
          deletedProduct.category_tier_3,
          deletedProduct.category_tier_4,
        ]);

        // 2. Decrement Tag Usage
        const tags = (deletedProduct.tags as string[]) || [];
        if (tags.length > 0) {
          await decrementTagUsage(tags);
        }

        // 3. Invalidate Cache
        await productCacheService.invalidateProduct(id, deletedProduct.sku, deletedProduct.slug);
      } else {
          console.warn(`[BulkDelete] softDeleteProduct returned null for ${id}`);
      }
    } catch (error: any) {
      console.error(`Failed to delete product ${id}:`, error);
      errors.push(id);
    }
  }

  if (deletedCount === 0 && errors.length > 0) {
      // If we failed to delete anything AND there were errors (e.g. all failed)
      // Return 200 with 0 count? Or 207 Multi-Status?
      // Keeping it simple: 200 with info
  }

  ResponseFormatter.success(res, { deletedCount, errors }, `Successfully deleted ${deletedCount} products`);
};

const router = Router();
router.post(
  '/bulk-delete',
  requireAuth,
  requirePermission('products:delete'),
  validationMiddleware(bulkDeleteSchema),
  handler
);

export default router;
