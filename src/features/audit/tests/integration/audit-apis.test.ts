/**
 * Integration tests for Audit Service
 * Tests with real database calls using the test database
 */

import { db } from '../../../../database';
import { auditLogs } from '../../shared/schema';
import { SupabaseAuthHelper } from '@tests/utils';
import { auditService } from '../../services/audit.service';
import { AuditAction, AuditResourceType } from '../../shared/types';

describe('Audit Service Integration Tests', () => {
    let testUser: any;
    let adminUser: any;
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
        // Seed RBAC data
        await SupabaseAuthHelper.seedRBACData();
    });

    beforeEach(async () => {
        // Clean up test data
        await db.delete(auditLogs);

        // Create test users using Supabase Auth
        const userData = await SupabaseAuthHelper.createTestUser({
            email: `testuser-${Date.now()}@audit.com`,
            password: 'password123',
            name: 'Test User',
            role: 'user',
        });
        testUser = userData.user;
        userToken = userData.token;

        const adminData = await SupabaseAuthHelper.createTestAdminUser({
            email: `admin-${Date.now()}@audit.com`
        });
        adminUser = adminData.user;
        adminToken = adminData.token;

        // Create some test audit logs
        await auditService.log({
            userId: testUser.id,
            action: AuditAction.LOGIN,
            resourceType: AuditResourceType.AUTH,
            ipAddress: '192.168.1.1',
            userAgent: 'Test Browser',
        });

        await auditService.log({
            userId: testUser.id,
            action: AuditAction.USER_UPDATE,
            resourceType: AuditResourceType.USER,
            resourceId: testUser.id,
            oldValues: { name: 'Old Name' },
            newValues: { name: 'Test User' },
            ipAddress: '192.168.1.1',
        });

        await auditService.log({
            userId: adminUser.id,
            action: AuditAction.ROLE_CREATE,
            resourceType: AuditResourceType.ROLE,
            resourceId: 1,
            newValues: { name: 'New Role' },
            ipAddress: '192.168.1.2',
        });
    });

    afterEach(async () => {
        // Cleanup
        await db.delete(auditLogs);
    });

    describe('GET /api/admin/audit/logs', () => {
        it('should retrieve all audit logs', async () => {
            const logs = await auditService.queryLogs({ limit: 100, offset: 0 });

            expect(logs).toBeDefined();
            expect(logs.length).toBeGreaterThanOrEqual(3);
        });

        it('should filter logs by userId', async () => {
            const logs = await auditService.queryLogs({
                userId: testUser.id,
                limit: 100,
                offset: 0
            });

            expect(logs).toBeDefined();
            expect(logs.length).toBe(2);
            logs.forEach(log => {
                expect(log.userId).toBe(testUser.id);
            });
        });

        it('should filter logs by action', async () => {
            const logs = await auditService.queryLogs({
                action: AuditAction.LOGIN,
                limit: 100,
                offset: 0
            });

            expect(logs).toBeDefined();
            expect(logs.length).toBe(1);
            expect(logs[0].action).toBe(AuditAction.LOGIN);
        });

        it('should filter logs by resourceType', async () => {
            const logs = await auditService.queryLogs({
                resourceType: AuditResourceType.USER,
                limit: 100,
                offset: 0
            });

            expect(logs).toBeDefined();
            expect(logs.length).toBe(1);
            expect(logs[0].resourceType).toBe(AuditResourceType.USER);
        });

        it('should filter logs by IP address', async () => {
            const logs = await auditService.queryLogs({
                ipAddress: '192.168.1.1',
                limit: 100,
                offset: 0
            });

            expect(logs).toBeDefined();
            expect(logs.length).toBe(2);
            logs.forEach(log => {
                expect(log.ipAddress).toBe('192.168.1.1');
            });
        });

        it('should apply pagination with limit', async () => {
            const logs = await auditService.queryLogs({ limit: 2, offset: 0 });

            expect(logs).toBeDefined();
            expect(logs.length).toBeLessThanOrEqual(2);
        });

        it('should apply pagination with offset', async () => {
            const allLogs = await auditService.queryLogs({ limit: 100, offset: 0 });
            const offsetLogs = await auditService.queryLogs({ limit: 100, offset: 1 });

            expect(offsetLogs.length).toBe(allLogs.length - 1);
        });

        it('should combine multiple filters', async () => {
            const logs = await auditService.queryLogs({
                userId: testUser.id,
                action: AuditAction.LOGIN,
                resourceType: AuditResourceType.AUTH,
                limit: 100,
                offset: 0
            });

            expect(logs).toBeDefined();
            expect(logs.length).toBe(1);
            expect(logs[0].userId).toBe(testUser.id);
            expect(logs[0].action).toBe(AuditAction.LOGIN);
        });
    });

    describe('GET /api/admin/audit/resource/:type/:id', () => {
        it('should get audit trail for a specific resource', async () => {
            const trail = await auditService.getAuditTrail(
                AuditResourceType.USER,
                testUser.id
            );

            expect(trail).toBeDefined();
            expect(trail.length).toBe(1);
            expect(trail[0].resourceType).toBe(AuditResourceType.USER);
            expect(trail[0].resourceId).toBe(testUser.id);
        });

        it('should return old and new values for resource changes', async () => {
            const trail = await auditService.getAuditTrail(
                AuditResourceType.USER,
                testUser.id
            );

            expect(trail[0].oldValues).toBeDefined();
            expect(trail[0].newValues).toBeDefined();
            expect(trail[0].oldValues).toEqual({ name: 'Old Name' });
            expect(trail[0].newValues).toEqual({ name: 'Test User' });
        });

        it('should respect limit parameter', async () => {
            // Create multiple entries
            await auditService.log({
                userId: testUser.id,
                action: AuditAction.USER_UPDATE,
                resourceType: AuditResourceType.USER,
                resourceId: testUser.id,
                newValues: { email: 'new@test.com' },
            });

            const trail = await auditService.getAuditTrail(
                AuditResourceType.USER,
                testUser.id,
                1
            );

            expect(trail.length).toBe(1);
        });

        it('should return empty array for non-existent resource', async () => {
            const trail = await auditService.getAuditTrail(
                AuditResourceType.USER,
                99999
            );

            expect(trail).toBeDefined();
            expect(trail.length).toBe(0);
        });
    });

    describe('GET /api/admin/audit/user/:userId/activity', () => {
        it('should get all activity for a specific user', async () => {
            const activity = await auditService.getUserActivity(testUser.id);

            expect(activity).toBeDefined();
            expect(activity.length).toBe(2);
            activity.forEach(log => {
                expect(log.userId).toBe(testUser.id);
            });
        });

        it('should order activity by timestamp descending', async () => {
            const activity = await auditService.getUserActivity(testUser.id);

            expect(activity.length).toBeGreaterThan(1);
            for (let i = 0; i < activity.length - 1; i++) {
                const current = new Date(activity[i].timestamp);
                const next = new Date(activity[i + 1].timestamp);
                expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
        });

        it('should respect limit parameter', async () => {
            const activity = await auditService.getUserActivity(testUser.id, 1);

            expect(activity.length).toBe(1);
        });

        it('should return empty array for user with no activity', async () => {
            const activity = await auditService.getUserActivity(99999);

            expect(activity).toBeDefined();
            expect(activity.length).toBe(0);
        });

        it('should include all activity types', async () => {
            const activity = await auditService.getUserActivity(testUser.id);

            const actions = activity.map(log => log.action);
            expect(actions).toContain(AuditAction.LOGIN);
            expect(actions).toContain(AuditAction.USER_UPDATE);
        });
    });

    describe('Audit Service - Data Sanitization', () => {
        it('should sanitize sensitive data in old values', async () => {
            await auditService.log({
                userId: testUser.id,
                action: AuditAction.PASSWORD_CHANGE,
                resourceType: AuditResourceType.USER,
                resourceId: testUser.id,
                oldValues: { password: 'oldpassword123', email: 'test@test.com' },
                newValues: { password: 'newpassword123', email: 'test@test.com' },
            });

            const logs = await auditService.queryLogs({
                userId: testUser.id,
                action: AuditAction.PASSWORD_CHANGE,
                limit: 1,
                offset: 0
            });

            expect(logs[0].oldValues).toBeDefined();
            expect(logs[0].oldValues).not.toBeNull();
            expect(logs[0].oldValues?.password).toBe('[REDACTED]');
            expect(logs[0].oldValues?.email).toBe('test@test.com');
        });

        it('should sanitize sensitive data in new values', async () => {
            await auditService.log({
                userId: testUser.id,
                action: AuditAction.TOKEN_REFRESH,
                resourceType: AuditResourceType.AUTH,
                newValues: {
                    token: 'jwt.token.here',
                    refreshToken: 'refresh.token.here',
                    userId: testUser.id
                },
            });

            const logs = await auditService.queryLogs({
                userId: testUser.id,
                action: AuditAction.TOKEN_REFRESH,
                limit: 1,
                offset: 0
            });

            expect(logs[0].newValues).toBeDefined();
            expect(logs[0].newValues).not.toBeNull();
            expect(logs[0].newValues?.token).toBe('[REDACTED]');
            expect(logs[0].newValues?.refreshToken).toBe('[REDACTED]');
        });
    });

    describe('Test Setup Validation', () => {
        it('should have created test users successfully', () => {
            expect(testUser).toBeDefined();
            expect(testUser.email).toMatch(/^testuser-\d+@audit\.com$/);
            expect(adminUser).toBeDefined();
            expect(adminUser.email).toMatch(/^admin-\d+@audit\.com$/);
        });

        it('should have generated valid tokens', () => {
            expect(userToken).toBeDefined();
            expect(adminToken).toBeDefined();
            expect(userToken.length).toBeGreaterThan(0);
            expect(adminToken.length).toBeGreaterThan(0);
        });

        it('should have created test audit logs', async () => {
            const logs = await auditService.queryLogs({ limit: 100, offset: 0 });
            expect(logs.length).toBeGreaterThanOrEqual(3);
        });
    });
});
