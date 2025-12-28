/**
 * POST /api/auth/refresh-token
 * Refresh access token (Requires auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { authRateLimit } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { verifyToken, generateToken, generateRefreshToken } from '../../../utils';
import { findUserById } from '../../user';
import { IAuthUserWithToken } from '../../../interfaces';

const schema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function handleRefreshToken(refreshToken: string): Promise<IAuthUserWithToken> {
  const decoded = verifyToken(refreshToken);

  if (typeof decoded === 'string' || !decoded.id) {
    throw new HttpException(401, 'Invalid refresh token format');
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  const newToken = generateToken(
    {
      id: user.id,
      email: user.email,
    },
    '24h'
  );
  const newRefreshToken = generateRefreshToken({
    id: user.id,
  });

  return {
    id: user.id,
    email: user.email,
    phone_number: user.phone_number || undefined,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token: newToken,
    refreshToken: newRefreshToken,
  };
}

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new HttpException(400, 'Refresh token is required');
    }

    const result = await handleRefreshToken(refreshToken);

    ResponseFormatter.success(res, result, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

const router = Router();
// No auth required - the refresh token itself is validated
// Rate limited to prevent abuse (same as auth endpoints)
router.post('/refresh-token', authRateLimit, validationMiddleware(schema), handler);

export default router;
