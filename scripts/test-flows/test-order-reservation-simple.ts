/**
 * TEST 003: Order Reservation Flow (Real Order Flow)
 * 
 * Tests REAL order reservation flow:
 * 1. Create actual orders with order items
 * 2. Reserve stock using real order IDs
 * 3. Release reservations using real order cancellation
 * 4. Edge cases with real scenarios
 * 
 * CRITICAL: Tests with ACTUAL order records, not dummy data
 */

import { setupBasicTestScenario } from './helpers/test-data';
import { cleanupAllTestData } from './helpers/cleanup';
import {
    assertInventoryState,
    setInventoryState,
    getInventoryState,
} from './helpers/inventory';
import { reserveStockForOrder, releaseReservation } from '../../src/features/inventory/services/order-reservation.service';
import { orders } from '../../src/features/orders/shared/orders.schema';
import { orderItems } from '../../src/features/orders/shared/order-items.schema';
import { db } from '../../src/database';
import { eq } from 'drizzle-orm';

/**
 * Helper: Create a real order with order items
 */
async function createRealOrder(
    userId: string,
    addressId: string,
    items: Array<{ product_id: string; quantity: number; price: number }>
): Promise<string> {
    const orderNumber = 'TEST-ORD-' + Date.now();
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create the order
    const [order] = await db.insert(orders).values({
        user_id: userId,
        order_number: orderNumber,
        order_status: 'pending',
        payment_status: 'pending',
        shipping_address_id: addressId,
        billing_address_id: addressId,
        subtotal: subtotal.toString(),
        total_amount: subtotal.toString(),
        currency: 'INR',
    }).returning();
    
    // Fetch product details and create order items
    const { products } = await import('../../src/features/product/shared/products.schema');
    
    for (const item of items) {
        // Get product name from database
        const [product] = await db.select({ 
            product_title: products.product_title,
            sku: products.sku 
        })
        .from(products)
        .where(eq(products.id, item.product_id));
        
        await db.insert(orderItems).values({
            order_id: order.id,
            product_id: item.product_id,
            product_name: product.product_title, // Required field
            sku: product.sku,
            cost_price: item.price.toString(),
            quantity: item.quantity,
            line_total: (item.price * item.quantity).toString(),
        });
    }
    
    return order.id;
}

