/**
 * Permission Middleware Unit Tests
 */

import { Response, NextFunction } from 'express';
import { requirePermission, requireAnyPermission, requireOwnerOrPermission } from '../../src/middlewares';
import { HttpException } from '../../src/utils';
import type { RequestWithUser } from '../../src/interfaces';

// Mock the RBAC cache service - updated path to match actual import
jest.mock('../../src/features/rbac/services/rbac-cache.service', () => ({
    rbacCacheService: {
        hasPermission: jest.fn(),
        hasAllPermissions: jest.fn(),
        hasAnyPermission: jest.fn(),
    },
}));

import { rbacCacheService } from '../../src/features/rbac/services/rbac-cache.service';

describe('Permission Middleware', () => {
    let mockRequest: Partial<RequestWithUser>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    const mockHasPermission = rbacCacheService.hasPermission as jest.MockedFunction<typeof rbacCacheService.hasPermission>;
    const mockHasAllPermissions = rbacCacheService.hasAllPermissions as jest.MockedFunction<typeof rbacCacheService.hasAllPermissions>;
    const mockHasAnyPermission = rbacCacheService.hasAnyPermission as jest.MockedFunction<typeof rbacCacheService.hasAnyPermission>;

    beforeEach(() => {
        mockRequest = {
            params: {},
        };
        mockResponse = {};
        nextFunction = jest.fn();
        jest.clearAllMocks();
    });

    describe('requirePermission (single permission)', () => {
        it('should allow access when user has the required permission', async () => {
            mockRequest.userId = 1;
            // Note: requirePermission always uses hasAllPermissions internally
            mockHasAllPermissions.mockResolvedValue(true);

            const middleware = requirePermission('users:read');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read']);
            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should deny access when user lacks the required permission', async () => {
            mockRequest.userId = 1;
            mockHasAllPermissions.mockResolvedValue(false);

            const middleware = requirePermission('users:delete');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(403);
        });

        it('should require authentication when userId is missing', async () => {
            mockRequest.userId = undefined;

            const middleware = requirePermission('users:read');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(401);
        });
    });

    describe('requirePermission (multiple permissions - all required)', () => {
        it('should allow access when user has all required permissions', async () => {
            mockRequest.userId = 1;
            mockHasAllPermissions.mockResolvedValue(true);

            const middleware = requirePermission(['users:read', 'users:update']);
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read', 'users:update']);
            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should deny access when user is missing any permission', async () => {
            mockRequest.userId = 1;
            mockHasAllPermissions.mockResolvedValue(false);

            const middleware = requirePermission(['users:read', 'users:delete']);
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(403);
        });
    });

    describe('requireAnyPermission', () => {
        it('should allow access when user has at least one permission', async () => {
            mockRequest.userId = 1;
            mockHasAnyPermission.mockResolvedValue(true);

            const middleware = requireAnyPermission(['admin:system', 'users:read']);
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(mockHasAnyPermission).toHaveBeenCalledWith(1, ['admin:system', 'users:read']);
            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should deny access when user has none of the permissions', async () => {
            mockRequest.userId = 1;
            mockHasAnyPermission.mockResolvedValue(false);

            const middleware = requireAnyPermission(['admin:system', 'roles:manage']);
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(403);
        });
    });

    describe('requireOwnerOrPermission', () => {
        it('should allow access when user is the owner', async () => {
            mockRequest.userId = 5;
            mockRequest.params = { id: '5' };

            const middleware = requireOwnerOrPermission('id', 'users:update');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            // Should pass without checking permission
            expect(mockHasPermission).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should check permission when user is not the owner', async () => {
            mockRequest.userId = 5;
            mockRequest.params = { id: '10' }; // Different user
            mockHasPermission.mockResolvedValue(true);

            const middleware = requireOwnerOrPermission('id', 'users:update');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(mockHasPermission).toHaveBeenCalledWith(5, 'users:update');
            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should deny access when user is not owner and lacks permission', async () => {
            mockRequest.userId = 5;
            mockRequest.params = { id: '10' };
            mockHasPermission.mockResolvedValue(false);

            const middleware = requireOwnerOrPermission('id', 'users:update');
            await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(HttpException));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.status).toBe(403);
        });
    });
});
