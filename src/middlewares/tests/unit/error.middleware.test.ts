import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import errorMiddleware from '../../error.middleware';
import { HttpException } from '../../../utils/helpers/httpException';
import { createMockRequest, createMockResponse } from '../../../utils/tests/test-utils';

// Mock dependencies
jest.mock('../../../utils/logging/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../../../utils/validateEnv', () => ({
    isDevelopment: false,
}));

describe('Error Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        const { mockResponse: response, mockJson: json, mockStatus: status } = createMockResponse();
        mockResponse = response;
        mockJson = json;
        mockStatus = status;
        mockRequest = createMockRequest({
            method: 'POST',
            url: '/api/users',
            userId: 42,
        });
        jest.clearAllMocks();
    });

    describe('ZodError handling', () => {
        it('should handle ZodError with validation issues', () => {
            const zodError = new ZodError([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['name'],
                    message: 'Expected string, received number',
                } as any,
                {
                    code: 'too_small',
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    path: ['email'],
                    message: 'String must contain at least 1 character(s)',
                } as any,
            ]);

            errorMiddleware(zodError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'name: Expected string, received number, email: String must contain at least 1 character(s)',
                    requestId: 'test-request-123',
                    timestamp: expect.any(String),
                },
            });
        });
    });

    describe('HttpException handling', () => {
        it('should handle HttpException with custom status and code', () => {
            const httpError = new HttpException(403, 'Forbidden access', 'ACCESS_DENIED');

            errorMiddleware(httpError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockStatus).toHaveBeenCalledWith(403);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'ACCESS_DENIED',
                    message: 'Forbidden access',
                    requestId: 'test-request-123',
                    timestamp: expect.any(String),
                },
            });
        });

        it('should handle HttpException with default code', () => {
            const httpError = new HttpException(404, 'Not found');

            errorMiddleware(httpError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Not found',
                    requestId: 'test-request-123',
                    timestamp: expect.any(String),
                },
            });
        });
    });

    describe('Generic Error handling', () => {
        it('should handle generic Error with 500 status', () => {
            const genericError = new Error('Database connection failed');

            errorMiddleware(genericError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'Error',
                    message: 'Database connection failed',
                    requestId: 'test-request-123',
                    timestamp: expect.any(String),
                },
            });
        });

        it('should handle error with no message', () => {
            const errorWithNoMessage = new Error();

            errorMiddleware(errorWithNoMessage, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'Error',
                    message: 'Something went wrong',
                    requestId: 'test-request-123',
                    timestamp: expect.any(String),
                },
            });
        });
    });

    describe('Logging behavior', () => {
        it('should log server errors (5xx) as error level', () => {
            const { logger } = require('../../../utils/logging/logger');
            const serverError = new HttpException(500, 'Internal server error');

            errorMiddleware(serverError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(logger.error).toHaveBeenCalledWith('Server Error:', expect.objectContaining({
                requestId: 'test-request-123',
                method: 'POST',
                url: '/api/users',
                ip: '127.0.0.1',
                userAgent: 'TestAgent/1.0',
                userId: 42,
                error: expect.objectContaining({
                    status: 500,
                    message: 'Internal server error',
                }),
            }));
        });

        it('should log client errors (4xx) as warn level', () => {
            const { logger } = require('../../../utils/logging/logger');
            const clientError = new HttpException(400, 'Bad request');

            errorMiddleware(clientError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(logger.warn).toHaveBeenCalledWith('Client Error:', expect.objectContaining({
                requestId: 'test-request-123',
                error: expect.objectContaining({
                    status: 400,
                    message: 'Bad request',
                }),
            }));
        });

        it('should log ZodError as info level', () => {
            const { logger } = require('../../../utils/logging/logger');
            const zodError = new ZodError([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['age'],
                    message: 'Expected string, received number',
                } as any,
            ]);

            errorMiddleware(zodError, mockRequest as Request, mockResponse as Response, jest.fn());

            expect(logger.info).toHaveBeenCalledWith('Validation failed', expect.objectContaining({
                requestId: 'test-request-123',
                method: 'POST',
                url: '/api/users',
                errors: zodError.issues,
            }));
        });
    });

    describe('Request context handling', () => {
        it('should handle missing requestId', () => {
            mockRequest.requestId = undefined;

            const error = new HttpException(404, 'Not found');
            errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, jest.fn());

            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    requestId: 'unknown',
                }),
            });
        });

        it('should handle missing userId', () => {
            mockRequest.userId = undefined;

            const error = new HttpException(403, 'Forbidden');
            errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, jest.fn());

            expect(mockJson).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    requestId: 'test-request-123',
                }),
            });
        });
    });
});
