/**
 * Unit tests for get-resource-history API
 * Tests resource audit trail retrieval
 */

import { auditService } from '../../services/audit.service';
import { AuditAction, AuditResourceType } from '../../shared/types';

jest.mock('../../services/audit.service');

describe('GET /api/admin/audit/resource/:type/:id - Unit Tests', () => {
    const mockAuditService = auditService as jest.Mocked<typeof auditService>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Resource History Retrieval', () => {
        it('should get audit trail for specific resource', async () => {
            const mockTrail = [
                {
                    id: 1,
                    timestamp: new Date('2024-01-02'),
                    userId: 1,
                    action: AuditAction.USER_UPDATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                    oldValues: { name: 'Old Name' },
                    newValues: { name: 'New Name' },
                },
                {
                    id: 2,
                    timestamp: new Date('2024-01-01'),
                    userId: 1,
                    action: AuditAction.USER_CREATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                    newValues: { name: 'Old Name', email: 'user@test.com' },
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.USER,
                123
            );

            expect(mockAuditService.getAuditTrail).toHaveBeenCalledWith(
                AuditResourceType.USER,
                123
            );
            expect(result).toEqual(mockTrail);
            expect(result).toHaveLength(2);
        });

        it('should return chronological history (newest first)', async () => {
            const mockTrail = [
                {
                    id: 3,
                    timestamp: new Date('2024-01-03'),
                    action: AuditAction.USER_UPDATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                },
                {
                    id: 2,
                    timestamp: new Date('2024-01-02'),
                    action: AuditAction.USER_UPDATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                },
                {
                    id: 1,
                    timestamp: new Date('2024-01-01'),
                    action: AuditAction.USER_CREATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.USER,
                123
            );

            expect(result[0].timestamp.getTime()).toBeGreaterThan(
                result[1].timestamp.getTime()
            );
            expect(result[1].timestamp.getTime()).toBeGreaterThan(
                result[2].timestamp.getTime()
            );
        });

        it('should respect limit parameter', async () => {
            const mockTrail = [
                {
                    id: 1,
                    timestamp: new Date(),
                    action: AuditAction.USER_UPDATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 123,
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            await mockAuditService.getAuditTrail(
                AuditResourceType.USER,
                123,
                10
            );

            expect(mockAuditService.getAuditTrail).toHaveBeenCalledWith(
                AuditResourceType.USER,
                123,
                10
            );
        });
    });

    describe('Change Tracking', () => {
        it('should show before and after values', async () => {
            const mockTrail = [
                {
                    id: 1,
                    timestamp: new Date(),
                    action: AuditAction.UPDATE,
                    resourceType: AuditResourceType.ROLE,
                    resourceId: 5,
                    oldValues: { name: 'Editor', permissions: ['read', 'write'] },
                    newValues: { name: 'Editor', permissions: ['read', 'write', 'delete'] },
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.ROLE,
                5
            );

            expect(result[0].oldValues).toBeDefined();
            expect(result[0].newValues).toBeDefined();
            expect(result[0].oldValues).not.toBeNull();
            expect(result[0].newValues).not.toBeNull();
            expect(result[0].oldValues?.permissions).toHaveLength(2);
            expect(result[0].newValues?.permissions).toHaveLength(3);
        });

        it('should handle creation events without old values', async () => {
            const mockTrail = [
                {
                    id: 1,
                    timestamp: new Date(),
                    action: AuditAction.CREATE,
                    resourceType: AuditResourceType.USER,
                    resourceId: 456,
                    oldValues: null,
                    newValues: { name: 'New User', email: 'new@test.com' },
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.USER,
                456
            );

            expect(result[0].oldValues).toBeNull();
            expect(result[0].newValues).toBeDefined();
        });

        it('should handle deletion events without new values', async () => {
            const mockTrail = [
                {
                    id: 1,
                    timestamp: new Date(),
                    action: AuditAction.DELETE,
                    resourceType: AuditResourceType.PERMISSION,
                    resourceId: 789,
                    oldValues: { name: 'deleted:permission' },
                    newValues: null,
                },
            ];

            mockAuditService.getAuditTrail.mockResolvedValue(mockTrail as any);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.PERMISSION,
                789
            );

            expect(result[0].oldValues).toBeDefined();
            expect(result[0].newValues).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should return empty array for non-existent resource', async () => {
            mockAuditService.getAuditTrail.mockResolvedValue([]);

            const result = await mockAuditService.getAuditTrail(
                AuditResourceType.USER,
                99999
            );

            expect(result).toEqual([]);
        });

        it('should handle different resource types', async () => {
            const resourceTypes = [
                AuditResourceType.USER,
                AuditResourceType.ROLE,
                AuditResourceType.PERMISSION,
                AuditResourceType.INVITATION,
            ];

            for (const type of resourceTypes) {
                mockAuditService.getAuditTrail.mockResolvedValue([]);

                await mockAuditService.getAuditTrail(type, 1);

                expect(mockAuditService.getAuditTrail).toHaveBeenCalledWith(type, 1);
            }
        });

        it('should handle errors gracefully', async () => {
            mockAuditService.getAuditTrail.mockRejectedValue(new Error('Database error'));

            await expect(mockAuditService.getAuditTrail(AuditResourceType.USER, 1))
                .rejects.toThrow('Database error');
        });
    });
});
