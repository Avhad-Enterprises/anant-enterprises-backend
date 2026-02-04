/**
 * TEST 004: Concurrent Operations (Race Conditions)
 * 
 * Tests REAL concurrent inventory operations with race conditions:
 * 1. Multiple simultaneous reservations
 * 2. Concurrent adjustments
 * 3. Race between reserve and adjust
 * 4. Concurrent releases
 * 5. High-volume concurrent orders
 * 
 * CRITICAL: Tests actual database race conditions that occur in production
 */

import { setupBasicTestScenario } from './helpers/test-data';
import { cleanupAllTestData } from './helpers/cleanup';
import {
    assertInventoryState,
    setInventoryState,
    getInventoryState,
} from './helpers/inventory';
import { reserveStockForOrder, releaseReservation } from '../../src/features/inventory/services/order-reservation.service';
import { adjustInventory } from '../../src/features/inventory/services/inventory.service';
import { orders } from '../../src/features/orders/shared/orders.schema';
import { orderItems } from '../../src/features/orders/shared/order-items.schema';
import { db } from '../../src/database';
import { eq } from 'drizzle-orm';
import { products } from '../../src/features/product/shared/products.schema';

/**
 * Helper: Create a real order with order items
 */
async function createRealOrder(
    userId: string,
    addressId: string,
    items: Array<{ product_id: string; quantity: number; price: number }>
): Promise<string> {
    const orderNumber = 'TEST-ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
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
    
    for (const item of items) {
        const [product] = await db.select({ 
            product_title: products.product_title,
            sku: products.sku 
        })
        .from(products)
        .where(eq(products.id, item.product_id));
        
        await db.insert(orderItems).values({
            order_id: order.id,
            product_id: item.product_id,
            product_name: product.product_title,
            sku: product.sku,
            cost_price: item.price.toString(),
            quantity: item.quantity,
            line_total: (item.price * item.quantity).toString(),
        });
    }
    
    return order.id;
}

