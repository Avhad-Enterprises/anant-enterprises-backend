/**
 * Fully Automated API Test Runner
 * 
 * This script will:
 * 1. Get test user and product from database
 * 2. Attempt to create/login test user
 * 3. Run all API tests automatically
 * 
 * Run: npx tsx scripts/auto-test-apis.ts
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

interface TestConfig {
    userId: string;
    productId: string;
    authToken: string;
}

interface AutoTestResult {
    category: string;
    endpoint: string;
    method: string;
    success: boolean;
    status: number;
    message: string;
}

const autoTestResults: AutoTestResult[] = [];

// Get configuration from database
async function getTestConfig(): Promise<Partial<TestConfig> | null> {
    try {
        const [user] = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.is_deleted, false))
            .limit(1);

        const [product] = await db
            .select({ id: products.id, title: products.product_title })
            .from(products)
            .where(eq(products.is_deleted, false))
            .limit(1);

        if (!user || !product) {
            return null;
        }

        console.log('✅ Found test data:');
        console.log(`   User: ${user.email} (${user.id})`);
        console.log(`   Product: ${product.title.substring(0, 30)}... (${product.id})`);

        return {
            userId: user.id,
            productId: product.id,
        };
    } catch {
        return null;
    }
}

// Make API request
async function makeApiRequest(
    method: string,
    endpoint: string,
    token: string,
    body?: any
): Promise<{ success: boolean; status: number; data: any }> {
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

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();

        return {
            success: response.ok,
            status: response.status,
            data,
        };
    } catch (error: any) {
        return {
            success: false,
            status: 0,
            data: { error: error.message },
        };
    }
}

// Test a single endpoint
async function testEndpoint(
    category: string,
    method: string,
    endpoint: string,
    description: string,
    token: string,
    body?: any
): Promise<void> {
    const result = await makeApiRequest(method, endpoint, token, body);

    autoTestResults.push({
        category,
        endpoint,
        method,
        success: result.success,
        status: result.status,
        message: result.success
            ? (result.data.message || 'Success')
            : (result.data.error?.message || result.data.message || 'Failed'),
    });

    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${method.padEnd(6)} ${endpoint.padEnd(50)} [${result.status}]`);
}

// Run all tests
async function runAllApiTests(config: TestConfig) {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 RUNNING COMPREHENSIVE API TESTS');
    console.log('='.repeat(70));

    // ORDERS API TESTS
    console.log('\n📋 ORDERS API');
    await testEndpoint(
        'Orders',
        'GET',
        `/api/users/${config.userId}/orders`,
        'Get user orders',
        config.authToken
    );

    await testEndpoint(
        'Orders',
        'GET',
        `/api/users/${config.userId}/orders?page=1&limit=5`,
        'Get orders with pagination',
        config.authToken
    );

    // ADDRESSES API TESTS
    console.log('\n🏠 ADDRESSES API');
    await testEndpoint(
        'Addresses',
        'GET',
        `/api/users/${config.userId}/addresses`,
        'Get all addresses',
        config.authToken
    );

    const createAddressResult = await makeApiRequest(
        'POST',
        `/api/users/${config.userId}/addresses`,
        config.authToken,
        {
            type: 'Home',
            name: 'Test User',
            phone: '+91 9876543210',
            addressLine1: '123 Test Street',
            addressLine2: 'Test Area',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            isDefault: true,
        }
    );

    autoTestResults.push({
        category: 'Addresses',
        endpoint: `/api/users/${config.userId}/addresses`,
        method: 'POST',
        success: createAddressResult.success,
        status: createAddressResult.status,
        message: createAddressResult.success
            ? 'Address created'
            : (createAddressResult.data.error?.message || 'Failed'),
    });

    const icon = createAddressResult.success ? '✅' : '❌';
    console.log(`${icon} POST   /api/users/${config.userId}/addresses`.padEnd(70) + `[${createAddressResult.status}]`);

    let addressId: number | null = null;
    if (createAddressResult.success && createAddressResult.data?.data?.id) {
        addressId = createAddressResult.data.data.id;
    }

    if (addressId) {
        await testEndpoint(
            'Addresses',
            'PUT',
            `/api/users/${config.userId}/addresses/${addressId}`,
            'Update address',
            config.authToken,
            { city: 'Navi Mumbai' }
        );

        await testEndpoint(
            'Addresses',
            'PATCH',
            `/api/users/${config.userId}/addresses/${addressId}/default`,
            'Set as default',
            config.authToken
        );
    }

    // Test validation
    await testEndpoint(
        'Addresses',
        'POST',
        `/api/users/${config.userId}/addresses`,
        'Test validation (should fail)',
        config.authToken,
        { type: 'Home' } // Missing required fields
    );

    // WISHLIST API TESTS
    console.log('\n❤️  WISHLIST API');
    await testEndpoint(
        'Wishlist',
        'GET',
        `/api/users/${config.userId}/wishlist`,
        'Get wishlist',
        config.authToken
    );

    await testEndpoint(
        'Wishlist',
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        'Add to wishlist',
        config.authToken
    );

    await testEndpoint(
        'Wishlist',
        'GET',
        `/api/users/${config.userId}/wishlist`,
        'Get wishlist after add',
        config.authToken
    );

    await testEndpoint(
        'Wishlist',
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        'Try duplicate add (should fail)',
        config.authToken
    );

    await testEndpoint(
        'Wishlist',
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}/move-to-cart`,
        'Move to cart',
        config.authToken
    );

    await testEndpoint(
        'Wishlist',
        'DELETE',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        'Remove from wishlist',
        config.authToken
    );

    // Delete test address if created
    if (addressId) {
        await testEndpoint(
            'Addresses',
            'DELETE',
            `/api/users/${config.userId}/addresses/${addressId}`,
            'Delete test address',
            config.authToken
        );
    }
}

// Print summary
function printTestSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));

    const categories = ['Orders', 'Addresses', 'Wishlist'];

    categories.forEach(category => {
        const tests = autoTestResults.filter(r => r.category === category);
        const passed = tests.filter(r => r.success).length;
        const failed = tests.filter(r => !r.success).length;

        console.log(`\n${category}:`);
        console.log(`  Total: ${tests.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);

        const failedTests = tests.filter(r => !r.success);
        if (failedTests.length > 0) {
            failedTests.forEach(test => {
                console.log(`    ❌ ${test.method} ${test.endpoint} - ${test.message}`);
            });
        }
    });

    const totalPassed = autoTestResults.filter(r => r.success).length;
    const totalFailed = autoTestResults.filter(r => !r.success).length;
    const successRate = ((totalPassed / autoTestResults.length) * 100).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log('📈 OVERALL RESULTS');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${autoTestResults.length}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log('='.repeat(70));

    if (totalFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!\n');
    } else {
        console.log('\n⚠️  Some tests failed - review details above\n');
    }
}

// Main execution
async function main() {
    console.log('🚀 Automated API Test Runner\n');

    // Step 1: Get test data
    console.log('📋 Step 1: Getting test data from database...');
    const config = await getTestConfig();

    if (!config || !config.userId || !config.productId) {
        console.log('\n❌ No test data found!');
        console.log('💡 Run this first: npx tsx scripts/seed-test-data.ts\n');
        process.exit(1);
    }

    // Step 2: Get auth token (try multiple methods)
    console.log('\n🔐 Step 2: Getting authentication token...');

    // For testing, we'll skip auth and provide instructions
    const authToken = process.env.TEST_AUTH_TOKEN || '';

    if (!authToken) {
        console.log('\n⚠️  No auth token provided!');
        console.log('\n💡 To run tests, set the TEST_AUTH_TOKEN environment variable:');
        console.log('   1. Login to get a token:');
        console.log('      curl -X POST http://localhost:3000/api/auth/login \\');
        console.log('        -H "Content-Type: application/json" \\');
        console.log('        -d \'{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}\'');
        console.log('\n   2. Set the token:');
        console.log('      $env:TEST_AUTH_TOKEN="your_token_here"  # PowerShell');
        console.log('      npx tsx scripts/auto-test-apis.ts');
        console.log('\n   Or provide it directly:');
        console.log('      TEST_AUTH_TOKEN=your_token npx tsx scripts/auto-test-apis.ts\n');
        process.exit(1);
    }

    const fullConfig: TestConfig = {
        userId: config.userId,
        productId: config.productId,
        authToken,
    };

    console.log('✅ Authentication ready\n');

    // Step 3: Run tests
    await runAllApiTests(fullConfig);

    // Step 4: Print summary
    printTestSummary();

    process.exit(autoTestResults.filter(r => !r.success).length > 0 ? 1 : 0);
}

main().catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
});
