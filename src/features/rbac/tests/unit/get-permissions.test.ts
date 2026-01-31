/**
 * Unit tests for Get Permissions API
 * GET /api/rbac/permissions
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '../../../../database';
import { permissions } from '../../shared/permissions.schema';
import { eq } from 'drizzle-orm';

describe('GET /api/rbac/permissions - Get All Permissions', () => {
  let superadminToken: string;
  let adminToken: string;
  let regularUserToken: string;
  let testPermissions: any[] = [];

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token: saToken } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = saToken;

    const { token: aToken } = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = aToken;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
  });

  afterAll(async () => {});

  beforeEach(async () => {
    // Create test permissions
    const createdPerms = await db
      .insert(permissions)
      .values([
        { name: 'orders:read', resource: 'orders', action: 'read', description: 'Read orders' },
        {
          name: 'orders:create',
          resource: 'orders',
          action: 'create',
          description: 'Create orders',
        },
        {
          name: 'products:read',
          resource: 'products',
          action: 'read',
          description: 'Read products',
        },
      ])
      .returning();
    testPermissions = createdPerms;
  });

  afterEach(async () => {
    // Clean up test permissions
    for (const perm of testPermissions) {
      await db.delete(permissions).where(eq(permissions.id, perm.id));
    }
    testPermissions = [];
  });

  describe('Successful Retrieval', () => {
    it('should return all permissions with correct structure', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.permissions).toBeDefined();
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });

    it('should group permissions by resource', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.by_resource).toBeDefined();
      expect(typeof response.body.data.by_resource).toBe('object');

      // Verify our test permissions are grouped correctly
      const byResource = response.body.data.by_resource;
      if (byResource.orders) {
        expect(Array.isArray(byResource.orders)).toBe(true);
        expect(byResource.orders.length).toBeGreaterThanOrEqual(2);
      }
      if (byResource.products) {
        expect(Array.isArray(byResource.products)).toBe(true);
        expect(byResource.products.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should include test permissions in response', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      const allPermissions = response.body.data.permissions;

      const ordersRead = allPermissions.find((p: any) => p.name === 'orders:read');
      expect(ordersRead).toBeDefined();
      expect(ordersRead.resource).toBe('orders');
      expect(ordersRead.action).toBe('read');
      expect(ordersRead.description).toBe('Read orders');
    });

    it('should return permissions with all required fields', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(response.status).toBe(200);
      const permissions = response.body.data.permissions;

      if (permissions.length > 0) {
        const perm = permissions[0];
        expect(perm).toHaveProperty('id');
        expect(perm).toHaveProperty('name');
        expect(perm).toHaveProperty('resource');
        expect(perm).toHaveProperty('action');
        expect(perm).toHaveProperty('created_at');
      }
    });

    it('should work with admin token (has permissions:read)', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.permissions).toBeDefined();
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/rbac/permissions');

      expect(response.status).toBe(401);
    });

    it('should reject requests without permissions:read permission', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
