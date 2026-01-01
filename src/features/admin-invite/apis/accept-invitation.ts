/**
 * POST /api/admin/invitations/accept
 * Accept invitation and create user account with chosen password (Public - no auth)
 * User provides their own password - NO temp password verification needed
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
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';
import { loginWithSupabase } from '../../auth/services/supabase-auth.service';

const schema = z.object({
  token: z.string().length(64, 'Invalid invitation token'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

type AcceptInvitationDto = z.infer<typeof schema>;

async function handleAcceptInvitation(acceptData: AcceptInvitationDto) {
  const invitation = await findInvitationByToken(acceptData.token);

  if (!invitation) {
    logger.warn('Invalid invitation token used', {
      tokenPrefix: acceptData.token.substring(0, 8),
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

  // Check if user already exists (shouldn't happen, but safety check)
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, acceptData.email))
    .limit(1);

  if (existingUser) {
    throw new HttpException(409, 'User account already exists for this email');
  }

  // Create user in Supabase Auth using Admin API with user's chosen password
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: acceptData.email,
    password: acceptData.password,
    email_confirm: true, // Auto-confirm invited users
    user_metadata: {
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      invited_by: invitation.invited_by,
    },
  });

  if (authError || !authUser?.user) {
    logger.error('Failed to create Supabase Auth user for invitation', {
      email: acceptData.email,
      error: authError,
    });
    throw new HttpException(500, 'Failed to create user account');
  }

  // Sync to public.users table
  const [publicUser] = await db
    .insert(users)
    .values({
      auth_id: authUser.user.id,
      name: `${invitation.first_name} ${invitation.last_name}`,
      email: acceptData.email,
      password: '', // Managed by Supabase
      phone_number: '',
      created_by: invitation.invited_by,
      updated_by: invitation.invited_by,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  if (!publicUser) {
    throw new HttpException(500, 'Failed to create user record');
  }

  // Assign role via RBAC system
  if (invitation.assigned_role_id) {
    await assignRoleToUser(publicUser.id, invitation.assigned_role_id, invitation.invited_by);
  }

  // Login user with the password they just created
  const { data: authData, error: loginError } = await loginWithSupabase({
    email: acceptData.email,
    password: acceptData.password,
  });

  if (loginError || !authData?.user || !authData?.session) {
    logger.error('Failed to login user after account creation', {
      email: acceptData.email,
      error: loginError,
    });
    throw new HttpException(
      500,
      'Account created but login failed. Please try logging in manually.'
    );
  }

  // Mark invitation as accepted
  await updateInvitation(invitation.id, {
    status: 'accepted',
    accepted_at: new Date(),
    temp_password_encrypted: null, // Clear for security
  });

  logger.info('Invitation accepted successfully', {
    email: invitation.email,
    userId: publicUser.id,
    authId: authData.user.id,
    invitationId: invitation.id,
  });

  return {
    user: {
      id: publicUser.id,
      auth_id: authData.user.id,
      name: publicUser.name,
      email: publicUser.email,
      phone_number: publicUser.phone_number || undefined,
      created_at: publicUser.created_at,
      updated_at: publicUser.updated_at,
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
    const result = await handleAcceptInvitation(acceptData);

    ResponseFormatter.success(res, result, 'Account created successfully. Welcome!');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/accept', validationMiddleware(schema), handler);

export default router;
