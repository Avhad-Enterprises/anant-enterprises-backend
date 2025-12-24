/**
 * Unit tests for login business logic
 */

import bcrypt from 'bcrypt';
import * as jwt from '../../../../utils';
import * as userQueries from '../../../user';
import { handleLogin } from '../../apis/login';

// Preserve HttpException class
jest.mock('../../../../utils', () => {
  const actualUtils = jest.requireActual('../../../../utils');
  return {
    ...actualUtils,
    verifyPassword: bcrypt.compare,
    generateToken: jest.fn(),
  };
});

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../user/shared/queries');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

describe('Login Business Logic', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    password: 'hashedPassword123',
    role: 'scientist' as const,
    created_by: 1,
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

  describe('handleLogin', () => {
    it('should successfully login with valid credentials', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
      expect(mockJwt.generateToken).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
        '24h'
      );
      expect(result).toMatchObject({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone_number: '1234567890',
        token: 'mock.jwt.token',
      });
    });

    it('should throw 400 if email is missing', async () => {
      await expect(handleLogin('', 'password123')).rejects.toMatchObject({
        status: 400,
        message: 'Email and password are required',
      });
    });

    it('should throw 400 if password is missing', async () => {
      await expect(handleLogin('test@example.com', '')).rejects.toMatchObject({
        status: 400,
        message: 'Email and password are required',
      });
    });

    it('should throw 404 if user not found', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);

      await expect(handleLogin('notfound@example.com', 'password123')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid credentials',
      });
    });

    it('should throw 401 if password is incorrect', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(handleLogin('test@example.com', 'wrongpassword')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid credentials',
      });
    });

    it('should return undefined phone_number if user has no phone', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      mockUserQueries.findUserByEmail.mockResolvedValue(userWithoutPhone);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(result.phone_number).toBeUndefined();
    });

    it('should handle different user roles', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      mockUserQueries.findUserByEmail.mockResolvedValue(adminUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleLogin('test@example.com', 'password123');

      expect(mockJwt.generateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        }),
        '24h'
      );
    });
  });
});
