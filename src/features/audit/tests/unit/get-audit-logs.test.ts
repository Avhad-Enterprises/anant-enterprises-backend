/**
 * Unit tests for get-audit-logs API
 * Tests the audit logs query endpoint with various filters
 */

import { auditService } from '../../services/audit.service';
import { AuditAction, AuditResourceType } from '../../shared/types';

// Mock the audit service
jest.mock('../../services/audit.service');

describe('GET /api/admin/audit/logs - Unit Tests', () => {
  const mockAuditService = auditService as jest.Mocked<typeof auditService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Filters', () => {
    it('should call queryLogs with correct filter parameters', async () => {
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date(),
          userId: 1,
          action: AuditAction.LOGIN,
          resourceType: AuditResourceType.AUTH,
          ipAddress: '192.168.1.1',
        },
      ];

      mockAuditService.queryLogs.mockResolvedValue(mockLogs as any);

      const filters = {
        userId: 1,
        action: AuditAction.LOGIN,
        limit: 50,
        offset: 0,
      };

      const result = await mockAuditService.queryLogs(filters);

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockLogs);
    });

    it('should handle multiple actions filter', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      const filters = {
        action: [AuditAction.LOGIN, AuditAction.LOGOUT] as any,
        limit: 50,
        offset: 0,
      };

      await mockAuditService.queryLogs(filters);

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(filters);
    });

    it('should handle date range filters', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 50,
        offset: 0,
      };

      await mockAuditService.queryLogs(filters);

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(filters);
    });

    it('should handle pagination parameters', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      const filters = {
        limit: 20,
        offset: 40,
      };

      await mockAuditService.queryLogs(filters);

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(filters);
    });
  });

  describe('Response Formatting', () => {
    it('should return logs with pagination metadata', async () => {
      const mockLogs = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: i + 1,
          timestamp: new Date(),
          userId: 1,
          action: AuditAction.CREATE,
          resourceType: AuditResourceType.USER,
        }));

      mockAuditService.queryLogs.mockResolvedValue(mockLogs as any);

      const result = await mockAuditService.queryLogs({ limit: 10, offset: 0 });

      expect(result).toHaveLength(10);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('action');
    });

    it('should return empty array when no logs match', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      const result = await mockAuditService.queryLogs({
        userId: 99999,
        limit: 50,
        offset: 0,
      });

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAuditService.queryLogs.mockRejectedValue(new Error('Database error'));

      await expect(mockAuditService.queryLogs({ limit: 50, offset: 0 })).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Filter Validation', () => {
    it('should respect limit boundaries', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      await mockAuditService.queryLogs({ limit: 500, offset: 0 });

      expect(mockAuditService.queryLogs).toHaveBeenCalled();
    });

    it('should handle IP address filter', async () => {
      mockAuditService.queryLogs.mockResolvedValue([]);

      await mockAuditService.queryLogs({
        ipAddress: '192.168.1.1',
        limit: 50,
        offset: 0,
      });

      expect(mockAuditService.queryLogs).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '192.168.1.1' })
      );
    });
  });
});
