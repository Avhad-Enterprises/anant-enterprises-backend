/**
 * List Sessions API
 *
 * GET /api/chatbot/sessions
 *
 * Get user's chat sessions with pagination.
 */

import { Router, Response, Request } from 'express';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { paginationSchema } from '../../../utils/validation/common-schemas';
import { chatbotCacheService } from '../services/chatbot-cache.service';

/**
 * List sessions handler - CACHED
 */
const handler = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { page, limit } = paginationSchema.parse(req.query);

  const { sessions, total } = await chatbotCacheService.listUserSessions(userId, page, limit);

  ResponseFormatter.paginated(
    res,
    sessions.map(session => ({
      id: session.id,
      title: session.title || 'New Chat',
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    })),
    { page, limit, total },
    'Sessions retrieved successfully'
  );
};

const router = Router();

// GET /api/chatbot/sessions - List user's sessions (all authenticated users)
router.get('/sessions', requireAuth, handler);

export default router;
