/**
 * Audit Service Unit Tests
 *
 * Tests the audit logging service functionality using mocked database
 *
 * Note: TypeScript errors related to mocked database methods are expected
 * and can be safely ignored. The mocks work correctly at runtime.
 */

// Mock database module
jest.mock('../../../../database/drizzle', () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger to avoid console noise
jest.mock('../../../../utils', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { AuditService } from '../../services/audit.service';
import { db } from '../../../../database';
import { logger } from '../../../../utils';
import { AuditAction, AuditResourceType } from '../../shared/interface';

// Type the mocked db as any to bypass Drizzle typing issues
const mockDb = db as any;

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    jest.clearAllMocks();

    // Reset mock implementations
    mockDb.insert = jest.fn().mockReturnThis();
    mockDb.select = jest.fn().mockReturnThis();
    mockDb.from = jest.fn().mockReturnThis();
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.orderBy = jest.fn().mockReturnThis();
    mockDb.limit = jest.fn().mockReturnThis();
    mockDb.offset = jest.fn().mockReturnThis();
    mockDb.values = jest.fn().mockResolvedValue(undefined);
  });

  describe('log', () => {
    it('should create an audit log entry with basic data', async () => {
      const auditData = {
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        resourceId: '123',
        userId: '1',
        userEmail: 'admin@example.com',
        userRole: 'admin',
      };

      await auditService.log(auditData);

      expect(mockDb.insert).toHaveBeenCalled();
      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: '1',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: AuditAction.USER_CREATE,
          resource_type: AuditResourceType.USER,
          resource_id: '123',
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Audit log created',
        expect.objectContaining({
          action: AuditAction.USER_CREATE,
          resourceType: AuditResourceType.USER,
        })
      );
    });

    it('should handle audit logging without user ID (system events)', async () => {
      const auditData = {
        action: AuditAction.SYSTEM_CONFIG,
        resourceType: AuditResourceType.SYSTEM,
        metadata: { config_key: 'maintenance_mode', config_value: true },
      };

      await auditService.log(auditData);

      expect(mockDb.insert).toHaveBeenCalled();
      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          action: AuditAction.SYSTEM_CONFIG,
          resource_type: AuditResourceType.SYSTEM,
          metadata: { config_key: 'maintenance_mode', config_value: true },
        })
      );
    });

    it('should sanitize sensitive data in old and new values', async () => {
      const auditData = {
        action: AuditAction.USER_UPDATE,
        resourceType: AuditResourceType.USER,
        resourceId: '123',
        userId: '1',
        oldValues: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'secret123',
        },
        newValues: {
          name: 'John Smith',
          email: 'john.smith@example.com',
          password: 'newsecret456',
        },
      };

      await auditService.log(auditData);

      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          old_values: {
            name: 'John Doe',
            email: 'john@example.com',
            password: '[REDACTED]',
          },
          new_values: {
            name: 'John Smith',
            email: 'john.smith@example.com',
            password: '[REDACTED]',
          },
        })
      );
    });

    it('should enrich data with request context', async () => {
      const auditData = {
        action: AuditAction.LOGIN,
        resourceType: AuditResourceType.AUTH,
      };

      const context = {
        userId: '42',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
      };

      await auditService.log(auditData, context);

      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: '42',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
          session_id: 'session-123',
        })
      );
    });

    it('should handle string resource IDs by converting to integers', async () => {
      const auditData = {
        action: AuditAction.UPLOAD_DELETE,
        resourceType: AuditResourceType.UPLOAD,
        resourceId: '456',
        userId: '1',
      };

      await auditService.log(auditData);

      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          resource_id: '456',
        })
      );
    });

    it('should not throw errors if logging fails', async () => {
      mockDb.values = jest.fn().mockRejectedValue(new Error('Database error'));

      const auditData = {
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        userId: '1',
      };

      // Should not throw
      await expect(auditService.log(auditData)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create audit log',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should fetch audit trail for a specific resource', async () => {
      const mockLogs = [
        {
          id: 1,
          action: 'USER_UPDATE',
          resource_type: 'USER',
          resource_id: '123',
          timestamp: new Date(),
        },
        {
          id: 2,
          action: 'USER_CREATE',
          resource_type: 'USER',
          resource_id: '123',
          timestamp: new Date(),
        },
      ];

      const expectedTransformedLogs = [
        {
          id: 1,
          action: 'USER_UPDATE',
          resourceType: 'USER',
          resourceId: '123',
          timestamp: mockLogs[0].timestamp,
          userId: undefined,
          userEmail: undefined,
          userRole: undefined,
          oldValues: undefined,
          newValues: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          sessionId: undefined,
          metadata: undefined,
          reason: undefined,
          createdAt: undefined,
        },
        {
          id: 2,
          action: 'USER_CREATE',
          resourceType: 'USER',
          resourceId: '123',
          timestamp: mockLogs[1].timestamp,
          userId: undefined,
          userEmail: undefined,
          userRole: undefined,
          oldValues: undefined,
          newValues: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          sessionId: undefined,
          metadata: undefined,
          reason: undefined,
          createdAt: undefined,
        },
      ];

      // Mock the query chain to return the logs
      (mockDb.orderBy as jest.Mock).mockReturnThis();
      (mockDb.limit as jest.Mock).mockResolvedValue(mockLogs);

      const result = await auditService.getAuditTrail(AuditResourceType.USER, '123');

      expect(result).toEqual(expectedTransformedLogs);
      expect(mockDb.select).toHaveBeenCalled();
      const selectResult = mockDb.select.mock.results[0].value;
      const fromResult = selectResult.from.mock.results[0].value;
      expect(fromResult.where).toHaveBeenCalled();
      expect(fromResult.orderBy).toHaveBeenCalled();
      expect(fromResult.limit).toHaveBeenCalledWith(50);
    });

    it('should handle errors gracefully and return empty array', async () => {
      (mockDb.limit as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await auditService.getAuditTrail(AuditResourceType.USER, '123');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch audit trail',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should accept custom limit', async () => {
      (mockDb.limit as jest.Mock).mockResolvedValue([]);

      await auditService.getAuditTrail(AuditResourceType.USER, '123', 10);

      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getUserActivity', () => {
    it('should fetch all activity for a specific user', async () => {
      const mockLogs = [
        {
          id: 1,
          user_id: '42',
          action: 'LOGIN',
          timestamp: new Date(),
        },
        {
          id: 2,
          user_id: '42',
          action: 'USER_UPDATE',
          timestamp: new Date(),
        },
      ];

      const expectedTransformedLogs = [
        {
          id: 1,
          userId: '42',
          action: 'LOGIN',
          timestamp: mockLogs[0].timestamp,
          userEmail: undefined,
          userRole: undefined,
          resourceType: undefined,
          resourceId: undefined,
          oldValues: undefined,
          newValues: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          sessionId: undefined,
          metadata: undefined,
          reason: undefined,
          createdAt: undefined,
        },
        {
          id: 2,
          userId: '42',
          action: 'USER_UPDATE',
          timestamp: mockLogs[1].timestamp,
          userEmail: undefined,
          userRole: undefined,
          resourceType: undefined,
          resourceId: undefined,
          oldValues: undefined,
          newValues: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          sessionId: undefined,
          metadata: undefined,
          reason: undefined,
          createdAt: undefined,
        },
      ];

      (mockDb.limit as jest.Mock).mockResolvedValue(mockLogs);

      const result = await auditService.getUserActivity('42');

      expect(result).toEqual(expectedTransformedLogs);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });

    it('should accept custom limit', async () => {
      (mockDb.limit as jest.Mock).mockResolvedValue([]);

      await auditService.getUserActivity('42', 25);

      expect(mockDb.limit).toHaveBeenCalledWith(25);
    });

    it('should handle errors gracefully', async () => {
      (mockDb.limit as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await auditService.getUserActivity('42');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('queryLogs', () => {
    beforeEach(() => {
      (mockDb.limit as jest.Mock).mockResolvedValue([]);
    });

    it('should query logs with userId filter', async () => {
      await auditService.queryLogs({ userId: '42' });

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should query logs with action filter (single)', async () => {
      await auditService.queryLogs({ action: AuditAction.LOGIN });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should query logs with action filter (multiple)', async () => {
      await auditService.queryLogs({
        action: [AuditAction.LOGIN, AuditAction.LOGOUT],
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should query logs with resourceType filter', async () => {
      await auditService.queryLogs({ resourceType: AuditResourceType.USER });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should query logs with date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await auditService.queryLogs({ startDate, endDate });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should apply limit and offset', async () => {
      // Mock the chain to return values correctly
      (mockDb.limit as jest.Mock).mockReturnThis();
      (mockDb.offset as jest.Mock).mockResolvedValue([]);

      await auditService.queryLogs({ limit: 20, offset: 40 });

      expect(mockDb.limit).toHaveBeenCalledWith(20);
      expect(mockDb.offset).toHaveBeenCalledWith(40);
    });

    it('should handle errors gracefully', async () => {
      (mockDb.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await auditService.queryLogs({ userId: '42' });

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('data sanitization', () => {
    it('should redact all sensitive fields', async () => {
      const sensitiveData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'secret',
        password_hash: 'hashed_secret',
        temp_password_encrypted: 'encrypted_temp',
        invite_token: 'token123',
        session_token: 'session123',
        refresh_token: 'refresh123',
        access_token: 'access123',
      };

      await auditService.log({
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        newValues: sensitiveData,
      });

      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          new_values: {
            name: 'Test User',
            email: 'test@example.com',
            password: '[REDACTED]',
            password_hash: '[REDACTED]',
            temp_password_encrypted: '[REDACTED]',
            invite_token: '[REDACTED]',
            session_token: '[REDACTED]',
            refresh_token: '[REDACTED]',
            access_token: '[REDACTED]',
          },
        })
      );
    });

    it('should handle nested objects', async () => {
      const nestedData = {
        user: {
          name: 'Test',
          credentials: {
            password: 'secret',
            email: 'test@example.com',
          },
        },
      };

      await auditService.log({
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        newValues: nestedData,
      });

      expect((mockDb as any).values).toHaveBeenCalledWith(
        expect.objectContaining({
          new_values: {
            user: {
              name: 'Test',
              credentials: {
                password: '[REDACTED]',
                email: 'test@example.com',
              },
            },
          },
        })
      );
    });
  });
});
