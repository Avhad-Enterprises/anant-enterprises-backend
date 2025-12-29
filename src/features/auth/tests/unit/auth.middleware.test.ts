// Mock the middleware
jest.mock('../../../../middlewares', () => ({
  requireAuth: jest.fn(),
}));

// Mock utils to preserve HttpException class
jest.mock('../../../../utils', () => {
  const actualUtils = jest.requireActual('../../../../utils');
  return {
    ...actualUtils,
    HttpException: actualUtils.HttpException,
    logger: {
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    },
  };
});

import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../../middlewares';
import { HttpException } from '../../../../utils';
import type { RequestWithUser } from '../../../../interfaces';

describe('Auth Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      userId: undefined, // Initialize userId property
    };
    mockResponse = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should successfully authenticate with valid token', async () => {
      const mockUser = { id: 1 };
      mockRequest.headers = {
        authorization: 'Bearer valid.jwt.token',
      };
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        (req as RequestWithUser).userId = mockUser.id;
        next();
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(mockRequest.userId).toBe(mockUser.id);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should throw 401 error if no authorization header', async () => {
      mockRequest.headers = {};
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(new HttpException(401, 'Authentication required. No token provided.'));
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic dXNlcjpwYXNz',
      };
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(new HttpException(401, 'Authentication required. No token provided.'));
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if token is null string', async () => {
      mockRequest.headers = {
        authorization: 'Bearer null',
      };
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(new HttpException(401, 'Authentication required. No token provided.'));
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Authentication required. No token provided.');
    });

    it('should throw 401 error if token verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(new HttpException(401, 'Invalid or expired token'));
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('Invalid or expired token');
    });

    it('should throw 401 error if user not found in database', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(new HttpException(401, 'User not found'));
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toBe('User not found');
    });

    it('should pass HttpException through if verifySupabaseToken throws one', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };
      const httpException = new HttpException(401, 'Token expired');
      mockRequireAuth.mockImplementation(async (req, res, next) => {
        next(httpException);
      });

      await requireAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(httpException);
    });
  });
});
