/**
 * RBAC API Integration Tests
 *
 * Comprehensive tests for all RBAC endpoints:
 * - Role management (CRUD)
 * - Permission management (create, list, bulk assign)
 * - User role management (assign, revoke, list)
 * - Complete RBAC flows
 */

import request from 'supertest';
import { Application } from 'express';
import App from '../../../../app';
import RBACRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { db } from '../../../../database';
import { roles, permissions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { rbacCacheService } from '../../services/rbac-cache.service';

describe('RBAC API Integration Tests', () => {
  let app: Application;
  let superadminToken: string;
  let adminToken: string;
  let regularUserToken: string;
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    const rbacRoute = new RBACRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, rbacRoute]);
    app = appInstance.getServer();

    await SupabaseAuthHelper.seedRBACData();

    const { token: saToken } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = saToken;

    const { token: aToken, user: aUser } = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = aToken;
    adminUser = aUser;

    const { token: uToken, user: rUser } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
    testUser = rUser;
  });

  afterEach(async () => {
    // Clean up test data created during tests
    await db.delete(permissions).where(eq(permissions.name, 'integration:test'));
    await db.delete(permissions).where(eq(permissions.name, 'flow:test'));
    await db.delete(permissions).where(eq(permissions.name, 'bulk:one'));
    await db.delete(permissions).where(eq(permissions.name, 'bulk:two'));
    await db.delete(permissions).where(eq(permissions.name, 'bulk:three'));
    await db.delete(permissions).where(eq(permissions.name, 'test:permission'));
    await db.delete(roles).where(eq(roles.name, 'integration_test_role'));
    await db.delete(roles).where(eq(roles.name, 'flow_test_role'));
    await db.delete(roles).where(eq(roles.name, 'bulk_test_role'));
    await db.delete(roles).where(eq(roles.name, 'test-role'));
    await rbacCacheService.invalidateAll();
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  // ==================== ROLE ENDPOINTS ====================

  describe('GET /api/rbac/roles', () => {
    it('should retrieve all roles', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow admin to read roles', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/rbac/roles');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/rbac/roles', () => {
    it('should create role with valid data', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'Integration test role',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('integration_test_role');
    });

    it('should reject duplicate role names', async () => {
      // Create first role
      await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'First role',
        });

      // Try duplicate
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'Duplicate role',
        });

      expect(response.status).toBe(409);
    });

    it('should enforce permissions for role creation', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'unauthorized_role',
          description: 'Should not be created',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/rbac/roles/:id', () => {
    it('should update role description', async () => {
      // Create role first
      const createResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'Original description',
        });

      const roleId = createResponse.body.data.id;

      // Update role
      const response = await request(app)
        .put(`/api/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should prevent renaming system roles', async () => {
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

      const response = await request(app)
        .put(`/api/rbac/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'hacked_admin' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/rbac/roles/:id', () => {
    it('should delete custom role', async () => {
      // Create role
      const createResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'To be deleted',
        });

      const roleId = createResponse.body.data.id;

      // Delete role
      const response = await request(app)
        .delete(`/api/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
    });

    it('should prevent deletion of system roles', async () => {
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

      const response = await request(app)
        .delete(`/api/rbac/roles/${adminRole.id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error?.message || response.body.message).toContain('system role');
    });
  });

  // ==================== PERMISSION ENDPOINTS ====================

  describe('GET /api/rbac/permissions', () => {
    it('should retrieve all permissions grouped by resource', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data).toHaveProperty('by_resource');
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
      expect(response.body.data.permissions.length).toBeGreaterThan(0);
    });

    it('should include wildcard permission for superadmin', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      const wildcardPerm = response.body.data.permissions.find((p: any) => p.name === '*');
      expect(wildcardPerm).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/rbac/permissions');
      expect(response.status).toBe(401);
    });

    it('should enforce permissions for reading', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/rbac/permissions', () => {
    it('should create permission with valid format', async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration:test',
          resource: 'integration',
          action: 'test',
          description: 'Integration test permission',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('integration:test');
    });

    it('should reject duplicate permission names', async () => {
      // Create first
      await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration:test',
          resource: 'integration',
          action: 'test',
        });

      // Try duplicate
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration:test',
          resource: 'integration',
          action: 'test',
        });

      expect(response.status).toBe(409);
    });

    it('should reject invalid permission format', async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Invalid-Format',
          resource: 'test',
          action: 'test',
        });

      expect(response.status).toBe(400);
    });

    it('should enforce permissions for creation', async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'unauthorized:test',
          resource: 'unauthorized',
          action: 'test',
        });

      expect(response.status).toBe(403);
    });
  });

  // ==================== ROLE PERMISSION ENDPOINTS ====================

  describe('POST /api/rbac/roles/:id/permissions', () => {
    it('should assign permission to role', async () => {
      // Create role and permission
      const roleResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'flow_test_role', description: 'Flow test' });

      const roleId = roleResponse.body.data.id;

      const permResponse = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'flow:test', resource: 'flow', action: 'test' });

      const permissionId = permResponse.body.data.id;

      // Assign permission
      const response = await request(app)
        .post(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: permissionId });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/rbac/roles/:id/permissions', () => {
    it('should list role permissions', async () => {
      const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);

      const response = await request(app)
        .get(`/api/rbac/roles/${adminRole.id}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('permissions');
    });
  });

  describe('POST /api/rbac/roles/:id/permissions/bulk', () => {
    it('should bulk assign permissions to role', async () => {
      // Create permissions
      const perm1 = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'bulk:one', resource: 'bulk', action: 'one' });

      const perm2 = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'bulk:two', resource: 'bulk', action: 'two' });

      const perm3 = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'bulk:three', resource: 'bulk', action: 'three' });

      // Create role
      const roleResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'bulk_test_role', description: 'Bulk test' });

      const roleId = roleResponse.body.data.id;

      // Bulk assign
      const bulkResponse = await request(app)
        .post(`/api/rbac/roles/${roleId}/permissions/bulk`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          permission_ids: [perm1.body.data.id, perm2.body.data.id, perm3.body.data.id],
        });

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.body.data.assigned_count).toBe(3);
      expect(bulkResponse.body.data.skipped_count).toBe(0);
    });
  });

  // ==================== USER ROLE ENDPOINTS ====================

  describe('POST /api/rbac/users/:id/roles', () => {
    it('should assign role to user', async () => {
      const [userRole] = await db.select().from(roles).where(eq(roles.name, 'user')).limit(1);

      const response = await request(app)
        .post(`/api/rbac/users/${testUser.id}/roles`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ role_id: userRole.id });

      expect([200, 409]).toContain(response.status); // 200 = assigned, 409 = already has role
    });
  });

  describe('GET /api/rbac/users/:id/roles', () => {
    it('should list user roles', async () => {
      const response = await request(app)
        .get(`/api/rbac/users/${adminUser.id}/roles`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('roles');
      expect(Array.isArray(response.body.data.roles)).toBe(true);
    });
  });

  // ==================== COMPLETE FLOWS ====================

  describe('Complete RBAC Flow', () => {
    it('should complete full role CRUD lifecycle', async () => {
      // CREATE
      const createResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'integration_test_role',
          description: 'Integration test role',
        });

      expect(createResponse.status).toBe(201);
      const createdRoleId = createResponse.body.data.id;

      // READ
      const listResponse = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(listResponse.status).toBe(200);
      const foundRole = listResponse.body.data.find((r: any) => r.id === createdRoleId);
      expect(foundRole).toBeDefined();

      // UPDATE
      const updateResponse = await request(app)
        .put(`/api/rbac/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ description: 'Updated description' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.description).toBe('Updated description');

      // DELETE
      const deleteResponse = await request(app)
        .delete(`/api/rbac/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    it('should create role and assign permissions', async () => {
      // Create role
      const createResponse = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ name: 'flow_test_role', description: 'Flow test' });

      const roleId = createResponse.body.data.id;

      // Get permissions
      const permissionsResponse = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      const permissions = permissionsResponse.body.data.permissions;
      expect(permissions.length).toBeGreaterThan(0);

      // Assign permission
      const permissionId = permissions[0].id;
      const assignResponse = await request(app)
        .post(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ permission_id: permissionId });

      expect(assignResponse.status).toBe(200);

      // Verify assignment
      const rolePermissionsResponse = await request(app)
        .get(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(rolePermissionsResponse.status).toBe(200);
      expect(rolePermissionsResponse.body.data.permissions.length).toBeGreaterThan(0);
    });
  });
});
