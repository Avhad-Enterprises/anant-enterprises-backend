/**
 * Comprehensive Test Script for User API Endpoints
 * 
 * This script tests all user-related endpoints created in this session:
 * - Orders API (1 endpoint)
 * - Addresses API (5 endpoints)
 * - Wishlist API (4 endpoints)
 * 
 * Total: 10 endpoints with comprehensive test cases
 * 
 * Usage:
 * 1. Update the configuration below with your actual values
 * 2. Run: npx tsx scripts/test-all-user-apis.ts
 */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const testConfig = {
    baseUrl: 'http://localhost:3000',
    authToken: 'YOUR_AUTH_TOKEN_HERE',
    userId: 'YOUR_USER_UUID_HERE',
    productId: 'YOUR_PRODUCT_UUID_HERE',
    // Will be populated during tests
    createdAddressId: null as number | null,
    secondAddressId: null as number | null,
};

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
    category: string;
    name: string;
    success: boolean;
    status?: number;
    data?: any;
    error?: string;
}

const testResults: TestResult[] = [];
let testCount = 0;

function logSection(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`📦 ${title}`);
    console.log('='.repeat(60));
}

async function makeRequest(
    method: string,
    endpoint: string,
    description: string,
    category: string,
    body?: any
): Promise<TestResult> {
    testCount++;
    const url = `${testConfig.baseUrl}${endpoint}`;
    console.log(`\n[${testCount}] ${method} ${endpoint}`);
    console.log(`    ${description}`);

    try {
        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${testConfig.authToken}`,
                'Content-Type': 'application/json',
            },
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();
        const success = response.ok;

        const icon = success ? '✅' : '❌';
        console.log(`    ${icon} Status: ${response.status}`);

        if (success) {
            console.log(`    📦 Success: ${data.message || 'OK'}`);
        } else {
            console.log(`    ⚠️  Error: ${data.error?.message || data.message || 'Unknown error'}`);
        }

        return {
            category,
            name: description,
            success,
            status: response.status,
            data,
        };
    } catch (error: any) {
        console.log(`    ❌ Exception: ${error.message}`);
        return {
            category,
            name: description,
            success: false,
            error: error.message,
        };
    }
}

// ============================================
// TEST SUITES
// ============================================

async function testOrdersAPI() {
    logSection('ORDERS API TESTS');

    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/orders`,
            'Get user orders',
            'Orders'
        )
    );

    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/orders?page=1&limit=5`,
            'Get user orders with pagination',
            'Orders'
        )
    );
}

async function testAddressesAPI() {
    logSection('ADDRESSES API TESTS');

    // Test 1: Get addresses (empty initially)
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/addresses`,
            'Get initial addresses (may be empty)',
            'Addresses'
        )
    );

    // Test 2: Create first address
    const address1Result = await makeRequest(
        'POST',
        `/api/users/${testConfig.userId}/addresses`,
        'Create first address (Home)',
        'Addresses',
        {
            type: 'Home',
            name: 'Test User',
            phone: '+91 9876543210',
            addressLine1: '123, Test Street',
            addressLine2: 'Near Test Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            isDefault: true,
        }
    );
    testResults.push(address1Result);

    // Extract address ID from response
    if (address1Result.success && address1Result.data?.data?.id) {
        testConfig.createdAddressId = address1Result.data.data.id;
        console.log(`    💾 Saved Address ID: ${testConfig.createdAddressId}`);
    }

    // Test 3: Create second address
    const address2Result = await makeRequest(
        'POST',
        `/api/users/${testConfig.userId}/addresses`,
        'Create second address (Office)',
        'Addresses',
        {
            type: 'Office',
            name: 'Test User',
            phone: '+91 9876543211',
            addressLine1: '456, Office Complex',
            addressLine2: 'Sector 5',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            isDefault: false,
        }
    );
    testResults.push(address2Result);

    if (address2Result.success && address2Result.data?.data?.id) {
        testConfig.secondAddressId = address2Result.data.data.id;
        console.log(`    💾 Saved Second Address ID: ${testConfig.secondAddressId}`);
    }

    // Test 4: Get addresses (should have 2 now)
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/addresses`,
            'Get addresses after creation',
            'Addresses'
        )
    );

    // Test 5: Update address
    if (testConfig.createdAddressId) {
        testResults.push(
            await makeRequest(
                'PUT',
                `/api/users/${testConfig.userId}/addresses/${testConfig.createdAddressId}`,
                'Update first address',
                'Addresses',
                {
                    addressLine2: 'Updated Address Line 2',
                    city: 'Navi Mumbai',
                }
            )
        );
    }

    // Test 6: Set second address as default
    if (testConfig.secondAddressId) {
        testResults.push(
            await makeRequest(
                'PATCH',
                `/api/users/${testConfig.userId}/addresses/${testConfig.secondAddressId}/default`,
                'Set second address as default',
                'Addresses'
            )
        );
    }

    // Test 7: Try to create duplicate/invalid address
    testResults.push(
        await makeRequest(
            'POST',
            `/api/users/${testConfig.userId}/addresses`,
            'Test validation - missing required fields (should fail)',
            'Addresses',
            {
                type: 'Home',
                // Missing required fields
            }
        )
    );

    // Test 8: Delete first address
    if (testConfig.createdAddressId) {
        testResults.push(
            await makeRequest(
                'DELETE',
                `/api/users/${testConfig.userId}/addresses/${testConfig.createdAddressId}`,
                'Delete first address',
                'Addresses'
            )
        );
    }

    // Test 9: Try to delete non-existent address
    testResults.push(
        await makeRequest(
            'DELETE',
            `/api/users/${testConfig.userId}/addresses/99999`,
            'Try to delete non-existent address (should fail)',
            'Addresses'
        )
    );

    // Test 10: Final address check
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/addresses`,
            'Get final addresses list',
            'Addresses'
        )
    );
}

