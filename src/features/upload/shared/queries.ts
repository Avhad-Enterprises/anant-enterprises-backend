import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import { uploads, type Upload as DrizzleUpload } from './schema';

/**
 * Find upload by ID (excluding deleted uploads)
 * Shared query used across multiple services
 * @param id - Upload ID
 * @param userId - Optional user ID for ownership verification
 */
export const findUploadById = async (
  id: number,
  userId?: number
): Promise<DrizzleUpload | undefined> => {
  const conditions = [
    eq(uploads.id, id),
    or(eq(uploads.is_deleted, false), isNull(uploads.is_deleted)),
  ];

  if (userId !== undefined) {
    conditions.push(eq(uploads.user_id, userId));
  }

  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(...conditions))
    .limit(1);

  return upload;
};

/**
 * Find upload by ID for admin (no ownership verification)
 * @param id - Upload ID
 */
export const findUploadByIdAdmin = async (id: number): Promise<DrizzleUpload | undefined> => {
  const [upload] = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, id), or(eq(uploads.is_deleted, false), isNull(uploads.is_deleted))))
    .limit(1);

  return upload;
};
