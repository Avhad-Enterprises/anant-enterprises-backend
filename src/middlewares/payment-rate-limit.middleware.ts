/**
 * Payment Rate Limiting Middleware
 *
 * Provides rate limiting specifically for payment endpoints
 * to prevent abuse and protect against DDoS attacks.
 *
 * Uses in-memory store by default. For production with multiple
 * instances, consider using rate-limit-redis package.
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils';

/**
 * Rate limiter for payment order creation
 * Strict limit: 10 requests per 15 minutes per user
 */
export const paymentCreateRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: 'Too many payment attempts. Please wait 15 minutes before trying again.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retry_after: 900,
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return (req as { userId?: string }).userId || req.ip || 'unknown';
    },
    skip: () => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
    },
    handler: (req, res) => {
        logger.warn('Payment rate limit exceeded', {
            userId: (req as { userId?: string }).userId,
            ip: req.ip,
        });
        res.status(429).json({
            success: false,
            message: 'Too many payment attempts. Please wait before trying again.',
            error: { code: 'RATE_LIMIT_EXCEEDED' },
        });
    },
});

/**
 * Rate limiter for payment verification
 * Moderate limit: 20 requests per 15 minutes per user
 */
export const paymentVerifyRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: 'Too many verification attempts.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req as { userId?: string }).userId || req.ip || 'unknown',
    skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Rate limiter for refund initiation (admin)
 * Very strict: 5 requests per 15 minutes per admin
 */
export const refundRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many refund requests. Please wait before trying again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req as { userId?: string }).userId || req.ip || 'unknown',
    skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Rate limiter for webhook endpoint
 * Higher limit since webhooks are server-to-server
 * 100 requests per minute per IP
 */
export const webhookRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { status: 'error', message: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
    skip: () => process.env.NODE_ENV === 'test',
});
