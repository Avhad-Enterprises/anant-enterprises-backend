import { supabaseAnon } from '../../../utils/supabase';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../utils/logging/logger';
import type { SyncUserData, AuthResponse } from '../shared/interface';

/**
 * Supabase Auth Service
 *
 * This service provides SERVER-SIDE utilities for Supabase Auth integration.
 *
 * IMPORTANT: Authentication (sign up, sign in, sign out) should be handled
 * by the FRONTEND using Supabase client libraries (@supabase/supabase-js).
 *
 * Backend responsibilities:
 * 1. Verify JWT tokens from Supabase Auth
 * 2. Sync users to public.users table (handled by auth middleware on first API request)
 * 3. Manage RBAC permissions
 * 4. Handle password reset flows
 *
 * Frontend responsibilities (using @supabase/supabase-js):
 * 1. supabase.auth.signUp() - User registration
 * 2. supabase.auth.signInWithPassword() - User login
 * 3. supabase.auth.signOut() - User logout
 * 4. supabase.auth.getSession() - Get current session
 */

/**
 * Verify Supabase Auth JWT and get user
 *
 * This function verifies the JWT token using Supabase's public keys
 * and returns the user information if valid.
 *
 * Used by auth middleware to authenticate API requests.
 *
 * @param token - JWT access token from Supabase Auth
 * @returns User object or null
 *
 * @example
 * ```typescript
 * const user = await verifySupabaseToken(token);
 * if (user) {
 *   console.log('User ID:', user.id);
 *   console.log('Email:', user.email);
 * }
 * ```
 */
export async function verifySupabaseToken(token: string) {
  try {
    const {
      data: { user },
      error,
    } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid Supabase token:', error?.message);
      return null;
    }

    logger.debug('Supabase token verified', {
      userId: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logger.error('Failed to verify Supabase token:', error);
    return null;
  }
}

/**
 * Request password reset for Supabase Auth user
 *
 * @param email - User's email address
 * @returns Success or error
 */
export async function requestPasswordReset(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }

    logger.info('Password reset email sent', { email });
    return { data: null, error: null };
  } catch (error) {
    logger.error('Failed to request password reset:', error);
    return { data: null, error };
  }
}

/**
 * Update password for authenticated Supabase Auth user
 *
 * @param accessToken - User's current access token
 * @param newPassword - New password
 * @returns Success or error
 */
export async function updatePassword(
  accessToken: string,
  newPassword: string
): Promise<AuthResponse> {
  try {
    // Create client with user's token
    const { data, error } = await supabaseAnon.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error('Password update error:', error);
      throw error;
    }

    logger.info('Password updated successfully', {
      userId: data.user?.id,
    });

    return { data, error: null };
  } catch (error) {
    logger.error('Failed to update password:', error);
    return { data: null, error };
  }
}

/**
 * Sync Supabase Auth user to public.users table
 *
 * This creates/updates a record in public.users table that matches
 * the Supabase Auth user, enabling RBAC integration.
 *
 * Called by auth middleware when a user makes their first API request.
 *
 * @param authId - Supabase Auth user ID (UUID)
 * @param userData - User data to sync
 */
export async function syncUserToPublicTable(authId: string, userData: SyncUserData): Promise<void> {
  try {
    // Check if user already exists with this email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user with auth_id
      await db
        .update(users)
        .set({
          auth_id: authId,
          updated_at: new Date(),
        })
        .where(eq(users.id, existingUser[0].id));

      logger.info('Synced Supabase Auth user to existing public.users record', {
        userId: existingUser[0].id,
        authId,
      });
    } else {
      // Create new user record with auth_id
      await db.insert(users).values({
        name: userData.name || 'User',
        email: userData.email,
        phone_number: userData.phone_number || '',
        password: '', // Placeholder - Supabase manages actual password
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('Created new public.users record from Supabase Auth', {
        authId,
        email: userData.email,
      });
    }
  } catch (error) {
    logger.error('Failed to sync user to public.users:', error);
    throw error;
  }
}

/**
 * Get user from public.users table by Supabase Auth ID
 *
 * @param authId - Supabase Auth user ID (UUID)
 * @returns User record or null
 */
export async function getUserByAuthId(authId: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, authId))
      .limit(1);

    return user[0] || null;
  } catch (error) {
    logger.error('Failed to get user by auth_id:', error);
    return null;
  }
}

/**
 * Login with Supabase Auth (for admin invite acceptance)
 *
 * NOTE: This is a temporary function for backward compatibility.
 * In frontend-first auth, login should be handled by the frontend.
 *
 * @param credentials - Email and password
 * @returns Auth data or error
 */
export async function loginWithSupabase(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      logger.error('Supabase login error:', error);
      throw error;
    }

    logger.info('User logged in via Supabase Auth', {
      userId: data.user?.id,
      email: credentials.email,
    });

    return { data, error: null };
  } catch (error) {
    logger.error('Failed to login with Supabase:', error);
    return { data: null, error };
  }
}
export async function migrateUserToSupabaseAuth(
  userId: string,
  password: string
): Promise<AuthResponse> {
  try {
    // Get existing user
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!existingUser[0]) {
      throw new Error('User not found');
    }

    const user = existingUser[0];

    // Create Supabase Auth account
    const { data, error } = await supabaseAnon.auth.signUp({
      email: user.email,
      password,
      options: {
        data: {
          name: user.name,
          phone_number: user.phone_number,
          migrated: true,
          original_user_id: userId,
        },
      },
    });

    if (error) {
      logger.error('Failed to migrate user to Supabase Auth:', error);
      throw error;
    }

    if (!data.user) {
      throw new Error('Migration succeeded but no user returned');
    }

    // Update public.users - remove password since Supabase manages it now
    await db
      .update(users)
      .set({
        password: '', // Empty string instead of null (until migration)
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info('User migrated to Supabase Auth', {
      userId,
      authId: data.user.id,
    });

    return { data, error: null };
  } catch (error) {
    logger.error('Failed to migrate user:', error);
    return { data: null, error };
  }
}
