import { Application } from 'express';
import App from '../../../../app';
import UserRoute from '../..';
import AuthRoute from '../../../auth';
import { dbHelper } from '@tests/utils';
import { SupabaseAuthHelper } from '@tests/utils';
import { ApiTestHelper } from '@tests/utils';
import { TestDataFactory } from '@tests/utils';

describe('User API Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let testUserId: number;
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

    // Create a test user using SupabaseAuthHelper
    const { token, user } = await SupabaseAuthHelper.createTestUserWithToken();
    authToken = token;
    testUserId = user.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('GET /api/users', () => {
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

  describe('GET /api/users/:id', () => {
    it('should get user by ID for authenticated user', async () => {
      const response = await apiHelper.get(`/api/users/${testUserId}`, authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 403 for non-existent user when lacking permission', async () => {
      // Regular users cannot view other users, so they get 403 even if user doesn't exist
      const response = await apiHelper.get('/api/users/99999', authToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });
});
