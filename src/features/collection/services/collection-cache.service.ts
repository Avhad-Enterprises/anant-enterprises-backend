import { redisClient } from '../../../utils';
import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { collections, Collection } from '../shared/collection.schema';
import { logger } from '../../../utils';

/**
 * Collection Cache Service
 * 
 * Provides caching layer for collection data to reduce database load.
 * Uses Redis when available, falls back to in-memory cache.
 */
export class CollectionCacheService {
    private readonly CACHE_TTL = 3600; // 1 hour
    private readonly KEY_PREFIX = 'collection';
    private inMemoryCache: Map<string, { data: Collection; expires: number }> = new Map();

    /**
     * Get collection by ID (cached)
     */
    async getCollectionById(id: string): Promise<Collection | undefined> {
        const cacheKey = `${this.KEY_PREFIX}:id:${id}`;

        try {
            // Try Redis first
            if (redisClient?.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    logger.debug(`Collection cache HIT (Redis): ${id}`);
                    return JSON.parse(cached);
                }
            }

            // Try in-memory cache
            const memCached = this.inMemoryCache.get(cacheKey);
            if (memCached && memCached.expires > Date.now()) {
                logger.debug(`Collection cache HIT (Memory): ${id}`);
                return memCached.data;
            }

            // Cache miss - fetch from database
            logger.debug(`Collection cache MISS: ${id}`);
            const [collection] = await db
                .select()
                .from(collections)
                .where(and(
                    eq(collections.id, id),
                    eq(collections.status, 'active')
                ))
                .limit(1);

            if (collection) {
                await this.cacheCollection(collection);
            }

            return collection;
        } catch (error) {
            logger.error('Collection cache error:', error);
            // Fall back to direct database query on error
            const [collection] = await db
                .select()
                .from(collections)
                .where(and(
                    eq(collections.id, id),
                    eq(collections.status, 'active')
                ))
                .limit(1);
            return collection;
        }
    }

    /**
     * Get collection by slug (cached)
     */
    async getCollectionBySlug(slug: string): Promise<Collection | undefined> {
        const cacheKey = `${this.KEY_PREFIX}:slug:${slug}`;

        try {
            // Try Redis first
            if (redisClient?.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    logger.debug(`Collection cache HIT (Redis): ${slug}`);
                    return JSON.parse(cached);
                }
            }

            // Try in-memory cache
            const memCached = this.inMemoryCache.get(cacheKey);
            if (memCached && memCached.expires > Date.now()) {
                logger.debug(`Collection cache HIT (Memory): ${slug}`);
                return memCached.data;
            }

            // Cache miss - fetch from database
            logger.debug(`Collection cache MISS: ${slug}`);
            const [collection] = await db
                .select()
                .from(collections)
                .where(and(
                    eq(collections.slug, slug),
                    eq(collections.status, 'active')
                ))
                .limit(1);

            if (collection) {
                await this.cacheCollection(collection);
            }

            return collection;
        } catch (error) {
            logger.error('Collection cache error:', error);
            // Fall back to direct database query on error
            const [collection] = await db
                .select()
                .from(collections)
                .where(and(
                    eq(collections.slug, slug),
                    eq(collections.status, 'active')
                ))
                .limit(1);
            return collection;
        }
    }

    /**
     * Cache a collection
     */
    private async cacheCollection(collection: Collection): Promise<void> {
        const idKey = `${this.KEY_PREFIX}:id:${collection.id}`;
        const slugKey = `${this.KEY_PREFIX}:slug:${collection.slug}`;
        const data = JSON.stringify(collection);

        try {
            // Cache in Redis
            if (redisClient?.isOpen) {
                await Promise.all([
                    redisClient.setEx(idKey, this.CACHE_TTL, data),
                    redisClient.setEx(slugKey, this.CACHE_TTL, data),
                ]);
            }

            // Cache in memory as fallback
            const expires = Date.now() + this.CACHE_TTL * 1000;
            this.inMemoryCache.set(idKey, { data: collection, expires });
            this.inMemoryCache.set(slugKey, { data: collection, expires });
        } catch (error) {
            logger.error('Collection cache write error:', error);
        }
    }

    /**
     * Invalidate collection cache by ID
     */
    async invalidateCollectionById(id: string): Promise<void> {
        const cacheKey = `${this.KEY_PREFIX}:id:${id}`;

        try {
            if (redisClient?.isOpen) {
                await redisClient.del(cacheKey);
            }
            this.inMemoryCache.delete(cacheKey);
            logger.debug(`Collection cache invalidated: ${id}`);
        } catch (error) {
            logger.error('Collection cache invalidation error:', error);
        }
    }

    /**
     * Invalidate collection cache by slug
     */
    async invalidateCollectionBySlug(slug: string): Promise<void> {
        const cacheKey = `${this.KEY_PREFIX}:slug:${slug}`;

        try {
            if (redisClient?.isOpen) {
                await redisClient.del(cacheKey);
            }
            this.inMemoryCache.delete(cacheKey);
            logger.debug(`Collection cache invalidated: ${slug}`);
        } catch (error) {
            logger.error('Collection cache invalidation error:', error);
        }
    }

    /**
     * Invalidate all collection cache
     */
    async invalidateCache(): Promise<void> {
        try {
            if (redisClient?.isOpen) {
                const keys = await redisClient.keys(`${this.KEY_PREFIX}:*`);
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            }
            this.inMemoryCache.clear();
            logger.debug('All collection cache invalidated');
        } catch (error) {
            logger.error('Collection cache invalidation error:', error);
        }
    }

    /**
     * Clean up expired in-memory cache entries
     */
    cleanupExpired(): void {
        const now = Date.now();
        for (const [key, value] of this.inMemoryCache.entries()) {
            if (value.expires < now) {
                this.inMemoryCache.delete(key);
            }
        }
    }
}

// Singleton instance
export const collectionCacheService = new CollectionCacheService();

// Cleanup expired cache every 5 minutes
setInterval(() => {
    collectionCacheService.cleanupExpired();
}, 5 * 60 * 1000);
