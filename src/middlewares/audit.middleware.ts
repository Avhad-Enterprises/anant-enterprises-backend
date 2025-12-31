/**
 * Audit Middleware
 *
 * Automatically logs all API requests with context enrichment
 * Captures: user, IP, timing, status code, request/response data
 */

import { Request, Response, NextFunction } from 'express';
import { auditService } from '../features/audit';
import { logger } from '../utils';
import {
  extractRequestContext,
  shouldAuditRequest,
  getAuditActionFromRequest,
  getResourceTypeFromPath,
  getResourceIdFromPath,
} from '../utils/audit/audit-utils';

/**
 * Audit logging middleware
 *
 * - Captures request context (IP, user agent, user ID, session)
 * - Logs API requests with timing information
 * - Maps HTTP methods to audit actions
 * - Extracts resource type from URL paths
 * - Sanitizes sensitive data automatically (handled by audit service)
 * - Adds status code and duration to metadata
 * - Non-blocking: audit errors won't affect the main request
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip non-auditable requests (health checks, static assets, etc.)
  if (!shouldAuditRequest(req)) {
    return next();
  }

  const startTime = Date.now();

  // Capture the original end function
  const originalEnd = res.end;
  let responseCaptured = false;

  // Override res.end to capture when response is sent
  res.end = function (this: Response, ...args: unknown[]): Response {
    if (!responseCaptured) {
      responseCaptured = true;

      // Calculate duration
      const duration = Date.now() - startTime;

      // Extract context and audit data
      const context = extractRequestContext(req);
      const action = getAuditActionFromRequest(req);
      const resourceType = getResourceTypeFromPath(req.path);
      const resourceId = getResourceIdFromPath(req.path);

      // Log audit entry asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await auditService.log(
            {
              action,
              resourceType,
              resourceId,
              userId: context.userId,
              newValues: {
                method: req.method,
                path: req.path,
                query: req.query,
                // Don't log request body for GET requests
                body: req.method !== 'GET' ? req.body : undefined,
              },
              metadata: {
                duration,
                statusCode: res.statusCode,
                userAgent: context.userAgent,
              },
            },
            context
          );
        } catch (error) {
          // Log error but don't throw - audit failures shouldn't break requests
          logger.error('Audit middleware error', {
            error: error instanceof Error ? error.message : String(error),
            path: req.path,
            method: req.method,
            userId: context.userId,
          });
        }
      });
    }

    // Call original end function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalEnd.apply(this, args as any[]);
  };

  next();
};

export default auditMiddleware;
