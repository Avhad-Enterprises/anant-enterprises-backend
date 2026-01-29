import { eq, sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db, schema } from '../../../database';
import { users, type User, type NewUser } from './user.schema';
import { userCacheService } from '../services/user-cache.service';

type Database = NodePgDatabase<typeof schema> | PgTransaction<any, typeof schema, any>;

/**
 * Get distinct tags used in customers
 */
export const getDistinctUserTags = async (tx: Database = db): Promise<string[]> => {
  const query = sql`
        SELECT DISTINCT unnest(${users.tags}) as tag
        FROM ${users}
        WHERE ${users.is_deleted} = false
        AND ${users.tags} IS NOT NULL
        ORDER BY tag ASC
    `;

  const result = await tx.execute(query);
  return result.rows.map((row: any) => row.tag).filter(Boolean);
};

/**
 * Find user by ID (excluding deleted users) - CACHED
 * Uses Redis/memory cache for better performance
 */
export const findUserById = async (id: string): Promise<User | undefined> => {
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
export const createUser = async (userData: NewUser, tx: Database = db): Promise<User> => {
  const [newUser] = await tx.insert(users).values(userData).returning();

  return newUser;
};

/**
 * Update user by ID
 * Shared query used across services
 */
export const updateUserById = async (
  id: string,
  data: Partial<Omit<User, 'id'>>,
  tx: Database = db
): Promise<User | undefined> => {
  const [updatedUser] = await tx
    .update(users)
    .set({ ...data, updated_at: new Date() })
    .where(eq(users.id, id))
    .returning();

  return updatedUser;
};
