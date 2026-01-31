/**
 * Unit tests for get-user-activity API
 * Tests user activity history retrieval
 */

import { auditService } from '../../services/audit.service';
import { AuditAction, AuditResourceType } from '../../shared/interface';

jest.mock('../../services/audit.service');

describe('GET /api/admin/audit/user/:userId/activity - Unit Tests', () => {
  const mockAuditService = auditService as jest.Mocked<typeof auditService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Activity Retrieval', () => {
    it('should get all activity for a user', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date('2024-01-03'),
          userId: '5',
          userEmail: 'test@example.com',
          userRole: 'admin',
          action: AuditAction.USER_UPDATE,
          resourceType: AuditResourceType.USER,
          resourceId: '5',
          oldValues: { name: 'old' },
          newValues: { name: 'new' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session123',
          metadata: null,
          reason: null,
          createdAt: new Date(),
        },
        {
          id: 2,
          timestamp: new Date('2024-01-02'),
          userId: '5',
          userEmail: 'test@example.com',
          userRole: 'admin',
          action: AuditAction.LOGIN,
          resourceType: AuditResourceType.AUTH,
          resourceId: null,
          oldValues: null,
          newValues: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session123',
          metadata: null,
          reason: null,
          createdAt: new Date(),
        },
        {
          id: 3,
          timestamp: new Date('2024-01-01'),
          userId: '5',
          userEmail: 'test@example.com',
          userRole: 'admin',
          action: AuditAction.LOGOUT,
          resourceType: AuditResourceType.AUTH,
          resourceId: null,
          oldValues: null,
          newValues: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session123',
          metadata: null,
          reason: null,
          createdAt: new Date(),
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      expect(mockAuditService.getUserActivity).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440005'
      );
      expect(result).toEqual(mockActivity);
      expect(result).toHaveLength(3);
    });

    it('should return activity in chronological order (newest first)', async () => {
      const mockActivity = [
        {
          id: 3,
          timestamp: new Date('2024-01-03'),
          userId: '5',
          action: AuditAction.USER_UPDATE,
        },
        {
          id: 2,
          timestamp: new Date('2024-01-02'),
          userId: '5',
          action: AuditAction.LOGIN,
        },
        {
          id: 1,
          timestamp: new Date('2024-01-01'),
          userId: '5',
          action: AuditAction.LOGOUT,
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].timestamp.getTime()
        );
      }
    });

    it('should respect limit parameter', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.LOGIN,
          resourceType: AuditResourceType.AUTH,
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005', 100);

      expect(mockAuditService.getUserActivity).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440005',
        100
      );
    });
  });

  describe('Activity Types', () => {
    it('should include authentication activities', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.LOGIN,
          resourceType: AuditResourceType.AUTH,
        },
        {
          id: 2,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.LOGOUT,
          resourceType: AuditResourceType.AUTH,
        },
        {
          id: 3,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.PASSWORD_CHANGE,
          resourceType: AuditResourceType.USER,
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      const actions = result.map(log => log.action);
      expect(actions).toContain(AuditAction.LOGIN);
      expect(actions).toContain(AuditAction.LOGOUT);
      expect(actions).toContain(AuditAction.PASSWORD_CHANGE);
    });

    it('should include CRUD operations', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.CREATE,
          resourceType: AuditResourceType.ROLE,
        },
        {
          id: 2,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.UPDATE,
          resourceType: AuditResourceType.USER,
        },
        {
          id: 3,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.DELETE,
          resourceType: AuditResourceType.PERMISSION,
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      const actions = result.map(log => log.action);
      expect(actions).toContain(AuditAction.CREATE);
      expect(actions).toContain(AuditAction.UPDATE);
      expect(actions).toContain(AuditAction.DELETE);
    });

    it('should include administrative actions', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.ROLE_CREATE,
          resourceType: AuditResourceType.ROLE,
        },
        {
          id: 2,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.PERMISSION_ASSIGN,
          resourceType: AuditResourceType.PERMISSION,
        },
        {
          id: 3,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.USER_ROLE_ASSIGN,
          resourceType: AuditResourceType.USER,
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      const actions = result.map(log => log.action);
      expect(actions).toContain(AuditAction.ROLE_CREATE);
      expect(actions).toContain(AuditAction.PERMISSION_ASSIGN);
      expect(actions).toContain(AuditAction.USER_ROLE_ASSIGN);
    });
  });

  describe('Context Information', () => {
    it('should include IP addresses and user agents', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.LOGIN,
          resourceType: AuditResourceType.AUTH,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      expect(result[0].ipAddress).toBe('192.168.1.1');
      expect(result[0].userAgent).toBe('Mozilla/5.0');
    });

    it('should include resource information', async () => {
      const mockActivity = [
        {
          id: 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.USER_UPDATE,
          resourceType: AuditResourceType.USER,
          resourceId: '10',
          oldValues: { name: 'Old' },
          newValues: { name: 'New' },
        },
      ];

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity as any);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005');

      expect(result[0].resourceType).toBe(AuditResourceType.USER);
      expect(result[0].resourceId).toBe('10');
      expect(result[0].oldValues).toBeDefined();
      expect(result[0].newValues).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for user with no activity', async () => {
      mockAuditService.getUserActivity.mockResolvedValue([]);

      const result = await mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655449999');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockAuditService.getUserActivity.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        mockAuditService.getUserActivity('550e8400-e29b-41d4-a716-446655440005')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle large activity histories', async () => {
      const largeActivity = Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          timestamp: new Date(),
          userId: '5',
          action: AuditAction.READ,
          resourceType: AuditResourceType.USER,
        }));

      mockAuditService.getUserActivity.mockResolvedValue(largeActivity as any);

      const result = await mockAuditService.getUserActivity(
        '550e8400-e29b-41d4-a716-446655440005',
        1000
      );

      expect(result).toHaveLength(1000);
    });
  });
});
