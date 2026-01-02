/**
 * Quick API Test Runner
 * 
 * Automatically gets test config and runs all user API tests
 * 
 * Run: npx tsx scripts/run-api-tests.ts
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

interface TestConfig {
    baseUrl: string;
    authToken: string | null;
    userId: string;
    productId: string;
}

async function getConfig(): Promise<TestConfig | null> {
    try {
        // Get test user
        const [user] = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.email, 'test@example.com'))
            .limit(1);

        // Get test product  
        const [product] = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sku, 'TEST-PRODUCT-001'))
            .limit(1);

        if (!user || !product) {
            return null;
        }

        return {
            baseUrl: 'http://localhost:3000',
            authToken: null, // Will try to login
            userId: user.id,
            productId: product.id,
        };
    } catch (error) {
        return null;
    }
}

async function login(email: string, password: string): Promise<string | null> {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.data?.accessToken || data.token || null;
    } catch {
        return null;
    }
}

async function main() {
    console.log('🚀 Quick API Test Runner\n');

    // Step 1: Get config
    console.log('📋 Step 1: Getting test configuration...');
    const config = await getConfig();

    if (!config) {
        console.log('❌ Test data not found!');
        console.log('\n💡 Run this first: npx tsx scripts/seed-test-data.ts\n');
        process.exit(1);
    }

    console.log('✅ Found test data');
    console.log(`   User ID: ${config.userId}`);
    console.log(`   Product ID: ${config.productId}`);

    // Step 2: Try to login
    console.log('\n🔐 Step 2: Logging in...');
    const token = await login('test@example.com', 'password123');

    if (!token) {
        console.log('❌ Login failed!');
        console.log('\n💡 Make sure:');
        console.log('   - Server is running (npm run dev)');
        console.log('   - Auth endpoints are working');
        console.log('   - Test user password is correct\n');
        process.exit(1);
    }

    console.log('✅ Login successful!');
    config.authToken = token;

    // Step 3: Run tests
    console.log('\n🧪 Step 3: Running API tests...\n');
    console.log('='.repeat(60));

    await runTests(config);
}

async function runTests(config: TestConfig) {
    let passed = 0;
    let failed = 0;

    // Test 1: Get Orders
    console.log('\n1️⃣  Testing GET /api/users/:userId/orders');
    const ordersResult = await testEndpoint(
        'GET',
        `/api/users/${config.userId}/orders`,
        config.authToken!
    );
    if (ordersResult) passed++; else failed++;

    // Test 2: Get Addresses
    console.log('\n2️⃣  Testing GET /api/users/:userId/addresses');
    const addressesResult = await testEndpoint(
        'GET',
        `/api/users/${config.userId}/addresses`,
        config.authToken!
    );
    if (addressesResult) passed++; else failed++;

    // Test 3: Create Address
    console.log('\n3️⃣  Testing POST /api/users/:userId/addresses');
    const createAddressResult = await testEndpoint(
        'POST',
        `/api/users/${config.userId}/addresses`,
        config.authToken!,
        {
            type: 'Home',
            name: 'Test User',
            phone: '+91 9876543210',
            addressLine1: 'Test Street 123',
            addressLine2: 'Test Area',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            isDefault: true,
        }
    );
    if (createAddressResult) passed++; else failed++;

    // Test 4: Get Wishlist
    console.log('\n4️⃣  Testing GET /api/users/:userId/wishlist');
    const wishlistResult = await testEndpoint(
        'GET',
        `/api/users/${config.userId}/wishlist`,
        config.authToken!
    );
    if (wishlistResult) passed++; else failed++;

    // Test 5: Add to Wishlist
    console.log('\n5️⃣  Testing POST /api/users/:userId/wishlist/:productId');
    const addWishlistResult = await testEndpoint(
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        config.authToken!
    );
    if (addWishlistResult) passed++; else failed++;

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 QUICK TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n🎉 All quick tests passed!');
        console.log('\n💡 Run full test suite: npx tsx scripts/test-all-user-apis.ts');
        console.log(`   (Update the config with userId: "${config.userId}" and productId: "${config.productId}")\n`);
    } else {
        console.log('\n⚠️  Some tests failed - see details above\n');
    }
}

async function testEndpoint(
    method: string,
    endpoint: string,
    token: string,
    body?: any
): Promise<boolean> {
    try {
        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`http://localhost:3000${endpoint}`, options);
        const data = await response.json();

        if (response.ok) {
            console.log(`   ✅ ${response.status} - ${data.message || 'Success'}`);
            return true;
        } else {
            console.log(`   ❌ ${response.status} - ${data.error?.message || data.message || 'Failed'}`);
            return false;
        }
    } catch (error: any) {
        console.log(`   ❌ Exception: ${error.message}`);
        return false;
    }
}

main().catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
});
