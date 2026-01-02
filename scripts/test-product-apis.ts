/**
 * Comprehensive Test Script: Product Page APIs
 * Tests all 8 Product Page API endpoints with multiple scenarios
 */

import { db } from '../src/database/index.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:8000/api';

// Test results tracker
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [] as any[],
};

// Helper function to run a test
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

// Helper function to make API request
async function apiRequest(endpoint: string, options = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }

    return { response, data };
}

// Test assertions
function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function runAllTests() {
    console.log('🧪 Testing Product Page APIs\n');
    console.log('='.repeat(70));

    // Get test data
    const [product1, product2, product3] = await db
        .select()
        .from(products)
        .where(eq(products.is_deleted, false))
        .limit(3);

    if (!product1 || !product2 || !product3) {
        console.log('❌ Not enough products in database. Run seed script first!');
        process.exit(1);
    }

    console.log(`\n📦 Test Products:`);
    console.log(`   1. ${product1.product_title} (${product1.id})`);
    console.log(`   2. ${product2.product_title} (${product2.id})`);
    console.log(`   3. ${product3.product_title} (${product3.id})`);
    console.log('\n' + '='.repeat(70) + '\n');

    // ===========================================
    // TEST 1: GET PRODUCT DETAIL
    // ===========================================
    console.log('\n📍 Test Suite 1: Product Detail (GET /products/:id)\n');

    await runTest('1.1 Get product by valid ID', async () => {
        const { data } = await apiRequest(`/products/${product1.id}`);
        assert(data.success === true, 'Response should be successful');
        assert(data.data.id === product1.id, 'Should return correct product');
        assert(data.data.product_title === product1.product_title, 'Should have product title');
        assert(typeof data.data.rating === 'number', 'Should have rating');
        assert(typeof data.data.review_count === 'number', 'Should have review count');
        assert(typeof data.data.inStock === 'boolean', 'Should have inStock status');
        assert(Array.isArray(data.data.images), 'Should have images array');
    });

    await runTest('1.2 Get product with invalid ID format', async () => {
        try {
            await apiRequest('/products/invalid-id');
            throw new Error('Should have failed with invalid ID');
        } catch (error: any) {
            assert(error.message.includes('400') || error.message.includes('Invalid'), 'Should return validation error');
        }
    });

    await runTest('1.3 Get non-existent product', async () => {
        try {
            await apiRequest('/products/00000000-0000-0000-0000-000000000000');
            throw new Error('Should have failed with 404');
        } catch (error: any) {
            assert(error.message.includes('404'), 'Should return 404 error');
        }
    });

    // ===========================================
    // TEST 2: GET PRODUCT REVIEWS
    // ===========================================
    console.log('\n📍 Test Suite 2: Product Reviews (GET /products/:id/reviews)\n');

    await runTest('2.1 Get reviews with default pagination', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/reviews`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data.reviews), 'Should have reviews array');
        assert(typeof data.data.total === 'number', 'Should have total count');
        assert(typeof data.data.averageRating === 'number', 'Should have average rating');
        assert(typeof data.data.ratingDistribution === 'object', 'Should have rating distribution');
        assert(Object.keys(data.data.ratingDistribution).length === 5, 'Rating distribution should have 5 keys');
    });

    await runTest('2.2 Get reviews with pagination', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/reviews?page=1&limit=2`);
        assert(data.data.reviews.length <= 2, 'Should respect limit parameter');
        assert(data.data.pagination.page === 1, 'Should have correct page number');
        assert(data.data.pagination.limit === 2, 'Should have correct limit');
    });

    await runTest('2.3 Get reviews sorted by helpful', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/reviews?sort=helpful`);
        const reviews = data.data.reviews;
        if (reviews.length > 1) {
            assert(reviews[0].helpful_votes >= reviews[reviews.length - 1].helpful_votes, 'Should be sorted by helpful votes');
        }
    });

    // ===========================================
    // TEST 3: SEARCH PRODUCTS
    // ===========================================
    console.log('\n📍 Test Suite 3: Search Products (GET /products/search)\n');

    await runTest('3.1 Search by product title', async () => {
        const searchTerm = product1.product_title.split(' ')[0];
        const { data } = await apiRequest(`/products/search?q=${searchTerm}`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
        assert(data.data.length > 0, 'Should find at least one product');
    });

    await runTest('3.2 Search with category filter', async () => {
        const { data } = await apiRequest(`/products/search?q=purifier&category=Residential`);
        assert(data.success === true, 'Response should be successful');
        const hasCategory = data.data.every((p: any) =>
            p.category_tier_1?.includes('Residential') || p.category_tier_2?.includes('Residential')
        );
        assert(hasCategory, 'All results should match category filter');
    });

    await runTest('3.3 Search with limit parameter', async () => {
        const { data } = await apiRequest(`/products/search?q=water&limit=2`);
        assert(data.data.length <= 2, 'Should respect limit parameter');
    });

    await runTest('3.4 Search with no query', async () => {
        try {
            await apiRequest('/products/search?q=');
            throw new Error('Should have failed without query');
        } catch (error: any) {
            assert(error.message.includes('400') || error.message.includes('required'), 'Should return validation error');
        }
    });

    // ===========================================
    // TEST 4: RELATED PRODUCTS
    // ===========================================
    console.log('\n📍 Test Suite 4: Related Products (GET /products/:id/related)\n');

    await runTest('4.1 Get related products', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/related`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
        const hasCurrentProduct = data.data.some((p: any) => p.id === product1.id);
        assert(!hasCurrentProduct, 'Should not include current product');
    });

    await runTest('4.2 Get related products with limit', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/related?limit=2`);
        assert(data.data.length <= 2, 'Should respect limit parameter');
    });

    // ===========================================
    // TEST 5: CATEGORY PRODUCTS
    // ===========================================
    console.log('\n📍 Test Suite 5: Category Products (GET /categories/:id/products)\n');

    await runTest('5.1 Get products by category slug', async () => {
        const categorySlug = 'residential-purifiers';
        const { data } = await apiRequest(`/categories/${categorySlug}/products`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
    });

    await runTest('5.2 Get category products with limit', async () => {
        const { data } = await apiRequest(`/categories/residential/products?limit=2`);
        assert(data.data.length <= 2, 'Should respect limit parameter');
    });

    await runTest('5.3 Get category products excluding specific product', async () => {
        const { data } = await apiRequest(`/categories/residential/products?exclude=${product1.id}`);
        const hasExcluded = data.data.some((p: any) => p.id === product1.id);
        assert(!hasExcluded, 'Should not include excluded product');
    });

    // ===========================================
    // TEST 6: BRAND PRODUCTS
    // ===========================================
    console.log('\n📍 Test Suite 6: Brand Products (GET /brands/:id/products)\n');

    await runTest('6.1 Get products by brand slug', async () => {
        const brandSlug = product1.brand_slug || 'anant';
        const { data } = await apiRequest(`/brands/${brandSlug}/products`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
    });

    await runTest('6.2 Get brand products with limit', async () => {
        const brandSlug = product1.brand_slug || 'anant';
        const { data } = await apiRequest(`/brands/${brandSlug}/products?limit=2`);
        assert(data.data.length <= 2, 'Should respect limit parameter');
    });

    // ===========================================
    // TEST 7: PRODUCT BUNDLES
    // ===========================================
    console.log('\n📍 Test Suite 7: Product Bundles (GET /products/:id/bundles)\n');

    await runTest('7.1 Get product bundles', async () => {
        const { data } = await apiRequest(`/products/${product1.id}/bundles`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of bundles');
        // Note: May return empty array if no bundles exist
    });

    // ===========================================
    // TEST 8: COMPARISON PRODUCTS
    // ===========================================
    console.log('\n📍 Test Suite 8: Comparison Products (GET /products/compare)\n');

    await runTest('8.1 Compare products by IDs', async () => {
        const ids = `${product1.id},${product2.id},${product3.id}`;
        const { data } = await apiRequest(`/products/compare?ids=${ids}`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
        assert(data.data.length === 3, 'Should return all requested products');
        assert(data.data[0].specs !== undefined, 'Should include specs field');
    });

    await runTest('8.2 Compare products by category', async () => {
        const category = product1.category_tier_1 || 'Residential Purifiers';
        const { data } = await apiRequest(`/products/compare?category=${encodeURIComponent(category)}`);
        assert(data.success === true, 'Response should be successful');
        assert(Array.isArray(data.data), 'Should return array of products');
    });

    await runTest('8.3 Compare with limit', async () => {
        const { data } = await apiRequest(`/products/compare?category=Purifiers&limit=2`);
        assert(data.data.length <= 2, 'Should respect limit parameter');
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
