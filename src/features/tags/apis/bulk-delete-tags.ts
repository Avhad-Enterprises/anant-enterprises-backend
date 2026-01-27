/**
 * POST /api/tags/bulk-delete
 * Bulk delete tags
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { inArray } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { ids } = req.body;

  if (ids.length === 0) {
    return ResponseFormatter.success(res, null, 'No tags selected');
  }

  // Soft Delete
  await db
    .update(tags)
    .set({
      is_deleted: true,
      updated_at: new Date(),
    })
    .where(inArray(tags.id, ids));

  // Note: usage_count on products/other entities might be affected, 
  // but for soft delete we generally leave associations as is or handle them differently.
  // For now, mirroring simple soft delete logic.

  return ResponseFormatter.success(res, null, `${ids.length} tags deleted successfully`);
};

const router = Router();
router.delete(
  '/bulk',
  requireAuth,
  requirePermission('tags:delete'),
  validationMiddleware(bulkDeleteSchema),
  handler
);

export default router;
