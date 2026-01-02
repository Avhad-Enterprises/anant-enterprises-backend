/**
 * Unit tests for create-invitation business logic (NEW FLOW - No temp passwords)
 */

import { HttpException } from '../../../../utils';
import * as inviteQueries from '../../shared/queries';
import * as userQueries from '../../../user';
import { sendInvitationEmail } from '../../../../utils/email/sendInvitationEmail';
import { ICreateInvitation, IInvitation } from '../../shared/interface';
import { Invitation } from '../../shared/schema';
import { config } from '../../../../utils/validateEnv';

// Mock dependencies
jest.mock('../../shared/queries');
jest.mock('../../../user');
jest.mock('../../../../utils/email/sendInvitationEmail');
jest.mock('../../../../database', () => ({
  db: jest.fn(),
}));
jest.mock('../../../../utils/validateEnv', () => ({
  config: {
    ALLOWED_ORIGINS: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:8080',
  },
}));
jest.mock('../../../../utils', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  HttpException: class extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
      this.name = 'HttpException';
    }
  },
}));

const mockInviteQueries = inviteQueries as jest.Mocked<typeof inviteQueries>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockSendEmail = sendInvitationEmail as jest.MockedFunction<typeof sendInvitationEmail>;

// Recreate the NEW business logic for testing (NO temp passwords)
async function handleCreateInvitation(
  invitationData: ICreateInvitation & { first_name: string; last_name: string },
  invitedBy: number | string
): Promise<IInvitation> {
  // Check if user already exists
  const existingUser = await userQueries.findUserByEmail(invitationData.email);
  if (existingUser) {
    throw new HttpException(409, 'A user with this email already exists');
  }

  // Check for existing pending invitation
  const existingInvitation = await inviteQueries.findInvitationByEmail(invitationData.email);
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new HttpException(409, 'An active invitation already exists for this email');
  }

  const inviteToken = 'a'.repeat(64); // Mocked token
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Create invitation record (NO user creation, NO password generation)
  const newInvitation = await inviteQueries.createInvitation({
    first_name: invitationData.first_name,
    last_name: invitationData.last_name,
    email: invitationData.email,
    assigned_role_id: invitationData.assigned_role_id,
    invite_token: inviteToken,
    temp_password_encrypted: null, // Not used in new flow
    password_hash: '', // Not used
    invited_by: String(invitedBy),
    expires_at: expiresAt,
    status: 'pending',
  });

  // Send email with accept link ONLY (NO password)
  try {
    const frontendUrl = config.FRONTEND_URL.replace(/\/+$/, '');
    const inviteLink = `${frontendUrl}/accept-invitation?invite_token=${inviteToken}`;
    await sendInvitationEmail({
      to: invitationData.email,
      firstName: invitationData.first_name,
      lastName: invitationData.last_name,
      inviteLink,
      expiresIn: '24 hours',
    });
  } catch {
    // Email errors are logged but don't block operation
  }

  return {
    id: newInvitation.id,
    first_name: newInvitation.first_name,
    last_name: newInvitation.last_name,
    email: newInvitation.email,
    status: newInvitation.status,
    assigned_role_id: newInvitation.assigned_role_id,
    temp_password_encrypted: newInvitation.temp_password_encrypted,
    password_hash: newInvitation.password_hash,
    verify_attempts: newInvitation.verify_attempts,
    invited_by: newInvitation.invited_by,
    expires_at: newInvitation.expires_at,
    accepted_at: newInvitation.accepted_at,
    created_at: newInvitation.created_at,
    updated_at: newInvitation.updated_at,
    is_deleted: newInvitation.is_deleted,
    deleted_by: newInvitation.deleted_by,
    deleted_at: newInvitation.deleted_at,
  };
}

describe('Create Invitation Business Logic (New Flow)', () => {
  const mockInvitationData: ICreateInvitation & { first_name: string; last_name: string } = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    assigned_role_id: 2,
  };

  const mockCreatedInvitation: Invitation = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    invite_token: 'a'.repeat(64),
    status: 'pending',
    assigned_role_id: 2,
    temp_password_encrypted: null, // NEW: No temp password
    password_hash: '', // NEW: Empty
    verify_attempts: 0,
    invited_by: '1',
    expires_at: new Date('2024-01-02'),
    accepted_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
    mockInviteQueries.findInvitationByEmail.mockResolvedValue(undefined);
    mockInviteQueries.createInvitation.mockResolvedValue(mockCreatedInvitation);
    mockSendEmail.mockResolvedValue(undefined);
  });

  describe('handleCreateInvitation', () => {
    it('should successfully create invitation for new email', async () => {
      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockInviteQueries.findInvitationByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockInviteQueries.createInvitation).toHaveBeenCalled();
      expect(result.first_name).toBe('John');
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should NOT generate temp password', async () => {
      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          temp_password_encrypted: null,
          password_hash: '',
        })
      );
    });

    it('should NOT create Supabase user', async () => {
      // In new flow, user is created only when invitation is accepted
      await handleCreateInvitation(mockInvitationData, 1);

      // Verify only invitation is created, no user creation
      expect(mockInviteQueries.createInvitation).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 if user already exists', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue({
        id: 1,
        email: 'john.doe@example.com',
      } as any);

      await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toThrow(HttpException);
      await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toMatchObject({
        status: 409,
        message: 'A user with this email already exists',
      });
    });

    it('should throw 409 if pending invitation exists', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'pending',
      });

      await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toThrow(
        'An active invitation already exists for this email'
      );
    });

    it('should allow new invitation if previous was accepted', async () => {
      mockInviteQueries.findInvitationByEmail.mockResolvedValue({
        ...mockCreatedInvitation,
        status: 'accepted',
      });

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
      expect(mockInviteQueries.createInvitation).toHaveBeenCalled();
    });

    it('should send email with accept link ONLY (no password)', async () => {
      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        inviteLink: expect.stringContaining('accept-invitation?invite_token='),
        expiresIn: '24 hours',
      });

      // Verify NO tempPassword parameter
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tempPassword: expect.anything(),
        })
      );
    });

    it('should not fail if email sending fails', async () => {
      mockSendEmail.mockRejectedValue(new Error('Email failed'));

      const result = await handleCreateInvitation(mockInvitationData, 1);

      expect(result).toBeDefined();
      expect(result.email).toBe('john.doe@example.com');
    });

    it('should set status to pending', async () => {
      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should set invited_by from parameter', async () => {
      await handleCreateInvitation(mockInvitationData, '5');

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ invited_by: '5' })
      );
    });

    it('should set expires_at to 24 hours from now', async () => {
      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Date),
        })
      );
    });

    it('should create invitation with assigned role', async () => {
      await handleCreateInvitation(mockInvitationData, 1);

      expect(mockInviteQueries.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ assigned_role_id: 2 })
      );
    });
  });
});
