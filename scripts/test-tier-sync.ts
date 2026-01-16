import { incrementTierUsage } from '../src/features/tiers/services/tier-sync.service';

async function testTierSync() {
  console.log('Testing tier sync import...');

  try {
    console.log('incrementTierUsage function:', typeof incrementTierUsage);

    // Test with empty array
    await incrementTierUsage([]);
    console.log('✅ Empty array test passed');

    // Test with null values
    await incrementTierUsage([null, null]);
    console.log('✅ Null values test passed');

    console.log('\n✨ All tests passed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testTierSync();
