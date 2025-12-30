import { Application } from 'express';
import App from '../../../../app';
import UserRoute from '../..';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { ApiTestHelper } from '../../../../../tests/utils';

describe('User API Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let adminToken: string;
  let testUserId: number;
  let adminUserId: number;
  let apiHelper: ApiTestHelper;

  beforeAll(async () => {
    const userRoute = new UserRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, userRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create a regular test user
    const { token, user } = await SupabaseAuthHelper.createTestUserWithToken();
    authToken = token;
    testUserId = user.id;

    // Create an admin user
    const adminData = await SupabaseAuthHelper.createTestAdminUser();
    adminToken = adminData.token;
    adminUserId = adminData.user.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  // ==================== GET /api/users ====================

  describe('GET /api/users', () => {
    it('should allow admin to list all users', async () => {
      const response = await apiHelper.get('/api/users', adminToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should require admin role to access users list', async () => {
      const response = await apiHelper.get('/api/users', authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  // ==================== GET /api/users/:id ====================

  describe('GET /api/users/:id', () => {
    it('should allow user to get their own profile', async () => {
      const response = await apiHelper.get(`/api/users/${testUserId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should allow admin to view any user', async () => {
      const response = await apiHelper.get(`/api/users/${testUserId}`, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testUserId);
    });

    it('should prevent regular users from viewing other users', async () => {
      const response = await apiHelper.get(`/api/users/${adminUserId}`, authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should return 404 for non-existent user (admin)', async () => {
      const response = await apiHelper.get('/api/users/99999', adminToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  // ==================== PUT /api/users/:id ====================

  describe('PUT /api/users/:id', () => {
    it('should allow user to update their own profile', async () => {
      const updateData = {
        name: 'Updated Name',
        phone_number: '+1234567890',
      };

      const response = await apiHelper.put(`/api/users/${testUserId}`, updateData, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.phone_number).toBe('+1234567890');
    });

    it('should allow admin to update any user', async () => {
      const updateData = {
        name: 'Admin Updated Name',
      };

      const response = await apiHelper.put(`/api/users/${testUserId}`, updateData, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Admin Updated Name');
    });

    it('should prevent regular users from updating other users', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await apiHelper.put(`/api/users/${adminUserId}`, updateData, authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('can only update your own profile');
    });

    it('should reject duplicate email', async () => {
      // Create another user
      const { user: otherUser } = await SupabaseAuthHelper.createTestUserWithToken();

      const updateData = {
        email: otherUser.email,
      };

      const response = await apiHelper.put(`/api/users/${testUserId}`, updateData, authToken);

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should return 404 for non-existent user', async () => {
      const updateData = {
        name: 'Test',
      };

      const response = await apiHelper.put('/api/users/99999', updateData, adminToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.put('/api/users/1', { name: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  // ==================== DELETE /api/users/:id ====================

  describe('DELETE /api/users/:id', () => {
    it('should allow admin to delete a user', async () => {
      const response = await apiHelper.delete(`/api/users/${testUserId}`, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');

      // Verify user is soft deleted (should return 404)
      const getResponse = await apiHelper.get(`/api/users/${testUserId}`, adminToken);
      expect(getResponse.status).toBe(404);
    });

    it('should prevent self-deletion', async () => {
      const response = await apiHelper.delete(`/api/users/${adminUserId}`, adminToken);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Cannot delete your own account');
    });

    it('should require users:delete permission', async () => {
      const response = await apiHelper.delete(`/api/users/${testUserId}`, authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await apiHelper.delete('/api/users/99999', adminToken);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.delete('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });
});
