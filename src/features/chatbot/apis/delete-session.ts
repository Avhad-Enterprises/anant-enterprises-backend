/**
 * Delete Session API
 *
 * DELETE /api/chatbot/sessions/:id
 *
 * Delete a chat session and all its messages.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { ResponseFormatter } from '../../../utils/helpers/responseFormatter';
import { asyncHandler } from '../../../utils/helpers/controllerHelpers';
import HttpException from '../../../utils/helpers/httpException';
import { logger } from '../../../utils/logging/logger';
import { getSessionByIdForUser, deleteSession } from '../shared/queries';
import { chatbotCacheService } from '../services/chatbot-cache.service';

// Params schema
const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Delete session handler
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = paramsSchema.parse(req.params);

  // Get session (verifies ownership)
  const session = await getSessionByIdForUser(id, userId);

  if (!session) {
    throw new HttpException(404, 'Session not found');
  }

  // Delete session (also deletes messages due to cascade in deleteSession)
  await deleteSession(id, userId);

  // Invalidate user's session cache
  await chatbotCacheService.invalidateUserSessions(userId);

  logger.info(`✅ Session ${id} deleted by user ${userId}`);

  ResponseFormatter.noContent(res);
});

const router = Router();

// DELETE /api/chatbot/sessions/:id - Delete session (all authenticated users)
router.delete('/sessions/:id', requireAuth, handler);

export default router;
