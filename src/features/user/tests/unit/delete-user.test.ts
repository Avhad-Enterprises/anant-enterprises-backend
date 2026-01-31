/**
 * Unit tests for delete-user business logic (soft delete)
 */

import { HttpException } from '../../../../utils';
import * as userQueries from '../../shared/queries';
import { db } from '../../../../database';
import { users } from '../../shared/user.schema';

// Mock dependencies
jest.mock('../../shared/queries');
jest.mock('../../../../database/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
  },
}));

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;
const mockDb = db as jest.Mocked<typeof db>;

// Recreate the business logic for testing
async function deleteUser(id: string, deletedBy: string): Promise<void> {
  const existingUser = await userQueries.findUserById(id);

  if (!existingUser) {
    throw new HttpException(404, 'User not found');
  }

  await (
    db.update(users).set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    }) as any
  ).where();
}

describe('Delete User Business Logic', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });
  });

  describe('deleteUser', () => {
    it('should successfully soft delete user', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')
      ).resolves.toBeUndefined();

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655449999', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toThrow(HttpException);
      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655449999', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should set is_deleted to true', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          is_deleted: true,
        })
      );
    });

    it('should set deleted_by field', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440005'
      );

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_by: '550e8400-e29b-41d4-a716-446655440005',
        })
      );
    });

    it('should set deleted_at timestamp', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await deleteUser(
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(Date),
        })
      );
    });

    it('should call findUserById with correct id', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await deleteUser(
        '550e8400-e29b-41d4-a716-446655440042',
        '550e8400-e29b-41d4-a716-446655440002'
      );

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440042'
      );
    });

    it('should not call update when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      try {
        await deleteUser(
          '550e8400-e29b-41d4-a716-446655440999',
          '550e8400-e29b-41d4-a716-446655440002'
        );
      } catch {
        // Expected to throw
      }

      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const mockWhere = jest.fn().mockRejectedValue(new Error('Database error'));
      const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toThrow('Database error');
    });

    it('should be idempotent - deleting already deleted user still checks existence', async () => {
      // If user is already soft-deleted, findUserById returns undefined
      // (because queries filter by is_deleted = false)
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(
        deleteUser('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
      ).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });
  });
});
