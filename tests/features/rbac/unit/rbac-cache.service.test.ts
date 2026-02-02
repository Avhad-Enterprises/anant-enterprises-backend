/**
 * RBAC Cache Service Unit Tests
 *
 * Tests the caching behavior using mock database functions
 */

// Mock redis module first - use correct path from test file location
jest.mock('@/utils', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  },
  isRedisReady: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock queries module
jest.mock('@/features/rbac/shared/queries', () => ({
  findUserPermissions: jest.fn(),
  findUserRoles: jest.fn().mockResolvedValue([]),
}));

import { RBACCacheService } from '@/features/rbac/services/rbac-cache.service';
import { findUserPermissions, findUserRoles } from '@/features/rbac/shared/queries';

const mockFindUserPermissions = findUserPermissions as jest.MockedFunction<
  typeof findUserPermissions
>;
const mockFindUserRoles = findUserRoles as jest.MockedFunction<typeof findUserRoles>;

describe('RBACCacheService', () => {
  let cacheService: RBACCacheService;

  beforeEach(() => {
    // Create a fresh instance for each test
    cacheService = new RBACCacheService();
    jest.clearAllMocks();

    // Default mock setup
    mockFindUserRoles.mockResolvedValue([]);
  });

  describe('getUserPermissions', () => {
    it('should fetch permissions from database on first call', async () => {
      const userId = 'test-user-uuid-1';
      const mockPermissions = ['users:read', 'users:update:own'];
      mockFindUserPermissions.mockResolvedValue(mockPermissions);

      const result = await cacheService.getUserPermissions(userId);

      expect(result).toEqual(mockPermissions);
      expect(mockFindUserPermissions).toHaveBeenCalledWith(userId);
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(1);
    });

    it('should return cached permissions on subsequent calls', async () => {
      const userId = 'test-user-uuid-2';
      const mockPermissions = ['users:read', 'users:update:own'];
      mockFindUserPermissions.mockResolvedValue(mockPermissions);

      // First call - should hit database
      const result1 = await cacheService.getUserPermissions(userId);
      // Second call - should use cache
      const result2 = await cacheService.getUserPermissions(userId);

      expect(result1).toEqual(mockPermissions);
      expect(result2).toEqual(mockPermissions);
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(1); // Only once!
    });

    it('should cache different users separately', async () => {
      const user1Permissions = ['users:read'];
      const user2Permissions = ['admin:system', '*'];

      mockFindUserPermissions
        .mockResolvedValueOnce(user1Permissions)
        .mockResolvedValueOnce(user2Permissions);

      const result1 = await cacheService.getUserPermissions('user-uuid-1');
      const result2 = await cacheService.getUserPermissions('user-uuid-2');

      expect(result1).toEqual(user1Permissions);
      expect(result2).toEqual(user2Permissions);
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has the specific permission', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read', 'users:update']);

      const result = await cacheService.hasPermission('user-uuid-1', 'users:read');

      expect(result).toBe(true);
    });

    it('should return false if user does not have the permission', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read']);

      const result = await cacheService.hasPermission('user-uuid-1', 'users:delete');

      expect(result).toBe(false);
    });

    it('should return true if user has wildcard permission', async () => {
      mockFindUserPermissions.mockResolvedValue(['*']);

      const result = await cacheService.hasPermission('user-uuid-1', 'any:permission');

      expect(result).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all required permissions', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read', 'users:update', 'users:delete']);

      const result = await cacheService.hasAllPermissions('user-uuid-1', [
        'users:read',
        'users:update',
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read']);

      const result = await cacheService.hasAllPermissions('user-uuid-1', [
        'users:read',
        'users:delete',
      ]);

      expect(result).toBe(false);
    });

    it('should return true with wildcard for any permissions', async () => {
      mockFindUserPermissions.mockResolvedValue(['*']);

      const result = await cacheService.hasAllPermissions('user-uuid-1', [
        'users:read',
        'admin:system',
      ]);

      expect(result).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read']);

      const result = await cacheService.hasAnyPermission('user-uuid-1', [
        'users:read',
        'users:delete',
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      mockFindUserPermissions.mockResolvedValue(['uploads:read']);

      const result = await cacheService.hasAnyPermission('user-uuid-1', [
        'users:read',
        'users:delete',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('invalidateUser', () => {
    it('should clear cache for specific user', async () => {
      const mockPermissions = ['users:read'];
      mockFindUserPermissions.mockResolvedValue(mockPermissions);

      // Populate cache
      await cacheService.getUserPermissions('user-uuid-1');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(1);

      // Invalidate
      await cacheService.invalidateUser('user-uuid-1');

      // Should fetch again from database
      await cacheService.getUserPermissions('user-uuid-1');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(2);
    });

    it('should not affect other users cache', async () => {
      mockFindUserPermissions
        .mockResolvedValueOnce(['users:read'])
        .mockResolvedValueOnce(['admin:system'])
        .mockResolvedValueOnce(['users:read']);

      // Populate cache for both users
      await cacheService.getUserPermissions('user-uuid-1');
      await cacheService.getUserPermissions('user-uuid-2');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(2);

      // Invalidate only user 1
      await cacheService.invalidateUser('user-uuid-1');

      // User 2 should still be cached (no new call)
      await cacheService.getUserPermissions('user-uuid-2');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(2);

      // User 1 should fetch again
      await cacheService.getUserPermissions('user-uuid-1');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(3);
    });
  });

  describe('invalidateAll', () => {
    it('should clear entire cache', async () => {
      mockFindUserPermissions.mockResolvedValue(['users:read']);

      // Populate cache
      await cacheService.getUserPermissions('user-uuid-1');
      await cacheService.getUserPermissions('user-uuid-2');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(2);

      // Invalidate all
      await cacheService.invalidateAll();

      // Both should fetch again
      await cacheService.getUserPermissions('user-uuid-1');
      await cacheService.getUserPermissions('user-uuid-2');
      expect(mockFindUserPermissions).toHaveBeenCalledTimes(4);
    });
  });
});
