/**
 * POST /api/auth/logout
 * Logout user (Requires auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Logout is simple - just return success
    // Token will naturally expire based on JWT expiration time
    ResponseFormatter.success(res, null, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

const router = Router();
// Only requireAuth needed - any authenticated user can logout
router.post('/logout', requireAuth, handler);

export default router;
