/**
 * POST /api/users/send-otp
 * Send OTP to email for verification
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, emailSchema, HttpException, logger } from '../../../utils';
import { otpService } from '../services/otp.service';

// Validation Schema
const sendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(['email_verification', 'password_reset']).default('email_verification'),
});

type SendOtpDto = z.infer<typeof sendOtpSchema>;

const handler = async (req: Request, res: Response) => {
  const data: SendOtpDto = req.body;

  logger.info('Sending OTP', { email: data.email, purpose: data.purpose });

  try {
    const result = await otpService.generateAndSendOtp(data.email, data.purpose);

    ResponseFormatter.success(res, {
      success: result.success,
      expiresIn: result.expiresIn,
      message: 'Verification code sent to your email',
    }, 'OTP sent successfully');

  } catch (error: any) {
    logger.error('Error sending OTP:', { message: error.message });
    throw new HttpException(500, 'Failed to send verification code. Please try again.');
  }
};

const router = Router();

router.post(
  '/send-otp',
  validationMiddleware(sendOtpSchema),
  handler
);

export default router;
