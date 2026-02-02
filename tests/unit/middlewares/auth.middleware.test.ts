jest.mock('@/features/auth/services/supabase-auth.service', () => ({
  verifySupabaseToken: jest.fn(),
}));

jest.mock('@/database', () => {
  const mockDbChain = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
  };

  // Set up the chain to return itself for chaining
  mockDbChain.select.mockReturnValue(mockDbChain);
  mockDbChain.from.mockReturnValue(mockDbChain);
  mockDbChain.where.mockReturnValue(mockDbChain);

  return {
    db: mockDbChain,
  };
});

jest.mock('@/features/user/shared/user.schema', () => ({
  users: 'mocked_users_table',
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@/middlewares/auth.middleware';
import { verifySupabaseToken } from '@/features/auth/services/supabase-auth.service';
import { HttpException } from '@/utils';
import type { RequestWithUser } from '@/interfaces';
import { db } from '@/database';
import type { User } from '@supabase/supabase-js';

const mockVerifySupabaseToken = verifySupabaseToken as jest.MockedFunction<
  typeof verifySupabaseToken
>;
const mockDb = db as any; // Use any to bypass complex Drizzle typing for tests

describe('Auth Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      userId: undefined,
      ip: '127.0.0.1',
      originalUrl: '/test',
      method: 'GET',
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();

    // Reset the mock chain
    (mockDb.select as jest.Mock).mockReturnValue(mockDb);
    (mockDb.from as jest.Mock).mockReturnValue(mockDb);
    (mockDb.where as jest.Mock).mockReturnValue(mockDb);
  });

  describe('requireAuth', () => {
    it('should successfully authenticate with valid token', async () => {
      const mockAuthUser: User = {
        id: 'uuid-from-supabase',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: undefined,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        identities: [],
      };
      const mockDbUser = { id: 1, auth_id: 'uuid-from-supabase', email: 'test@example.com' };
      mockRequest.headers = {
        authorization: 'Bearer valid.jwt.token',
        'user-agent': 'test-agent',
      };

      mockVerifySupabaseToken.mockResolvedValue(mockAuthUser);
      (mockDb.limit as jest.Mock).mockResolvedValue([mockDbUser]);

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifySupabaseToken).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockRequest.userId).toBe(mockDbUser.id);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw 401 error if no authorization header', async () => {
      mockRequest.headers = {};

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = nextFunction.mock.calls[0][0] as unknown as HttpException;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic dXNlcjpwYXNz',
      };

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = nextFunction.mock.calls[0][0] as unknown as HttpException;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if token is null string', async () => {
      mockRequest.headers = {
        authorization: 'Bearer null',
      };

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = nextFunction.mock.calls[0][0] as unknown as HttpException;
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if token verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };

      mockVerifySupabaseToken.mockResolvedValue(null);

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifySupabaseToken).toHaveBeenCalledWith('invalid.token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = nextFunction.mock.calls[0][0] as unknown as HttpException;
      expect(error.status).toBe(401);
    });

    it('should throw 401 error if user not found in database', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      const mockAuthUser: User = {
        id: 'uuid-from-supabase',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: undefined,
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
        identities: [],
      };

      mockVerifySupabaseToken.mockResolvedValue(mockAuthUser);
      (mockDb.limit as jest.Mock).mockResolvedValue([]); // No user found

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifySupabaseToken).toHaveBeenCalledWith('valid.token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = nextFunction.mock.calls[0][0] as unknown as HttpException;
      expect(error.status).toBe(401);
      expect(error.message).toBe('User not found');
    });

    it('should pass HttpException through if verifySupabaseToken throws one', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };

      const httpException = new HttpException(401, 'Token expired');
      mockVerifySupabaseToken.mockRejectedValue(httpException);

      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockVerifySupabaseToken).toHaveBeenCalledWith('expired.token');
      expect(nextFunction).toHaveBeenCalledWith(httpException);
    });
  });
});
