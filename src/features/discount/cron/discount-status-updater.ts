/**
 * Discount Status Updater Cron Job
 *
 * Checks for:
 * 1. Scheduled discounts that have reached start_date -> Set to 'active'
 * 2. Active discounts that have passed end_date -> Set to 'expired'
 */

import cron from 'node-cron';
import { discountService } from '../services';
import { logger } from '../../../utils';

export const initializeDiscountCron = () => {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('Running discount status update cron job');
        try {
            const { activated, expired } = await discountService.updateDiscountStatuses();

            if (activated > 0 || expired > 0) {
                logger.info('Discount statuses updated', { activated, expired });
            }
        } catch (error) {
            logger.error('Error in discount status update cron job', { error });
        }
    });

    logger.info('Discount cron job initialized');
};
