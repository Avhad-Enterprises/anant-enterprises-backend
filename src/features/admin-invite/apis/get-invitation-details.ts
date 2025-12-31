/**
 * GET /api/admin/invitations/details
 * Get invitation details for pre-filling registration form (Public - no auth)
 * Used by frontend to display invitation info before user creates their password
 *
 * SECURITY:
 * - Returns ONLY first_name, last_name, email (NO password, NO role)
 * - Brute force protection via max verification attempts
 * - Validates invitation status and expiry
 */

import { Router, Request, Response } from 'express';
import { sql, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import { findInvitationByToken, updateInvitation } from '../shared/queries';
import { db } from '../../../database';
import { invitations } from '../shared/schema';

// Validation schema for query params
const querySchema = z.object({
  token: z
    .string()
    .length(64, 'Invalid invitation token format')
    .regex(/^[a-f0-9]+$/i, 'Invalid token format'),
});

// Max verification attempts before lockout (brute force protection)
const MAX_VERIFY_ATTEMPTS = 5;

interface InvitationDetailsResponse {
  first_name: string;
  last_name: string;
  email: string;
}

async function handleGetInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
  const invitation = await findInvitationByToken(token);

  if (!invitation) {
    logger.warn('Invitation not found for token', { tokenPrefix: token.substring(0, 8) });
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  // Check verification attempts (brute force protection)
  if (invitation.verify_attempts >= MAX_VERIFY_ATTEMPTS) {
    logger.warn('Max verification attempts exceeded', {
      invitationId: invitation.id,
      attempts: invitation.verify_attempts,
    });
    throw new HttpException(429, 'Too many verification attempts. Please contact administrator.');
  }

  // Increment verification attempts (do this early to count even failed attempts)
  await db
    .update(invitations)
    .set({ verify_attempts: sql`${invitations.verify_attempts} + 1` })
    .where(eq(invitations.id, invitation.id));

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  logger.info('Invitation details retrieved successfully', {
    email: invitation.email,
    invitationId: invitation.id,
  });

  // Return ONLY non-sensitive information for form pre-fill
  return {
    first_name: invitation.first_name,
    last_name: invitation.last_name,
    email: invitation.email,
  };
}

const handler = async (req: Request, res: Response): Promise<void> => {
  // Validate token from query params
  const { token } = querySchema.parse(req.query);
  const details = await handleGetInvitationDetails(token);

  ResponseFormatter.success(
    res,
    details,
    'Invitation details retrieved. Please create your password to continue.'
  );
};

const router = Router();
// GET method - public endpoint, no auth required
router.get('/details', handler);

export default router;
