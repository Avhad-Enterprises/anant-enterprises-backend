/**
 * Unit tests for Update Role API
 * PUT /api/rbac/roles/:roleId
 */

import request from 'supertest';
import app from '@tests/utils';
import { dbHelper } from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { roles } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('PUT /api/rbac/roles/:roleId - Update Role', () => {
  let superadminToken: string;
  let superadminUserId: number;
  let regularUserToken: string;
  let testRole: any;
  let systemRole: any;

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token, userId } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminUserId = userId;
    superadminToken = token;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;

    // Get a system role for testing
    const [sysRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
    systemRole = sysRole;
  });

  afterAll(async () => {});

  beforeEach(async () => {
    // Create test role
    const [role] = await db
      .insert(roles)
      .values({
        name: 'test_update_role',
        description: 'Original description',
        is_system_role: false,
        created_by: superadminUserId,
      })
      .returning();
    testRole = role;
  });

  afterEach(async () => {
    // Clean up test role
    if (testRole) {
      await db.delete(roles).where(eq(roles.id, testRole.id));
    }
    // Clean up any leftover duplicate test role
    await db.delete(roles).where(eq(roles.name, 'existing_role_duplicate'));
  });

  describe('Successful Update', () => {
    it('should update role name', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'updated_role_name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('updated_role_name');
      expect(response.body.data.id).toBe(testRole.id);
    });

    it('should update role description', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update is_active status', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ is_active: false });

      expect(response.status).toBe(200);
      expect(response.body.data.is_active).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'completely_new',
          description: 'Completely new description',
          is_active: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('completely_new');
      expect(response.body.data.description).toBe('Completely new description');
      expect(response.body.data.is_active).toBe(false);
    });
  });

  describe('System Role Protection', () => {
    it('should not allow changing system role name', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'hacked_admin' });

      expect(response.status).toBe(400);
      expect(response.body.error?.message || response.body.message).toContain(
        'Cannot change the name of a system role'
      );
    });

    it('should allow updating system role description', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ description: 'Updated system role description' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated system role description');
    });
  });

  describe('Validation Errors', () => {
    it('should reject non-existent role ID', async () => {
      const response = await request(app)
        .put('/api/rbac/roles/99999')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'new_name' });

      expect(response.status).toBe(404);
      expect(response.body.error?.message || response.body.message).toContain('Role not found');
    });

    it('should reject duplicate role name', async () => {
      // Use unique role name (lowercase with underscores only per API validation)
      const uniqueRoleName = 'existing_role_duplicate';

      // Create another role
      const [otherRole] = await db
        .insert(roles)
        .values({
          name: uniqueRoleName,
          description: 'Existing role',
          is_system_role: false,
          created_by: superadminUserId,
        })
        .returning();

      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: uniqueRoleName });

      expect(response.status).toBe(409);
      expect(response.body.error?.message || response.body.message).toContain('already exists');

      // Cleanup
      await db.delete(roles).where(eq(roles.id, otherRole.id));
    });

    it('should reject invalid name format', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'Invalid-Name' });

      expect(response.status).toBe(400);
    });

    it('should reject too long role name', async () => {
      const longName = 'a'.repeat(51);
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: longName });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .send({ name: 'new_name' });

      expect(response.status).toBe(401);
    });

    it('should reject requests without roles:manage permission', async () => {
      const response = await request(app)
        .put(`/api/rbac/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ name: 'new_name' });

      expect(response.status).toBe(403);
    });
  });
});
