// Middlewares Index

// Authentication middleware
export { default as requireAuth } from './auth.middleware';
export { requireAuth as requireAuthNamed } from './auth.middleware';

// Authorization/Permission middleware
export {
  requirePermission,
  // ... (omitting middle lines for brevity, wait, replace_file_content needs exact match. better to do targeted replacements)
  // I will target the specific trace lines I added.

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
export { authRateLimit, apiRateLimit, uploadRateLimit, invitationRateLimit } from './rate-limit.middleware';

// Input sanitization middleware (XSS protection)
export { sanitizeInput } from './sanitize.middleware';

// Audit middleware
export { default as auditMiddleware } from './audit.middleware';
export { auditMiddleware as auditMiddlewareNamed } from './audit.middleware';

// Payment rate limiting middleware
export {
  paymentCreateRateLimit,
  paymentVerifyRateLimit,
  refundRateLimit,
  webhookRateLimit,
} from './payment-rate-limit.middleware';
