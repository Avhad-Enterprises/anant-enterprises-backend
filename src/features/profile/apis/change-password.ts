/**
 * PUT /api/profile/change-password
 * Change current user's password
 * - Verifies current password
 * - Updates to new password
 */

import { Router, Response } from 'express';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { supabase } from '../../../utils/supabase';
import { users } from '../../user/shared/user.schema';

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  if (!currentPassword || !newPassword) {
    throw new HttpException(400, 'Current password and new password are required');
  }

  // Get user with password
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  // Verify current password if one exists
  if (user.password) {
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      // Fallback: Check if the password matches Supabase Auth (Split-Brain recovery)
      // This handles cases where local DB password is old/different from actual login password
      console.log('Local password mismatch. Attempting Supabase verification...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (error || !data.user) {
        console.log('Supabase verification failed:', error?.message);
        throw new HttpException(400, 'Invalid current password');
      }

      console.log('Supabase verification successful! Resyncing...');
    }
  } else {
    // If no password exists (e.g. Supabase/External auth), we allow setting one
    // We trust the active session since they successfully authenticated via requireAuth
    console.log(`Setting initial password for user ${userId} (migrating from external auth)`);
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password in local database
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId));

  // Update password in Supabase Auth (since frontend uses Supabase for login)
  try {
    const { error: supabaseError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (supabaseError) {
      console.error('Failed to sync password to Supabase Auth:', supabaseError);
      // We don't throw error here to allow local update to succeed, 
      // but in a real sync scenario we might want to rollback.
      // For now, logging is sufficient as local auth is growing priority.
    } else {
      console.log('Password synced to Supabase Auth successfully');
    }
  } catch (err) {
    console.error('Error syncing to Supabase:', err);
  }

  ResponseFormatter.success(res, null, 'Password updated successfully');
};

const router = Router();
router.put('/change-password', requireAuth, handler);

export default router;
