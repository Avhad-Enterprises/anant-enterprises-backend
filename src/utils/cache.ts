/**
 * General Redis Cache Utility
 * 
 * Provides a simple interface for caching any data with Redis
 * Falls back gracefully when Redis is unavailable
 */

import { redisClient, isRedisReady } from './redis';
import { logger } from './logger';

// Default TTL: 5 minutes
const DEFAULT_TTL = 300;

/**
 * Generic cache service for any data type
 */
export const cacheService = {
    /**
     * Get a cached value
     */
    async get<T>(key: string): Promise<T | null> {
        if (!isRedisReady()) {
            return null;
        }

        try {
            const cached = await redisClient.get(key);
            if (cached) {
                return JSON.parse(cached) as T;
            }
            return null;
        } catch (error) {
            logger.warn(`Cache get error for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Set a cached value with TTL
     */
    async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<boolean> {
        if (!isRedisReady()) {
            return false;
        }

        try {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.warn(`Cache set error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Delete a cached value
     */
    async del(key: string): Promise<boolean> {
        if (!isRedisReady()) {
            return false;
        }

        try {
            await redisClient.del(key);
            return true;
        } catch (error) {
            logger.warn(`Cache delete error for key ${key}:`, error);
            return false;
        }
    },

    /**
     * Delete all keys matching a pattern
     */
    async delPattern(pattern: string): Promise<number> {
        if (!isRedisReady()) {
            return 0;
        }

        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
            return keys.length;
        } catch (error) {
            logger.warn(`Cache pattern delete error for ${pattern}:`, error);
            return 0;
        }
    },

    /**
     * Check if Redis is available
     */
    isAvailable(): boolean {
        return isRedisReady();
    },

    /**
     * Get cache stats
     */
    async getStats(): Promise<{
        connected: boolean;
        keyCount?: number;
        memoryUsage?: string;
    }> {
        if (!isRedisReady()) {
            return { connected: false };
        }

        try {
            const info = await redisClient.info('memory');
            const keyCount = await redisClient.dbSize();
            const memoryMatch = info.match(/used_memory_human:(.+)/);

            return {
                connected: true,
                keyCount,
                memoryUsage: memoryMatch ? memoryMatch[1].trim() : undefined,
            };
        } catch (error) {
            logger.warn('Cache stats error:', error);
            return { connected: true };
        }
    },
};

/**
 * Cache key builders for consistent naming
 */
export const cacheKeys = {
    // User-related keys
    user: (userId: number) => `user:${userId}`,
    userProfile: (userId: number) => `user:profile:${userId}`,

    // Session keys
    session: (sessionId: string) => `session:${sessionId}`,

    // RBAC keys (also used in rbac-cache.service.ts)
    permissions: (userId: number) => `rbac:permissions:${userId}`,
    roles: (userId: number) => `rbac:roles:${userId}`,

    // API response cache
    apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${params}`,

    // Rate limiting keys
    rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

export default cacheService;
