/**
 * Delete Document API
 *
 * DELETE /api/chatbot/documents/:id
 *
 * Admin-only endpoint to delete a document and its vectors.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import { getDocumentById, deleteDocument } from '../shared/queries';
import { deleteDocumentVectors } from '../services/vector.service';
import { chatbotCacheService } from '../services/chatbot-cache.service';

// Params schema
const paramsSchema = z.object({
  id: z.coerce.number().int().positive() });

/**
 * Delete document handler
 */
const handler =(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = paramsSchema.parse(req.params);

  // Get document to verify it exists
  const document = await getDocumentById(id);

  if (!document) {
    throw new HttpException(404, 'Document not found');
  }

  // Delete vectors from Pinecone if document was processed
  if (document.status === 'completed' && document.chunk_count > 0) {
    try {
      logger.info(`🗑️ Deleting vectors for document ${id}`);
      await deleteDocumentVectors(id);
      logger.info(`✅ Vectors deleted for document ${id}`);
    } catch (error) {
      logger.error(`⚠️ Failed to delete vectors for document ${id}:`, error);
      // Continue with document deletion even if vector deletion fails
    }
  }

  // Soft delete the document
  await deleteDocument(id, userId);

  // Invalidate document caches
  await chatbotCacheService.invalidateDocuments();

  logger.info(`✅ Document ${id} deleted by user ${userId}`);

  ResponseFormatter.noContent(res);
});

const router = Router();

// DELETE /api/chatbot/documents/:id - Delete document (admin only)
router.delete('/documents/:id', requireAuth, requirePermission('chatbot:documents'), handler);

export default router;
