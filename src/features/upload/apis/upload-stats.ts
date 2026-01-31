/**
 * GET /api/uploads/stats
 * Get upload statistics (Requires auth)
 */

import { Router, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { uploads } from '../shared/upload.schema';
import { UploadStats } from '../shared/interface';

async function getUserUploadStats(userId: string): Promise<UploadStats> {
  // Fetch all non-deleted uploads for this user
  const allUploads = await db
    .select({
      status: uploads.status,
      file_size: uploads.file_size,
      mime_type: uploads.mime_type,
    })
    .from(uploads)
    .where(and(eq(uploads.user_id, userId), eq(uploads.is_deleted, false)));

  // Calculate stats manually
  const stats = {
    total_uploads: allUploads.length,
    total_size: 0,
    pending_count: 0,
    processing_count: 0,
    completed_count: 0,
    failed_count: 0,
  };

  const uploadsByTypeMap: Record<string, number> = {};

  for (const upload of allUploads) {
    stats.total_size += Number(upload.file_size) || 0;

    if (upload.status === 'pending') stats.pending_count++;
    else if (upload.status === 'processing') stats.processing_count++;
    else if (upload.status === 'completed') stats.completed_count++;
    else if (upload.status === 'failed') stats.failed_count++;

    uploadsByTypeMap[upload.mime_type] = (uploadsByTypeMap[upload.mime_type] || 0) + 1;
  }

  return {
    total_uploads: stats.total_uploads,
    total_size: stats.total_size,
    uploads_by_status: {
      pending: stats.pending_count,
      processing: stats.processing_count,
      completed: stats.completed_count,
      failed: stats.failed_count,
    },
    uploads_by_type: uploadsByTypeMap,
  };
}

const handler = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpException(401, 'User authentication required');
    }

    const stats = await getUserUploadStats(userId);

    ResponseFormatter.success(res, stats, 'Upload statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.get('/stats', requireAuth, handler);

export default router;
