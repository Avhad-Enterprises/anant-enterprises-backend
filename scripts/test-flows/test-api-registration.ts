import { createTestCustomer } from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';

async function testApiRegistration() {
    console.log('🧪 Testing API registration...\n');

    try {
        // Create test customer
        const customer = await createTestCustomer({
            email: 'api-test-customer@example.com',
            phone: '919876543210'
        });
        console.log(`✅ Created customer: ${customer.email}`);

        // Test API registration
        const apiClient = new TestApiClient();

        console.log('📝 Registering via API...');
        const registerResponse = await apiClient.register({
            email: customer.email,
            password: 'Test@123',
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone_number!,
        });

        console.log('✅ Registration successful!');
        console.log('📧 Login via API...');

        const loginResponse = await apiClient.login(customer.email, 'Test@123');
        console.log('✅ Login successful!');

        return { success: true, customer, registerResponse, loginResponse };
    } catch (error) {
        console.error('❌ API test failed:', error);
        return { success: false, error };
    }
}

testApiRegistration().then(result => {
    console.log('\nTest result:', result.success ? 'PASS' : 'FAIL');
    process.exit(result.success ? 0 : 1);
});