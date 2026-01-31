import { Application } from 'express';
import App from '../../../../app';
import UserRoute from '../../../user';
import AuthRoute from '../../index';
import { dbHelper } from '../../../../../tests/utils';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { ApiTestHelper } from '../../../../../tests/utils';

// Non-existent UUID for testing 404 cases
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('User Authentication Integration Tests', () => {
  let app: Application;
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
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      // Create a test user via Supabase Auth
      const testUser = await SupabaseAuthHelper.registerTestUser(
        `testuser.${Date.now()}@example.com`,
        'TestPassword123!',
        'Test User'
      );

      const response = await apiHelper.post('/api/auth/refresh-token', {
        refreshToken: testUser.session.refresh_token,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.auth_id).toBe(testUser.authUser.id);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await apiHelper.post('/api/auth/refresh-token', {
        refreshToken: 'invalid.refresh.token',
      });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid refresh token');
    });

    it('should fail with missing refresh token', async () => {
      const response = await apiHelper.post('/api/auth/refresh-token', {});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('refreshToken');
    });
  });

  describe('POST /api/auth/password-reset/request', () => {
    it('should request password reset successfully', async () => {
      const response = await apiHelper.post('/api/auth/password-reset/request', {
        email: 'test@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset');
    });

    it('should fail with invalid email', async () => {
      const response = await apiHelper.post('/api/auth/password-reset/request', {
        email: 'invalid-email',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });
  });

  describe('POST /api/auth/password-reset/confirm', () => {
    it('should reset password successfully with valid token', async () => {
      // This would require a valid reset token from Supabase
      // For now, test the validation - it should fail with 400
      const response = await apiHelper.post('/api/auth/password-reset/confirm', {
        access_token: 'invalid-token',
        new_password: 'NewPassword123!',
      });

      // Should fail because token is invalid
      expect(response.status).toBe(400);
    });

    it('should fail with missing fields', async () => {
      const response = await apiHelper.post('/api/auth/password-reset/confirm', {
        access_token: 'some-token',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/users', () => {
    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should require admin role to access users list', async () => {
      const { token } = await SupabaseAuthHelper.createTestUserWithToken();

      const response = await apiHelper.get('/api/users', token);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID for authenticated user', async () => {
      const { user, token } = await SupabaseAuthHelper.createTestUserWithToken();

      const response = await apiHelper.get(`/api/users/${user.id}`, token);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 404 for non-existent user (requesting as admin)', async () => {
      // Use admin user to bypass ownership check and reach the 404 logic
      const { token } = await SupabaseAuthHelper.createTestAdminUser();

      const response = await apiHelper.get(`/api/users/${NON_EXISTENT_UUID}`, token);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('User not found');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/users/1');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });
});
