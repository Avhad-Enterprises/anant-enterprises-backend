import { Request, Response, NextFunction } from 'express';
import requireAuth from '../../auth.middleware';
import { HttpException } from '../../../utils/helpers/httpException';
import type { RequestWithUser } from '../../../interfaces';

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
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            ip: '127.0.0.1',
            originalUrl: '/test',
            method: 'GET',
        };
        mockResponse = {};
        nextFunction = jest.fn();
        jest.clearAllMocks();

        // Reset db mock chain
        const mockLimit = jest.fn().mockResolvedValue([]);
        const mockWhere = jest.fn().mockReturnThis();
        const mockFrom = jest.fn().mockReturnThis();
        const mockSelect = jest.fn().mockReturnThis();

        mockSelect.mockReturnValue({
            from: mockFrom,
        });
        mockFrom.mockReturnValue({
            where: mockWhere,
        });
        mockWhere.mockReturnValue({
            limit: mockLimit,
        });

        mockDbSelect.mockReturnValue({
            from: mockFrom,
        } as any);
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
        it('should return 401 when token is null', async () => {
            mockRequest.headers = { authorization: 'Bearer null' };

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
        });

        it('should return 401 when token is empty', async () => {
            mockRequest.headers = { authorization: 'Bearer ' };

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
        });

        it('should return 401 when Supabase token verification fails', async () => {
            mockRequest.headers = { authorization: 'Bearer invalid-token' };
            mockVerifySupabaseToken.mockResolvedValue(null);

            await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockVerifySupabaseToken).toHaveBeenCalledWith('invalid-token');
            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
            expect(error.message).toBe('Invalid or expired token');
        });
    });

    describe('User lookup failures', () => {
        it('should return 401 when user is not found in database', async () => {
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockVerifySupabaseToken.mockResolvedValue({ id: 'auth-uuid-123' });

            // Mock empty user result
            const mockLimit = jest.fn().mockResolvedValue([]);
            const mockWhere = jest.fn().mockReturnThis();
            const mockFrom = jest.fn().mockReturnThis();
            const mockSelect = jest.fn().mockReturnThis();

            mockSelect.mockReturnValue({
                from: mockFrom,
            });
            mockFrom.mockReturnValue({
                where: mockWhere,
            });
            mockWhere.mockReturnValue({
                limit: mockLimit,
            });

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

            const mockUser = { id: 'auth-uuid-123' };
            const mockPublicUser = [{ id: 42, auth_id: 'auth-uuid-123' }];

            mockVerifySupabaseToken.mockResolvedValue(mockUser);

            // Mock successful user lookup
            const mockLimit = jest.fn().mockResolvedValue(mockPublicUser);
            const mockWhere = jest.fn().mockReturnThis();
            const mockFrom = jest.fn().mockReturnThis();
            const mockSelect = jest.fn().mockReturnThis();

            mockSelect.mockReturnValue({
                from: mockFrom,
            });
            mockFrom.mockReturnValue({
                where: mockWhere,
            });
            mockWhere.mockReturnValue({
                limit: mockLimit,
            });

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
