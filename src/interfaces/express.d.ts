/**
 * Central Express type declarations
 * This file extends the Express Request interface with custom properties
 * used throughout the application for authentication, logging, and request tracking
 */

declare global {
  namespace Express {
    interface Request {
      // Request tracking
      requestId?: string;

      // Authentication & Authorization
      userId?: number;
      userAgent?: string;
      clientIP?: string;

      // Additional metadata
      schema?: string;
    }
  }
}

// Required to make this a module
export { };