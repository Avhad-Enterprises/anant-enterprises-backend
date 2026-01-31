/**
 * Unit tests for Bulk Permissions API
 * POST /api/rbac/roles/:roleId/permissions/bulk
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { roles } from '../../shared/roles.schema';
import { permissions } from '../../shared/permissions.schema';
import { rolePermissions } from '../../shared/role-permissions.schema';
import { eq } from 'drizzle-orm';

describe('POST /api/rbac/roles/:roleId/permissions/bulk - Bulk Assign Permissions', () => {
  let superadminToken: string;
  let superadminUserId: string;
  let regularUserToken: string;
  let testRole: any;
  let testPermissions: any[] = [];

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token, userId } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = token;
    superadminUserId = userId;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
  });

  afterAll(async () => { });

  beforeEach(async () => {
    // Create test role
    const [role] = await db
      .insert(roles)
      .values({
        name: 'test_bulk_role',
        description: 'Test role for bulk operations',
        is_system_role: false,
        created_by: superadminUserId,
      })
      .returning();
    testRole = role;

    // Create test permissions
    const perms = await db
      .insert(permissions)
      .values([
        { name: 'bulk:read', resource: 'bulk', action: 'read' },
        { name: 'bulk:write', resource: 'bulk', action: 'write' },
        { name: 'bulk:delete', resource: 'bulk', action: 'delete' },
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

  describe('Successful Bulk Assignment', () => {
    it('should assign multiple permissions to role', async () => {
      const permissionIds = testPermissions.map(p => p.id);

      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: permissionIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assigned_count).toBe(3);
      expect(response.body.data.skipped_count).toBe(0);
      expect(response.body.data.role_id).toBe(testRole.id);
    });

    it('should skip already assigned permissions', async () => {
      const permissionIds = testPermissions.map(p => p.id);

      // Assign first two permissions manually
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
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: permissionIds });

      expect(response.status).toBe(200);
      expect(response.body.data.assigned_count).toBe(1); // Only third permission
      expect(response.body.data.skipped_count).toBe(2); // First two skipped
    });
  });

  describe('Validation Errors', () => {
    it('should reject non-existent role ID', async () => {
      const response = await request(app)
        .post('/api/rbac/roles/00000000-0000-0000-0000-000000000000/permissions/bulk')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: [testPermissions[0].id] });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain('Role not found');
    });

    it('should reject empty permission array', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: [] });

      expect(response.status).toBe(400);
    });

    it('should reject more than 50 permissions', async () => {
      const tooManyIds = Array.from({ length: 51 }, (_, i) => '00000000-0000-0000-0000-0000000000' + (i + 10).toString());

      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: tooManyIds });

      expect(response.status).toBe(400);
    });

    it('should reject invalid permission IDs (not integers)', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: ['invalid', 'ids'] });

      expect(response.status).toBe(400);
    });

    it('should reject negative permission IDs', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: [-1, -2] });

      expect(response.status).toBe(400);
    });

    it('should handle non-existent permission IDs gracefully', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_ids: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'] });

      expect(response.status).toBe(400);
      expect(response.body.error?.message || response.body.message).toContain(
        'No valid permission IDs'
      );
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .send({ permission_ids: [testPermissions[0].id] });

      expect(response.status).toBe(401);
    });

    it('should reject requests without permissions:assign permission', async () => {
      const response = await request(app)
        .post(`/api/rbac/roles/${testRole.id}/permissions/bulk`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ permission_ids: [testPermissions[0].id] });

      expect(response.status).toBe(403);
    });
  });
});
