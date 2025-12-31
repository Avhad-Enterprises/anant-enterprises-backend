/**
 * Unit tests for User Roles API
 * GET/POST/DELETE /api/rbac/users/:userId/roles and GET /api/rbac/users/:userId/permissions
 */

import request from 'supertest';
import app from '@tests/utils';
import { dbHelper } from '@tests/utils';
import { SupabaseAuthHelper, AuthTestHelper } from '@tests/utils';
import { db } from '../../../../database';
import { roles, permissions, rolePermissions, userRoles } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { rbacCacheService } from '../../services/rbac-cache.service';

describe('User Roles API - GET/POST/DELETE', () => {
  let superadminToken: string;
  let superadminUserId: number;
  let adminToken: string;
  let regularUserToken: string;
  let regularUserId: number;
  let testRole: any;
  let testPermission: any;

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token: saToken, userId: saUserId } =
      await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = saToken;
    superadminUserId = saUserId;

    const { token: aToken } = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = aToken;

    const { token: uToken, user } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
    regularUserId = user.id;
  });

  afterAll(async () => {});

  beforeEach(async () => {
    // Create test role
    const [role] = await db
      .insert(roles)
      .values({
        name: 'test_user_role',
        description: 'Test role for user assignment',
        is_system_role: false,
        created_by: superadminUserId,
      })
      .returning();
    testRole = role;

    // Create test permission
    const [perm] = await db
      .insert(permissions)
      .values({
        name: 'userrole:test',
        resource: 'userrole',
        action: 'test',
      })
      .returning();
    testPermission = perm;

    // Assign permission to role
    await db.insert(rolePermissions).values({
      role_id: testRole.id,
      permission_id: testPermission.id,
      assigned_by: superadminUserId,
    });
  });

  afterEach(async () => {
    // Clean up
    if (testRole) {
      await db.delete(userRoles).where(eq(userRoles.role_id, testRole.id));
      await db.delete(rolePermissions).where(eq(rolePermissions.role_id, testRole.id));
      await db.delete(roles).where(eq(roles.id, testRole.id));
    }
    if (testPermission) {
      await db.delete(permissions).where(eq(permissions.id, testPermission.id));
    }
    // Clear RBAC cache to avoid test pollution
    await rbacCacheService.invalidateAll();
  });

  describe('GET /api/rbac/users/:userId/roles', () => {
    it('should return user roles', async () => {
      // Assign role to user
      await db.insert(userRoles).values({
        user_id: regularUserId,
        role_id: testRole.id,
        assigned_by: superadminUserId,
      });

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(regularUserId);
      expect(Array.isArray(response.body.data.roles)).toBe(true);

      const assignedRole = response.body.data.roles.find((r: any) => r.id === testRole.id);
      expect(assignedRole).toBeDefined();
      expect(assignedRole.name).toBe(testRole.name);
      expect(assignedRole.assigned_at).toBeDefined();
    });

    it('should return empty array for user with no roles', async () => {
      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // User will have default 'user' role from seeding
      expect(response.body.data.roles).toBeDefined();
    });

    it('should include role expiration if set', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      await db.insert(userRoles).values({
        user_id: regularUserId,
        role_id: testRole.id,
        assigned_by: superadminUserId,
        expires_at: futureDate,
      });

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const assignedRole = response.body.data.roles.find((r: any) => r.id === testRole.id);
      expect(assignedRole.expires_at).toBeDefined();
    });

    it('should allow user to read own roles', async () => {
      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require users:read permission to read others roles', async () => {
      // Create another user
      const { token: otherToken } = await SupabaseAuthHelper.createTestUserWithToken();

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/rbac/users/:userId/permissions', () => {
    it('should return user permissions aggregated from roles', async () => {
      // Assign role to user
      await db.insert(userRoles).values({
        user_id: regularUserId,
        role_id: testRole.id,
        assigned_by: superadminUserId,
      });

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(regularUserId);
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
      expect(response.body.data.permissions).toContain('userrole:test');
      expect(response.body.data.has_wildcard).toBeDefined();
    });

    it('should detect wildcard permissions', async () => {
      // Get superadmin role (has wildcard)
      const [superadminRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'superadmin'))
        .limit(1);

      // Assign superadmin role
      await db
        .insert(userRoles)
        .values({
          user_id: regularUserId,
          role_id: superadminRole.id,
          assigned_by: superadminUserId,
        })
        .onConflictDoNothing();

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.has_wildcard).toBe(true);
      expect(response.body.data.permissions).toContain('*');

      // Clean up superadmin role assignment to prevent test pollution
      await db
        .delete(userRoles)
        .where(and(eq(userRoles.user_id, regularUserId), eq(userRoles.role_id, superadminRole.id)));
      // Invalidate cache for this user
      await rbacCacheService.invalidateUser(regularUserId);
    });

    it('should allow user to read own permissions', async () => {
      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require users:read permission to read others permissions', async () => {
      // Create another user
      const { token: otherToken } = await SupabaseAuthHelper.createTestUserWithToken();

      const response = await request(app)
        .get(`/api/rbac/users/${regularUserId}/permissions`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/rbac/users/:userId/roles', () => {
    it('should assign role to user', async () => {
      const response = await request(app)
        .post(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ role_id: testRole.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(regularUserId);
      expect(response.body.data.role.id).toBe(testRole.id);

      // Verify in database
      const [assignment] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.user_id, regularUserId), eq(userRoles.role_id, testRole.id)));
      expect(assignment).toBeDefined();
    });

    it('should assign role with expiration', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const response = await request(app)
        .post(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          role_id: testRole.id,
          expires_at: futureDate,
        });

      expect(response.status).toBe(200);

      // Verify expiration in database
      const [assignment] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.user_id, regularUserId), eq(userRoles.role_id, testRole.id)));
      expect(assignment.expires_at).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/rbac/users/99999/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ role_id: testRole.id });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain('User not found');
    });

    it('should reject non-existent role', async () => {
      const response = await request(app)
        .post(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ role_id: 99999 });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain('Role not found');
    });

    it('should require roles:manage permission', async () => {
      const response = await request(app)
        .post(`/api/rbac/users/${regularUserId}/roles`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ role_id: testRole.id });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/rbac/users/:userId/roles/:roleId', () => {
    beforeEach(async () => {
      // Assign role before each delete test
      await db
        .insert(userRoles)
        .values({
          user_id: regularUserId,
          role_id: testRole.id,
          assigned_by: superadminUserId,
        })
        .onConflictDoNothing();
    });

    it('should remove role from user', async () => {
      const response = await request(app)
        .delete(`/api/rbac/users/${regularUserId}/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify removal in database
      const [assignment] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.user_id, regularUserId), eq(userRoles.role_id, testRole.id)));
      expect(assignment).toBeUndefined();
    });

    it('should handle removing non-existent assignment gracefully', async () => {
      // Remove role
      await request(app)
        .delete(`/api/rbac/users/${regularUserId}/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      // Try to remove again
      const response = await request(app)
        .delete(`/api/rbac/users/${regularUserId}/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
    });

    it('should require roles:manage permission', async () => {
      const response = await request(app)
        .delete(`/api/rbac/users/${regularUserId}/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
