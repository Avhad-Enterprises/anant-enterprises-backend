/**
 * POST /api/auth/password-reset/confirm
 * Reset password with token from email (Public - no auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { updatePassword } from '../services/supabase-auth.service';
import { shortTextSchema } from '../../../utils/validation/common-schemas';

const schema = z.object({
  access_token: shortTextSchema,
  new_password: shortTextSchema,
});

type ResetPasswordDto = z.infer<typeof schema>;

export async function handleResetPassword(accessToken: string, newPassword: string) {
  const { error } = await updatePassword(accessToken, newPassword);

  if (error) {
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Password reset failed';
    throw new HttpException(400, errorMessage);
  }

  return {
    message: 'Password reset successfully',
  };
}

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { access_token, new_password }: ResetPasswordDto = req.body;
    const result = await handleResetPassword(access_token, new_password);

    ResponseFormatter.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/password-reset/confirm', validationMiddleware(schema), handler);

export default router;
