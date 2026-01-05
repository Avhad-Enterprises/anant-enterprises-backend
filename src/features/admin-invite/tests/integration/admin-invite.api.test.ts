import { Application } from 'express';
import App from '../../../../app';
import AdminInviteRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { ApiTestHelper } from '../../../../../tests/utils';
import { db } from '../../../../database';
import { invitations } from '../../shared/admin-invite.schema';
import { users } from '../../../user';
import { roles } from '../../../rbac';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Helper to generate valid 64-char invite tokens
const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

// Helper to generate unique test emails
const generateTestEmail = (prefix: string = 'test') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

// Helper to get role ID by name
async function getRoleId(roleName: string): Promise<number> {
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  if (!role) throw new Error(`Role '${roleName}' not found`);
  return role.id;
}

describe('Admin Invite API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let adminUserId: number;
  let regularUserToken: string;
  let userRoleId: number;
  let adminRoleId: number;
  let superadminRoleId: number;

  beforeAll(async () => {
    const adminInviteRoute = new AdminInviteRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, adminInviteRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create admin user with proper RBAC permissions
    const { user: admin, token } = await SupabaseAuthHelper.createTestAdminUser();
    adminUserId = admin.id;
    adminToken = token;

    // Create regular user for authorization tests
    const { token: regUserToken } = await SupabaseAuthHelper.createTestUserWithToken();
    regularUserToken = regUserToken;

    // Get role IDs for tests
    userRoleId = await getRoleId('user'); // Default role
    adminRoleId = await getRoleId('admin');
    superadminRoleId = await getRoleId('superadmin');
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/admin/invitations', () => {
    it('should create invitation successfully with admin role', async () => {
      const testEmail = generateTestEmail('harshal');
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: testEmail,
        assigned_role_id: userRoleId,
      };

      const response = await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe('Harshal');
      expect(response.body.data.last_name).toBe('Patil');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.assigned_role_id).toBe(userRoleId);
      expect(response.body.data.status).toBe('pending');
      // invite_token is intentionally not returned for security - token is only sent via email
      expect(response.body.data.invite_token).toBeUndefined();
      expect(response.body.data.password).toBeUndefined(); // Password should not be returned
      expect(response.body.message).toContain('Invitation sent successfully');
    });

    it('should fail with invalid email format', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        assigned_role_id: userRoleId,
      };

      const response = await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });

    it('should fail with invalid role type', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role_id: 'invalid_role', // String instead of number
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData as any,
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const invitationData = {
        first_name: 'John',
        email: 'john.doe@example.com',
        // Missing last_name and assigned_role_id
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData as any,
        adminToken
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should fail with duplicate active invitation', async () => {
      const testEmail = generateTestEmail('john');
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: testEmail,
        assigned_role_id: userRoleId,
      };

      // Create first invitation
      await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      // Try to create duplicate
      const response = await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain(
        'An active invitation already exists for this email'
      );
    });

    it('should require admin role', async () => {
      const testEmail = generateTestEmail('scientist');
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: testEmail,
        assigned_role_id: userRoleId,
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        regularUserToken
      );

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role_id: userRoleId,
      };

      const response = await apiHelper.post('/api/admin/invitations', invitationData);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should create invitation for all valid roles', async () => {
      const roles = [
        { name: 'admin', id: adminRoleId },
        { name: 'user', id: userRoleId },
        { name: 'superadmin', id: superadminRoleId },
      ];

      for (const role of roles) {
        const testEmail = generateTestEmail(`test-${role.name}`);
        const invitationData = {
          first_name: 'Test',
          last_name: 'User',
          email: testEmail,
          assigned_role_id: role.id,
        };

        const response = await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

        expect(response.status).toBe(200);
        expect(response.body.data.assigned_role_id).toBe(role.id);
      }
    });
  });

  describe('GET /api/admin/invitations', () => {
    beforeEach(async () => {
      // Create test invitations
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);
      const pendingEmail = generateTestEmail('john-pending');
      const acceptedEmail = generateTestEmail('jane-accepted');
      const expiredEmail = generateTestEmail('bob-expired');

      await db.insert(invitations).values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: pendingEmail,
          invite_token: generateInviteToken(),
          status: 'pending',
          assigned_role_id: userRoleId,
          password_hash: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: acceptedEmail,
          invite_token: generateInviteToken(),
          status: 'accepted',
          assigned_role_id: adminRoleId,
          password_hash: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          accepted_at: new Date(),
        },
        {
          first_name: 'Bob',
          last_name: 'Wilson',
          email: expiredEmail,
          invite_token: generateInviteToken(),
          status: 'expired',
          assigned_role_id: superadminRoleId,
          password_hash: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ]);
    });

    it('should get all invitations for admin', async () => {
      const response = await apiHelper.get('/api/admin/invitations', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should filter invitations by status', async () => {
      const response = await apiHelper.get('/api/admin/invitations?status=pending', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.invitations[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await apiHelper.get('/api/admin/invitations?page=1&limit=2', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
    });

    it('should require admin role', async () => {
      const response = await apiHelper.get('/api/admin/invitations', regularUserToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/admin/invitations');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('GET /api/admin/invitations/details', () => {
    let testInvitationToken: string;
    let testInvitationEmail: string;

    beforeEach(async () => {
      // Create a test invitation
      testInvitationEmail = generateTestEmail('details-test');
      const invitationData = {
        first_name: 'Details',
        last_name: 'Test',
        email: testInvitationEmail,
        assigned_role_id: userRoleId,
      };

      await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      // Get the invitation token from database
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, testInvitationEmail))
        .limit(1);

      testInvitationToken = invitation.invite_token;
    });

    it('should return invitation details for valid token', async () => {
      const response = await apiHelper.get(
        `/api/admin/invitations/details?token=${testInvitationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe('Details');
      expect(response.body.data.last_name).toBe('Test');
      expect(response.body.data.email).toBe(testInvitationEmail);
    });

    it('should NOT return sensitive data (role, password, token)', async () => {
      const response = await apiHelper.get(
        `/api/admin/invitations/details?token=${testInvitationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('assigned_role_id');
      expect(response.body.data).not.toHaveProperty('temp_password_encrypted');
      expect(response.body.data).not.toHaveProperty('password_hash');
      expect(response.body.data).not.toHaveProperty('invite_token');
    });

    it('should fail with invalid token format', async () => {
      const response = await apiHelper.get(
        '/api/admin/invitations/details?token=invalid-short-token'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('token');
    });

    it('should fail with non-existent token', async () => {
      const fakeToken = generateInviteToken();
      const response = await apiHelper.get(`/api/admin/invitations/details?token=${fakeToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Invalid or expired invitation');
    });

    it('should fail if invitation already accepted', async () => {
      // Accept the invitation first
      await apiHelper.post('/api/admin/invitations/accept', {
        token: testInvitationToken,
        email: testInvitationEmail,
        password: 'SecurePass123!',
      });

      // Try to get details again
      const response = await apiHelper.get(
        `/api/admin/invitations/details?token=${testInvitationToken}`
      );

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been accepted');
    });

    it('should fail if invitation expired', async () => {
      // Create expired invitation
      const expiredEmail = generateTestEmail('expired');
      const expiredToken = generateInviteToken();
      await db.insert(invitations).values({
        first_name: 'Expired',
        last_name: 'User',
        email: expiredEmail,
        invite_token: expiredToken,
        status: 'pending',
        assigned_role_id: userRoleId,
        password_hash: '',
        invited_by: adminUserId,
        expires_at: new Date(Date.now() - 1000), // Already expired
      });

      const response = await apiHelper.get(`/api/admin/invitations/details?token=${expiredToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('expired');
    });

    it('should not require authentication (public endpoint)', async () => {
      const response = await apiHelper.get(
        `/api/admin/invitations/details?token=${testInvitationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(testInvitationEmail);
    });

    it('should increment verification attempts', async () => {
      // Call the endpoint
      await apiHelper.get(`/api/admin/invitations/details?token=${testInvitationToken}`);

      // Check that verify_attempts was incremented in database
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, testInvitationEmail))
        .limit(1);

      expect(invitation.verify_attempts).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/invitations/accept', () => {
    it('should accept invitation and create user account', async () => {
      const invitationEmail = generateTestEmail('accept-test');

      // Create invitation using the API
      const invitationData = {
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        assigned_role_id: userRoleId,
      };

      const createResponse = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        adminToken
      );

      expect(createResponse.status).toBe(200);

      // Get the invitation token from the response or database
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, invitationEmail))
        .limit(1);

      expect(invitation).toBeDefined();

      const acceptData = {
        token: invitation.invite_token,
        email: invitationEmail,
        password: 'NewSecurePassword123!', // User provides new password
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe(invitationEmail);
      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.session.access_token).toBeDefined();
      expect(response.body.message).toContain('Account created successfully');

      // Verify user was updated in database
      const [createdUser] = await db.select().from(users).where(eq(users.email, invitationEmail));

      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');
    });

    it('should fail with invalid token', async () => {
      const acceptData = {
        token: generateInviteToken(), // Valid format but doesn't exist
        email: 'test@example.com',
        password: 'NewSecurePass123!',
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Invalid or expired invitation token');
    });

    it('should fail with weak password validation on token format', async () => {
      // Token validation happens first - 64 chars required
      const acceptData = {
        token: 'short-token',
        email: 'test@example.com',
        password: 'weak',
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('token');
    });

    it('should fail if invitation already accepted', async () => {
      const invitationEmail = generateTestEmail('already-accepted');

      // Create invitation using the API
      const invitationData = {
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        assigned_role_id: userRoleId,
      };

      await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      // Get the invitation token
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, invitationEmail))
        .limit(1);

      // Accept invitation first time
      await apiHelper.post('/api/admin/invitations/accept', {
        token: invitation.invite_token,
        email: invitationEmail,
        password: 'NewSecurePassword123!',
      });

      // Try to accept again
      const response = await apiHelper.post('/api/admin/invitations/accept', {
        token: invitation.invite_token,
        email: invitationEmail,
        password: 'AnotherPassword123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('already been accepted');
    });

    it('should fail if invitation expired', async () => {
      // Create expired invitation
      const expiredToken = generateInviteToken();
      const expiredEmail = `expired-${Date.now()}@example.com`;
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      await db.insert(invitations).values({
        first_name: 'Expired',
        last_name: 'User',
        email: expiredEmail,
        invite_token: expiredToken,
        status: 'pending',
        assigned_role_id: userRoleId,
        password_hash: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() - 1000), // Already expired
      });

      const response = await apiHelper.post('/api/admin/invitations/accept', {
        token: expiredToken,
        email: expiredEmail,
        password: tempPassword,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('expired');
    });

    it('should not require authentication (public endpoint)', async () => {
      const invitationEmail = generateTestEmail('public-endpoint');

      // Create invitation using the API
      const invitationData = {
        first_name: 'Public',
        last_name: 'User',
        email: invitationEmail,
        assigned_role_id: userRoleId,
      };

      await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      // Get the invitation token
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, invitationEmail))
        .limit(1);

      const acceptData = {
        token: invitation.invite_token,
        email: invitationEmail,
        password: 'NewSecurePassword123!',
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
    });
  });

  describe('Email Sending - Real Test', () => {
    it('should send invitation email successfully', async () => {
      const testEmail = generateTestEmail('email-test');
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: testEmail,
        assigned_role_id: adminRoleId,
      };

      const response = await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(testEmail);

      // Note: Email verification should be done manually by checking the inbox
      // Invitation ID: ${response.body.data.id}, Status: ${response.body.data.status}
    }, 30000); // 30 second timeout for email sending
  });
});
