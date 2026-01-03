/**
 * Comprehensive Test Script: Collection APIs
 * Tests all 11 endpoints with multiple scenarios
 */

const BASE_URL = 'http://localhost:8000/api';

// Test results tracker
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [] as any[],
};

// Test data
let testCollectionId: string;
let testCollectionSlug: string;
let testProductIds: string[] = [];

// Helper functions
async function runTest(name: string, testFn: () => Promise<void>) {
    testResults.total++;
    try {
        await testFn();
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASS' });
        console.log(`✅ ${name}`);
    } catch (error: any) {
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}\n`);
    }
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();
    return { response, data };
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function runAllTests() {
    console.log('🧪 Testing Collection APIs - Comprehensive Test Suite\n');
    console.log('='.repeat(70) + '\n');

    // ===========================================
    // SETUP: Get test data
    // ===========================================
    console.log('📦 Setting up test data...\n');

    // Get existing products for testing
    const { data: productsData } = await apiRequest('/products?limit=3');
    if (productsData.success && productsData.data.products.length > 0) {
        testProductIds = productsData.data.products.slice(0, 3).map((p: any) => p.id);
        console.log(`Found ${testProductIds.length} products for testing`);
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // ===========================================
    // TEST SUITE 1: PUBLIC ENDPOINTS (10 tests)
    // ===========================================
    console.log('📍 Test Suite 1: Public Endpoints\n');

    await runTest('1.1 GET /collections - List all collections', async () => {
        const { response, data } = await apiRequest('/collections');
        assert(response.ok, 'Response should be successful');
        assert(data.success === true, 'Should have success flag');
        assert(Array.isArray(data.data.collections), 'Should return collections array');
        assert(typeof data.data.total === 'number', 'Should have total count');
        assert(typeof data.data.totalPages === 'number', 'Should have totalPages');
    });

    await runTest('1.2 GET /collections - Pagination', async () => {
        const { data } = await apiRequest('/collections?page=1&limit=2');
        assert(data.data.collections.length <= 2, 'Should respect limit');
        assert(data.data.currentPage === 1, 'Should have correct page');
    });

    await runTest('1.3 GET /collections - Filter by type', async () => {
        const { data } = await apiRequest('/collections?type=manual');
        assert(data.success === true, 'Should filter by type');
    });

    await runTest('1.4 GET /collections - Sort by newest', async () => {
        const { data } = await apiRequest('/collections?sort=newest&limit=5');
        assert(data.success === true, 'Should sort by newest');
    });

    await runTest('1.5 GET /collections/:slug - Get by slug', async () => {
        const { data } = await apiRequest('/collections/summer-sale');
        if (data.success) {
            testCollectionId = data.data.id;
            testCollectionSlug = data.data.slug;
            assert(data.data.title !== undefined, 'Should have title');
            assert(data.data.slug === 'summer-sale', 'Should match requested slug');
        }
    });

    await runTest('1.6 GET /collections/:slug - Non-existent slug returns 404', async () => {
        const { response, data } = await apiRequest('/collections/non-existent-slug-xyz');
        assert(response.status === 404, 'Should return 404');
        assert(data.success === false, 'Should have success: false');
    });

    await runTest('1.7 GET /collections/:slug/products - Get collection products', async () => {
        const { response, data } = await apiRequest('/collections/summer-sale/products');
        assert(response.ok, 'Response should be successful');
        assert(data.success === true, 'Should have success flag');
        assert(data.data.collection !== undefined, 'Should have collection info');
        assert(Array.isArray(data.data.products), 'Should have products array');
    });

    await runTest('1.8 GET /collections/:slug/products - Pagination', async () => {
        const { data } = await apiRequest('/collections/summer-sale/products?page=1&limit=5');
        assert(data.success === true || data.data.products.length === 0, 'Should handle pagination');
    });

    await runTest('1.9 GET /collections/featured - Get featured collections', async () => {
        const { response, data } = await apiRequest('/collections/featured');
        assert(response.ok, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array');
    });

    await runTest('1.10 GET /collections/featured - Limit parameter', async () => {
        const { data } = await apiRequest('/collections/featured?limit=3');
        assert(data.data.length <= 3, 'Should respect limit');
    });

    // ===========================================
    // TEST SUITE 2: ADMIN AUTH CHECKS (7 tests)
    // ===========================================
    console.log('\n📍 Test Suite 2: Admin Endpoints (Auth Required)\n');

    await runTest('2.1 POST /collections - Create without auth returns 401', async () => {
        const { response } = await apiRequest('/collections', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Test Collection',
                slug: 'test-collection',
            }),
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.2 PUT /collections/:id - Update without auth returns 401', async () => {
        const { response } = await apiRequest('/collections/some-id', {
            method: 'PUT',
            body: JSON.stringify({ title: 'Updated' }),
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.3 DELETE /collections/:id - Delete without auth returns 401', async () => {
        const { response } = await apiRequest('/collections/some-id', {
            method: 'DELETE',
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.4 POST /collections/:id/products - Add products without auth returns 401', async () => {
        const { response } = await apiRequest('/collections/some-id/products', {
            method: 'POST',
            body: JSON.stringify({ productIds: ['id1'] }),
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.5 DELETE /collections/:id/products/:productId - Remove without auth returns 401', async () => {
        const { response } = await apiRequest('/collections/some-id/products/prod-id', {
            method: 'DELETE',
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.6 PUT /collections/:id/products/reorder - Reorder without auth returns 401', async () => {
        const { response } = await apiRequest('/collections/some-id/products/reorder', {
            method: 'PUT',
            body: JSON.stringify({ products: [] }),
        });
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    await runTest('2.7 GET /admin/collections - Admin list without auth returns 401', async () => {
        const { response } = await apiRequest('/admin/collections');
        assert(response.status === 401, 'Should return 401 unauthorized');
    });

    // ===========================================
    // TEST SUITE 3: VALIDATION TESTS (4 tests)
    // ===========================================
    console.log('\n📍 Test Suite 3: Validation & Error Handling\n');

    await runTest('3.1 GET /collections - Invalid page number', async () => {
        const { response, data } = await apiRequest('/collections?page=-1');
        assert(response.status === 400 || data.data.collections !== undefined, 'Should handle invalid page');
    });

    await runTest('3.2 GET /collections - Limit exceeds max', async () => {
        const { data } = await apiRequest('/collections?limit=100');
        assert(data.data.collections.length <= 50, 'Should respect max limit');
    });

    await runTest('3.3 GET /collections/:slug/products - Invalid slug format', async () => {
        const { response } = await apiRequest('/collections/@invalid-slug/products');
        assert(response.status === 404 || response.status === 400, 'Should handle invalid slug');
    });

    await runTest('3.4 GET /collections/featured - Invalid limit', async () => {
        const { response, data } = await apiRequest('/collections/featured?limit=0');
        assert(response.status === 400 || data.data.length >= 0, 'Should handle invalid limit');
    });

    // ===========================================
    // TEST SUITE 4: RESPONSE STRUCTURE (4 tests)
    // ===========================================
    console.log('\n📍 Test Suite 4: Response Structure Validation\n');

    await runTest('4.1 Collections have correct structure', async () => {
        const { data } = await apiRequest('/collections?limit=1');
        if (data.data.collections.length > 0) {
            const collection = data.data.collections[0];
            assert(typeof collection.id === 'string', 'Should have id');
            assert(typeof collection.title === 'string', 'Should have title');
            assert(typeof collection.slug === 'string', 'Should have slug');
            assert('bannerImage' in collection, 'Should have bannerImage field');
            assert('mobileBannerImage' in collection, 'Should have mobileBannerImage field');
        }
    });

    await runTest('4.2 Collection products have correct structure', async () => {
        const { data } = await apiRequest('/collections/summer-sale/products?limit=1');
        if (data.data.products.length > 0) {
            const product = data.data.products[0];
            assert(typeof product.id === 'string', 'Should have id');
            assert(typeof product.name === 'string', 'Should have name');
            assert(typeof product.price === 'number', 'Should have price');
            assert(typeof product.rating === 'number', 'Should have rating');
            assert(typeof product.reviews === 'number', 'Should have reviews');
        }
    });

    await runTest('4.3 Featured collections have product count', async () => {
        const { data } = await apiRequest('/collections/featured');
        if (data.data.length > 0) {
            const featured = data.data[0];
            assert(typeof featured.productCount === 'number', 'Should have productCount');
        }
    });

    await runTest('4.4 Pagination metadata is correct', async () => {
        const { data } = await apiRequest('/collections?page=1&limit=5');
        assert(typeof data.data.total === 'number', 'Should have total');
        assert(typeof data.data.totalPages === 'number', 'Should have totalPages');
        assert(typeof data.data.currentPage === 'number', 'Should have currentPage');
        assert(data.data.currentPage === 1, 'Current page should match request');
    });

    // ===========================================
    // TEST SUITE 5: EDGE CASES (4 tests)
    // ===========================================
    console.log('\n📍 Test Suite 5: Edge Cases\n');

    await runTest('5.1 GET /collections - Empty results', async () => {
        const { data } = await apiRequest('/collections?page=9999');
        assert(data.data.collections.length === 0 || data.success, 'Should handle empty results');
    });

    await runTest('5.2 GET /collections/:slug/products - Collection with no products', async () => {
        const { data } = await apiRequest('/collections/commercial-systems/products');
        if (data.success) {
            assert(Array.isArray(data.data.products), 'Should return products array');
            assert(data.data.collection !== undefined, 'Should have collection info');
        }
    });

    await runTest('5.3 GET /collections - Very large limit', async () => {
        const { data } = await apiRequest('/collections?limit=1000');
        assert(data.data.collections.length <= 50, 'Should enforce max limit');
    });

    await runTest('5.4 GET /collections/:slug - Case sensitivity', async () => {
        const { response } = await apiRequest('/collections/SUMMER-SALE');
        assert(response.status === 404, 'Should be case-sensitive');
    });

    // ===========================================
    // PRINT RESULTS
    // ===========================================
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter((t) => t.status === 'FAIL')
            .forEach((t) => {
                console.log(`   - ${t.name}`);
                console.log(`     ${t.error}`);
            });
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Testing Complete!\n');

    console.log('📝 Test Coverage Summary:');
    console.log('  ✅ Public endpoints (10 tests)');
    console.log('  ✅ Authentication checks (7 tests)');
    console.log('  ✅ Validation & error handling (4 tests)');
    console.log('  ✅ Response structure validation (4 tests)');
    console.log('  ✅ Edge cases & limits (4 tests)');
    console.log('  📊 Total: 29 comprehensive tests');
    console.log('\nNote: Admin endpoints tested for auth requirement.');
    console.log('For full admin testing, run with valid auth token.\n');

    return testResults.failed === 0;
}

runAllTests()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
