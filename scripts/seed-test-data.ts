/**
 * Seed Test Data Script
 * 
 * Creates test data needed for API testing:
 * - Test user
 * - Test product
 * 
 * Run: npx tsx scripts/seed-test-data.ts
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

async function seedTestData() {
    console.log('🌱 Seeding test data...\n');

    try {
        // Check for existing test user
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, 'test@example.com'))
            .limit(1);

        let testUser;
        if (existingUser) {
            console.log('✅ Test user already exists');
            testUser = existingUser;
        } else {
            // Create test user
            [testUser] = await db
                .insert(users)
                .values({
                    user_type: 'individual',
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123', // Note: This should be hashed in production
                    phone_number: '9876543210',
                    phone_country_code: '+91',
                    phone_verified: false,
                    preferred_language: 'en',
                    preferred_currency: 'INR',
                    timezone: 'Asia/Kolkata',
                    is_deleted: false,
                })
                .returning();

            console.log('✅ Created test user');
        }

        // Check for existing test product
        const [existingProduct] = await db
            .select()
            .from(products)
            .where(eq(products.sku, 'TEST-PRODUCT-001'))
            .limit(1);

        let testProduct;
        if (existingProduct) {
            console.log('✅ Test product already exists');
            testProduct = existingProduct;
        } else {
            // Create test product
            [testProduct] = await db
                .insert(products)
                .values({
                    slug: 'test-product-001',
                    product_title: 'Test Product for API Testing',
                    secondary_title: 'A sample product',
                    short_description: 'This is a test product for API testing',
                    full_description: 'This product is created automatically for testing purposes.',
                    status: 'active',
                    cost_price: '100.00',
                    selling_price: '150.00',
                    compare_at_price: '200.00',
                    sku: 'TEST-PRODUCT-001',
                    barcode: '1234567890',
                    primary_image_url: '/test/product.png',
                    is_deleted: false,
                })
                .returning();

            console.log('✅ Created test product');
        }

        // Display results
        console.log('\n' + '='.repeat(60));
        console.log('🎉 TEST DATA READY!');
        console.log('='.repeat(60));

        console.log('\n📋 Test User:');
        console.log(`  ID:    ${testUser.id}`);
        console.log(`  Name:  ${testUser.name}`);
        console.log(`  Email: ${testUser.email}`);

        console.log('\n📦 Test Product:');
        console.log(`  ID:    ${testProduct.id}`);
        console.log(`  Title: ${testProduct.product_title}`);
        console.log(`  SKU:   ${testProduct.sku}`);
        console.log(`  Price: ₹${testProduct.selling_price}`);

        console.log('\n' + '='.repeat(60));
        console.log('📝 UPDATE YOUR TEST SCRIPT CONFIG:');
        console.log('='.repeat(60));
        console.log('\nconst config = {');
        console.log('  baseUrl: \'http://localhost:3000\',');
        console.log('  authToken: \'YOUR_AUTH_TOKEN_HERE\',  // ← Get this from login');
        console.log(`  userId: '${testUser.id}',`);
        console.log(`  productId: '${testProduct.id}',`);
        console.log('};');

        console.log('\n' + '='.repeat(60));
        console.log('🔑 NEXT STEPS TO GET AUTH TOKEN:');
        console.log('='.repeat(60));
        console.log('\n1. Login to get auth token:');
        console.log('   curl -X POST http://localhost:3000/api/auth/login \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log(`     -d '{"email":"test@example.com","password":"password123"}'`);
        console.log('\n2. Copy the token from the response');
        console.log('3. Update authToken in the test script');
        console.log('4. Run: npx tsx scripts/test-all-user-apis.ts\n');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error seeding data:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   - Database is running');
        console.error('   - Migrations have been run');
        console.error('   - npm run dev is running\n');
        process.exit(1);
    }
}

seedTestData();
