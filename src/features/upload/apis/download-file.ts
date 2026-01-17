/**
 * GET /api/uploads/:id/download
 * Download file from S3 (Requires auth and ownership)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { HttpException } from '../../../utils';
import { downloadFromStorage } from '../../../utils/supabaseStorage';
import { findUploadById } from '../shared/queries';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Upload ID must be a positive integer'),
});

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

  const { blob, contentType, contentLength } = await downloadFromStorage(upload.file_path);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', contentLength);
  res.setHeader('Content-Disposition', `attachment; filename="${upload.original_filename}"`);

  // Convert Blob to Buffer and send
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  res.send(buffer);
};

const router = Router();
router.get('/:id/download', requireAuth, validationMiddleware(paramsSchema, 'params'), handler);

export default router;
