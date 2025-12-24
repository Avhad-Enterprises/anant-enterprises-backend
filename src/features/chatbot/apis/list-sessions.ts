/**
 * List Sessions API
 *
 * GET /api/chatbot/sessions
 *
 * Get user's chat sessions with pagination.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler } from '../../../utils';
import { chatbotCacheService } from '../services/chatbot-cache.service';

// Query params schema
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * List sessions handler - CACHED
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { page, limit } = querySchema.parse(req.query);

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
});

const router = Router();

// GET /api/chatbot/sessions - List user's sessions (all authenticated users)
router.get('/sessions', requireAuth, handler);

export default router;
