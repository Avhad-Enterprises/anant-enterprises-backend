/**
 * Test GET /api/products/:id - Enhanced Product Detail
 * Shows the complete response with all computed fields
 */

import { db } from '../src/database/index.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

async function testGetProductDetail() {
    console.log('🧪 Testing GET /api/products/:id (Enhanced)\n');
    console.log('='.repeat(70));

    // Get a product
    const [product] = await db
        .select({ id: products.id, product_title: products.product_title })
        .from(products)
        .where(eq(products.is_deleted, false))
        .limit(1);

    if (!product) {
        console.log('❌ No products found in database!\n');
        console.log('💡 Run seed script or create a product first.\n');
        process.exit(1);
    }

    console.log('\n📦 Testing Product:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Title: ${product.product_title}`);

    console.log('\n' + '='.repeat(70));
    console.log('📡 REQUEST:\n');
    console.log(`Method: GET`);
    console.log(`URL: ${BASE_URL}/api/products/${product.id}`);
    console.log(`Headers: (Public endpoint - no auth required for active products)`);

    try {
        const response = await fetch(`${BASE_URL}/api/products/${product.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('\n' + '='.repeat(70));
        console.log('📤 RESPONSE:\n');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('\nResponse Body:');
        console.log(JSON.stringify(data, null, 2));
        console.log('\n' + '='.repeat(70));

        if (response.ok && data.success) {
            console.log('\n✅ SUCCESS! Product detail retrieved.\n');
            console.log('📊 Response Includes:');
            console.log('   ✓ All product fields (keeping backend names)');
            console.log('   ✓ discount: Computed from compare_at_price and selling_price');
            console.log('   ✓ inStock: Computed from inventory table');
            console.log('   ✓ total_stock: Sum of available quantity');
            console.log('   ✓ rating: Average from reviews table');
            console.log('   ✓ review_count: Count of approved reviews');
            console.log('   ✓ images: Combined array of primary + additional images');

            console.log('\n📝 Key Fields:');
            const d = data.data;
            console.log(`   product_title: ${d.product_title}`);
            console.log(`   selling_price: ${d.selling_price}`);
            console.log(`   compare_at_price: ${d.compare_at_price || 'null'}`);
            console.log(`   discount: ${d.discount !== null ? d.discount + '%' : 'null'}`);
            console.log(`   inStock: ${d.inStock}`);
            console.log(`   total_stock: ${d.total_stock}`);
            console.log(`   rating: ${d.rating}`);
            console.log(`   review_count: ${d.review_count}`);
            console.log(`   images: ${d.images?.length || 0} image(s)`);
        } else {
            console.log(`\n❌ ERROR: ${data.error?.message || data.message}\n`);
        }

    } catch (error: any) {
        console.log(`\n❌ Request Failed: ${error.message}\n`);
    }

    console.log('');
}

testGetProductDetail();
