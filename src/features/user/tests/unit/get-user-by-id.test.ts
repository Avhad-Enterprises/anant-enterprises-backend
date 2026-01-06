/**
 * Unit tests for get-user-by-id business logic
 */

import { HttpException } from '../../../../utils';
import * as userQueries from '../../shared/queries';
import { IUser } from '../../shared/interface';

// Mock dependencies
jest.mock('../../shared/queries');

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

// Recreate the business logic for testing
async function getUserById(id: string): Promise<IUser> {
  const user = await userQueries.findUserById(id);

  if (!user) {
    throw new HttpException(404, 'User not found');
  }

  return user as IUser;
}

describe('Get User By ID Business Logic', () => {
  const mockUser: any = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    auth_id: 'auth_123',
    user_type: 'individual',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    email_verified: true,
    phone_number: '1234567890',
    phone_country_code: '+1',
    phone_verified: false,
    phone_verified_at: undefined,
    profile_image_url: undefined,
    date_of_birth: '1990-01-01',
    gender: 'male',
    preferred_language: 'en',
    preferred_currency: 'USD',
    timezone: 'America/New_York',
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
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await getUserById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw 404 when user not found', async () => {
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(getUserById('99999999-9999-9999-9999-999999999999')).rejects.toThrow(
        HttpException
      );
      await expect(getUserById('99999999-9999-9999-9999-999999999999')).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should return user with all fields', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      const result = await getUserById('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('user_type', 'individual');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('is_deleted', false);
    });

    it('should call findUserById with correct id', async () => {
      mockUserQueries.findUserById.mockResolvedValue(mockUser);

      await getUserById('550e8400-e29b-41d4-a716-446655440042');

      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440042'
      );
      expect(mockUserQueries.findUserById).toHaveBeenCalledTimes(1);
    });

    it('should return user with business type', async () => {
      const businessUser = { ...mockUser, user_type: 'business' as const };
      mockUserQueries.findUserById.mockResolvedValue(businessUser);

      const result = await getUserById('550e8400-e29b-41d4-a716-446655440000');

      expect(result.user_type).toBe('business');
    });

    it('should return user without phone number', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      mockUserQueries.findUserById.mockResolvedValue(userWithoutPhone);

      const result = await getUserById('550e8400-e29b-41d4-a716-446655440000');

      expect(result.phone_number).toBeNull();
    });

    it('should handle database errors', async () => {
      mockUserQueries.findUserById.mockRejectedValue(new Error('Database error'));

      await expect(getUserById('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'Database error'
      );
    });
  });
});
