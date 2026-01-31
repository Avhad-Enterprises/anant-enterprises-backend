/**
 * Worker Manager
 *
 * Manages all queue workers lifecycle in a single place.
 * Workers can be started with the main server or as a separate process.
 */

import { logger } from '../../../../utils';
import { closeSharedRedisConnection } from '../../shared/config';
import { orderWorker } from './order.worker';
import { paymentWorker } from './payment.worker';
import { inventoryWorker } from './inventory.worker';
import { notificationWorker } from './notification.worker';
import { invoiceWorker } from './invoice.worker';

// All workers
const workers = [orderWorker, paymentWorker, inventoryWorker, notificationWorker, invoiceWorker];

/**
 * Start all queue workers
 */
export async function startWorkers(): Promise<void> {
  try {
    logger.info('🔄 Starting queue workers...');

    await Promise.all(workers.map(worker => worker.start()));

    logger.info('✅ All workers started successfully');

    // Log worker status
    workers.forEach(worker => {
      const health = worker.getHealth();
      logger.info(`  📦 ${health.name}: running (concurrency: ${health.concurrency})`);
    });
  } catch (error) {
    logger.error('Failed to start workers', { error });
    throw error;
  }
}

/**
 * Stop all queue workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  try {
    logger.info('🔄 Stopping workers...');

    await Promise.all(workers.map(worker => worker.stop()));

    // Close the shared Redis connection after all workers are stopped
    await closeSharedRedisConnection();

    logger.info('✅ All workers stopped');
  } catch (error) {
    logger.error('Error stopping workers', { error });
    throw error;
  }
}

/**
 * Get health status of all workers
 */
export function getWorkersHealth() {
  return workers.map(worker => worker.getHealth());
}

// Export all workers for direct access if needed
export { orderWorker, paymentWorker, inventoryWorker, notificationWorker, invoiceWorker };
