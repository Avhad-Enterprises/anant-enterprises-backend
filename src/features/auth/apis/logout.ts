/**
 * POST /api/auth/logout
 * Logout user (Requires auth)
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler } from '../../../utils';

const handler = asyncHandler(async (req: Request, res: Response) => {
  // Logout is simple - just return success
  // Token will naturally expire based on JWT expiration time
  ResponseFormatter.success(res, null, 'Logout successful');
});

const router = Router();
// Only requireAuth needed - any authenticated user can logout
router.post('/logout', requireAuth, handler);

export default router;
