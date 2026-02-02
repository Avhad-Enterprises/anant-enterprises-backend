/**
 * Cleanup expired cart reservations cron job
 * Runs every 5 minutes to release abandoned cart stock
 */

import cron from 'node-cron';
import { cleanupExpiredCartReservations } from '../../inventory/services/inventory.service';
import { logger } from '../../../utils';
import { CART_RESERVATION_CONFIG } from '../config/cart-reservation.config';

/**
 * Start the cart reservation cleanup cron job
 */
export function startCartReservationCleanup() {
    if (!CART_RESERVATION_CONFIG.ENABLED) {
        logger.info('Cart reservation system is disabled');
        return;
    }

    // Run every N minutes (default: 5)
    const schedulePattern = `*/${CART_RESERVATION_CONFIG.CLEANUP_INTERVAL} * * * *`;

    cron.schedule(schedulePattern, async () => {
        try {
            const count = await cleanupExpiredCartReservations();
            if (count > 0) {
                logger.info(`Cart reservation cleanup: released ${count} expired reservations`);
            }
        } catch (error) {
            logger.error('Cart reservation cleanup failed:', error);
        }
    });

    logger.info(`Cart reservation cleanup cron job started (every ${CART_RESERVATION_CONFIG.CLEANUP_INTERVAL} minutes)`);
}
