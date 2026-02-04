
import * as testData from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';
import { cleanupTestScenario } from './helpers/cleanup';
import { db } from '../../src/database';
import { users } from '../../src/features/user/shared/user.schema';
import { supabase } from '../../src/utils/supabase';
import { eq } from 'drizzle-orm';

async function runTest() {
    console.log('========================================');
    console.log('TEST: Overselling Protection');
    console.log('========================================');

    let customer: any;
    let simpleProduct: any;
    let variantProduct: any;
    let apiClient: TestApiClient;
    let authUserId: string | undefined;

    // Test Config
    const SIMPLE_STOCK = 10;
    const VARIANT_STOCK_M = 5;
    const VARIANT_STOCK_L = 3;

    try {
        apiClient = new TestApiClient();

        // 1. Setup Data
        console.log('\n📦 Setting up test data...');
        customer = await testData.createTestCustomer();

        // Setup Auth
        console.log('🔐 Setting up Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: customer.email,
            password: 'Test@123',
            email_confirm: true,
            user_metadata: { first_name: 'Test', last_name: 'User' }
        });
        if (authError || !authData.user) throw new Error(`Auth create failed: ${authError?.message}`);
        authUserId = authData.user.id;

        await db.update(users).set({ auth_id: authUserId }).where(eq(users.id, customer.id));
        const { data: signInData } = await supabase.auth.signInWithPassword({
            email: customer.email,
            password: 'Test@123',
        });
        if (!signInData.session?.access_token) throw new Error('Sign in failed');
        apiClient.setToken(signInData.session.access_token);
        console.log('✅ Authenticated');

        // Create Simple Product
        simpleProduct = await testData.createTestProduct({
            product_title: 'Oversell Test Simple',
            stock: SIMPLE_STOCK,
            selling_price: '100',
            has_variants: false,
            variants: []
        });
        console.log(`   Simple Product: ${simpleProduct.id} (Stock: ${SIMPLE_STOCK})`);

        // Create Variant Product
        variantProduct = await testData.createTestProduct({
            product_title: 'Oversell Test Variant',
            stock: 0, // Base stock ignores when variants exist, but good to set 0 to be sure
            selling_price: '100',
            has_variants: true,
            variants: [
                { option_name: 'Size', option_value: 'M', inventory_quantity: VARIANT_STOCK_M, selling_price: '100' },
                { option_name: 'Size', option_value: 'L', inventory_quantity: VARIANT_STOCK_L, selling_price: '100' }
            ]
        });
        // We need to fetch the variants to get their IDs
        const variantResponse = await apiClient.getProductById(variantProduct.id);
        const variants = variantResponse.data.variants;
        const variantM = variants.find((v: any) => v.option_value === 'M');
        const variantL = variants.find((v: any) => v.option_value === 'L');

        console.log(`   Variant Product: ${variantProduct.id}`);
        console.log(`   - Variant M: ${variantM.id} (Stock: ${VARIANT_STOCK_M})`);
        console.log(`   - Variant L: ${variantL.id} (Stock: ${VARIANT_STOCK_L})`);


        // =================================================================
        // SCENARIO 1: Simple Product Oversell
        // =================================================================
        console.log('\n🔄 SCENARIO 1: Simple Product Oversell');

        console.log(`   Attempting to add ${SIMPLE_STOCK + 1} units (Available + 1)...`);
        try {
            await apiClient.addToCart(simpleProduct.id, SIMPLE_STOCK + 1);
            throw new Error('❌ Check Failed: Should have rejected oversell request');
        } catch (error: any) {
            // Expect 400 or similar
            if (error.response?.status === 400 || error.response?.data?.message?.includes('stock')) {
                console.log(`✅ Correctly rejected: ${error.response?.data?.message}`);
            } else {
                throw new Error(`❌ Unexpected error: ${error.message} (Status: ${error.response?.status})`);
            }
        }

        console.log(`   Adding max available (${SIMPLE_STOCK})...`);
        await apiClient.addToCart(simpleProduct.id, SIMPLE_STOCK);
        console.log('✅ Added max stock successfully');

        console.log(`   Attempting to add 1 more...`);
        try {
            await apiClient.addToCart(simpleProduct.id, 1);
            throw new Error('❌ Check Failed: Should have rejected additional unit');
        } catch (error: any) {
            console.log(`✅ Correctly rejected: ${error.response?.data?.message}`);
        }

        // =================================================================
        // SCENARIO 2: Variant Oversell
        // =================================================================
        console.log('\n🔄 SCENARIO 2: Variant Oversell');

        console.log(`   Attempting to add ${VARIANT_STOCK_M + 1} units of Variant M...`);
        try {
            await apiClient.addToCart(variantProduct.id, VARIANT_STOCK_M + 1, variantM.id);
            throw new Error('❌ Check Failed: Should have rejected oversell request');
        } catch (error: any) {
            console.log(`✅ Correctly rejected: ${error.response?.data?.message}`);
        }

        console.log(`   Adding max units of Variant M (${VARIANT_STOCK_M})...`);
        await apiClient.addToCart(variantProduct.id, VARIANT_STOCK_M, variantM.id);
        console.log('✅ Added max Variant M successfully');

        console.log(`   Attempting to add 1 more Variant M...`);
        try {
            await apiClient.addToCart(variantProduct.id, 1, variantM.id);
            throw new Error('❌ Check Failed: Should have rejected additional Variant M');
        } catch (error: any) {
            console.log(`✅ Correctly rejected: ${error.response?.data?.message}`);
        }

        // Verify Variant L is still purchasable
        console.log(`   Adding 1 unit of Variant L (Should succeed)...`);
        await apiClient.addToCart(variantProduct.id, 1, variantL.id);
        console.log('✅ Added Variant L successfully');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('\n🧹 Cleaning up...');
        try {
            if (customer) {
                await cleanupTestScenario({
                    userId: customer.id,
                    productIds: [simpleProduct?.id, variantProduct?.id].filter(Boolean)
                });
            }
            if (authUserId) {
                await supabase.auth.admin.deleteUser(authUserId);
            }
        } catch (err) {
            console.error('Cleanup failed:', err);
        }
    }
}

runTest();
