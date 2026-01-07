/**
 * Payment Lock Service
 *
 * Provides distributed locking using Redis to prevent race conditions
 * in payment operations, such as:
 * - Duplicate payment order creation
 * - Concurrent verification attempts
 * - Double refund requests
 */

import { redis, isRedisReady } from '../../../utils';
import { logger } from '../../../utils';
import { HttpException } from '../../../utils';

// ============================================
// PAYMENT LOCK SERVICE
// ============================================

class PaymentLockServiceClass {
    private static readonly LOCK_PREFIX = 'payment_lock:';
    private static readonly DEFAULT_TTL = 30; // seconds

    /**
     * Acquire a lock for a payment operation
     *
     * @param orderId - The order ID to lock
     * @param ttlSeconds - Lock TTL in seconds (default: 30)
     * @returns true if lock acquired, false otherwise
     */
    async acquireLock(orderId: string, ttlSeconds: number = PaymentLockServiceClass.DEFAULT_TTL): Promise<boolean> {
        if (!isRedisReady()) {
            // If Redis is unavailable, allow operation to proceed
            // (single instance fallback - not recommended for production)
            logger.warn('Redis unavailable, skipping payment lock', { orderId });
            return true;
        }

        const lockKey = `${PaymentLockServiceClass.LOCK_PREFIX}${orderId}`;

        try {
            // SET with NX (only if not exists) and EX (expiry)
            const result = await redis.set(lockKey, Date.now().toString(), 'EX', ttlSeconds, 'NX');
            const acquired = result === 'OK';

            if (acquired) {
                logger.debug('Payment lock acquired', { orderId, ttlSeconds });
            } else {
                logger.debug('Payment lock not acquired (already locked)', { orderId });
            }

            return acquired;
        } catch (error) {
            logger.error('Failed to acquire payment lock', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            // On error, allow operation to proceed (fail-open)
            return true;
        }
    }

    /**
     * Release a lock after operation completes
     *
     * @param orderId - The order ID to unlock
     */
    async releaseLock(orderId: string): Promise<void> {
        if (!isRedisReady()) {
            return;
        }

        const lockKey = `${PaymentLockServiceClass.LOCK_PREFIX}${orderId}`;

        try {
            await redis.del(lockKey);
            logger.debug('Payment lock released', { orderId });
        } catch (error) {
            logger.error('Failed to release payment lock', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Don't throw - lock will expire anyway
        }
    }

    /**
     * Execute an operation with lock protection
     *
     * Automatically acquires lock before operation and releases after.
     * Throws 429 if lock cannot be acquired.
     *
     * @param orderId - The order ID to lock
     * @param operation - The async operation to execute
     * @returns The result of the operation
     */
    async withLock<T>(orderId: string, operation: () => Promise<T>): Promise<T> {
        const acquired = await this.acquireLock(orderId);

        if (!acquired) {
            throw new HttpException(
                429,
                'Payment operation already in progress. Please wait a moment and try again.'
            );
        }

        try {
            return await operation();
        } finally {
            await this.releaseLock(orderId);
        }
    }

    /**
     * Check if an order is currently locked
     *
     * @param orderId - The order ID to check
     * @returns true if locked, false otherwise
     */
    async isLocked(orderId: string): Promise<boolean> {
        if (!isRedisReady()) {
            return false;
        }

        const lockKey = `${PaymentLockServiceClass.LOCK_PREFIX}${orderId}`;

        try {
            const exists = await redis.exists(lockKey);
            return exists === 1;
        } catch (error) {
            logger.error('Failed to check payment lock', {
                orderId,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}

// Export singleton instance
export const PaymentLockService = new PaymentLockServiceClass();

// Also export class for testing
export { PaymentLockServiceClass };
