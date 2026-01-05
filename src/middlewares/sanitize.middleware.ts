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
        const sanitized = DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [], // Strip ALL HTML tags
            ALLOWED_ATTR: [], // Strip ALL attributes
            KEEP_CONTENT: true, // Keep text content
        });

        // Log if sanitization changed the value (potential XSS attack)
        if (sanitized !== value) {
            logger.warn('Input sanitization triggered - potential XSS attempt detected', {
                original: value.slice(0, 100), // Log first 100 chars
                sanitized: sanitized.slice(0, 100),
                stripped: value.length - sanitized.length,
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
    // Sanitize request body (POST, PUT, PATCH)
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }

    // Sanitize query parameters (GET requests with user input)
    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeValue(req.query);
        // Mutate existing query object instead of reassigning to avoid setter error
        Object.keys(req.query).forEach(key => {
            delete (req.query as any)[key];
        });
        Object.assign(req.query, sanitized);
    }

    next();
};

export default sanitizeInput;
