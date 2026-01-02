/**
 * Quick Test: Verify Product Page APIs
 * Simple verification that all endpoints are responding
 */

import { db } from '../src/database/index.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:8000/api';

async function quickTest() {
    console.log('🧪 Quick API Verification\n');

    // Get a product
    const [product] = await db
        .select()
        .from(products)
        .where(eq(products.is_deleted, false))
        .limit(1);

    if (!product) {
        console.log('❌ No products found!');
        return;
    }

    console.log(`Testing with: ${product.product_title}\n`);

    const tests = [
        { name: 'Product Detail', url: `/products/${product.id}` },
        { name: 'Product Reviews', url: `/products/${product.id}/reviews` },
        { name: 'Search Products', url: `/products/search?q=water` },
        { name: 'Related Products', url: `/products/${product.id}/related` },
        { name: 'Category Products', url: `/categories/residential/products` },
        { name: 'Brand Products', url: `/brands/${product.brand_slug || 'anant'}/products` },
        { name: 'Product Bundles', url: `/products/${product.id}/bundles` },
        { name: 'Comparison', url: `/products/compare?ids=${product.id}` },
    ];

    for (const test of tests) {
        try {
            const response = await fetch(`${BASE_URL}${test.url}`);
            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`✅ ${test.name}`);
            } else {
                console.log(`❌ ${test.name} - ${data.message || 'Failed'}`);
            }
        } catch (error: any) {
            console.log(`❌ ${test.name} - ${error.message}`);
        }
    }

    console.log('\n✨ Verification Complete!');
}

quickTest()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
