/**
 * List Documents API
 *
 * GET /api/chatbot/documents
 *
 * Admin-only endpoint to list all uploaded documents with pagination.
 */

import { Router, Response, Request } from 'express';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { paginationSchema } from '../../../utils/validation/common-schemas';
import { chatbotCacheService } from '../services/chatbot-cache.service';

/**
 * List documents handler - CACHED
 */
const handler = async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);

  const { documents, total } = await chatbotCacheService.listDocuments(page, limit);

  ResponseFormatter.paginated(
    res,
    documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      status: doc.status,
      chunkCount: doc.chunk_count,
      errorMessage: doc.error_message,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    { page, limit, total },
    'Documents retrieved successfully'
  );
};

/**
 * Get document stats handler - CACHED
 */
const statsHandler = async (_req: Request, res: Response) => {
  const stats = await chatbotCacheService.getDocumentStats();

  ResponseFormatter.success(res, stats, 'Document statistics retrieved successfully');
};

const router = Router();

// GET /api/chatbot/documents - List documents (admin only)
router.get('/documents', requireAuth, requirePermission('chatbot:documents'), handler);

// GET /api/chatbot/documents/stats - Get document statistics (admin only)
router.get('/documents/stats', requireAuth, requirePermission('chatbot:documents'), statsHandler);

export default router;
