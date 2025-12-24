/**
 * POST /api/uploads
 * Upload file to S3 and create record (Requires auth)
 */

import { Router, Response, Request, NextFunction } from 'express';
// Import to ensure global Express interface extension is loaded
import '../../../interfaces/request.interface';
import { requireAuth } from '../../../middlewares';
import { uploadSingleFileMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { uploadToS3 } from '../../../utils/s3Upload';
import { db } from '../../../database';
import { uploads } from '../shared/schema';
import { Upload } from '../shared/interface';

async function handleCreateUpload(file: Express.Multer.File, userId: number): Promise<Upload> {
  const s3Result = await uploadToS3(file.buffer, file.originalname, file.mimetype, userId);

  const [upload] = await db.insert(uploads).values({
    filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    file_path: s3Result.key,
    file_url: s3Result.url,
    user_id: userId,
    created_by: userId
  }).returning();

  if (!upload) {
    throw new HttpException(500, 'Failed to create upload record');
  }

  return {
    ...upload,
    created_at: upload.created_at.toISOString(),
    updated_at: upload.updated_at.toISOString(),
    deleted_at: upload.deleted_at?.toISOString()
  } as Upload;
}

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new HttpException(401, 'User authentication required');
    }
    const file = req.file;

    if (!file) {
      throw new HttpException(400, 'No file uploaded');
    }

    const upload = await handleCreateUpload(file, userId);

    ResponseFormatter.created(res, upload, 'File uploaded successfully');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/', requireAuth, uploadSingleFileMiddleware, handler);

export default router;
