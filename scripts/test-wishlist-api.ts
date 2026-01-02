/**
 * Test Script for Wishlist API Endpoints (Simple Version)
 * 
 * Run: npx tsx scripts/test-wishlist-simple.ts
 */

const wishlistConfig = {
    baseUrl: 'http://localhost:3000',
    authToken: 'YOUR_AUTH_TOKEN_HERE',
    userId: 'YOUR_USER_UUID_HERE',
    productId: 'YOUR_PRODUCT_UUID_HERE',
};

interface WishlistTestResult {
    name: string;
    success: boolean;
    status?: number;
    error?: string;
}

async function testWishlistEndpoint(
    method: string,
    endpoint: string,
    description: string
): Promise<WishlistTestResult> {
    const url = `${wishlistConfig.baseUrl}${endpoint}`;
    console.log(`\n📡 ${method} ${endpoint}`);
    console.log(`   ${description}`);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${wishlistConfig.authToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        const success = response.ok;

        console.log(`   ${success ? '✅' : '❌'} Status: ${response.status}`);
        if (!success) {
            console.log(`   Error: ${data.error?.message || data.message}`);
        }

        return {
            name: description,
            success,
            status: response.status,
        };
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        return {
            name: description,
            success: false,
            error: error.message,
        };
    }
}

async function runWishlistTests() {
    console.log('🚀 Testing Wishlist API Endpoints');
    console.log('='.repeat(60));

    if (wishlistConfig.authToken === 'YOUR_AUTH_TOKEN_HERE') {
        console.log('\n❌ Please update config with actual values first!\n');
        return;
    }

    const wishlistResults: WishlistTestResult[] = [];

    // Test 1: Get Wishlist
    wishlistResults.push(
        await testWishlistEndpoint(
            'GET',
            `/api/users/${wishlistConfig.userId}/wishlist`,
            'Get initial wishlist'
        )
    );

    // Test 2: Add to Wishlist
    wishlistResults.push(
        await testWishlistEndpoint(
            'POST',
            `/api/users/${wishlistConfig.userId}/wishlist/${wishlistConfig.productId}`,
            'Add product to wishlist'
        )
    );

    // Test 3: Get Wishlist Again
    wishlistResults.push(
        await testWishlistEndpoint(
            'GET',
            `/api/users/${wishlistConfig.userId}/wishlist`,
            'Get wishlist with product'
        )
    );

    // Test 4: Move to Cart
    wishlistResults.push(
        await testWishlistEndpoint(
            'POST',
            `/api/users/${wishlistConfig.userId}/wishlist/${wishlistConfig.productId}/move-to-cart`,
            'Move product to cart'
        )
    );

    //  Test 5: Remove from Wishlist
    wishlistResults.push(
        await testWishlistEndpoint(
            'DELETE',
            `/api/users/${wishlistConfig.userId}/wishlist/${wishlistConfig.productId}`,
            'Remove from wishlist'
        )
    );

    // Summary
    const passed = wishlistResults.filter(r => r.success).length;
    const failed = wishlistResults.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log('='.repeat(60));
}

runWishlistTests();
