
import * as testData from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';
import { cleanupTestScenario } from './helpers/cleanup';
import { db } from '../../src/database';
import { inventory } from '../../src/features/inventory/shared/inventory.schema';
import { users } from '../../src/features/user/shared/user.schema';
import { supabase } from '../../src/utils/supabase';
import { eq } from 'drizzle-orm';

async function runTest() {
    console.log('========================================');
    console.log('TEST: Order Cancellation & Restocking');
    console.log('========================================');

    let customer: any;
    let product: any;
    let address: any;
    let productId: string;
    let apiClient: TestApiClient;
    let authUserId: string | undefined;

    // Initial Stock
    const INITIAL_STOCK = 50;
    const ORDER_QTY = 5;

    try {
        // Instantiate Client
        apiClient = new TestApiClient();

        // 1. Setup
        console.log('\n📦 Setting up test data...');
        // Create DB customer
        customer = await testData.createTestCustomer();

        // Create Supabase Auth User
        console.log('🔐 Setting up Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: customer.email,
            password: 'Test@123',
            email_confirm: true,
            user_metadata: { first_name: 'Test', last_name: 'User' }
        });

        if (authError || !authData.user) {
            throw new Error(`Auth create failed: ${authError?.message}`);
        }
        authUserId = authData.user.id;

        // Link Auth User to DB User
        await db.update(users)
            .set({ auth_id: authUserId })
            .where(eq(users.id, customer.id));

        // Sign In to get Token
        const { data: signInData } = await supabase.auth.signInWithPassword({
            email: customer.email,
            password: 'Test@123',
        });

        if (!signInData.session?.access_token) throw new Error('Sign in failed - no token');
        apiClient.setToken(signInData.session.access_token);
        console.log('✅ Authenticated');

        // Create Product
        product = await testData.createTestProduct({
            product_title: 'Restock Test Product',
            stock: INITIAL_STOCK,
            selling_price: '100',
            has_variants: false,
            variants: []
        });

        productId = product.id;
        console.log(`   Product created: ${productId} (Stock: ${INITIAL_STOCK})`);

        // =================================================================
        // SCENARIO 1: Cancel Pending Order (Release Reservation)
        // =================================================================
        console.log('\n🔄 SCENARIO 1: Cancel Pending Order');

        // Create address
        console.log('   Creating address...');
        address = await testData.createTestAddress({ userId: customer.id });

        // 1. Add to Cart
        console.log(`   Adding ${ORDER_QTY} units to cart...`);
        await apiClient.addToCart(productId, ORDER_QTY);

        // 2. Create Order (Pending)
        console.log('   Creating order (COD)...');
        const orderData = await apiClient.createOrder({
            shipping_address_id: address.id,
            billing_address_id: address.id,
            payment_method: 'cod'
        });
        const orderId = orderData.data.order_id;
        console.log(`   Order Created: ${orderData.data.order_number}`);

        // 3. Verify Inventory (Should be Reserved)
        let inv = await getInventory(productId);
        console.log(`   Stock after Order: Available=${inv.available_quantity}, Reserved=${inv.reserved_quantity}`);

        if (inv.reserved_quantity !== ORDER_QTY) {
            throw new Error(`Expected Reserved=${ORDER_QTY}, got ${inv.reserved_quantity}`);
        }
        if (inv.available_quantity !== INITIAL_STOCK) {
            throw new Error(`Expected Available=${INITIAL_STOCK}, got ${inv.available_quantity} (Physical stock should not change on pending)`);
        }

        // 4. Cancel Order
        console.log('   Cancelling order...');
        await apiClient.cancelOrder(orderId, 'Changed mind');

        // 5. Verify Inventory (Should be Released)
        inv = await getInventory(productId);
        console.log(`   Stock after Cancel: Available=${inv.available_quantity}, Reserved=${inv.reserved_quantity}`);

        if (inv.reserved_quantity !== 0) {
            throw new Error(`Expected Reserved=0, got ${inv.reserved_quantity}`);
        }
        if (inv.available_quantity !== INITIAL_STOCK) {
            throw new Error(`Expected Available=${INITIAL_STOCK}, got ${inv.available_quantity}`);
        }
        console.log('✅ Scenario 1 Passed');

        // =================================================================
        // SCENARIO 2: Return Shipped Order (Restock)
        // =================================================================
        console.log('\n🔄 SCENARIO 2: Return Shipped Order (Admin Simulation)');

        // 1. Create New Order
        console.log(`   Adding ${ORDER_QTY} units to cart...`);
        await apiClient.addToCart(productId, ORDER_QTY);

        const orderData2 = await apiClient.createOrder({
            shipping_address_id: address.id,
            billing_address_id: address.id,
            payment_method: 'cod'
        });
        const orderId2 = orderData2.data.order_id;
        console.log(`   Order 2 Created: ${orderData2.data.order_number}`);

        // 2. Simulate Shipping (Fulfill Inventory)
        console.log('   Simulating Shipping (Fulfill Inventory)...');
        const { fulfillOrderInventory, processOrderReturn } = await import('../../src/features/inventory/services/inventory.service');

        await fulfillOrderInventory(orderId2, customer.id);

        inv = await getInventory(productId);
        console.log(`   Stock after Shipping: Available=${inv.available_quantity}, Reserved=${inv.reserved_quantity}`);

        // Expect: Available = 50 - 5 = 45. Reserved = 0
        if (inv.available_quantity !== (INITIAL_STOCK - ORDER_QTY)) {
            throw new Error(`Expected Available=${INITIAL_STOCK - ORDER_QTY}, got ${inv.available_quantity}`);
        }
        if (inv.reserved_quantity !== 0) {
            throw new Error(`Expected Reserved=0, got ${inv.reserved_quantity}`);
        }

        // 3. Simulate Return (Restock)
        console.log('   Simulating Return (Restock)...');
        await processOrderReturn(orderId2, customer.id);

        inv = await getInventory(productId);
        console.log(`   Stock after Return: Available=${inv.available_quantity}, Reserved=${inv.reserved_quantity}`);

        // Expect: Available = 45 + 5 = 50. Reserved = 0.
        if (inv.available_quantity !== INITIAL_STOCK) {
            throw new Error(`Expected Available=${INITIAL_STOCK}, got ${inv.available_quantity}`);
        }
        console.log('✅ Scenario 2 Passed');

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('\n🧹 Cleaning up...');
        try {
            if (customer && product) {
                await cleanupTestScenario({
                    userId: customer.id,
                    productIds: [product.id]
                });
            }
            if (authUserId) {
                await supabase.auth.admin.deleteUser(authUserId);
                console.log(`   Deleted Supabase Auth User: ${authUserId}`);
            }
        } catch (err) {
            console.error('Cleanup failed:', err);
        }
    }
}

async function getInventory(productId: string) {
    const [inv] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId));
    return inv;
}

runTest();
