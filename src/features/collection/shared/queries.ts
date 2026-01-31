import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { collections, type Collection, type NewCollection } from './collection.schema';
import { collectionCacheService } from '../services/collection-cache.service';

/**
 * Find collection by ID (only active) - CACHED
 * Uses Redis/memory cache for better performance
 */
export const findCollectionById = async (id: string): Promise<Collection | undefined> => {
  return collectionCacheService.getCollectionById(id);
};

/**
 * Find collection by slug (only active) - CACHED
 * Uses Redis/memory cache for better performance
 */
export const findCollectionBySlug = async (slug: string): Promise<Collection | undefined> => {
  return collectionCacheService.getCollectionBySlug(slug);
};

/**
 * Create a new collection
 * Shared query used across services
 */
export const createCollection = async (collectionData: NewCollection): Promise<Collection> => {
  const [newCollection] = await db.insert(collections).values(collectionData).returning();

  // Invalidate cache
  await collectionCacheService.invalidateCache();

  return newCollection;
};

/**
 * Update collection by ID
 * Shared query used across services
 */
export const updateCollectionById = async (
  id: string,
  data: Partial<Omit<Collection, 'id'>>
): Promise<Collection | undefined> => {
  const [updatedCollection] = await db
    .update(collections)
    .set({ ...data, updated_at: new Date() })
    .where(eq(collections.id, id))
    .returning();

  // Invalidate cache
  if (updatedCollection) {
    await collectionCacheService.invalidateCollectionById(id);
    if (updatedCollection.slug) {
      await collectionCacheService.invalidateCollectionBySlug(updatedCollection.slug);
    }
  }

  return updatedCollection;
};

/**
 * Get all active collections
 * No caching - used for admin lists
 */
export const getAllActiveCollections = async (): Promise<Collection[]> => {
  return db
    .select()
    .from(collections)
    .where(eq(collections.status, 'active'))
    .orderBy(collections.created_at);
};
