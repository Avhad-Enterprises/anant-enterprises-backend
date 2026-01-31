/**
 * Get Session API
 *
 * GET /api/chatbot/sessions/:id
 *
 * Get a specific chat session with all its messages.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { paginationSchema } from '../../../utils/validation/common-schemas';
import { getSessionByIdForUser, getSessionMessages } from '../shared/queries';

// Params schema
const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Get session handler
 */
const handler = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = paramsSchema.parse(req.params);
  const { page, limit } = paginationSchema.parse(req.query);

  // Get session (verifies ownership)
  const session = await getSessionByIdForUser(id, userId);

  if (!session) {
    throw new HttpException(404, 'Session not found');
  }

  // Get messages for the session
  const { messages, total } = await getSessionMessages(id, page, limit);

  ResponseFormatter.success(
    res,
    {
      session: {
        id: session.id,
        title: session.title || 'New Chat',
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        createdAt: msg.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Session retrieved successfully'
  );
};

const router = Router();

// GET /api/chatbot/sessions/:id - Get session with messages (all authenticated users)
router.get('/sessions/:id', requireAuth, handler);

export default router;
