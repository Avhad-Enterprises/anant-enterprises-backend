/**
 * Unit tests for Role Permissions API
 * GET/POST/DELETE /api/rbac/roles/:roleId/permissions
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '@/database';
import { roles } from '@/features/rbac/shared/roles.schema';
import { permissions } from '@/features/rbac/shared/permissions.schema';
import { rolePermissions } from '@/features/rbac/shared/role-permissions.schema';
import { eq, and } from 'drizzle-orm';

describe('Role Permissions API - GET/POST/DELETE', () => {
  let superadminToken: string;
  let superadminUserId: string;
  let adminToken: string;
  let regularUserToken: string;
  let testRole: any;
  let testPermissions: any[] = [];

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token: saToken, userId: saUserId } =
      await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = saToken;
    superadminUserId = saUserId;

    const { token: aToken } = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = aToken;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
  });

  afterAll(async () => { });

  beforeEach(async () => {
    // Create test role
    const [role] = await db
      .insert(roles)
      .values({
        name: 'test_role_perms',
        description: 'Test role for permissions',
        is_system_role: false,
        created_by: superadminUserId,
      })
      .returning();
    testRole = role;

    // Create test permissions
    const perms = await db
      .insert(permissions)
      .values([
        { name: 'roleperm:read', resource: 'roleperm', action: 'read' },
        { name: 'roleperm:write', resource: 'roleperm', action: 'write' },
      ])
      .returning();
    testPermissions = perms;
  });

  afterEach(async () => {
    // Clean up
    if (testRole) {
      await db.delete(rolePermissions).where(eq(rolePermissions.role_id, testRole.id));
      await db.delete(roles).where(eq(roles.id, testRole.id));
    }
    for (const perm of testPermissions) {
      await db.delete(permissions).where(eq(permissions.id, perm.id));
    }
    testPermissions = [];
  });

  describe('GET /api/rbac/roles/:roleId/permissions', () => {
    it('should return role permissions', async () => {
      // Assign permissions to role
      await db.insert(rolePermissions).values([
        {
          role_id: testRole.id,
          permission_id: testPermissions[0].id,
          assigned_by: superadminUserId,
        },
        {
          role_id: testRole.id,
          permission_id: testPermissions[1].id,
          assigned_by: superadminUserId,
        },
      ]);

      const response = await request(app)
        .get(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toMatchObject({
        id: testRole.id,
        name: testRole.name,
      });
      expect(response.body.data.permissions).toHaveLength(2);
    });

    it('should return empty array for role with no permissions', async () => {
      const response = await request(app)
        .get(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.permissions).toHaveLength(0);
    });

    it('should reject non-existent role', async () => {
      const response = await request(app)
        .get('/api/rbac/roles/00000000-0000-0000-0000-000000000000/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should require roles:read permission', async () => {
      const response = await request(app)
        .get(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/rbac/roles/:roleId/permissions', () => {
    it('should assign permission to role', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: testPermissions[0].id });

      console.log('Test Data:', {
        roleId: testRole.id,
        permissionId: testPermissions[0].id,
        permissionIdType: typeof testPermissions[0].id
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role_id).toBe(testRole.id);
      expect(response.body.data.permission.id).toBe(testPermissions[0].id);

      // Verify in database
      const [assignment] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.role_id, testRole.id),
            eq(rolePermissions.permission_id, testPermissions[0].id)
          )
        );
      expect(assignment).toBeDefined();
    });

    it('should handle duplicate assignment gracefully', async () => {
      // Assign first time
      await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: testPermissions[0].id });

      // Try to assign again (should not error due to onConflictDoNothing)
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: testPermissions[0].id });

      // onConflictDoNothing in query should handle this
      expect([200, 409]).toContain(response.status);
    });

    it('should reject non-existent role', async () => {
      const response = await request(app)
        .post('/api/rbac/roles/00000000-0000-0000-0000-000000000000/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: testPermissions[0].id });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain('Role not found');
    });

    it('should reject non-existent permission', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain(
        'Permission not found'
      );
    });

    it('should require permissions:assign permission', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ permission_id: testPermissions[0].id });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/rbac/roles/:roleId/permissions/:permissionId', () => {
    beforeEach(async () => {
      // Assign permission before each delete test
      await db.insert(rolePermissions).values({
        role_id: testRole.id,
        permission_id: testPermissions[0].id,
        assigned_by: superadminUserId,
      });
    });

    it('should remove permission from role', async () => {
      const response = await request(app)
        .delete(`/api/rbac/roles/${testRole.id}/permissions/${testPermissions[0].id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify removal in database
      const [assignment] = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.role_id, testRole.id),
            eq(rolePermissions.permission_id, testPermissions[0].id)
          )
        );
      expect(assignment).toBeUndefined();
    });

    it('should handle removing non-existent assignment gracefully', async () => {
      // Remove permission
      await request(app)
        .delete(`/api/rbac/roles/${testRole.id}/permissions/${testPermissions[0].id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      // Try to remove again
      const response = await request(app)
        .delete(`/api/rbac/roles/${testRole.id}/permissions/${testPermissions[0].id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      // Should succeed (no error for removing non-existent)
      expect(response.status).toBe(200);
    });

    it('should reject non-existent role', async () => {
      const response = await request(app)
        .delete(`/api/rbac/roles/00000000-0000-0000-0000-000000000000/permissions/${testPermissions[0].id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(404);
    });

    it('should require permissions:assign permission', async () => {
      const response = await request(app)
        .delete(`/api/rbac/roles/${testRole.id}/permissions/${testPermissions[0].id}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
