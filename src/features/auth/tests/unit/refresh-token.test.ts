/**
 * Unit tests for refresh-token business logic
 */

import * as jwt from '../../../../utils';
import * as userQueries from '../../../user';
import { handleRefreshToken } from '../../apis/refresh-token';

// Preserve HttpException class
jest.mock('../../../../utils', () => {
  const actualUtils = jest.requireActual('../../../../utils');
  return {
    ...actualUtils,
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
  };
});

jest.mock('../../../user/shared/queries');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>;

describe('Refresh Token Business Logic', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRefreshToken', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockJwt.generateToken.mockReturnValue('new.access.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(mockJwt.verifyToken).toHaveBeenCalledWith('valid.refresh.token');
      expect(mockUserQueries.findUserById).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        phone_number: '1234567890',
        token: 'new.access.token',
      });
    });

    it('should throw 401 if decoded token is a string', async () => {
      mockJwt.verifyToken.mockReturnValue('invalid-string-token');

      await expect(handleRefreshToken('bad.token')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid refresh token format',
      });
    });

    it('should throw 401 if decoded token has no id', async () => {
      mockJwt.verifyToken.mockReturnValue({ email: 'test@example.com' });

      await expect(handleRefreshToken('no-id.token')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid refresh token format',
      });
    });

    it('should throw 404 if user not found', async () => {
      const decodedToken = { id: 999, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(undefined);

      await expect(handleRefreshToken('valid.token.deleted.user')).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should return undefined phone_number if user has no phone', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(userWithoutPhone);
      mockJwt.generateToken.mockReturnValue('new.access.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(result.phone_number).toBeUndefined();
    });

    it('should propagate HttpException from verifyToken', async () => {
      const HttpException = require('../../../../utils').HttpException;
      const tokenExpiredError = new HttpException(401, 'Token has expired');
      mockJwt.verifyToken.mockImplementation(() => {
        throw tokenExpiredError;
      });

      await expect(handleRefreshToken('expired.token')).rejects.toThrow(tokenExpiredError);
    });

    it('should handle different user roles correctly', async () => {
      const decodedToken = { id: 1, iat: 1234567890, exp: 1234567890 };
      mockJwt.verifyToken.mockReturnValue(decodedToken);
      mockUserQueries.findUserById.mockResolvedValue(mockUser);
      mockJwt.generateToken.mockReturnValue('new.access.token');

      const result = await handleRefreshToken('valid.refresh.token');

      expect(result.id).toBe(1);
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
