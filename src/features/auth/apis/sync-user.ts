/**
 * POST /api/auth/sync-user
 * Sync Supabase Auth user to public.users table
 *
 * This endpoint should be called after successful login/signup
 * to ensure the user exists in the public.users table with correct auth_id
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { RequestWithUser } from '../../../interfaces';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { logger, generateCustomerId } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { verifySupabaseToken } from '../services/supabase-auth.service';
import { shortTextSchema, optionalPhoneSchema } from '../../../utils/validation/common-schemas';


const syncUserSchema = z.object({
  name: shortTextSchema.optional(),
  phone_number: optionalPhoneSchema,
});

const handler = async (req: RequestWithUser, res: Response) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpException(401, 'Authentication required');
  }

  const token = authHeader.substring(7);

  // Verify token with Supabase
  const authUser = await verifySupabaseToken(token);
  if (!authUser) {
    throw new HttpException(401, 'Invalid or expired token');
  }

  // Get validated body data from middleware
  const bodyData = req.body;

  // Extract email verification status from Supabase Auth
  const emailVerified = !!authUser.email_confirmed_at;
  const emailVerifiedAt = authUser.email_confirmed_at
    ? new Date(authUser.email_confirmed_at)
    : null;

  // Check if user already exists with this auth_id
  let existingUser = await db.select().from(users).where(eq(users.auth_id, authUser.id)).limit(1);

  if (existingUser[0]) {
    // User already synced - but update email verification if status changed
    if (existingUser[0].email_verified !== emailVerified) {
      await db
        .update(users)
        .set({
          email_verified: emailVerified,
          email_verified_at: emailVerifiedAt,
          updated_at: new Date(),
        })
        .where(eq(users.id, existingUser[0].id));

      logger.info('Updated email verification status for user', {
        userId: existingUser[0].id,
        authId: authUser.id,
        emailVerified,
      });
    }

    return ResponseFormatter.success(
      res,
      {
        id: existingUser[0].id,
        synced: false,
        message: 'User already exists',
      },
      'User already synced'
    );
  }

  // Check if user exists with this email (but no auth_id)
  existingUser = await db.select().from(users).where(eq(users.email, authUser.email!)).limit(1);

  if (existingUser[0]) {
    // Link existing user to Supabase auth and update email verification
    await db
      .update(users)
      .set({
        auth_id: authUser.id,
        email_verified: emailVerified,
        email_verified_at: emailVerifiedAt,
        updated_at: new Date(),
      })
      .where(eq(users.id, existingUser[0].id));

    logger.info('Linked existing user to Supabase Auth', {
      userId: existingUser[0].id,
      authId: authUser.id,
      emailVerified,
    });

    return ResponseFormatter.success(
      res,
      {
        id: existingUser[0].id,
        synced: true,
        message: 'Linked existing user',
      },
      'User synced successfully'
    );
  }

  // Create new user
  const fullName =
    bodyData.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';
  const nameParts = fullName.trim().split(' ');
  const first_name = nameParts[0] || 'User';
  const last_name = nameParts.slice(1).join(' ') || '';

  // Ensure unique customer_id
  let customerId = generateCustomerId();
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.customer_id, customerId))
      .limit(1);
    if (!existing) break;
    customerId = generateCustomerId();
    attempts++;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      auth_id: authUser.id,
      first_name,
      last_name,
      email: authUser.email!,
      phone_number: bodyData.phone_number || authUser.phone || '',
      customer_id: customerId,
      email_verified: emailVerified,
      email_verified_at: emailVerifiedAt,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  logger.info('Created new user from Supabase Auth', {
    userId: newUser.id,
    authId: authUser.id,
    email: authUser.email,
    emailVerified,
  });

  return ResponseFormatter.created(
    res,
    {
      id: newUser.id,
      synced: true,
      message: 'New user created',
    },
    'User synced successfully'
  );
};

const router = Router();
router.post('/sync-user', validationMiddleware(syncUserSchema), handler);

export default router;

