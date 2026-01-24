/**
 * POST /api/tiers/bulk-delete
 * Bulk delete tiers
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray, eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { ids } = req.body;

  if (ids.length === 0) {
    return ResponseFormatter.success(res, null, 'No tiers selected');
  }

  // 1. Fetch all tiers to be deleted
  const targets = await db
    .select()
    .from(tiers)
    .where(inArray(tiers.id, ids));

  if (targets.length === 0) {
    return ResponseFormatter.success(res, null, 'No tiers found to delete');
  }

  const targetIds = targets.map(t => t.id);

  // 2. Check for active children (parent_id in targetIds AND is_deleted = false)
  // We strictly need to check if ANY active tier has one of these target IDs as parent.
  const activeChildren = await db
    .select({ count: sql<number>`count(*)` })
    .from(tiers)
    .where(
      and(
        inArray(tiers.parent_id, targetIds),
        eq(tiers.is_deleted, false)
      )
    );

  const childCount = Number(activeChildren[0]?.count || 0);
  if (childCount > 0) {
    throw new HttpException(
      409,
      'Cannot delete tiers because some have active sub-tiers. Please delete sub-tiers first.'
    );
  }

  // 3. Check for usage
  // If any target tier has usage_count > 0
  const usedTiers = targets.filter(t => t.usage_count > 0);
  if (usedTiers.length > 0) {
    throw new HttpException(
      409,
      `Cannot delete tiers because ${usedTiers.length} of them are assigned to products.`
    );
  }

  // 4. Soft Delete
  await db
    .update(tiers)
    .set({
      is_deleted: true,
      updated_at: new Date(),
    })
    .where(inArray(tiers.id, targetIds));

  ResponseFormatter.success(res, null, `${targets.length} tiers deleted successfully`);
};

const router = Router();
router.post(
  '/bulk-delete',
  requireAuth,
  requirePermission('tiers:delete'),
  validationMiddleware(bulkDeleteSchema),
  handler
);

export default router;
