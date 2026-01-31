import { redisClient, isRedisReady, testRedisConnection } from '../src/utils/database/redis';
import { config } from '../src/utils/validateEnv';

async function verifyConnection() {
  console.log('--- Redis Connection Verification ---');
  console.log(`Current Mode: ${config.REDIS_MODE}`);
  console.log(`Configuration: `);
  if (config.REDIS_MODE === 'local') {
    console.log(`  Host: ${config.REDIS_LOCAL_HOST}`);
    console.log(`  Port: ${config.REDIS_LOCAL_PORT}`);
  } else {
    console.log(`  Host: ${config.REDIS_CLOUD_HOST}`);
    console.log(`  Port: ${config.REDIS_CLOUD_PORT}`);
  }

  console.log('\nTesting connection...');
  const result = await testRedisConnection();

  if (result) {
    console.log('\n✅ Connection SUCCESSFUL!');
    console.log(`Client Ready State: ${isRedisReady()}`);

    // Try a simple operation
    try {
      await redisClient.set('test-key', 'active');
      const val = await redisClient.get('test-key');
      console.log(`Test Read/Write: ${val === 'active' ? 'PASSED' : 'FAILED'}`);
      await redisClient.del('test-key');
    } catch (e) {
      console.error('Test Read/Write operation failed:', e);
    }
  } else {
    console.log('\n❌ Connection FAILED.');
    console.log('Please check your .env configuration and ensure the Redis instance is running.');
  }

  await redisClient.disconnect();
}

verifyConnection().catch(console.error);
