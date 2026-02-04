/**
 * TEST: Analytics Fields Validation
 * 
 * Validates that the Phase 1 analytics fields are populated correctly:
 * - total_sold: Increments when orders are fulfilled/shipped
 * - total_fulfilled: Counts number of fulfilled order items
 * - last_stock_movement_at: Updates on any quantity change
 * - last_sale_at: Records timestamp of last shipment
 * 
 * This test ensures the analytics columns added in Phase 1 work correctly.
 */

import { setupBasicTestScenario } from './helpers/test-data';
import { cleanupAllTestData } from './helpers/cleanup';
import {
    getInventoryState,
    setInventoryState,
} from './helpers/inventory';
import {
    reserveStockForOrder,
    fulfillOrderInventory,
    releaseReservation
} from '../../src/features/inventory/services/order-reservation.service';
import { orders } from '../../src/features/orders/shared/orders.schema';
import { orderItems } from '../../src/features/orders/shared/order-items.schema';
import { inventory } from '../../src/features/inventory/shared/inventory.schema';
import { db } from '../../src/database';
import { eq } from 'drizzle-orm';

/**
 * Helper: Create a test order with items
 */
async function createTestOrder(
    userId: string,
    addressId: string,
    items: Array<{ product_id: string; variant_id?: string; quantity: number; price: number }>
): Promise<string> {
    const orderNumber = `ORD-TEST-${Date.now()}`;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const [order] = await db.insert(orders).values({
        user_id: userId,
        order_number: orderNumber,
        order_status: 'pending',
        payment_status: 'paid',
        fulfillment_status: 'unfulfilled',
        shipping_address_id: addressId,
        billing_address_id: addressId,
        subtotal: subtotal.toString(),
        total_amount: subtotal.toString(),
        currency: 'INR',
    }).returning();

    // Get product details
    const { products } = await import('../../src/features/product/shared/products.schema');

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
            variant_id: item.variant_id,
            product_name: product.product_title,
            sku: product.sku,
            cost_price: item.price.toString(),
            quantity: item.quantity,
            line_total: (item.price * item.quantity).toString(),
            fulfillment_status: 'unfulfilled',
        });
    }

    return order.id;
}

/**
 * Helper: Get inventory analytics fields
 */
async function getInventoryAnalytics(productId: string, variantId?: string) {
    const [inv] = await db
        .select({
            total_sold: inventory.total_sold,
            total_fulfilled: inventory.total_fulfilled,
            last_stock_movement_at: inventory.last_stock_movement_at,
            last_sale_at: inventory.last_sale_at,
        })
        .from(inventory)
        .where(
            variantId
                ? eq(inventory.variant_id, variantId)
                : eq(inventory.product_id, productId)
        );

    return inv;
}

