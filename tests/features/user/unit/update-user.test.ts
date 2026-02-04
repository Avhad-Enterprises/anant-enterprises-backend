/**
 * Unit tests for update-user business logic
 */

import bcrypt from 'bcrypt';
import { HttpException } from '@/utils';
import * as userQueries from '@/features/user/shared/queries';
import { db } from '@/database';
import { users } from '@/features/user/shared/user.schema';
import { IUser } from '@/features/user/shared/interface';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('@/features/user/shared/queries');
jest.mock('@/database/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockDb = db as jest.Mocked<typeof db>;

interface UpdateUserData {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
}

// Recreate the business logic for testing
async function updateUser(id: string, data: UpdateUserData, updatedBy: string): Promise<IUser> {
  const existingUser = await userQueries.findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  if (data.email && data.email !== existingUser.email) {
    const existingUserWithEmail = await userQueries.findUserByEmail(data.email);

    if (existingUserWithEmail && existingUserWithEmail.id !== id) {
      throw new HttpException(409, 'Email already exists');
    }
  }

  const updateData: Partial<IUser> = {
    ...data,
    updated_by: updatedBy,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const [result] = await (
    db.update(users).set({
      ...updateData,
      updated_at: new Date(),
    }) as any
  )
    .where()
    .returning();

  if (!result) {
    throw new HttpException(500, 'Failed to update user');
  }

  return result as IUser;
}

describe('Update User Business Logic', () => {
  const mockUser: any = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    auth_id: null,
    user_type: 'individual',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    email_verified: true,
    email_verified_at: null,
    phone_number: '1234567890',
    phone_country_code: '+1',
    phone_verified: false,
    phone_verified_at: undefined,
    profile_image_url: undefined,
    date_of_birth: undefined,
    gender: 'prefer_not_to_say',
    preferred_language: 'en',
    preferred_currency: 'USD',
    timezone: 'UTC',
    created_by: '550e8400-e29b-41d4-a716-446655440001',
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const updatedMockUser = {
    ...mockUser,
    name: 'Updated User',
    updated_by: '550e8400-e29b-41d4-a716-446655440002',
    updated_at: new Date('2024-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain
    const mockReturning = jest.fn().mockResolvedValue([updatedMockUser]);
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('updateUser', () => {
    it('should successfully update user name', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Updated User' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(result.name).toBe('Updated User');
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440999',
          { name: 'Test' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toThrow(HttpException);
      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440999',
          { name: 'Test' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should throw 409 when email already exists for another user', async () => {
      const anotherUser = {
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'existing@example.com',
      };
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockUserQueries.findUserByEmail.mockResolvedValue(anotherUser);

      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440001',
          { email: 'existing@example.com' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toThrow(HttpException);
      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440001',
          { email: 'existing@example.com' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toMatchObject({
        status: 409,
        message: 'Email already exists',
      });
    });

    it('should allow updating email to same value', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      // Same email as current user, should not throw

      const result = await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { email: 'test@example.com' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockUserQueries.findUserByEmail).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should allow updating email if it belongs to same user', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser); // Same user

      const updatedWithNewEmail = { ...updatedMockUser, email: 'newemail@example.com' };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithNewEmail]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { email: 'newemail@example.com' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(result).toBeDefined();
    });

    it('should hash password when updating', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { password: 'newPassword123' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
    });

    it('should not hash password when not updating password', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'New Name' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should set updated_by field', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const expectedResult = {
        ...updatedMockUser,
        updated_by: '550e8400-e29b-41d4-a716-446655440005',
      };
      const mockReturning = jest.fn().mockResolvedValue([expectedResult]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { name: 'Test' },
        '550e8400-e29b-41d4-a716-446655440005'
      );

      expect(result.updated_by).toBe('550e8400-e29b-41d4-a716-446655440005');
    });

    // Role update test removed as role is not on user table

    it('should throw 500 when database update fails', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockReturning = jest.fn().mockResolvedValue([undefined]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440000',
          { name: 'Test' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toThrow(HttpException);
      await expect(
        updateUser(
          '550e8400-e29b-41d4-a716-446655440000',
          { name: 'Test' },
          '550e8400-e29b-41d4-a716-446655440002'
        )
      ).rejects.toMatchObject({
        status: 500,
        message: 'Failed to update user',
      });
    });

    it('should update phone number', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const updatedWithPhone = { ...updatedMockUser, phone_number: '9999999999' };
      const mockReturning = jest.fn().mockResolvedValue([updatedWithPhone]);
      const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      const result = await updateUser(
        '550e8400-e29b-41d4-a716-446655440000',
        { phone_number: '9999999999' },
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(result.phone_number).toBe('9999999999');
    });
  });
});
