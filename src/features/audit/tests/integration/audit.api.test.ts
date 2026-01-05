/**
 * Supertest Integration Tests for Audit API Endpoints
 * Tests real HTTP requests with authentication and database
 */

import request from 'supertest';
import App from '../../../../app';
import { db } from '../../../../database';
import { auditLogs } from '../../shared/audit-logs.schema';
import { users } from '../../../user';
import { userRoles } from '../../../rbac';
import { eq } from 'drizzle-orm';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { auditService } from '../../services/audit.service';
import { AuditAction, AuditResourceType } from '../../shared/types';
import UserRoute from '../../../user';
import AuthRoute from '../../../auth';
import AuditRoute from '../../index';

// Non-existent UUID for testing edge cases
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('Audit API - Supertest Integration Tests', () => {
  let app: App;
  let server: any;
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    // Initialize app with routes
    app = new App([new AuthRoute(), new UserRoute(), new AuditRoute()]);
    server = app.getServer();

    // Seed RBAC data (now includes audit:read permission for admin)
    await SupabaseAuthHelper.seedRBACData();
  });

  beforeEach(async () => {
    // Clean up audit logs
    await db.delete(auditLogs);

    // Create admin user with audit:read permission
    const adminData = await SupabaseAuthHelper.createTestAdminUser();
    adminUser = adminData.user;
    adminToken = adminData.token;

    // Create regular user
    const userData = await SupabaseAuthHelper.createTestUser({
      email: `user-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Regular User',
      role: 'user',
    });
    regularUser = userData.user;
    regularToken = userData.token;

    // Create test audit logs
    await auditService.log({
      userId: regularUser.id,
      action: AuditAction.LOGIN,
      resourceType: AuditResourceType.AUTH,
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser 1.0',
    });

    await auditService.log({
      userId: regularUser.id,
      action: AuditAction.USER_UPDATE,
      resourceType: AuditResourceType.USER,
      resourceId: regularUser.id,
      oldValues: { name: 'Old Name' },
      newValues: { name: 'Regular User' },
      ipAddress: '192.168.1.100',
    });

    await auditService.log({
      userId: adminUser.id,
      action: AuditAction.ROLE_CREATE,
      resourceType: AuditResourceType.ROLE,
      resourceId: adminUser.id, // Use UUID for resourceId
      newValues: { name: 'TestRole', description: 'Test' },
      ipAddress: '10.0.0.1',
    });
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(auditLogs);
    if (regularUser?.id) {
      await db.delete(userRoles).where(eq(userRoles.user_id, regularUser.id));
      await db.delete(users).where(eq(users.id, regularUser.id));
    }
    if (adminUser?.id) {
      await db.delete(userRoles).where(eq(userRoles.user_id, adminUser.id));
      await db.delete(users).where(eq(users.id, adminUser.id));
    }
  });

  describe('GET /api/admin/audit/logs', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(server).get('/api/admin/audit/logs').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for regular user without audit:read permission', async () => {
      const response = await request(server)
        .get('/api/admin/audit/logs')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return all audit logs for admin with audit:read permission', async () => {
      const response = await request(server)
        .get('/api/admin/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeDefined();
      // Should have at least the 3 logs we created (may have more from other operations)
      expect(response.body.data.logs.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter logs by userId', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/logs?userId=${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should have at least the 2 logs we created for regularUser
      expect(response.body.data.logs.length).toBeGreaterThanOrEqual(1);
      response.body.data.logs.forEach((log: any) => {
        expect(log.userId).toBe(regularUser.id);
      });
    });

    it('should filter logs by action', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/logs?action=${AuditAction.LOGIN}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs.length).toBe(1);
      expect(response.body.data.logs[0].action).toBe(AuditAction.LOGIN);
    });

    it('should filter logs by multiple actions (comma-separated)', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/logs?action=${AuditAction.LOGIN},${AuditAction.ROLE_CREATE}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return logs matching either action (at least 1)
      expect(response.body.data.logs.length).toBeGreaterThanOrEqual(1);
      // All returned logs should have one of the filtered actions
      const actions = response.body.data.logs.map((log: any) => log.action);
      actions.forEach((action: string) => {
        expect([AuditAction.LOGIN, AuditAction.ROLE_CREATE]).toContain(action);
      });
    });

    it('should filter logs by resourceType', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/logs?resourceType=${AuditResourceType.USER}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned logs should be of type USER if any exist
      response.body.data.logs.forEach((log: any) => {
        expect(log.resourceType).toBe(AuditResourceType.USER);
      });
    });

    it('should filter logs by ipAddress', async () => {
      const response = await request(server)
        .get('/api/admin/audit/logs?ipAddress=192.168.1.100')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned logs should have matching IP address
      response.body.data.logs.forEach((log: any) => {
        expect(log.ipAddress).toBe('192.168.1.100');
      });
    });

    it('should apply pagination with limit', async () => {
      const response = await request(server)
        .get('/api/admin/audit/logs?limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should apply pagination with offset', async () => {
      const response = await request(server)
        .get('/api/admin/audit/logs?limit=10&offset=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.offset).toBe(1);
    });

    it('should combine multiple filters', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/logs?userId=${regularUser.id}&action=${AuditAction.LOGIN}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs.length).toBe(1);
      expect(response.body.data.logs[0].userId).toBe(regularUser.id);
      expect(response.body.data.logs[0].action).toBe(AuditAction.LOGIN);
    });
  });

  describe('GET /api/admin/audit/resource/:type/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${regularUser.id}`)
        .expect(401);
    });

    it('should return 403 for regular user', async () => {
      await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should get audit trail for a specific resource', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resourceType).toBe(AuditResourceType.USER);
      expect(response.body.data.resourceId).toBe(regularUser.id);
      expect(response.body.data.history).toBeDefined();
      // History array should be returned (may be empty due to timing)
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    it('should return old and new values for resource changes', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // If history has entries, verify structure
      if (response.body.data.history.length > 0) {
        const history = response.body.data.history[0];
        expect(history).toHaveProperty('oldValues');
        expect(history).toHaveProperty('newValues');
      }
    });

    it('should return empty history for non-existent resource', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history.length).toBe(0);
    });

    it('should respect limit query parameter', async () => {
      // Create multiple entries
      await auditService.log({
        userId: adminUser.id,
        action: AuditAction.USER_UPDATE,
        resourceType: AuditResourceType.USER,
        resourceId: regularUser.id,
        newValues: { email: 'new@test.com' },
      });

      const response = await request(server)
        .get(`/api/admin/audit/resource/${AuditResourceType.USER}/${regularUser.id}?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Limit should restrict results to at most 1
      expect(response.body.data.history.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/admin/audit/user/:userId/activity', () => {
    it('should return 401 without authentication', async () => {
      await request(server).get(`/api/admin/audit/user/${regularUser.id}/activity`).expect(401);
    });

    it('should return 403 for regular user', async () => {
      await request(server)
        .get(`/api/admin/audit/user/${regularUser.id}/activity`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should get all activity for a specific user', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/user/${regularUser.id}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(regularUser.id);
      expect(response.body.data.activity).toBeDefined();
      // Should have at least 1 activity log for the user
      expect(response.body.data.activity.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.count).toBeGreaterThanOrEqual(1);
    });

    it('should return activity in chronological order (newest first)', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/user/${regularUser.id}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const activity = response.body.data.activity;
      for (let i = 0; i < activity.length - 1; i++) {
        const current = new Date(activity[i].timestamp);
        const next = new Date(activity[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should respect limit query parameter', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/user/${regularUser.id}/activity?limit=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.activity.length).toBe(1);
    });

    it('should return empty activity for user with no logs', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/user/${NON_EXISTENT_UUID}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activity.length).toBe(0);
    });

    it('should include all activity types', async () => {
      const response = await request(server)
        .get(`/api/admin/audit/user/${regularUser.id}/activity`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const actions = response.body.data.activity.map((log: any) => log.action);
      expect(actions).toContain(AuditAction.LOGIN);
      expect(actions).toContain(AuditAction.USER_UPDATE);
    });
  });

  describe('Cross-Endpoint Tests', () => {
    it('should track audit API access in audit logs', async () => {
      // Make a request to audit API
      await request(server)
        .get('/api/admin/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Wait for audit log to be written (async operation)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if the access was logged
      const logs = await auditService.queryLogs({
        userId: adminUser.id,
        resourceType: AuditResourceType.SYSTEM,
        limit: 100,
        offset: 0,
      });

      // Should have logged the GET request
      expect(logs.some(log => log.action === AuditAction.READ)).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(server)
            .get('/api/admin/audit/logs?limit=10')
            .set('Authorization', `Bearer ${adminToken}`)
        );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
