import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle';
import { users, type User, type NewUser } from './schema';
import { userCacheService } from '../services/user-cache.service';

/**
 * Find user by ID (excluding deleted users) - CACHED
 * Uses Redis/memory cache for better performance
 */
export const findUserById = async (id: number): Promise<User | undefined> => {
  return userCacheService.getUserById(id);
};

/**
 * Find user by email (excluding deleted users) - CACHED
 * Uses Redis/memory cache for better performance
 */
export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  return userCacheService.getUserByEmail(email);
};

/**
 * Create a new user
 * Shared query used across services
 */
export const createUser = async (userData: NewUser): Promise<User> => {
  const [newUser] = await db
    .insert(users)
    .values(userData)
    .returning();

  return newUser;
};

/**
 * Update user by ID
 * Shared query used across services
 */
export const updateUserById = async (
  id: number,
  data: Partial<Omit<User, 'id'>>
): Promise<User | undefined> => {
  const [updatedUser] = await db
    .update(users)
    .set({ ...data, updated_at: new Date() })
    .where(eq(users.id, id))
    .returning();

  return updatedUser;
};
