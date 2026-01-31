/**
 * POST /api/auth/password-reset/request
 * Request password reset link via email using Supabase Auth (Public - no auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter } from '../../../utils';
import { requestPasswordReset } from '../services/supabase-auth.service';
import { emailSchema } from '../../../utils';

const schema = z.object({
  email: emailSchema,
});

type RequestPasswordResetDto = z.infer<typeof schema>;

export async function handleRequestPasswordReset(email: string) {
  const { error } = await requestPasswordReset(email);

  if (error) {
    // Don't reveal if email exists - return success always
    // This prevents user enumeration attacks
  }

  return {
    message: 'If the email exists, a password reset link has been sent',
  };
}

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email }: RequestPasswordResetDto = req.body;
    const result = await handleRequestPasswordReset(email);

    ResponseFormatter.success(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/password-reset/request', validationMiddleware(schema), handler);

export default router;
