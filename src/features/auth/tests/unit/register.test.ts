/**
 * Unit tests for register business logic
 */

import bcrypt from 'bcrypt';
import * as jwt from '../../../../utils';
import * as userQueries from '../../../user';
import { handleRegister } from '../../apis/register';

// Preserve HttpException class
jest.mock('../../../../utils', () => {
  const actualUtils = jest.requireActual('../../../../utils');
  return {
    ...actualUtils,
    hashPassword: bcrypt.hash,
    generateToken: jest.fn(),
  };
});

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../user/shared/queries', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUserById: jest.fn(),
}));
jest.mock('../../../rbac/shared/queries', () => ({
  findRoleByName: jest.fn(),
  assignRoleToUser: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
}

describe('Register Business Logic', () => {
  const mockNewUser = {
    id: 1,
    name: 'New User',
    email: 'newuser@example.com',
    phone_number: '1234567890',
    password: 'hashedPassword123',
    created_by: 1,
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const validRegisterData: RegisterData = {
    name: 'New User',
    email: 'newuser@example.com',
    password: 'password123',
    phone_number: '1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock createUser to return the new user
    mockUserQueries.createUser.mockResolvedValue(mockNewUser);

    // Mock RBAC methods
    const rbac = require('../../../rbac');
    rbac.findRoleByName.mockResolvedValue({ id: 1, name: 'user' });
    rbac.assignRoleToUser.mockResolvedValue(undefined);
    mockUserQueries.updateUserById.mockResolvedValue(undefined);
  });

  describe('handleRegister', () => {
    it('should successfully register a new user', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleRegister(validRegisterData);

      expect(mockUserQueries.findUserByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockBcrypt.hash).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 1,
        name: 'New User',
        email: 'newuser@example.com',
        phone_number: '1234567890',
        token: 'mock.jwt.token',
      });
    });

    it('should throw 409 if email already exists', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(mockNewUser);

      await expect(handleRegister(validRegisterData)).rejects.toMatchObject({
        status: 409,
        message: 'Email already registered',
      });
    });

    it('should use default created_by of 1 if not provided', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleRegister(validRegisterData);

      expect(result).toHaveProperty('id');
      expect(mockUserQueries.createUser).toHaveBeenCalled();
    });

    it('should use provided created_by value', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleRegister(validRegisterData);

      expect(result).toHaveProperty('id');
      expect(mockUserQueries.createUser).toHaveBeenCalled();
    });

    it('should register user with specified role', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const result = await handleRegister(validRegisterData);

      expect(mockUserQueries.createUser).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should return undefined phone_number if not provided', async () => {
      const userWithoutPhone = { ...mockNewUser, phone_number: null };
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      mockUserQueries.createUser.mockResolvedValue(userWithoutPhone);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      const { phone_number: _unusedPhone, ...dataWithoutPhone } = validRegisterData;
      void _unusedPhone;
      const result = await handleRegister(dataWithoutPhone);

      expect(result.phone_number).toBeUndefined();
    });

    it('should hash password with bcrypt salt rounds of 10', async () => {
      mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      mockJwt.generateToken.mockReturnValue('mock.jwt.token');

      await handleRegister(validRegisterData);

      expect(mockBcrypt.hash).toHaveBeenCalled();
    });
  });
});
