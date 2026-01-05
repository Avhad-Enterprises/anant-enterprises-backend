/**
 * Unit tests for Get Roles API
 * GET /api/rbac/roles
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { roles } from '../../shared/rbac.schema';
import { eq } from 'drizzle-orm';

describe('GET /api/rbac/roles - Get All Roles', () => {
  let superadminToken: string;
  let superadminUserId: string;
  let adminToken: string;
  let regularUserToken: string;
  let testRole: any;

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token: saToken, userId } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = saToken;
    superadminUserId = userId;

    const { token: aToken } = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = aToken;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
  });

  afterAll(async () => {});

  beforeEach(async () => {
    // Create test role
    const [role] = await db
      .insert(roles)
      .values({
        name: 'test_get_role',
        description: 'Test role for get all',
        is_system_role: false,
        created_by: superadminUserId,
      })
      .returning();
    testRole = role;
  });

  afterEach(async () => {
    // Clean up
    if (testRole) {
      await db.delete(roles).where(eq(roles.id, testRole.id));
    }
  });

  describe('Successful Retrieval', () => {
    it('should return all roles with correct structure', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include role with all required fields', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const role = response.body.data.find((r: any) => r.id === testRole.id);
      expect(role).toBeDefined();
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('is_system_role');
      expect(role).toHaveProperty('is_active');
      expect(role).toHaveProperty('permissions_count');
      expect(role).toHaveProperty('users_count');
      expect(role).toHaveProperty('created_at');
    });

    it('should include permissions_count', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const testRoleData = response.body.data.find((r: any) => r.id === testRole.id);
      expect(testRoleData.permissions_count).toBeDefined();
      expect(typeof testRoleData.permissions_count).toBe('number');
    });

    it('should include users_count', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const testRoleData = response.body.data.find((r: any) => r.id === testRole.id);
      expect(testRoleData.users_count).toBeDefined();
      expect(typeof testRoleData.users_count).toBe('number');
    });

    it('should include system roles', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const systemRoles = response.body.data.filter((r: any) => r.is_system_role);
      expect(systemRoles.length).toBeGreaterThan(0);

      // Should include user, admin, superadmin
      const roleNames = systemRoles.map((r: any) => r.name);
      expect(roleNames).toContain('user');
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('superadmin');
    });

    it('should work with superadmin token', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/rbac/roles');

      expect(response.status).toBe(401);
    });

    it('should reject requests without roles:read permission', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
