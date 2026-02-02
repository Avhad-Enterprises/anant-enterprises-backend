/**
 * POST /api/users/verify-otp
 * Verify OTP code
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, emailSchema, logger } from '../../../utils';
import { otpService } from '../services/otp.service';

// Validation Schema
const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['email_verification', 'password_reset']).default('email_verification'),
});

type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

const handler = async (req: Request, res: Response) => {
  const data: VerifyOtpDto = req.body;

  logger.info('Verifying OTP', { email: data.email, purpose: data.purpose });

  const result = await otpService.verifyOtp(data.email, data.otp, data.purpose);

  ResponseFormatter.success(res, {
    verified: result.verified,
  }, 'Email verified successfully');
};

const router = Router();

router.post(
  '/verify-otp',
  validationMiddleware(verifyOtpSchema),
  handler
);

export default router;
