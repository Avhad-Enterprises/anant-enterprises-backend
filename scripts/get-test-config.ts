/**
 * Helper Script to Get Test Configuration Values
 * 
 * This script queries your database to get the values needed for testing:
 * - A user ID
 * - A product ID
 * 
 * Run: npx tsx scripts/get-test-config.ts
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { eq } from 'drizzle-orm';

async function getTestConfig() {
    console.log('🔍 Fetching test configuration from database...\n');

    try {
        // Get a user
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
            })
            .from(users)
            .where(eq(users.is_deleted, false))
            .limit(1);

        if (!user) {
            console.log('❌ No users found in database!');
            console.log('💡 Create a user first or check your database connection.\n');
            process.exit(1);
        }

        // Get a product
        const [product] = await db
            .select({
                id: products.id,
                title: products.product_title,
                sku: products.sku,
            })
            .from(products)
            .where(eq(products.is_deleted, false))
            .limit(1);

        if (!product) {
            console.log('❌ No products found in database!');
            console.log('💡 Create a product first or check your database connection.\n');
            process.exit(1);
        }

        // Display results
        console.log('✅ Found test data!\n');
        console.log('='.repeat(60));
        console.log('📋 COPY THESE VALUES TO YOUR TEST SCRIPT');
        console.log('='.repeat(60));
        console.log('\nUser Information:');
        console.log(`  Name:  ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  ID:    ${user.id}`);

        console.log('\nProduct Information:');
        console.log(`  Title: ${product.title}`);
        console.log(`  SKU:   ${product.sku}`);
        console.log(`  ID:    ${product.id}`);

        console.log('\n' + '='.repeat(60));
        console.log('📝 UPDATE YOUR TEST SCRIPT CONFIG:');
        console.log('='.repeat(60));
        console.log('\nconst config = {');
        console.log('  baseUrl: \'http://localhost:3000\',');
        console.log('  authToken: \'YOUR_AUTH_TOKEN_HERE\',  // ← Still need to get this from login');
        console.log(`  userId: '${user.id}',`);
        console.log(`  productId: '${product.id}',`);
        console.log('};');

        console.log('\n' + '='.repeat(60));
        console.log('🔑 TO GET AUTH TOKEN:');
        console.log('='.repeat(60));
        console.log('\n1. Option A: Login via API');
        console.log(`   curl -X POST http://localhost:3000/api/auth/login \\`);
        console.log(`     -H "Content-Type: application/json" \\`);
        console.log(`     -d '{"email":"${user.email}","password":"YOUR_PASSWORD"}'`);

        console.log('\n2. Option B: Use existing session');
        console.log('   - Open your app in browser');
        console.log('   - Login with your credentials');
        console.log('   - Open DevTools > Application > LocalStorage');
        console.log('   - Copy the auth token');

        console.log('\n3. Option C: Generate test token (if you have a test user)');
        console.log('   - Check if you have seed data or test accounts\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        console.error('\n💡 Make sure:');
        console.error('   - Database is running');
        console.error('   - npm run dev is running');
        console.error('   - Database has been migrated\n');
        process.exit(1);
    }
}

getTestConfig();
