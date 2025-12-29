/**
 * Auth Shared Queries
 * 
 * Reusable database queries for auth operations
 */

import { db } from '../../../database';
import { users } from '../../user/shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}