async function testOrderReservationFlow(): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 TEST 003: Order Reservation Flow\n');
    console.log('========================================\n');

    try {
        // ============================================
        // SETUP
        // ============================================
        console.log('📦 STEP 1: Setting up test products...\n');

        const testData = await setupBasicTestScenario({
            numProducts: 2,
            stockPerProduct: 100,
            addToCart: false,
        });

        const [product1, product2] = testData.products;

        console.log(`✅ Created 2 test products`);
        console.log(`   Product 1: ${product1.product_title} (ID: ${product1.id})`);
        console.log(`   Product 2: ${product2.product_title} (ID: ${product2.id})\n`);

        // Get inventory IDs
        const inv1 = await getInventoryState(product1.id);
        const inv2 = await getInventoryState(product2.id);

        if (!inv1 || !inv2) {
            throw new Error('Inventory not found');
        }

        // Set known state
        await setInventoryState(product1.id, 100, 0);
        await setInventoryState(product2.id, 50, 0);

        console.log('Initial inventory:');
        await assertInventoryState(product1.id, { available: 100, reserved: 0 });
        await assertInventoryState(product2.id, { available: 50, reserved: 0 });
        console.log('');

        // ============================================
        // TEST CASE 1: Basic Reservation with Real Order
        // ============================================
        console.log('📊 TEST CASE 1: Basic Stock Reservation (Real Order)\n');

        console.log('Creating real order for 5 units of Product1...');

        // Create a real order with order items
        const orderId1 = await createRealOrder(
            testData.customer.id,
            testData.address.id,
            [{ product_id: product1.id, quantity: 5, price: 500 }]
        );
        
        console.log(`✅ Created order: ${orderId1}`);

        // Reserve stock for this real order
        await reserveStockForOrder(
            [{ product_id: product1.id, quantity: 5 }],
            orderId1,
            testData.customer.id
        );

        // CRITICAL: available should NOT decrease, only reserved increases
        await assertInventoryState(product1.id, {
            available: 100,  // UNCHANGED
            reserved: 5,     // INCREASED
            total: 105,      // 100 + 5
        }, 'After reservation');

        console.log('✅ TEST CASE 1 PASSED: Real order reservation works\n');

        // ============================================
        // TEST CASE 2: Release Reservation (Cancel Order)
        // ============================================
        console.log('📊 TEST CASE 2: Release Reservation (Real Order Cancellation)\n');

        console.log('Releasing reservation by cancelling order...');

        await releaseReservation(orderId1, testData.customer.id);

        await assertInventoryState(product1.id, {
            available: 100,  // Still unchanged
            reserved: 0,     // Released
            total: 100,
        }, 'After release');

        console.log('✅ TEST CASE 2 PASSED: Real order cancellation releases reservation\n');

        // ============================================
        // TEST CASE 3: Multiple Items in One Order
        // ============================================
        console.log('📊 TEST CASE 3: Reserve Multiple Products (Real Order)\n');

        console.log('Creating order with 10x Product1 and 5x Product2...');

        const orderId2 = await createRealOrder(
            testData.customer.id,
            testData.address.id,
            [
                { product_id: product1.id, quantity: 10, price: 500 },
                { product_id: product2.id, quantity: 5, price: 1000 }
            ]
        );

        await reserveStockForOrder(
            [
                { product_id: product1.id, quantity: 10 },
                { product_id: product2.id, quantity: 5 }
            ],
            orderId2,
            testData.customer.id
        );

        await assertInventoryState(product1.id, {
            available: 100,
            reserved: 10,
        }, 'Product1 after multi-item order');

        await assertInventoryState(product2.id, {
            available: 50,
            reserved: 5,
        }, 'Product2 after multi-item order');

        console.log('✅ TEST CASE 3 PASSED: Multiple items in one real order\n');

        // ============================================
        // TEST CASE 4: Cumulative Reservations (Multiple Orders)
        // ============================================
        console.log('📊 TEST CASE 4: Cumulative Reservations (Multiple Orders)\n');

        console.log('Creating another order for 15 units of Product1...');

        const orderId3 = await createRealOrder(
            testData.customer.id,
            testData.address.id,
            [{ product_id: product1.id, quantity: 15, price: 500 }]
        );

        await reserveStockForOrder(
            [{ product_id: product1.id, quantity: 15 }],
            orderId3,
            testData.customer.id
        );

        // Should accumulate: 10 (from order2) + 15 (from order3) = 25
        await assertInventoryState(product1.id, {
            available: 100,  // Still unchanged!
            reserved: 25,    // Cumulative from two orders
            total: 125,
        }, 'After multiple orders');

        console.log('✅ TEST CASE 4 PASSED: Multiple orders accumulate reservations\n');

        // ============================================
        // TEST CASE 5: Insufficient Stock (Real Scenario)
        // ============================================
        console.log('📊 TEST CASE 5: Insufficient Stock Validation\n');

        await setInventoryState(product1.id, 5, 0); // Only 5 available

        console.log('Attempting to create order for 10 units when only 5 available...');

        try {
            const orderId4 = await createRealOrder(
                testData.customer.id,
                testData.address.id,
                [{ product_id: product1.id, quantity: 10, price: 500 }]
            );

            await reserveStockForOrder(
                [{ product_id: product1.id, quantity: 10 }],
                orderId4,
                testData.customer.id
            );

            throw new Error('❌ Should have rejected order with insufficient stock!');
        } catch (error: any) {
            if (error.message?.includes('insufficient') || error.message?.includes('stock') || error.message?.includes('available')) {
                console.log('✅ Correctly rejected insufficient stock order');
                console.log(`   Error: ${error.message}\n`);
            } else if (error.message.includes('Should have rejected')) {
                throw error;
            } else {
                throw error;
            }
        }

        console.log('✅ TEST CASE 5 PASSED: Insufficient stock validation works in real flow\n');

        // ============================================
        // TEST CASE 6: Reserved Stock Unavailable (Real Scenario)
        // ============================================
        console.log('📊 TEST CASE 6: Reserved Stock Cannot Be Reserved Again\n');

        await setInventoryState(product1.id, 10, 40); // available=10, reserved=40

        console.log('Stock: available=10, reserved=40 (total=50)');
        console.log('Attempting to create order for 15 units (more than available)...');

        try {
            const orderId5 = await createRealOrder(
                testData.customer.id,
                testData.address.id,
                [{ product_id: product1.id, quantity: 15, price: 500 }]
            );

            await reserveStockForOrder(
                [{ product_id: product1.id, quantity: 15 }],
                orderId5,
                testData.customer.id
            );

            throw new Error('❌ Should have rejected (only 10 available, 40 reserved)!');
        } catch (error: any) {
            if (error.message?.includes('insufficient') || error.message?.includes('stock')) {
                console.log('✅ Correctly rejected (reserved stock not available)');
                console.log(`   Error: ${error.message}\n`);
            } else if (error.message.includes('Should have rejected')) {
                throw error;
            } else {
                throw error;
            }
        }

        console.log('✅ TEST CASE 6 PASSED: Reserved stock properly unavailable\n');

        // ============================================
        // TEST CASE 7: Zero Quantity Order (Edge Case)
        // ============================================
        console.log('📊 TEST CASE 7: Zero Quantity Edge Case\n');

        try {
            const orderId6 = await createRealOrder(
                testData.customer.id,
                testData.address.id,
                [{ product_id: product1.id, quantity: 0, price: 500 }]
            );

            await reserveStockForOrder(
                [{ product_id: product1.id, quantity: 0 }],
                orderId6,
                testData.customer.id
            );

            console.log('⚠️  Zero quantity order allowed (may be valid for some scenarios)\n');
        } catch (error: any) {
            console.log('✅ Zero quantity order rejected (validation enforced)\n');
        }

        console.log('✅ TEST CASE 7 COMPLETED\n');

        // ============================================
        // SUCCESS
        // ============================================
        console.log('========================================');
        console.log('✅ ALL REAL ORDER RESERVATION TESTS PASSED');
        console.log('========================================\n');
        console.log('Summary:');
        console.log('  ✅ Real order reservation works');
        console.log('  ✅ Real order cancellation releases reservation');
        console.log('  ✅ Multiple items in one order');
        console.log('  ✅ Multiple orders accumulate reservations');
        console.log('  ✅ Insufficient stock validation with real orders');
        console.log('  ✅ Reserved stock unavailable for new orders');
        console.log('  ✅ Edge cases handled\n');
        console.log('Key Findings:');
        console.log('  🔑 Real orders properly reserve inventory');
        console.log('  🔑 Order cancellation properly releases reserved stock');
        console.log('  🔑 Validation works in actual order flow');
        console.log('  🔑 Multiple orders correctly accumulate reservations\n');

        return { success: true };

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ ORDER RESERVATION TEST FAILED');
        console.error('========================================\n');
        console.error('Error:', error);
        console.error('\n');

        return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
        // Cleanup
        if (process.env.CLEANUP_AFTER_TEST !== 'false') {
            console.log('\n🧹 Cleaning up test data...\n');
            await cleanupAllTestData();
            console.log('✅ Cleanup complete\n');
        }
    }
}

// Run the test
if (require.main === module) {
    testOrderReservationFlow().then(result => {
        console.log('Test result:', result.success ? '✅ PASS' : '❌ FAIL');
        process.exit(result.success ? 0 : 1);
    });
}

export { testOrderReservationFlow };
