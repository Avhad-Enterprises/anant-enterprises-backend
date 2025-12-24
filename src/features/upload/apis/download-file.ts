/**
 * GET /api/uploads/:id/download
 * Download file from S3 (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Readable } from 'stream';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { HttpException } from '../../../utils';
import { downloadFromS3 } from '../../../utils/s3Upload';
import { findUploadById } from '../shared/queries';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Upload ID must be a positive integer') });

const handler = async (req: RequestWithUser, res: Response) => {
  const { id: uploadId } = paramsSchema.parse(req.params);
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const upload = await findUploadById(uploadId, userId);

  if (!upload) {
    throw new HttpException(404, 'Upload not found');
  }

  const { stream, contentType, contentLength } = await downloadFromS3(upload.file_path);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', contentLength);
  res.setHeader('Content-Disposition', `attachment; filename="${upload.original_filename}"`);

  // S3 SDK returns a Readable stream
  (stream as Readable).pipe(res);
};

const router = Router();
router.get('/:id/download', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
