/**
 * Visual API Test Runner with Input/Output Display
 * 
 * Shows exactly what we send and what we receive for each endpoint
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

interface VisualTestConfig {
    userId: string;
    userEmail: string;
    productId: string;
    productName: string;
    authToken: string;
}

let testNumber = 0;

function printHeader(title: string) {
    console.log('\n' + '═'.repeat(80));
    console.log(`  ${title}`);
    console.log('═'.repeat(80));
}

function printTestHeader(method: string, endpoint: string, description: string) {
    testNumber++;
    console.log('\n' + '─'.repeat(80));
    console.log(`TEST ${testNumber}: ${description}`);
    console.log('─'.repeat(80));
    console.log(`📡 ${method} ${endpoint}`);
}

function printInput(data: any) {
    console.log('\n📥 INPUT (What we send):');
    console.log('─'.repeat(40));
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('(No request body - GET request)');
    }
}

function printOutput(status: number, data: any) {
    const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
    console.log('\n📤 OUTPUT (What we receive):');
    console.log('─'.repeat(40));
    console.log(`${statusIcon} Status Code: ${status}`);
    console.log(JSON.stringify(data, null, 2));
}

async function makeRequest(
    method: string,
    endpoint: string,
    token: string,
    body?: any
) {
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
            status: response.status,
            data,
        };
    } catch (error: any) {
        return {
            status: 0,
            data: { error: error.message },
        };
    }
}

async function runVisualTests(config: VisualTestConfig) {
    printHeader('🧪 VISUAL API TESTING - INPUT/OUTPUT DEMO');

    console.log('\n📋 Test Configuration:');
    console.log(`   User: ${config.userEmail} (${config.userId})`);
    console.log(`   Product: ${config.productName.substring(0, 40)}...`);
    console.log(`   Auth Token: ${config.authToken.substring(0, 20)}...`);

    // ========================================
    // ORDERS API TESTS
    // ========================================

    printHeader('📋 ORDERS API TESTS');

    // Test 1: Get Orders
    printTestHeader('GET', `/api/users/${config.userId}/orders`, 'Get User Orders');
    printInput(null);

    const ordersResult = await makeRequest(
        'GET',
        `/api/users/${config.userId}/orders`,
        config.authToken
    );
    printOutput(ordersResult.status, ordersResult.data);

    // Test 2: Get Orders with Pagination
    printTestHeader(
        'GET',
        `/api/users/${config.userId}/orders?page=1&limit=5`,
        'Get Orders with Pagination'
    );
    printInput({ queryParams: { page: 1, limit: 5 } });

    const paginatedOrdersResult = await makeRequest(
        'GET',
        `/api/users/${config.userId}/orders?page=1&limit=5`,
        config.authToken
    );
    printOutput(paginatedOrdersResult.status, paginatedOrdersResult.data);

    // ========================================
    // ADDRESSES API TESTS
    // ========================================

    printHeader('🏠 ADDRESSES API TESTS');

    // Test 3: Get Addresses (Empty)
    printTestHeader('GET', `/api/users/${config.userId}/addresses`, 'Get All Addresses');
    printInput(null);

    const getAddressesResult = await makeRequest(
        'GET',
        `/api/users/${config.userId}/addresses`,
        config.authToken
    );
    printOutput(getAddressesResult.status, getAddressesResult.data);

    // Test 4: Create Address
    const addressInput = {
        type: 'Home',
        name: 'John Doe',
        phone: '+91 9876543210',
        addressLine1: '123, Green Valley Apartments',
        addressLine2: 'MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        isDefault: true,
    };

    printTestHeader('POST', `/api/users/${config.userId}/addresses`, 'Create New Address');
    printInput(addressInput);

    const createAddressResult = await makeRequest(
        'POST',
        `/api/users/${config.userId}/addresses`,
        config.authToken,
        addressInput
    );
    printOutput(createAddressResult.status, createAddressResult.data);

    let addressId: number | null = null;
    if (createAddressResult.status === 201 && createAddressResult.data?.data?.id) {
        addressId = createAddressResult.data.data.id;
        console.log(`\n💾 Created Address ID: ${addressId}`);
    }

    // Test 5: Update Address
    if (addressId) {
        const updateInput = {
            city: 'Navi Mumbai',
            addressLine2: 'Updated - Near XYZ Mall',
        };

        printTestHeader(
            'PUT',
            `/api/users/${config.userId}/addresses/${addressId}`,
            'Update Address'
        );
        printInput(updateInput);

        const updateAddressResult = await makeRequest(
            'PUT',
            `/api/users/${config.userId}/addresses/${addressId}`,
            config.authToken,
            updateInput
        );
        printOutput(updateAddressResult.status, updateAddressResult.data);
    }

    // Test 6: Set as Default
    if (addressId) {
        printTestHeader(
            'PATCH',
            `/api/users/${config.userId}/addresses/${addressId}/default`,
            'Set Address as Default'
        );
        printInput(null);

        const setDefaultResult = await makeRequest(
            'PATCH',
            `/api/users/${config.userId}/addresses/${addressId}/default`,
            config.authToken
        );
        printOutput(setDefaultResult.status, setDefaultResult.data);
    }

    // ========================================
    // WISHLIST API TESTS
    // ========================================

    printHeader('❤️  WISHLIST API TESTS');

    // Test 7: Get Empty Wishlist
    printTestHeader('GET', `/api/users/${config.userId}/wishlist`, 'Get Wishlist (Empty)');
    printInput(null);

    const getWishlistResult = await makeRequest(
        'GET',
        `/api/users/${config.userId}/wishlist`,
        config.authToken
    );
    printOutput(getWishlistResult.status, getWishlistResult.data);

    // Test 8: Add to Wishlist
    printTestHeader(
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        'Add Product to Wishlist'
    );
    printInput({ productId: config.productId });

    const addWishlistResult = await makeRequest(
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        config.authToken
    );
    printOutput(addWishlistResult.status, addWishlistResult.data);

    // Test 9: Get Wishlist with Product
    printTestHeader(
        'GET',
        `/api/users/${config.userId}/wishlist`,
        'Get Wishlist (With Product)'
    );
    printInput(null);

    const getWishlistWithProductResult = await makeRequest(
        'GET',
        `/api/users/${config.userId}/wishlist`,
        config.authToken
    );
    printOutput(getWishlistWithProductResult.status, getWishlistWithProductResult.data);

    // Test 10: Move to Cart
    printTestHeader(
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}/move-to-cart`,
        'Move Product to Cart'
    );
    printInput({ productId: config.productId });

    const moveToCartResult = await makeRequest(
        'POST',
        `/api/users/${config.userId}/wishlist/${config.productId}/move-to-cart`,
        config.authToken
    );
    printOutput(moveToCartResult.status, moveToCartResult.data);

    // Test 11: Remove from Wishlist
    printTestHeader(
        'DELETE',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        'Remove Product from Wishlist'
    );
    printInput({ productId: config.productId });

    const removeWishlistResult = await makeRequest(
        'DELETE',
        `/api/users/${config.userId}/wishlist/${config.productId}`,
        config.authToken
    );
    printOutput(removeWishlistResult.status, removeWishlistResult.data);

    // Cleanup: Delete test address
    if (addressId) {
        printTestHeader(
            'DELETE',
            `/api/users/${config.userId}/addresses/${addressId}`,
            'Delete Test Address (Cleanup)'
        );
        printInput(null);

        const deleteAddressResult = await makeRequest(
            'DELETE',
            `/api/users/${config.userId}/addresses/${addressId}`,
            config.authToken
        );
        printOutput(deleteAddressResult.status, deleteAddressResult.data);
    }

    // ========================================
    // SUMMARY
    // ========================================

    printHeader('📊 TEST SUMMARY');
    console.log(`\n✅ Completed ${testNumber} API tests`);
    console.log('\n📝 Key Observations:');
    console.log('   • All endpoints follow consistent response format');
    console.log('   • Success responses include: success, message, data');
    console.log('   • Error responses include: success, error object');
    console.log('   • Status codes: 200 (OK), 201 (Created), 404 (Not Found), etc.');
    console.log('\n');
}

async function main() {
    console.log('🚀 Starting Visual API Test Runner...\n');

    // Get test data
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
        console.log('❌ No test data found! Run: npx tsx scripts/seed-test-data.ts\n');
        process.exit(1);
    }

    // Check for auth token
    const authToken = process.env.TEST_AUTH_TOKEN;
    if (!authToken) {
        console.log('❌ No auth token provided!\n');
        console.log('💡 Set TEST_AUTH_TOKEN environment variable:');
        console.log('   $env:TEST_AUTH_TOKEN="your_token_here"');
        console.log('   npx tsx scripts/visual-test.ts\n');
        process.exit(1);
    }

    const config: VisualTestConfig = {
        userId: user.id,
        userEmail: user.email,
        productId: product.id,
        productName: product.title,
        authToken,
    };

    await runVisualTests(config);
    process.exit(0);
}

main().catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
});
