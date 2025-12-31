describe('Cache Service', () => {
  let cacheService: any;
  let cacheKeys: any;
  let mockRedisClient: any;
  let mockIsRedisReady: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      // Mock dependencies
      jest.doMock('../../database/redis', () => ({
        redisClient: {
          get: jest.fn(),
          setEx: jest.fn(),
          del: jest.fn(),
          keys: jest.fn(),
          dbSize: jest.fn(),
          info: jest.fn(),
        },
        isRedisReady: jest.fn(),
      }));

      jest.doMock('../../logging/logger', () => ({
        logger: {
          warn: jest.fn(),
        },
      }));

      // Import after mocks are set up
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cacheModule = require('../../database/cache');
      cacheService = cacheModule.cacheService;
      cacheKeys = cacheModule.cacheKeys;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const redisModule = require('../../database/redis');
      mockRedisClient = redisModule.redisClient;
      mockIsRedisReady = redisModule.isRedisReady;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get method', () => {
    it('should return null when Redis is not ready', async () => {
      mockIsRedisReady.mockReturnValue(false);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return parsed JSON data when cache hit', async () => {
      mockIsRedisReady.mockReturnValue(true);
      const testData = { id: 1, name: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when cache miss', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set method', () => {
    it('should return false when Redis is not ready', async () => {
      mockIsRedisReady.mockReturnValue(false);

      const result = await cacheService.set('test-key', 'test-value');

      expect(result).toBe(false);
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should set value with default TTL', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', { data: 'test' });

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify({ data: 'test' })
      );
    });

    it('should set value with custom TTL', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', 'test-value', 600);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        600,
        JSON.stringify('test-value')
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.set('test-key', 'test-value');

      expect(result).toBe(false);
    });
  });

  describe('del method', () => {
    it('should return false when Redis is not ready', async () => {
      mockIsRedisReady.mockReturnValue(false);

      const result = await cacheService.del('test-key');

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should delete key successfully', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheService.del('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.del('test-key');

      expect(result).toBe(false);
    });
  });

  describe('delPattern method', () => {
    it('should return 0 when Redis is not ready', async () => {
      mockIsRedisReady.mockReturnValue(false);

      const result = await cacheService.delPattern('test:*');

      expect(result).toBe(0);
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });

    it('should delete keys matching pattern', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.keys.mockResolvedValue(['test:1', 'test:2', 'test:3']);
      mockRedisClient.del.mockResolvedValue(3);

      const result = await cacheService.delPattern('test:*');

      expect(result).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['test:1', 'test:2', 'test:3']);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await cacheService.delPattern('nonexistent:*');

      expect(result).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.keys.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheService.delPattern('test:*');

      expect(result).toBe(0);
    });
  });

  describe('isAvailable method', () => {
    it('should return Redis ready status', () => {
      mockIsRedisReady.mockReturnValue(true);
      expect(cacheService.isAvailable()).toBe(true);

      mockIsRedisReady.mockReturnValue(false);
      expect(cacheService.isAvailable()).toBe(false);
    });
  });

  describe('getStats method', () => {
    it('should return disconnected status when Redis not ready', async () => {
      mockIsRedisReady.mockReturnValue(false);

      const stats = await cacheService.getStats();

      expect(stats).toEqual({ connected: false });
    });

    it('should return cache statistics when Redis is ready', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.dbSize.mockResolvedValue(42);
      mockRedisClient.info.mockResolvedValue('used_memory_human:5.2M\nother_info:123');

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        connected: true,
        keyCount: 42,
        memoryUsage: '5.2M',
      });
      expect(mockRedisClient.dbSize).toHaveBeenCalled();
      expect(mockRedisClient.info).toHaveBeenCalledWith('memory');
    });

    it('should handle Redis errors in stats', async () => {
      mockIsRedisReady.mockReturnValue(true);
      mockRedisClient.dbSize.mockRejectedValue(new Error('Redis error'));

      const stats = await cacheService.getStats();

      expect(stats).toEqual({ connected: true });
    });
  });
});

describe('Cache Keys', () => {
  let cacheKeys: any;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cacheModule = require('../../database/cache');
    cacheKeys = cacheModule.cacheKeys;
  });

  describe('User keys', () => {
    it('should generate user cache key', () => {
      expect(cacheKeys.user(123)).toBe('user:123');
    });

    it('should generate user profile cache key', () => {
      expect(cacheKeys.userProfile(456)).toBe('user:profile:456');
    });
  });

  describe('Session keys', () => {
    it('should generate session cache key', () => {
      expect(cacheKeys.session('session-123')).toBe('session:session-123');
    });
  });

  describe('RBAC keys', () => {
    it('should generate permissions cache key', () => {
      expect(cacheKeys.permissions(789)).toBe('rbac:permissions:789');
    });

    it('should generate roles cache key', () => {
      expect(cacheKeys.roles(101)).toBe('rbac:roles:101');
    });
  });

  describe('API response keys', () => {
    it('should generate API response cache key', () => {
      expect(cacheKeys.apiResponse('/users', 'page=1&limit=10')).toBe('api:/users:page=1&limit=10');
    });
  });

  describe('Rate limit keys', () => {
    it('should generate rate limit cache key', () => {
      expect(cacheKeys.rateLimit('192.168.1.1', '/api/users')).toBe(
        'ratelimit:192.168.1.1:/api/users'
      );
    });
  });
});
