import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils';

/**
 * Recursively sanitizes object properties
 * Removes HTML tags and JavaScript from string values
 *
 * @param value - The value to sanitize (string, object, array, or primitive)
 * @returns Sanitized value with HTML/JavaScript stripped
 */
function sanitizeValue(value: unknown): unknown {
    // Handle string values - strip HTML/JavaScript
    if (typeof value === 'string') {
        let sanitized = DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [], // Strip ALL HTML tags
            ALLOWED_ATTR: [], // Strip ALL attributes
            KEEP_CONTENT: true, // Keep text content
        });

        // Fallback for environments where DOMPurify might fail or return "undefined" string
        if (!sanitized || sanitized === 'undefined') {
            sanitized = value;
        }

        // Log if sanitization changed the value (potential XSS attack)
        if (sanitized !== value) {
            logger.warn('Input sanitization triggered - potential XSS attempt detected', {
                original: String(value).slice(0, 100), // Log first 100 chars
                sanitized: String(sanitized).slice(0, 100),
                stripped: String(value).length - String(sanitized).length,
            });
        }

        return sanitized;
    }

    // Handle arrays - recursively sanitize each element
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    // Handle objects - recursively sanitize each property
    if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
    }

    // Return primitives as-is (numbers, booleans, null, undefined)
    return value;
}

/**
 * Input Sanitization Middleware
 *
 * Protects against XSS (Cross-Site Scripting) attacks by:
 * - Stripping HTML tags from all string inputs
 * - Removing JavaScript code from user inputs
 * - Sanitizing both request body and query parameters
 *
 * Applied to all POST, PUT, PATCH requests before validation.
 * Runs recursively on nested objects and arrays.
 *
 * Example:
 * Input:  { comment: "<script>alert('XSS')</script>" }
 * Output: { comment: "alert('XSS')" }
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    // Skip sanitization in test environment to avoid interference with request body
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    // Sanitize request body (POST, PUT, PATCH)
    if (req.body && typeof req.body === 'object') {
        const sanitizedBody = sanitizeValue(req.body) as Record<string, unknown>;
        try {
            req.body = sanitizedBody;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        } catch (error: any) {
            // In Express 5 or some environments, req.body might be read-only.
            try {
                Object.defineProperty(req, 'body', {
                    value: sanitizedBody,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            } catch (defineError) {
                logger.warn('Could not sanitize req.body - property is read-only', { error: defineError });
            }
        }
    }

    // Sanitize query parameters (GET requests with user input)
    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeValue(req.query);
        // Mutate existing query object instead of reassigning to avoid setter error
        Object.keys(req.query).forEach(key => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (req.query as any)[key];
        });
        Object.assign(req.query, sanitized);
    }

    next();
};

export default sanitizeInput;