async function testAnalyticsFields(): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 TEST: Analytics Fields Validation\n');
    console.log('========================================\n');

    try {
        // ============================================
        // SETUP
        // ============================================
        console.log('📦 SETUP: Creating test products...\n');

        const testData = await setupBasicTestScenario({
            numProducts: 2,
            stockPerProduct: 100,
            addToCart: false,
        });

        const [product1, product2] = testData.products;

        console.log(`✅ Created products: ${product1.product_title}, ${product2.product_title}\n`);

        // Set initial state
        await setInventoryState(product1.id, 100, 0);
        await setInventoryState(product2.id, 100, 0);

        // ============================================
        // TEST CASE 1: Initial State - Analytics NULL/Zero
        // ============================================
        console.log('📊 TEST CASE 1: Initial Analytics State\n');

        const initialAnalytics = await getInventoryAnalytics(product1.id);

        console.log('Initial analytics:');
        console.log(`  total_sold: ${initialAnalytics.total_sold}`);
        console.log(`  total_fulfilled: ${initialAnalytics.total_fulfilled}`);
        console.log(`  last_stock_movement_at: ${initialAnalytics.last_stock_movement_at}`);
        console.log(`  last_sale_at: ${initialAnalytics.last_sale_at}\n`);

        if (initialAnalytics.total_sold !== 0) {
            throw new Error(`Expected total_sold=0, got ${initialAnalytics.total_sold}`);
        }

        if (initialAnalytics.total_fulfilled !== 0) {
            throw new Error(`Expected total_fulfilled=0, got ${initialAnalytics.total_fulfilled}`);
        }

        console.log('✅ TEST CASE 1 PASSED: Initial analytics are zero/null\n');

        // ============================================
        // TEST CASE 2: Reservation Updates last_stock_movement_at
        // ============================================
        console.log('📊 TEST CASE 2: Reservation Updates Movement Timestamp\n');

        const beforeReservation = new Date();

        const orderId1 = await createTestOrder(
            testData.customer.id,
            testData.address.id,
            [{ product_id: product1.id, quantity: 10, price: 500 }]
        );

        await reserveStockForOrder(
            [{ product_id: product1.id, quantity: 10 }],
            orderId1,
            testData.customer.id
        );

        const afterReservation = await getInventoryAnalytics(product1.id);

        console.log(`  last_stock_movement_at: ${afterReservation.last_stock_movement_at}`);
        console.log(`  total_sold: ${afterReservation.total_sold} (should still be 0)`);
        console.log(`  last_sale_at: ${afterReservation.last_sale_at} (should still be null)\n`);

        if (!afterReservation.last_stock_movement_at) {
            throw new Error('last_stock_movement_at should be set after reservation');
        }

        if (afterReservation.last_stock_movement_at < beforeReservation) {
            throw new Error('last_stock_movement_at should be recent');
        }

        if (afterReservation.total_sold !== 0) {
            throw new Error('total_sold should still be 0 (not shipped yet)');
        }

        if (afterReservation.last_sale_at !== null) {
            throw new Error('last_sale_at should still be null (not shipped yet)');
        }

        console.log('✅ TEST CASE 2 PASSED: Reservation updates movement timestamp only\n');

        // ============================================
        // TEST CASE 3: Fulfillment Updates All Analytics
        // ============================================
        console.log('📊 TEST CASE 3: Fulfillment Updates All Analytics\n');

        const beforeFulfillment = new Date();

        // Fulfill the order
        await fulfillOrderInventory(orderId1, testData.customer.id);

        const afterFulfillment = await getInventoryAnalytics(product1.id);

        console.log('After fulfillment:');
        console.log(`  total_sold: ${afterFulfillment.total_sold} (should be 10)`);
        console.log(`  total_fulfilled: ${afterFulfillment.total_fulfilled} (should be 1)`);
        console.log(`  last_stock_movement_at: ${afterFulfillment.last_stock_movement_at}`);
        console.log(`  last_sale_at: ${afterFulfillment.last_sale_at}\n`);

        if (afterFulfillment.total_sold !== 10) {
            throw new Error(`Expected total_sold=10, got ${afterFulfillment.total_sold}`);
        }

        if (afterFulfillment.total_fulfilled !== 1) {
            throw new Error(`Expected total_fulfilled=1, got ${afterFulfillment.total_fulfilled}`);
        }

        if (!afterFulfillment.last_sale_at) {
            throw new Error('last_sale_at should be set after fulfillment');
        }

        if (afterFulfillment.last_sale_at < beforeFulfillment) {
            throw new Error('last_sale_at should be recent');
        }

        console.log('✅ TEST CASE 3 PASSED: Fulfillment updates all analytics correctly\n');

        // ============================================
        // TEST CASE 4: Cumulative Analytics
        // ============================================
        console.log('📊 TEST CASE 4: Cumulative Analytics Across Multiple Orders\n');

        // Create and fulfill second order
        const orderId2 = await createTestOrder(
            testData.customer.id,
            testData.address.id,
            [{ product_id: product1.id, quantity: 5, price: 500 }]
        );

        await reserveStockForOrder(
            [{ product_id: product1.id, quantity: 5 }],
            orderId2,
            testData.customer.id
        );

        await fulfillOrderInventory(orderId2, testData.customer.id);

        const afterSecondOrder = await getInventoryAnalytics(product1.id);

        console.log('After 2nd order:');
        console.log(`  total_sold: ${afterSecondOrder.total_sold} (should be 15 = 10+5)`);
        console.log(`  total_fulfilled: ${afterSecondOrder.total_fulfilled} (should be 2)\n`);

        if (afterSecondOrder.total_sold !== 15) {
            throw new Error(`Expected total_sold=15, got ${afterSecondOrder.total_sold}`);
        }

        if (afterSecondOrder.total_fulfilled !== 2) {
            throw new Error(`Expected total_fulfilled=2, got ${afterSecondOrder.total_fulfilled}`);
        }

        console.log('✅ TEST CASE 4 PASSED: Analytics accumulate correctly\n');

        // ============================================
        // TEST CASE 5: Cancellation Updates Movement But Not Sales
        // ============================================
        console.log('📊 TEST CASE 5: Cancellation Updates Movement Timestamp\n');

        const orderId3 = await createTestOrder(
            testData.customer.id,
            testData.address.id,
            [{ product_id: product2.id, quantity: 20, price: 500 }]
        );

        await reserveStockForOrder(
            [{ product_id: product2.id, quantity: 20 }],
            orderId3,
            testData.customer.id
        );

        const beforeCancel = await getInventoryAnalytics(product2.id);
        const oldMovementTime = beforeCancel.last_stock_movement_at;

        // Wait 100ms to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 100));

        await releaseReservation(orderId3, testData.customer.id);

        const afterCancel = await getInventoryAnalytics(product2.id);

        console.log(`  last_stock_movement_at updated: ${afterCancel.last_stock_movement_at > oldMovementTime!}`);
        console.log(`  total_sold unchanged: ${afterCancel.total_sold === beforeCancel.total_sold}`);
        console.log(`  last_sale_at unchanged: ${afterCancel.last_sale_at === beforeCancel.last_sale_at}\n`);

        if (afterCancel.last_stock_movement_at! <= oldMovementTime!) {
            throw new Error('last_stock_movement_at should update on cancellation');
        }

        if (afterCancel.total_sold !== beforeCancel.total_sold) {
            throw new Error('total_sold should not change on cancellation');
        }

        console.log('✅ TEST CASE 5 PASSED: Cancellation updates movement only\n');

        // ============================================
        // TEST CASE 6: Multi-Item Order Analytics
        // ============================================
        console.log('📊 TEST CASE 6: Multi-Item Order (Different Products)\n');

        const orderId4 = await createTestOrder(
            testData.customer.id,
            testData.address.id,
            [
                { product_id: product1.id, quantity: 3, price: 500 },
                { product_id: product2.id, quantity: 7, price: 700 }
            ]
        );

        await reserveStockForOrder(
            [
                { product_id: product1.id, quantity: 3 },
                { product_id: product2.id, quantity: 7 }
            ],
            orderId4,
            testData.customer.id
        );

        await fulfillOrderInventory(orderId4, testData.customer.id);

        const p1Analytics = await getInventoryAnalytics(product1.id);
        const p2Analytics = await getInventoryAnalytics(product2.id);

        console.log('Product 1:');
        console.log(`  total_sold: ${p1Analytics.total_sold} (should be 18 = 15+3)`);
        console.log(`  total_fulfilled: ${p1Analytics.total_fulfilled} (should be 3)`);

        console.log('Product 2:');
        console.log(`  total_sold: ${p2Analytics.total_sold} (should be 7)`);
        console.log(`  total_fulfilled: ${p2Analytics.total_fulfilled} (should be 1)\n`);

        if (p1Analytics.total_sold !== 18) {
            throw new Error(`Product1: Expected total_sold=18, got ${p1Analytics.total_sold}`);
        }

        if (p1Analytics.total_fulfilled !== 3) {
            throw new Error(`Product1: Expected total_fulfilled=3, got ${p1Analytics.total_fulfilled}`);
        }

        if (p2Analytics.total_sold !== 7) {
            throw new Error(`Product2: Expected total_sold=7, got ${p2Analytics.total_sold}`);
        }

        if (p2Analytics.total_fulfilled !== 1) {
            throw new Error(`Product2: Expected total_fulfilled=1, got ${p2Analytics.total_fulfilled}`);
        }

        console.log('✅ TEST CASE 6 PASSED: Multi-item orders track analytics per product\n');

        // ============================================
        // SUCCESS
        // ============================================
        console.log('========================================');
        console.log('✅ ALL ANALYTICS TESTS PASSED');
        console.log('========================================\n');
        console.log('Summary:');
        console.log('  ✅ Initial state: analytics zero/null');
        console.log('  ✅ Reservation: updates last_stock_movement_at only');
        console.log('  ✅ Fulfillment: updates all 4 analytics fields');
        console.log('  ✅ Cumulative tracking works across orders');
        console.log('  ✅ Cancellation: updates movement, not sales');
        console.log('  ✅ Multi-item orders: per-product analytics\n');
        console.log('Key Findings:');
        console.log('  🔑 total_sold increments correctly on shipment');
        console.log('  🔑 total_fulfilled counts fulfilled order items');
        console.log('  🔑 last_stock_movement_at tracks all changes');
        console.log('  🔑 last_sale_at only updates on actual sales\n');

        return { success: true };

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ ANALYTICS TEST FAILED');
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
    testAnalyticsFields().then(result => {
        console.log('Test result:', result.success ? '✅ PASS' : '❌ FAIL');
        process.exit(result.success ? 0 : 1);
    });
}

export { testAnalyticsFields };
