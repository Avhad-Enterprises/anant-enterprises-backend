/**
 * POST /api/tiers/bulk-delete
 * Bulk delete tiers
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray, eq} from 'drizzle-orm';
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

  // 1. Fetch all active tiers to build hierarchy
  const allTiers = await db
    .select()
    .from(tiers)
    .where(eq(tiers.is_deleted, false));

  // 2. Build parent -> children map
  const parentMap = new Map<string, string[]>();
  allTiers.forEach(t => {
    if (t.parent_id) {
      if (!parentMap.has(t.parent_id)) {
        parentMap.set(t.parent_id, []);
      }
      parentMap.get(t.parent_id)?.push(t.id);
    }
  });

  // 3. Recursively collect all IDs to delete
  const idsToDelete = new Set<string>(ids);
  
  const collectDescendants = (parentId: string) => {
    const children = parentMap.get(parentId) || [];
    children.forEach(childId => {
      if (!idsToDelete.has(childId)) {
        idsToDelete.add(childId);
        collectDescendants(childId);
      }
    });
  };

  // Run collection for each initially selected ID
  ids.forEach((id: string) => collectDescendants(id));

  const finalTargetIds = Array.from(idsToDelete);

  if (finalTargetIds.length === 0) {
    return ResponseFormatter.success(res, null, 'No tiers found to delete');
  }

  // 4. Check for usage in ANY of the tiers to be deleted
  // We need to check usage_count for all collected tiers
  // Since we already fetched all tiers in step 1, we can filter them in memory
  const usedTiers = allTiers.filter(t => 
    finalTargetIds.includes(t.id) && t.usage_count > 0
  );

  if (usedTiers.length > 0) {
    throw new HttpException(
      409,
      `Cannot delete tiers because ${usedTiers.length} of them (or their sub-tiers) are assigned to products.`
    );
  }

  // 5. Soft Delete All
  await db
    .update(tiers)
    .set({
      is_deleted: true,
      updated_at: new Date(),
    })
    .where(inArray(tiers.id, finalTargetIds));

  return ResponseFormatter.success(res, null, `${finalTargetIds.length} tiers deleted successfully`);
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
