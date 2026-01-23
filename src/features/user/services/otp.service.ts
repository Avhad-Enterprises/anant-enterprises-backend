/**
 * OTP Service
 * 
 * Handles generation, storage, and verification of email OTPs.
 * OTPs are 6-digit codes that expire after 5 minutes.
 */

import { db } from '../../../database';
import { emailOtps } from '../shared/email-otp.schema';
import { eq, and, gt, lt, isNull } from 'drizzle-orm';
import { logger } from '../../../utils';
import { emailService } from '../../../utils/email/email.service';

// OTP Configuration
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Generate a random 6-digit OTP
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * OTP Service class for email verification
 */
class OtpService {
  /**
   * Generate and send OTP to email
   * Invalidates any existing OTPs for the same email
   */
  async generateAndSendOtp(email: string, purpose: string = 'email_verification'): Promise<{ success: boolean; expiresIn: number }> {
    try {
      // Generate OTP code
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Delete any existing OTPs for this email and purpose
      await db.delete(emailOtps)
        .where(
          and(
            eq(emailOtps.email, email.toLowerCase()),
            eq(emailOtps.purpose, purpose)
          )
        );

      // Insert new OTP
      await db.insert(emailOtps).values({
        email: email.toLowerCase(),
        otp_code: otpCode,
        purpose,
        attempts: 0,
        max_attempts: MAX_ATTEMPTS,
        expires_at: expiresAt,
      });

      // Send OTP email
      await emailService.sendOtpEmail({
        to: email,
        otp: otpCode,
        expiresIn: `${OTP_EXPIRY_MINUTES} minutes`,
      });

      logger.info(`OTP sent successfully to ${email}`);

      return {
        success: true,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
      };
    } catch (error) {
      logger.error('Failed to generate/send OTP', { email, error });
      throw error;
    }
  }

  /**
   * Verify OTP code
   * Returns true if valid, throws error if invalid/expired
   * Also updates email_verified and email_verified_at in users table
   */
  async verifyOtp(email: string, code: string, purpose: string = 'email_verification'): Promise<{ verified: boolean }> {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();

    // Find valid OTP
    const [otp] = await db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.email, normalizedEmail),
          eq(emailOtps.purpose, purpose),
          gt(emailOtps.expires_at, now),
          isNull(emailOtps.verified_at)
        )
      )
      .limit(1);

    if (!otp) {
      logger.warn(`No valid OTP found for ${email}`);
      throw new Error('OTP expired or not found. Please request a new code.');
    }

    // Check attempts
    if (otp.attempts >= otp.max_attempts) {
      logger.warn(`Max OTP attempts exceeded for ${email}`);
      throw new Error('Maximum attempts exceeded. Please request a new code.');
    }

    // Verify code
    if (otp.otp_code !== code) {
      // Increment attempts
      await db
        .update(emailOtps)
        .set({ attempts: otp.attempts + 1 })
        .where(eq(emailOtps.id, otp.id));

      const remainingAttempts = otp.max_attempts - otp.attempts - 1;
      logger.warn(`Invalid OTP attempt for ${email}, ${remainingAttempts} attempts remaining`);
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }

    // Mark OTP as verified
    await db
      .update(emailOtps)
      .set({ verified_at: now })
      .where(eq(emailOtps.id, otp.id));

    // Update users table: set email_verified = true and email_verified_at
    const { users } = await import('../shared/user.schema');
    await db
      .update(users)
      .set({
        email_verified: true,
        email_verified_at: now
      })
      .where(eq(users.email, normalizedEmail));

    logger.info(`OTP verified successfully for ${email}, user email_verified updated`);

    return { verified: true };
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    await db
      .delete(emailOtps)
      .where(lt(emailOtps.expires_at, new Date()));

    return 0; // Drizzle doesn't return count easily
  }
}

// Export singleton instance
export const otpService = new OtpService();

// Export class for testing
export { OtpService };
