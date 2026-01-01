/**
 * DELETE /api/uploads/:id
 * Soft delete an upload
 *
 * Regular users: can only delete own uploads
 * Users with uploads:delete permission: can delete any upload
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { uploads } from '../shared/schema';
import { findUploadById, findUploadByIdAdmin } from '../shared/queries';
import { rbacCacheService } from '../../rbac';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Upload ID must be a positive integer'),
});

async function handleDeleteUpload(
  uploadId: number,
  userId: string,
  canDeleteAll: boolean
): Promise<void> {
  // Find upload based on permission
  let existingUpload;
  if (canDeleteAll) {
    existingUpload = await findUploadByIdAdmin(uploadId);
  } else {
    existingUpload = await findUploadById(uploadId, userId);
  }

  if (!existingUpload) {
    throw new HttpException(404, 'Upload not found');
  }

  const [deletedUpload] = await db
    .update(uploads)
    .set({
      is_deleted: true,
      deleted_by: userId,
      deleted_at: new Date(),
    })
    .where(eq(uploads.id, uploadId))
    .returning();

  if (!deletedUpload) {
    throw new HttpException(500, 'Failed to delete upload');
  }
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }
  const { id: uploadId } = paramsSchema.parse(req.params);

  // Check if user can delete any upload
  const canDeleteAll = await rbacCacheService.hasPermission(userId, 'uploads:delete');

  await handleDeleteUpload(uploadId, userId, canDeleteAll);

  ResponseFormatter.success(res, null, 'Upload deleted successfully');
};

const router = Router();
router.delete('/:id', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
