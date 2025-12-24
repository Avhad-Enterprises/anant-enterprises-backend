/**
 * POST /api/admin/invitations
 * Create invitation with auto-generated secure password (Admin only)
 * User will receive email with invite link, credentials shown on verification
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { sendInvitationEmail } from '../../../utils';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils';
import { encrypt, generateSecurePassword } from '../../../utils';
import { hashPassword } from '../../../utils';

import { createInvitation, findInvitationByEmail } from '../shared/queries';
import { findUserByEmail } from '../../user';
import { ICreateInvitation, IInvitation } from '../shared/interface';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email format'),
  assigned_role_id: z.number().int().positive('Role ID must be a positive integer') });

type CreateInvitationDto = z.infer<typeof schema>;

/** Invitation expiry in hours */
const INVITATION_EXPIRY_HOURS = 24;

async function handleCreateInvitation(
  invitationData: ICreateInvitation & { first_name: string; last_name: string },
  invitedBy: number
): Promise<IInvitation> {
  // Check if user already exists
  const existingUser = await findUserByEmail(invitationData.email);
  if (existingUser) {
    throw new HttpException(409, 'A user with this email already exists');
  }

  // Check for existing pending invitation
  const existingInvitation = await findInvitationByEmail(invitationData.email);
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new HttpException(409, 'An active invitation already exists for this email');
  }

  // Generate secure random token (64 chars hex)
  const inviteToken = randomBytes(32).toString('hex');

  // Generate secure temporary password
  const tempPassword = generateSecurePassword(16);

  // Encrypt temp password (for retrieval during verification)
  const tempPasswordEncrypted = encrypt(tempPassword);

  // Hash password (for actual login verification)
  const passwordHash = await hashPassword(tempPassword);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITATION_EXPIRY_HOURS);

  const newInvitation = await createInvitation({
    first_name: invitationData.first_name,
    last_name: invitationData.last_name,
    email: invitationData.email,
    assigned_role_id: invitationData.assigned_role_id,
    invite_token: inviteToken,
    temp_password_encrypted: tempPasswordEncrypted,
    password_hash: passwordHash,
    invited_by: invitedBy,
    expires_at: expiresAt,
    status: 'pending' });

  // Send invitation email with credentials
  try {
    const frontendUrl = config.FRONTEND_URL.replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invitation?invite_token=${inviteToken}`;

    await sendInvitationEmail({
      to: invitationData.email,
      firstName: invitationData.first_name,
      lastName: invitationData.last_name,
      inviteLink,
      expiresIn: `${INVITATION_EXPIRY_HOURS} hours`,
      tempPassword, // Include credentials in email
    });
  } catch (emailError) {
    logger.error('Failed to send invitation email', {
      email: invitationData.email,
      error: emailError
    });
  }

  // Return response without sensitive fields
  return {
    id: newInvitation.id,
    first_name: newInvitation.first_name,
    last_name: newInvitation.last_name,
    email: newInvitation.email,
    status: newInvitation.status,
    assigned_role_id: newInvitation.assigned_role_id,
    temp_password_encrypted: newInvitation.temp_password_encrypted,
    password_hash: newInvitation.password_hash,
    verify_attempts: newInvitation.verify_attempts,
    invited_by: newInvitation.invited_by,
    expires_at: newInvitation.expires_at,
    accepted_at: newInvitation.accepted_at,
    created_at: newInvitation.created_at,
    updated_at: newInvitation.updated_at,
    is_deleted: newInvitation.is_deleted,
    deleted_by: newInvitation.deleted_by,
    deleted_at: newInvitation.deleted_at };
}

const handler = async (req: RequestWithUser, res: Response): Promise<void> => {
  const invitationData: CreateInvitationDto = req.body;
  const invitedBy = req.userId;
  if (!invitedBy) {
    throw new HttpException(401, 'User authentication required');
  }

  const invitation = await handleCreateInvitation(invitationData, invitedBy);

  ResponseFormatter.success(res, invitation, 'Invitation sent successfully');
};

const router = Router();
router.post('/', requireAuth, requirePermission('admin:invitations'), validationMiddleware(schema), handler);

export default router;