async function testWishlistAPI() {
    logSection('WISHLIST API TESTS');

    // Test 1: Get empty wishlist
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/wishlist`,
            'Get initial wishlist (should be empty)',
            'Wishlist'
        )
    );

    // Test 2: Add product to wishlist
    testResults.push(
        await makeRequest(
            'POST',
            `/api/users/${testConfig.userId}/wishlist/${testConfig.productId}`,
            'Add product to wishlist',
            'Wishlist'
        )
    );

    // Test 3: Get wishlist with product
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/wishlist`,
            'Get wishlist after adding product',
            'Wishlist'
        )
    );

    // Test 4: Try to add duplicate product
    testResults.push(
        await makeRequest(
            'POST',
            `/api/users/${testConfig.userId}/wishlist/${testConfig.productId}`,
            'Try adding duplicate product (should fail with 409)',
            'Wishlist'
        )
    );

    // Test 5: Move to cart (Option B - keeps in wishlist)
    testResults.push(
        await makeRequest(
            'POST',
            `/api/users/${testConfig.userId}/wishlist/${testConfig.productId}/move-to-cart`,
            'Move product to cart (keeps in wishlist)',
            'Wishlist'
        )
    );

    // Test 6: Verify product still in wishlist
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/wishlist`,
            'Verify product still in wishlist after move-to-cart',
            'Wishlist'
        )
    );

    // Test 7: Try to add invalid product UUID
    testResults.push(
        await makeRequest(
            'POST',
            `/api/users/${testConfig.userId}/wishlist/invalid-uuid`,
            'Try adding invalid product UUID (should fail)',
            'Wishlist'
        )
    );

    // Test 8: Remove product from wishlist
    testResults.push(
        await makeRequest(
            'DELETE',
            `/api/users/${testConfig.userId}/wishlist/${testConfig.productId}`,
            'Remove product from wishlist',
            'Wishlist'
        )
    );

    // Test 9: Verify wishlist is empty
    testResults.push(
        await makeRequest(
            'GET',
            `/api/users/${testConfig.userId}/wishlist`,
            'Verify wishlist is empty after removal',
            'Wishlist'
        )
    );

    // Test 10: Try to remove non-existent product
    testResults.push(
        await makeRequest(
            'DELETE',
            `/api/users/${testConfig.userId}/wishlist/${testConfig.productId}`,
            'Try removing non-existent product (should fail)',
            'Wishlist'
        )
    );
}

// ============================================
// TEST RUNNER
// ============================================

async function runAllTests() {
    console.log('🚀 COMPREHENSIVE USER API TEST SUITE');
    console.log('='.repeat(60));
    console.log(`Base URL: ${testConfig.baseUrl}`);
    console.log(`User ID:  ${testConfig.userId}`);
    console.log(`Product:  ${testConfig.productId}`);
    console.log('='.repeat(60));

    // Validate configuration
    if (
        testConfig.authToken === 'YOUR_AUTH_TOKEN_HERE' ||
        testConfig.userId === 'YOUR_USER_UUID_HERE' ||
        testConfig.productId === 'YOUR_PRODUCT_UUID_HERE'
    ) {
        console.log('\n❌ CONFIGURATION ERROR!');
        console.log('\nPlease update the config section with actual values:');
        console.log('  ➤ authToken: Get from login/auth endpoint');
        console.log('  ➤ userId: Get from database users table');
        console.log('  ➤ productId: Get from database products table');
        console.log('\n💡 Tip: You can get these from your database:');
        console.log('   SELECT id FROM users LIMIT 1;');
        console.log('   SELECT id FROM products WHERE is_deleted = false LIMIT 1;');
        console.log('\nExiting...');
        return;
    }

    const startTime = Date.now();

    // Run all test suites
    await testOrdersAPI();
    await testAddressesAPI();
    await testWishlistAPI();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print detailed summary
    printSummary(duration);
}

function printSummary(duration: string) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    // Group by category
    const categories = ['Orders', 'Addresses', 'Wishlist'];

    categories.forEach(category => {
        const categoryTests = testResults.filter(r => r.category === category);
        const passed = categoryTests.filter(r => r.success).length;
        const failed = categoryTests.filter(r => !r.success).length;

        console.log(`\n${category} API:`);
        console.log(`  Total: ${categoryTests.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);

        // Show failed tests
        const failedTests = categoryTests.filter(r => !r.success);
        if (failedTests.length > 0) {
            failedTests.forEach(test => {
                console.log(`    ❌ ${test.name}`);
                if (test.error) {
                    console.log(`       Error: ${test.error}`);
                } else if (test.status) {
                    console.log(`       Status: ${test.status}`);
                }
            });
        }
    });

    // Overall summary
    const totalPassed = testResults.filter(r => r.success).length;
    const totalFailed = testResults.filter(r => !r.success).length;
    const successRate = ((totalPassed / testResults.length) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📈 OVERALL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${testResults.length}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60));

    if (totalFailed > 0) {
        console.log('\n⚠️  Some tests failed. Review the details above.');
        console.log('💡 Common issues:');
        console.log('   - Invalid auth token (expired?)');
        console.log('   - Database not seeded with test data');
        console.log('   - Server not running on the configured port');
    } else {
        console.log('\n🎉 ALL TESTS PASSED! Great job!');
    }
}

// Run the test suite
runAllTests().catch(error => {
    console.error('\n💥 Fatal error occurred:');
    console.error(error);
    process.exit(1);
});