async function testConcurrentOperations(): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 TEST 004: Concurrent Operations (Race Conditions)\n');
    console.log('========================================\n');

    try {
        // ============================================
        // SETUP
        // ============================================
        console.log('📦 STEP 1: Setting up test products...\n');

        const testData = await setupBasicTestScenario();
        const product1 = testData.products[0];
        const product2 = testData.products[1];
        const inv1 = testData.inventories[0];
        const inv2 = testData.inventories[1];

        if (!inv1 || !inv2) {
            throw new Error('Inventory not found');
        }

        // ============================================
        // TEST CASE 1: Multiple Simultaneous Reservations
        // ============================================
        console.log('📊 TEST CASE 1: Multiple Simultaneous Reservations (Race Condition)\n');

        await setInventoryState(product1.id, 100, 0);
        console.log('Initial: available=100, reserved=0\n');

        console.log('Creating 5 concurrent orders for same product...');

        // Create 5 orders simultaneously - REAL race condition
        const orderPromises = Array(5).fill(null).map(async (_, i) => {
            const orderId = await createRealOrder(
                testData.customer.id,
                testData.address.id,
                [{ product_id: product1.id, quantity: 10, price: 500 }]
            );
            
            // Reserve concurrently - this is where race condition happens!
            await reserveStockForOrder(
                [{ product_id: product1.id, quantity: 10 }],
                orderId,
                testData.customer.id
            );
            
            return orderId;
        });

        const orderIds = await Promise.all(orderPromises);
        console.log(`✅ Created ${orderIds.length} concurrent orders`);

        // All 5 orders × 10 units = 50 reserved
        await assertInventoryState(product1.id, {
            available: 100,  // Unchanged
            reserved: 50,    // 5 orders × 10 units
            total: 150,
        }, 'After concurrent reservations');

        console.log('✅ TEST CASE 1 PASSED: Concurrent reservations handled correctly\n');

        // ============================================
        // TEST CASE 2: Concurrent Adjustments
        // ============================================
        console.log('📊 TEST CASE 2: Concurrent Inventory Adjustments\n');

        await setInventoryState(product2.id, 100, 0);
        console.log('Initial: available=100, reserved=0\n');

        console.log('Making 10 concurrent adjustments (+5 each)...');

        // 10 concurrent adjustments - REAL race condition
        const adjustmentPromises = Array(10).fill(null).map(async () => {
            await adjustInventory(
                inv2.id,
                {
                    quantity_change: 5,
                    reason: 'Concurrent test adjustment',
                },
                testData.customer.id
            );
        });

        await Promise.all(adjustmentPromises);
        console.log('✅ Completed 10 concurrent adjustments');

        // Should be 100 + (10 × 5) = 150
        await assertInventoryState(product2.id, {
            available: 150,  // 100 + 50
            reserved: 0,
            total: 150,
        }, 'After concurrent adjustments');

        console.log('✅ TEST CASE 2 PASSED: Concurrent adjustments calculated correctly\n');

        // ============================================
        // TEST CASE 3: Race Between Reserve and Adjust
        // ============================================
        console.log('📊 TEST CASE 3: Race Between Reservation and Adjustment\n');

        await setInventoryState(product1.id, 50, 0);
        console.log('Initial: available=50, reserved=0\n');

        console.log('Executing concurrent reservation + adjustment...');

        // Create order and reserve + adjust simultaneously
        const [raceOrderId] = await Promise.all([
            (async () => {
                const orderId = await createRealOrder(
                    testData.customer.id,
                    testData.address.id,
                    [{ product_id: product1.id, quantity: 20, price: 500 }]
                );
                await reserveStockForOrder(
                    [{ product_id: product1.id, quantity: 20 }],
                    orderId,
                    testData.customer.id
                );
                return orderId;
            })(),
            adjustInventory(
                inv1.id,
                {
                    quantity_change: 30,
                    reason: 'Concurrent restock',
                },
                testData.customer.id
            ),
        ]);

        console.log('✅ Both operations completed');

        // Expected: 50 + 30 = 80 available, 20 reserved, total = 100
        await assertInventoryState(product1.id, {
            available: 80,   // 50 + 30 (adjustment)
            reserved: 20,    // From reservation
            total: 100,
        }, 'After concurrent ops');

        console.log('✅ TEST CASE 3 PASSED: Race condition handled correctly\n');

        // ============================================
        // TEST CASE 4: Concurrent Releases
        // ============================================
        console.log('📊 TEST CASE 4: Concurrent Order Cancellations (Releases)\n');

        await setInventoryState(product2.id, 100, 0);
        console.log('Initial: available=100, reserved=0\n');

        // Create multiple orders first
        console.log('Creating 5 orders to cancel...');
        const ordersToCancel = await Promise.all(
            Array(5).fill(null).map(async () => {
                const orderId = await createRealOrder(
                    testData.customer.id,
                    testData.address.id,
                    [{ product_id: product2.id, quantity: 10, price: 1000 }]
                );
                await reserveStockForOrder(
                    [{ product_id: product2.id, quantity: 10 }],
                    orderId,
                    testData.customer.id
                );
                return orderId;
            })
        );

        console.log(`✅ Created ${ordersToCancel.length} orders (50 units reserved)`);

        const beforeCancel = await getInventoryState(product2.id);
        console.log(`Before cancel: available=${beforeCancel.available}, reserved=${beforeCancel.reserved}`);

        // Cancel all orders simultaneously - REAL race condition
        console.log('Cancelling all 5 orders concurrently...');
        await Promise.all(
            ordersToCancel.map(orderId => 
                releaseReservation(orderId, testData.customer.id)
            )
        );

        console.log('✅ All orders cancelled concurrently');

        // All reservations should be released
        await assertInventoryState(product2.id, {
            available: 100,  // Back to original
            reserved: 0,     // All released
            total: 100,
        }, 'After concurrent cancellations');

        console.log('✅ TEST CASE 4 PASSED: Concurrent releases handled correctly\n');

        // ============================================
        // TEST CASE 5: High-Volume Concurrent Orders
        // ============================================
        console.log('📊 TEST CASE 5: High-Volume Concurrent Order Scenario\n');

        await setInventoryState(product1.id, 1000, 0);
        console.log('Initial: available=1000, reserved=0\n');

        console.log('Simulating 20 concurrent customer orders (5-15 units each)...');

        // 20 concurrent orders with random quantities
        const highVolumeOrders = await Promise.all(
            Array(20).fill(null).map(async () => {
                const quantity = Math.floor(Math.random() * 11) + 5; // 5-15 units
                const orderId = await createRealOrder(
                    testData.customer.id,
                    testData.address.id,
                    [{ product_id: product1.id, quantity, price: 500 }]
                );
                await reserveStockForOrder(
                    [{ product_id: product1.id, quantity }],
                    orderId,
                    testData.customer.id
                );
                return { orderId, quantity };
            })
        );

        const totalReserved = highVolumeOrders.reduce((sum, o) => sum + o.quantity, 0);
        console.log(`✅ Created 20 concurrent orders (${totalReserved} total units reserved)`);

        // Verify reservations accumulated correctly
        await assertInventoryState(product1.id, {
            available: 1000,              // Unchanged
            reserved: totalReserved,      // Sum of all orders
            total: 1000 + totalReserved,
        }, 'After high-volume concurrent orders');

        console.log('✅ TEST CASE 5 PASSED: High-volume concurrent orders handled correctly\n');

        // ============================================
        // SUCCESS
        // ============================================
        console.log('========================================');
        console.log('✅ ALL CONCURRENT OPERATIONS TESTS PASSED');
        console.log('========================================\n');
        console.log('Summary:');
        console.log('  ✅ Multiple simultaneous reservations');
        console.log('  ✅ Concurrent inventory adjustments');
        console.log('  ✅ Race between reservation and adjustment');
        console.log('  ✅ Concurrent order cancellations');
        console.log('  ✅ High-volume concurrent order scenario\n');
        console.log('Key Findings:');
        console.log('  🔑 Database transactions handle race conditions correctly');
        console.log('  🔑 Concurrent reservations accumulate without data loss');
        console.log('  🔑 Concurrent adjustments calculate correctly');
        console.log('  🔑 System handles high concurrent load properly\n');

        return { success: true };
    } catch (error: any) {
        console.error('\n========================================');
        console.error('❌ CONCURRENT OPERATIONS TEST FAILED');
        console.error('========================================\n');
        console.error('Error:', error.message);
        console.error('\n');
        return { success: false, error: error.message };
    } finally {
        console.log('🧹 Cleaning up test data...\n');
        await cleanupAllTestData();
        console.log('✅ Cleanup complete\n');
    }
}

// Run the test
testConcurrentOperations()
    .then(result => {
        console.log(`Test result: ${result.success ? '✅ PASS' : '❌ FAIL'}\n`);
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
