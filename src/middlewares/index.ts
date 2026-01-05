/**
 * Middlewares Index
 *
 * Re-exports all middleware functions for convenient imports
 */

// Authentication middleware
export { default as requireAuth } from './auth.middleware';
export { requireAuth as requireAuthNamed } from './auth.middleware';

// Authorization/Permission middleware
export {
  requirePermission,
  requireAnyPermission,
  checkOwnershipOrPermission,
  requireOwnerOrPermission,
  userHasPermission,
  getUserPermissions,
} from './permission.middleware';

// CORS middleware
export { corsMiddleware } from './cors.middleware';

// Error handling middleware
export { default as errorMiddleware } from './error.middleware';

// Request logging middleware
export { requestLoggerMiddleware } from './request-logger.middleware';

// Request ID middleware
export { requestIdMiddleware } from './request-id.middleware';

// Security middleware
export { securityMiddleware } from './security.middleware';

// Upload middleware
export { uploadSingleFileMiddleware, uploadCsvMiddleware } from './upload.middleware';

// Validation middleware
export { default as validationMiddleware } from './validation.middleware';

// Rate limiting middleware
export { authRateLimit, apiRateLimit } from './rate-limit.middleware';

// Input sanitization middleware (XSS protection)
export { sanitizeInput } from './sanitize.middleware';

// Audit middleware
export { default as auditMiddleware } from './audit.middleware';
export { auditMiddleware as auditMiddlewareNamed } from './audit.middleware';
