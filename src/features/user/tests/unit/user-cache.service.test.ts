/**
 * User Cache Service Tests
 * 
 * Tests for the Redis-based user caching functionality.
 * Follows the same pattern as RBAC cache service tests.
 */

// Mock redis module first
jest.mock('../../../../utils', () => ({
    redisClient: {
        get: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        keys: jest.fn().mockResolvedValue([]),
    },
    isRedisReady: jest.fn().mockReturnValue(false), // Disable Redis for unit tests
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { UserCacheService } from '../../services/user-cache.service';
import { redisClient, isRedisReady } from '../../../../utils';

const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
const mockIsRedisReady = isRedisReady as jest.MockedFunction<typeof isRedisReady>;

describe('UserCacheService', () => {
    let cacheService: UserCacheService;

    const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        phone_number: '1234567890',
        is_deleted: false,
        created_at: new Date('2025-12-22T14:48:47.607Z'),
        updated_at: new Date('2025-12-22T14:48:47.607Z'),
        created_by: null,
        updated_by: null,
        deleted_by: null,
        deleted_at: null,
    };

    beforeEach(() => {
        // Create a fresh instance for each test
        cacheService = new UserCacheService();
        jest.clearAllMocks();
    });

    describe('getUserById - Redis cache', () => {
        it('should return user from Redis cache when available', async () => {
            mockIsRedisReady.mockReturnValue(true);
            const cachedUser = { ...mockUser, created_at: mockUser.created_at.toISOString(), updated_at: mockUser.updated_at.toISOString() };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

            const result = await cacheService.getUserById(1);

            expect(result).toEqual(cachedUser);
            expect(mockRedisClient.get).toHaveBeenCalledWith('user:id:1');
        });

        it('should handle Redis errors gracefully and fall back', async () => {
            mockIsRedisReady.mockReturnValue(true);
            mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

            // Should not throw - will fall back to memory/database
            await expect(cacheService.getUserById(1)).resolves.not.toThrow();
        });
    });

    describe('getUserByEmail', () => {
        it('should normalize email to lowercase', async () => {
            mockIsRedisReady.mockReturnValue(true);
            const cachedUser = { ...mockUser, created_at: mockUser.created_at.toISOString(), updated_at: mockUser.updated_at.toISOString() };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

            await cacheService.getUserByEmail('TEST@EXAMPLE.COM');

            expect(mockRedisClient.get).toHaveBeenCalledWith('user:email:test@example.com');
        });

        it('should return user from Redis cache when available', async () => {
            mockIsRedisReady.mockReturnValue(true);
            const cachedUser = { ...mockUser, created_at: mockUser.created_at.toISOString(), updated_at: mockUser.updated_at.toISOString() };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedUser));

            const result = await cacheService.getUserByEmail('test@example.com');

            expect(result).toEqual(cachedUser);
        });
    });

    describe('invalidateUser', () => {
        it('should clear user cache from Redis and memory', async () => {
            mockIsRedisReady.mockReturnValue(true);
            mockRedisClient.del.mockResolvedValue(1);

            await cacheService.invalidateUser(1, 'test@example.com');

            expect(mockRedisClient.del).toHaveBeenCalledWith([
                'user:id:1',
                'user:email:test@example.com',
            ]);
        });

        it('should handle Redis unavailable gracefully', async () => {
            mockIsRedisReady.mockReturnValue(false);

            // Should not throw
            await expect(cacheService.invalidateUser(1, 'test@example.com')).resolves.not.toThrow();
        });
    });

    describe('invalidateAll', () => {
        it('should clear all user caches from Redis', async () => {
            mockIsRedisReady.mockReturnValue(true);
            mockRedisClient.keys.mockResolvedValue(['user:id:1', 'user:id:2']);
            mockRedisClient.del.mockResolvedValue(2);

            await cacheService.invalidateAll();

            expect(mockRedisClient.keys).toHaveBeenCalledWith('user:id:*');
            expect(mockRedisClient.keys).toHaveBeenCalledWith('user:email:*');
        });

        it('should handle Redis errors gracefully', async () => {
            mockIsRedisReady.mockReturnValue(true);
            mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

            // Should not throw
            await expect(cacheService.invalidateAll()).resolves.not.toThrow();
        });
    });

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            mockIsRedisReady.mockReturnValue(true);
            mockRedisClient.keys.mockResolvedValue(['user:id:1', 'user:id:2']);

            const stats = await cacheService.getCacheStats();

            expect(stats).toEqual({
                redisAvailable: true,
                memoryCacheSize: expect.any(Number),
                redisCacheSize: 2,
            });
        });

        it('should handle Redis unavailable', async () => {
            mockIsRedisReady.mockReturnValue(false);

            const stats = await cacheService.getCacheStats();

            expect(stats).toEqual({
                redisAvailable: false,
                memoryCacheSize: expect.any(Number),
                redisCacheSize: undefined,
            });
        });
    });
});
