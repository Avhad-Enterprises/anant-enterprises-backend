import { setupBasicTestScenario } from './helpers/test-data';

async function testSetup() {
    console.log('🧪 Testing setup only...\n');

    try {
        const testData = await setupBasicTestScenario({
            numProducts: 1,
            stockPerProduct: 10,
            addToCart: false,
        });

        console.log('✅ Setup successful!');
        console.log(`   Customer: ${testData.customer.email}`);
        console.log(`   Products: ${testData.products.length}`);
        console.log(`   Address: ${testData.address.id}`);

        return { success: true, data: testData };
    } catch (error) {
        console.error('❌ Setup failed:', error);
        return { success: false, error };
    }
}

testSetup().then(result => {
    console.log('\nTest result:', result.success ? 'PASS' : 'FAIL');
    process.exit(result.success ? 0 : 1);
});