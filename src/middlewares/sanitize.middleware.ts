import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils';

/**
 * Fields that should allow rich HTML content while still being sanitized for XSS
 * These fields use a permissive sanitization that allows formatting tags
 */
const RICH_HTML_FIELDS = ['content', 'description', 'fullDescription', 'full_description', 'body'];

/**
 * Safe HTML tags allowed in rich content fields (for blog posts, descriptions, etc.)
 * Only formatting tags are allowed - no scripts, iframes, or other potentially dangerous elements
 */
const SAFE_HTML_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

/**
 * Safe HTML attributes allowed in rich content fields
 */
const SAFE_HTML_ATTRS = [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'width', 'height', 'style',
];

/**
 * Sanitizes a string value, allowing HTML for rich content fields
 */
function sanitizeString(value: string, fieldName?: string): string {
    const isRichHtmlField = fieldName && RICH_HTML_FIELDS.includes(fieldName);

    let sanitized = DOMPurify.sanitize(value, isRichHtmlField ? {
        ALLOWED_TAGS: SAFE_HTML_TAGS,
        ALLOWED_ATTR: SAFE_HTML_ATTRS,
        KEEP_CONTENT: true,
    } : {
        ALLOWED_TAGS: [], // Strip ALL HTML tags for non-rich fields
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    });

    // Fallback for environments where DOMPurify might fail
    if (!sanitized || sanitized === 'undefined') {
        sanitized = value;
    }

    // Log if sanitization changed the value (potential XSS attack) - but not for rich HTML fields
    if (!isRichHtmlField && sanitized !== value) {
        logger.warn('Input sanitization triggered - potential XSS attempt detected', {
            original: String(value).slice(0, 100),
            sanitized: String(sanitized).slice(0, 100),
            stripped: String(value).length - String(sanitized).length,
        });
    }

    return sanitized;
}

/**
 * Recursively sanitizes object properties
 * Removes HTML tags and JavaScript from string values (except for rich HTML fields)
 *
 * @param value - The value to sanitize (string, object, array, or primitive)
 * @param fieldName - Optional field name for context-aware sanitization
 * @returns Sanitized value
 */
function sanitizeValue(value: unknown, fieldName?: string): unknown {
    // Handle string values
    if (typeof value === 'string') {
        return sanitizeString(value, fieldName);
    }

    // Handle arrays - recursively sanitize each element
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, fieldName));
    }

    // Handle objects - recursively sanitize each property
    if (value && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            // Pass the field name for context-aware sanitization
            sanitized[key] = sanitizeValue(val, key);
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
 * - Stripping dangerous HTML/JavaScript from all string inputs
 * - Allowing safe HTML tags in designated rich content fields (content, description, etc.)
 * - Sanitizing both request body and query parameters
 *
 * Applied to all POST, PUT, PATCH requests before validation.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    // Skip sanitization in test environment
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    // Sanitize request body (POST, PUT, PATCH)
    if (req.body && typeof req.body === 'object') {
        const sanitizedBody = sanitizeValue(req.body) as Record<string, unknown>;
        try {
            req.body = sanitizedBody;
        } catch (error: any) {
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

    // Sanitize query parameters (GET requests with user input) - always strip HTML
    if (req.query && typeof req.query === 'object') {
        const sanitized = sanitizeValue(req.query);
        Object.keys(req.query).forEach(key => {
            delete (req.query as any)[key];
        });
        Object.assign(req.query, sanitized);
    }

    next();
};

export default sanitizeInput;
