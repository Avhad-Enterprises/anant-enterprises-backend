/**
 * Unit tests for Create Role API
 * POST /api/rbac/roles
 */

import request from 'supertest';
import app from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { db } from '@/database';
import { roles } from '@/features/rbac/shared/roles.schema';
import { eq } from 'drizzle-orm';

describe('POST /api/rbac/roles - Create Role', () => {
  let superadminToken: string;
  let regularUserToken: string;
  let testRoleIds: string[] = [];

  beforeAll(async () => {
    await SupabaseAuthHelper.seedRBACData();

    const { token } = await SupabaseAuthHelper.createTestSuperadminUser();
    superadminToken = token;

    const { token: uToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = uToken;
  });

  afterAll(async () => {});

  afterEach(async () => {
    // Clean up test roles
    for (const id of testRoleIds) {
      await db.delete(roles).where(eq(roles.id, id));
    }
    testRoleIds = [];
    await db.delete(roles).where(eq(roles.name, 'test_create_role'));
  });

  describe('Successful Creation', () => {
    it('should create a new role with valid data', async () => {
      const roleData = {
        name: 'test_create_role',
        description: 'Test role for unit testing',
      };

      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(roleData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'test_create_role',
        description: 'Test role for unit testing',
        is_system_role: false, // User-created roles are never system roles
        is_active: true,
      });
      expect(response.body.data.id).toBeDefined();
      testRoleIds.push(response.body.data.id);
    });

    it('should create role without description', async () => {
      const roleData = {
        name: 'test_create_role',
      };

      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(roleData);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('test_create_role');
      expect(response.body.data.description).toBeNull();
      testRoleIds.push(response.body.data.id);
    });

    it('should always set is_system_role to false for user-created roles', async () => {
      const roleData = {
        name: 'test_create_role',
        description: 'Testing system role flag',
      };

      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(roleData);

      expect(response.status).toBe(201);
      expect(response.body.data.is_system_role).toBe(false);
      testRoleIds.push(response.body.data.id);
    });
  });

  describe('Validation Errors', () => {
    it('should reject duplicate role name', async () => {
      const roleData = {
        name: 'test_create_role',
        description: 'First role',
      };

      // Create first role
      const first = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(roleData);
      testRoleIds.push(first.body.data.id);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(roleData);

      expect(response.status).toBe(409);
      expect(response.body.error?.message || response.body.message).toContain('already exists');
    });

    it('should reject role name with invalid format (uppercase)', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'InvalidRole',
          description: 'Invalid role name',
        });

      expect(response.status).toBe(400);
    });

    it('should reject role name with invalid format (spaces)', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'invalid role',
          description: 'Invalid role name',
        });

      expect(response.status).toBe(400);
    });

    it('should reject role name with hyphens', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'invalid-role',
          description: 'Invalid role name',
        });

      expect(response.status).toBe(400);
    });

    it('should reject too short role name', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'a',
          description: 'Too short',
        });

      expect(response.status).toBe(400);
    });

    it('should reject too long role name', async () => {
      const longName = 'a'.repeat(51);
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: longName,
          description: 'Too long',
        });

      expect(response.status).toBe(400);
    });

    it('should reject empty role name', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: '',
          description: 'Empty name',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).post('/api/rbac/roles').send({
        name: 'test_create_role',
        description: 'Test',
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests without roles:manage permission', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'test_create_role',
          description: 'Test',
        });

      expect(response.status).toBe(403);
    });
  });
});
