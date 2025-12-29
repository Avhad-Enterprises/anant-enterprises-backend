/**
 * POST /api/admin/invitations/accept
 * Accept invitation - verifies credentials via Supabase Auth (Public - no auth)
 * User manually enters credentials received via email along with the token from URL
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import { supabase } from '../../../utils/supabase';
import { findInvitationByToken, updateInvitation } from '../shared/queries';
import { assignRoleToUser } from '../../rbac';
import { db } from '../../../database';
import { users } from '../../user/shared/schema';
import { eq } from 'drizzle-orm';
import { loginWithSupabase } from '../../auth/services/supabase-auth.service';

const schema = z.object({
  token: z.string().length(64, 'Invalid invitation token'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type AcceptInvitationDto = z.infer<typeof schema>;

async function handleAcceptInvitation(acceptData: AcceptInvitationDto) {
  const invitation = await findInvitationByToken(acceptData.token);

  if (!invitation) {
    logger.warn('Invalid invitation token used', {
      tokenPrefix: acceptData.token.substring(0, 8)
    });
    throw new HttpException(404, 'Invalid or expired invitation token');
  }

  if (invitation.status !== 'pending') {
    throw new HttpException(400, `Invitation has already been ${invitation.status}`);
  }

  if (new Date() > invitation.expires_at) {
    await updateInvitation(invitation.id, { status: 'expired' });
    throw new HttpException(400, 'Invitation has expired');
  }

  // Verify email matches invitation
  if (invitation.email.toLowerCase() !== acceptData.email.toLowerCase()) {
    throw new HttpException(400, 'Email does not match invitation');
  }

  // Get the user from public.users table to find auth_id
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, acceptData.email))
    .limit(1);

  if (!existingUser) {
    throw new HttpException(500, 'User not found in database');
  }

  if (!existingUser.auth_id) {
    throw new HttpException(500, 'User auth_id is missing');
  }

  // Update user password in Supabase Auth
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existingUser.auth_id,
    { password: acceptData.password }
  );

  if (updateError) {
    logger.error('Failed to update user password', { error: updateError });
    throw new HttpException(500, 'Failed to update password');
  }

  // Now login with the new password
  const { data: authData, error: authError } = await loginWithSupabase({
    email: acceptData.email,
    password: acceptData.password,
  });

  if (authError || !authData?.user || !authData?.session) {
    throw new HttpException(401, 'Login failed after password update');
  }

  // Get the public.users record (again, in case it was updated)
  const publicUser = await db
    .select()
    .from(users)
    .where(eq(users.email, acceptData.email)) // Use email instead of auth_id until migration
    .limit(1);

  if (!publicUser[0]) {
    throw new HttpException(500, 'User sync failed');
  }

  // Assign role via RBAC system
  if (invitation.assigned_role_id) {
    await assignRoleToUser(publicUser[0].id, invitation.assigned_role_id, invitation.invited_by);
  }

  // Mark invitation as accepted
  await updateInvitation(invitation.id, {
    status: 'accepted',
    accepted_at: new Date(),
    temp_password_encrypted: null, // Clear for security
  });

  logger.info('Invitation accepted successfully', {
    email: invitation.email,
    userId: publicUser[0].id,
    authId: authData.user.id,
    invitationId: invitation.id
  });

  return {
    user: {
      id: publicUser[0].id,
      auth_id: authData.user.id,
      name: publicUser[0].name,
      email: publicUser[0].email,
      phone_number: publicUser[0].phone_number || undefined,
      created_at: publicUser[0].created_at,
      updated_at: publicUser[0].updated_at,
    },
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
      token_type: authData.session.token_type,
    },
  };
}

const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const acceptData: AcceptInvitationDto = req.body;
    const user = await handleAcceptInvitation(acceptData);

    ResponseFormatter.success(
      res,
      user,
      'Account created successfully. Welcome!'
    );
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/accept', validationMiddleware(schema), handler);

export default router;
