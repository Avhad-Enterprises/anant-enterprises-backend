import { redisClient, isRedisReady, testRedisConnection } from '../../src/utils/database/redis';
import { config } from '../../src/utils/validateEnv';
import { logger } from '../../src/utils';

async function verifyConnection() {
  logger.info('--- Redis Connection Verification ---');
  logger.info(`  Host: ${config.REDIS_HOST}`);
  logger.info(`  Port: ${config.REDIS_PORT}`);
  logger.info(`  URL: ${config.REDIS_URL ? 'Set' : 'Not Set'}`);

  logger.info('\nTesting connection...');
  const result = await testRedisConnection();

  if (result) {
    logger.info('\n✅ Connection SUCCESSFUL!');
    logger.info(`Client Ready State: ${isRedisReady()}`);

    // Try a simple operation
    try {
      await redisClient.set('test-key', 'active');
      const val = await redisClient.get('test-key');
      logger.info(`Test Read/Write: ${val === 'active' ? 'PASSED' : 'FAILED'}`);
      await redisClient.del('test-key');
    } catch (e) {
      logger.error('Test Read/Write operation failed:', e);
    }
  } else {
    logger.error('\n❌ Connection FAILED.');
    logger.error('Please check your .env configuration and ensure the Redis instance is running.');
  }

  await redisClient.disconnect();
}

verifyConnection().catch(err => logger.error(err));
