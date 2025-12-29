import { Request, Response, NextFunction } from 'express';
import requireAuth from '../../auth.middleware';
import { HttpException } from '../../../utils/helpers/httpException';
import { createMockUserRequest, createMockResponse, createMockSupabaseUser, createMockDbQueryChain } from '../../../utils/tests/test-utils';

// Mock dependencies
jest.mock('../../../utils/logging/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../../../features/auth/services/supabase-auth.service', () => ({
    verifySupabaseToken: jest.fn(),
}));

jest.mock('../../../database', () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn(),
    },
}));

import { verifySupabaseToken } from '../../../features/auth/services/supabase-auth.service';
import { db } from '../../../database';

const mockVerifySupabaseToken = verifySupabaseToken as jest.MockedFunction<typeof verifySupabaseToken>;
const mockDbSelect = db.select as jest.MockedFunction<typeof db.select>;

describe('Auth Middleware', () => {
    let mockRequest: Partial<RequestWithUser>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let nextFunction: NextFunction;

    beforeEach(() => {
        const { mockResponse: response, mockJson: json, mockStatus: status } = createMockResponse();
        mockResponse = response;
        mockJson = json;
        mockStatus = status;
        mockRequest = createMockUserRequest({ headers: {} });
        nextFunction = jest.fn();
        jest.clearAllMocks();

        // Setup default empty database result
        const { chain } = createMockDbQueryChain([]);
        mockDbSelect.mockReturnValue(chain as any);
    });

    describe('Missing authorization header', () => {
        it('should return 401 when no authorization header is provided', async () => {
            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
            expect(error.message).toBe('Authentication required. No token provided.');
        });

        it('should return 401 when authorization header does not start with Bearer', async () => {
            mockRequest.headers = { authorization: 'Basic token123' };

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
        });
    });

    describe('Invalid tokens', () => {
        it.each([
            ['null', 'Bearer null'],
            ['empty', 'Bearer '],
            ['invalid-token', 'Bearer invalid-token']
        ])('should return 401 when token is %s', async (description, authHeader) => {
            mockRequest.headers = { authorization: authHeader };

            if (description === 'invalid-token') {
                mockVerifySupabaseToken.mockResolvedValue(null);
            }

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);

            if (description === 'invalid-token') {
                expect(error.message).toBe('Invalid or expired token');
                expect(mockVerifySupabaseToken).toHaveBeenCalledWith('invalid-token');
            }
        });
    });

    describe('User lookup failures', () => {
        it('should return 401 when user is not found in database', async () => {
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockVerifySupabaseToken.mockResolvedValue(createMockSupabaseUser());

            // Mock empty user result
            const { chain } = createMockDbQueryChain([]);
            mockDbSelect.mockReturnValue(chain as any);

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
            expect(error.message).toBe('User not found');
        });
    });

    describe('Successful authentication', () => {
        it('should attach user info to request and call next on successful auth', async () => {
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
                'user-agent': 'TestAgent/1.0'
            };

            const mockUser = createMockSupabaseUser();
            const mockPublicUser = [{ id: 42, auth_id: 'auth-uuid-123' }];

            mockVerifySupabaseToken.mockResolvedValue(mockUser);

            // Mock successful user lookup
            const { chain } = createMockDbQueryChain(mockPublicUser);
            mockDbSelect.mockReturnValue(chain as any);

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockVerifySupabaseToken).toHaveBeenCalledWith('valid-token');
            expect(mockRequest.userId).toBe(42);
            expect(mockRequest.userAgent).toBe('TestAgent/1.0');
            expect(mockRequest.clientIP).toBe('127.0.0.1');
            expect(nextFunction).toHaveBeenCalledWith();
        });
    });

    describe('Error handling', () => {
        it('should handle unexpected errors and return 500', async () => {
            mockRequest.headers = { authorization: 'Bearer token' };
            mockVerifySupabaseToken.mockRejectedValue(new Error('Database connection failed'));

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(500);
            expect(error.message).toBe('Authentication error');
        });

        it('should pass through HttpException errors', async () => {
            mockRequest.headers = { authorization: 'Bearer token' };
            const customError = new HttpException(429, 'Rate limited');
            mockVerifySupabaseToken.mockRejectedValue(customError);

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(customError);
        });
    });
});
