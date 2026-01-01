/**
 * Redis-based RBAC Cache Service
 *
 * Uses Redis for distributed caching of user permissions.
 * Falls back to in-memory caching if Redis is unavailable.
 */

import { findUserPermissions, findUserRoles } from '../shared/queries';
import { logger } from '../../../utils';
import { redisClient, isRedisReady } from '../../../utils';
import { ICachedPermissions } from '../shared/interface';

// Redis key prefixes
const PERMISSIONS_PREFIX = 'rbac:permissions:';
const ROLES_PREFIX = 'rbac:roles:';
const USER_CACHE_PREFIX = 'rbac:user:';

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 5 * 60;

class RBACCacheService {
  // Fallback in-memory cache when Redis is unavailable
  private memoryCache: Map<string, ICachedPermissions> = new Map();
  private readonly TTL = CACHE_TTL * 1000; // milliseconds for memory cache

  /**
   * Get user permissions from cache or database
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(`${PERMISSIONS_PREFIX}${userId}`);
        if (cached) {
          logger.debug(`RBAC Redis cache hit for user ${userId}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Redis error in getUserPermissions for user ${userId}:`, error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.memoryCache.get(userId);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`RBAC memory cache hit for user ${userId}`);
      return memoryCached.permissions;
    }

    // Cache miss - load from database
    logger.debug(`RBAC cache miss for user ${userId}, loading from database`);
    const permissions = await this.loadAndCachePermissions(userId);
    return permissions;
  }

  /**
   * Load permissions from DB and cache them
   */
  private async loadAndCachePermissions(userId: string): Promise<string[]> {
    const permissions = await findUserPermissions(userId);
    const userRolesData = await findUserRoles(userId);
    const roleIds = userRolesData.map(r => r.role.id);

    // Try to cache in Redis first
    if (isRedisReady()) {
      try {
        await redisClient.setEx(
          `${PERMISSIONS_PREFIX}${userId}`,
          CACHE_TTL,
          JSON.stringify(permissions)
        );
        logger.debug(`Cached permissions for user ${userId} in Redis`);
      } catch (error) {
        logger.warn(`Failed to cache permissions in Redis for user ${userId}:`, error);
      }
    }

    // Also cache in memory as fallback
    this.memoryCache.set(userId, {
      permissions,
      roleIds,
      expiresAt: Date.now() + this.TTL,
    });

    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // Check for wildcard permission (superadmin)
    if (permissions.includes('*')) {
      return true;
    }

    return permissions.includes(permission);
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  async hasAllPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // Wildcard grants all permissions
    if (permissions.includes('*')) {
      return true;
    }

    return requiredPermissions.every(required => permissions.includes(required));
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  async hasAnyPermission(userId: string, possiblePermissions: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // Wildcard grants all permissions
    if (permissions.includes('*')) {
      return true;
    }

    return possiblePermissions.some(perm => permissions.includes(perm));
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<{ id: number; name: string }[]> {
    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(`${ROLES_PREFIX}${userId}`);
        if (cached) {
          logger.debug(`RBAC Redis roles cache hit for user ${userId}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Redis error in getUserRoles for user ${userId}:`, error);
      }
    }

    // Load from database
    const rolesData = await findUserRoles(userId);
    const roles = rolesData.map(r => ({ id: r.role.id, name: r.role.name }));

    // Cache in Redis
    if (isRedisReady()) {
      try {
        await redisClient.setEx(`${ROLES_PREFIX}${userId}`, CACHE_TTL, JSON.stringify(roles));
      } catch (error) {
        logger.warn(`Failed to cache roles in Redis for user ${userId}:`, error);
      }
    }

    return roles;
  }

  /**
   * Invalidate cache for a specific user
   */
  async invalidateUser(userId: string): Promise<void> {
    // Clear from Redis
    if (isRedisReady()) {
      try {
        await redisClient.del(`${PERMISSIONS_PREFIX}${userId}`);
        await redisClient.del(`${ROLES_PREFIX}${userId}`);
        await redisClient.del(`${USER_CACHE_PREFIX}${userId}`);
        logger.debug(`Invalidated Redis cache for user ${userId}`);
      } catch (error) {
        logger.warn(`Failed to invalidate Redis cache for user ${userId}:`, error);
      }
    }

    // Clear from memory cache
    this.memoryCache.delete(userId);
    logger.debug(`Invalidated permission cache for user ${userId}`);
  }

  /**
   * Invalidate all cached permissions
   */
  async invalidateAll(): Promise<void> {
    // Clear from Redis using pattern matching
    if (isRedisReady()) {
      try {
        const keys = await redisClient.keys(`${PERMISSIONS_PREFIX}*`);
        const roleKeys = await redisClient.keys(`${ROLES_PREFIX}*`);
        const userKeys = await redisClient.keys(`${USER_CACHE_PREFIX}*`);
        const allKeys = [...keys, ...roleKeys, ...userKeys];

        if (allKeys.length > 0) {
          await redisClient.del(allKeys);
        }
        logger.info(`Invalidated ${allKeys.length} RBAC cache entries in Redis`);
      } catch (error) {
        logger.warn('Failed to invalidate all Redis cache:', error);
      }
    }

    // Clear memory cache
    this.memoryCache.clear();
    logger.info('Invalidated all RBAC permission caches');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisAvailable: boolean;
    memoryCacheSize: number;
    redisCacheSize?: number;
  }> {
    const stats = {
      redisAvailable: isRedisReady(),
      memoryCacheSize: this.memoryCache.size,
      redisCacheSize: undefined as number | undefined,
    };

    if (isRedisReady()) {
      try {
        const keys = await redisClient.keys(`${PERMISSIONS_PREFIX}*`);
        stats.redisCacheSize = keys.length;
      } catch (error) {
        logger.warn('Failed to get Redis cache stats:', error);
      }
    }

    return stats;
  }
}

// Export singleton instance
export const rbacCacheService = new RBACCacheService();

// Export class for testing
export { RBACCacheService };
