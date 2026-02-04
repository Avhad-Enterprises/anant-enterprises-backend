/**
 * TEST: Inventory Variants Consistency
 * 
 * SCENARIO:
 * Reproduce the issue where a product has both base inventory and variant inventory,
 * causing inconsistencies in total stock calculations.
 * 
 * DATA:
 * - Base Inventory: 73
 * - Variant 1 (Medium): 28
 * - Variant 2 (Red): 12
 * - Expected Total if separate: 73 + 28 + 12 = 113
 * - Expected Total if base should be ignored: 28 + 12 = 40
 * 
 * The issue is likely that "base_inventory" is being counted alongside variant inventory
 * or "base_inventory" shouldn't exist/be returned when variants exist.
 */

import {
    setupBasicTestScenario,
    createTestProduct,
    createTestCustomer,
} from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';
import { cleanupAllTestData } from './helpers/cleanup';
import { supabase } from '../../src/utils/supabase';
import { db } from '../../src/database';
import { users } from '../../src/features/user/shared/user.schema';
import { eq } from 'drizzle-orm';

async function runTest() {
    console.log('\n========================================');
    console.log('TEST: Inventory Variants Consistency');
    console.log('========================================\n');

    let apiClient: TestApiClient;
    let customerId: string;

    try {
        // ============================================
        // STEP 1: Setup Test Data
        // ============================================
        console.log('📦 Setting up test scenario with variants...\n');

        // Create Customer
        const customer = await createTestCustomer();
        customerId = customer.id;

        // Create Product with specific inventory mismatch similar to user report
        const product = await createTestProduct({
            product_title: 'Checking Inventory Bug',
            stock: 73, // Base inventory
            category_tier_1: undefined, // default
            has_variants: true,
            variants: [
                {
                    option_name: 'size',
                    option_value: 'medium',
                    inventory_quantity: 28,
                    sku: 'VAR-1-MED',
                    selling_price: '14.00'
                },
                {
                    option_name: 'size',
                    option_value: 'red', // color in size option? mimicking user data
                    inventory_quantity: 12,
                    sku: 'VAR-2-RED',
                    selling_price: '14.00'
                }
            ]
        });

        console.log(`✅ Created Product: ${product.id}`);
        console.log(`   Base Stock: 73`);
        console.log(`   Variants: Medium (28), Red (12)`);

        // ============================================
        // STEP 2: Authenticate
        // ============================================
        console.log('\n🔐 Setting up auth...\n');
        apiClient = new TestApiClient();

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: customer.email,
            password: 'Test@123',
            email_confirm: true,
            user_metadata: { first_name: 'Test', last_name: 'User' }
        });

        if (authError || !authData.user) throw new Error(`Auth create failed: ${authError?.message}`);

        await db.update(users).set({ auth_id: authData.user.id }).where(eq(users.id, customer.id));

        const { data: signInData } = await supabase.auth.signInWithPassword({
            email: customer.email,
            password: 'Test@123',
        });

        if (!signInData.session?.access_token) throw new Error('Sign in failed');
        apiClient.setToken(signInData.session.access_token);

        // ============================================
        // STEP 3: Fetch Product via API
        // ============================================
        console.log('\nAPI Request: Get Product Details');
        const response = await apiClient.getProductById(product.id);

        if (!response.success) {
            throw new Error(`Failed to fetch product: ${response.message}`);
        }

        const apiProduct = response.data;
        console.log('API Response Data:', JSON.stringify(apiProduct, null, 2));

        // ============================================
        // STEP 4: Analyze & Assert
        // ============================================
        console.log('\n🔍 Analyzing Inventory Data...');

        const totalStock = apiProduct.total_stock;
        const availableStock = apiProduct.available_stock;
        const reservedStock = apiProduct.reserved_stock;

        const variants = apiProduct.variants || [];
        const variantSum = variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0);
        const baseInv = apiProduct.base_inventory || 0;

        console.log(`\nResults:`);
        console.log(`- Base Inventory (DB Available): ${baseInv}`);
        console.log(`- Sum of Variants (DB Available): ${variantSum}`);
        console.log(`- Total DB Available (Base + variants): ${baseInv + variantSum}`);
        console.log(`- API Total Stock: ${totalStock}`);
        console.log(`- API Available Stock: ${availableStock}`);
        console.log(`- API Reserved Stock: ${reservedStock}`);

        // Logic Check
        // Correct Logic: Available = DB_Available. Total = DB_Available + DB_Reserved.
        // Buggy Logic: Available = DB_Available - DB_Reserved.

        const calculatedTotalFromParts = baseInv + variantSum + reservedStock;

        console.log(`\nValidation:`);

        if (availableStock !== (baseInv + variantSum)) {
            console.log(`❌ API Available Stock (${availableStock}) != Sum of DB Available parts (${baseInv + variantSum})`);
            console.log(`   Difference: ${(baseInv + variantSum) - availableStock}`);

            if (availableStock === (baseInv + variantSum) - reservedStock) {
                console.log(`🐛 BUG CONFIRMED: available_stock is subtracting reserved_stock twice!`);
                console.log(`   DB 'available_quantity' already excludes reserved. Code is subtracting it again.`);
            }
        } else {
            console.log(`✅ Available Stock matches Sum of DB Available parts.`);
        }

        if (totalStock !== calculatedTotalFromParts) {
            console.log(`❌ API Total Stock (${totalStock}) != Sum of parts + reserved (${calculatedTotalFromParts})`);
        } else {
            console.log(`✅ Total Stock logic seems consistent (Total = Avail + Reserved).`);
        }

        return { success: true };

    } catch (error) {
        console.error('Error:', error);
        return { success: false, error };
    } finally {
        if (process.env.CLEANUP_AFTER_TEST !== 'false') {
            console.log('\n🧹 Cleaning up...');
            await cleanupAllTestData();
        }
    }
}

runTest().then(() => process.exit(0));
