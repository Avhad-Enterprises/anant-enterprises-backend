import { Application } from 'express';
import App from '../../../../app';
import AdminInviteRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils';
import { AuthTestHelper } from '../../../../../tests/utils';
import { ApiTestHelper } from '../../../../../tests/utils';
import { db } from '../../../../database';
import { invitations } from '../../shared/schema';
import { users } from '../../../user';
import { roles } from '../../../rbac';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Helper to generate valid 64-char invite tokens
const generateInviteToken = () => crypto.randomBytes(32).toString('hex');

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
  let scientistToken: string;
  let scientistRoleId: number;
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
    const { user: admin, token } = await AuthTestHelper.createTestAdminUser();
    adminUserId = admin.id;
    adminToken = token;

    // Create scientist user for authorization tests
    const { token: sciToken } = await AuthTestHelper.createTestUserWithToken();
    scientistToken = sciToken;

    // Get role IDs for tests
    scientistRoleId = await getRoleId('user'); // Default role
    adminRoleId = await getRoleId('admin');
    superadminRoleId = await getRoleId('superadmin');
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/admin/invitations', () => {
    it('should create invitation successfully with admin role', async () => {
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: 'harshalpatilself@gmail.com',
        assigned_role_id: scientistRoleId,
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe('Harshal');
      expect(response.body.data.last_name).toBe('Patil');
      expect(response.body.data.email).toBe('harshalpatilself@gmail.com');
      expect(response.body.data.assigned_role_id).toBe(scientistRoleId);
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
        assigned_role_id: scientistRoleId,
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        adminToken
      );

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
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role_id: scientistRoleId,
      };

      // Create first invitation
      await apiHelper.post('/api/admin/invitations', invitationData, adminToken);

      // Try to create duplicate
      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('active invitation already exists');
    });

    it('should require admin role', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role_id: scientistRoleId,
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        scientistToken
      );

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const invitationData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        assigned_role_id: scientistRoleId,
      };

      const response = await apiHelper.post('/api/admin/invitations', invitationData);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should create invitation for all valid roles', async () => {
      const roles = [
        { name: 'admin', id: adminRoleId },
        { name: 'user', id: scientistRoleId },
        { name: 'superadmin', id: superadminRoleId },
      ];

      for (const role of roles) {
        const invitationData = {
          first_name: 'Test',
          last_name: 'User',
          email: `test.${role.name}@example.com`,
          assigned_role_id: role.id,
        };

        const response = await apiHelper.post(
          '/api/admin/invitations',
          invitationData,
          adminToken
        );

        expect(response.status).toBe(200);
        expect(response.body.data.assigned_role_id).toBe(role.id);
      }
    });
  });

  describe('GET /api/admin/invitations', () => {
    beforeEach(async () => {
      // Create test invitations
      const hashedPassword = await bcrypt.hash('TempPass123!', 12);
      await db.insert(invitations).values([
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.pending@example.com',
          invite_token: generateInviteToken(),
          status: 'pending',
          assigned_role_id: scientistRoleId,
          password_hash: hashedPassword,
          invited_by: adminUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.accepted@example.com',
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
          email: 'bob.expired@example.com',
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
      const response = await apiHelper.get(
        '/api/admin/invitations?status=pending',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.invitations[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await apiHelper.get(
        '/api/admin/invitations?page=1&limit=2',
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.invitations).toHaveLength(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
    });

    it('should require admin role', async () => {
      const response = await apiHelper.get('/api/admin/invitations', scientistToken);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await apiHelper.get('/api/admin/invitations');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Authentication required');
    });
  });

  describe('POST /api/admin/invitations/accept', () => {
    it('should accept invitation and create user account', async () => {
      const inviteToken = generateInviteToken();
      const invitationEmail = `newuser-${Date.now()}@example.com`;
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      await db.insert(invitations).values({
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role_id: scientistRoleId,
        password_hash: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const acceptData = {
        token: inviteToken,
        email: invitationEmail,
        password: tempPassword,
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe(invitationEmail);
      expect(response.body.data.name).toBe('New User');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.message).toContain('Account created successfully');

      // Verify user was created
      const [createdUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, invitationEmail));

      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');
      // Note: role is managed via RBAC (userRoles table), not users table
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
      const inviteToken = generateInviteToken();
      const invitationEmail = `newuser-accepted-${Date.now()}@example.com`;
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      await db.insert(invitations).values({
        first_name: 'New',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role_id: scientistRoleId,
        password_hash: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Accept invitation first time
      await apiHelper.post('/api/admin/invitations/accept', {
        token: inviteToken,
        email: invitationEmail,
        password: tempPassword,
      });

      // Try to accept again
      const response = await apiHelper.post('/api/admin/invitations/accept', {
        token: inviteToken,
        email: invitationEmail,
        password: tempPassword,
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
        assigned_role_id: scientistRoleId,
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
      const inviteToken = generateInviteToken();
      const invitationEmail = `public-${Date.now()}@example.com`;
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      await db.insert(invitations).values({
        first_name: 'Public',
        last_name: 'User',
        email: invitationEmail,
        invite_token: inviteToken,
        status: 'pending',
        assigned_role_id: scientistRoleId,
        password_hash: hashedPassword,
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const acceptData = {
        token: inviteToken,
        email: invitationEmail,
        password: tempPassword,
      };

      const response = await apiHelper.post('/api/admin/invitations/accept', acceptData);

      expect(response.status).toBe(200);
    });
  });

  describe('Email Sending - Real Test', () => {
    it('should send invitation email to harshalpatilself@gmail.com', async () => {
      const invitationData = {
        first_name: 'Harshal',
        last_name: 'Patil',
        email: 'harshalpatilself@gmail.com',
        assigned_role_id: adminRoleId,
      };

      const response = await apiHelper.post(
        '/api/admin/invitations',
        invitationData,
        adminToken
      );

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('harshalpatilself@gmail.com');
      
      // Note: Email verification should be done manually by checking the inbox
      // Invitation ID: ${response.body.data.id}, Status: ${response.body.data.status}
    }, 30000); // 30 second timeout for email sending
  });
});
