/**
 * Cleanup Helper Functions
 * Remove test data after tests complete
 */

import { db } from '../../../src/database';
import { users } from '../../../src/features/user/shared/user.schema';
import { products } from '../../../src/features/product/shared/products.schema';
import { inventory } from '../../../src/features/inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../../../src/features/inventory/shared/inventory-adjustments.schema';
import { orders } from '../../../src/features/orders/shared/orders.schema';
import { orderItems } from '../../../src/features/orders/shared/order-items.schema';
import { carts } from '../../../src/features/cart/shared/carts.schema';
import { cartItems } from '../../../src/features/cart/shared/cart-items.schema';
import { userAddresses } from '../../../src/features/address/shared/addresses.schema';
import { eq, like, inArray } from 'drizzle-orm';

// ============================================
// DELETE BY ID
// ============================================

export async function deleteTestUser(userId: string) {
    // Delete related data first (cascading)
    await db.delete(userAddresses).where(eq(userAddresses.user_id, userId));
    await db.delete(carts).where(eq(carts.user_id, userId));
    await db.delete(orders).where(eq(orders.user_id, userId));
    
    // Delete user
    await db.delete(users).where(eq(users.id, userId));
    console.log(`🗑️  Deleted test user: ${userId}`);
}

export async function deleteTestProduct(productId: string) {
    // Delete inventory first
    await db.delete(inventory).where(eq(inventory.product_id, productId));
    
    // Delete product
    await db.delete(products).where(eq(products.id, productId));
    console.log(`🗑️  Deleted test product: ${productId}`);
}

export async function deleteTestOrder(orderId: string) {
    // Delete order items first
    await db.delete(orderItems).where(eq(orderItems.order_id, orderId));
    
    // Delete order
    await db.delete(orders).where(eq(orders.id, orderId));
    console.log(`🗑️  Deleted test order: ${orderId}`);
}

export async function deleteTestCart(cartId: string) {
    // Delete cart items first
    await db.delete(cartItems).where(eq(cartItems.cart_id, cartId));
    
    // Delete cart
    await db.delete(carts).where(eq(carts.id, cartId));
    console.log(`🗑️  Deleted test cart: ${cartId}`);
}

// ============================================
// BULK CLEANUP
// ============================================

export async function cleanupAllTestUsers() {
    // Find all test users (email contains 'test-customer')
    const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, '%test-customer%'));

    console.log(`\n🗑️  Cleaning up ${testUsers.length} test users...`);

    for (const user of testUsers) {
        await deleteTestUser(user.id);
    }

    console.log(`✅ Cleaned up all test users\n`);
}

export async function cleanupAllTestProducts() {
    // Find all test products (SKU starts with 'TEST-')
    const testProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(like(products.sku, 'TEST-%'));

    console.log(`\n🗑️  Cleaning up ${testProducts.length} test products...`);

    for (const product of testProducts) {
        await deleteTestProduct(product.id);
    }

    console.log(`✅ Cleaned up all test products\n`);
}

export async function cleanupAllTestOrders() {
    // Find all orders from test users
    const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, '%test-customer%'));

    const userIds = testUsers.map(u => u.id);

    if (userIds.length === 0) {
        console.log('No test orders to clean up');
        return;
    }

    const testOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(inArray(orders.user_id, userIds));

    console.log(`\n🗑️  Cleaning up ${testOrders.length} test orders...`);

    for (const order of testOrders) {
        await deleteTestOrder(order.id);
    }

    console.log(`✅ Cleaned up all test orders\n`);
}

// ============================================
// COMPLETE CLEANUP
// ============================================

export async function cleanupAllTestData() {
    console.log('\n🧹 Starting complete test data cleanup...\n');

    try {
        await cleanupAllTestOrders();
        await cleanupAllTestProducts();
        await cleanupAllTestUsers();

        console.log('✅ Complete cleanup finished!\n');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// ============================================
// TARGETED CLEANUP
// ============================================

export async function cleanupTestScenario(data: {
    userId?: string;
    productIds?: string[];
    orderIds?: string[];
    cartId?: string;
}) {
    console.log('\n🧹 Cleaning up test scenario...\n');

    if (data.cartId) {
        await deleteTestCart(data.cartId);
    }

    if (data.orderIds && data.orderIds.length > 0) {
        for (const orderId of data.orderIds) {
            await deleteTestOrder(orderId);
        }
    }

    if (data.productIds && data.productIds.length > 0) {
        for (const productId of data.productIds) {
            await deleteTestProduct(productId);
        }
    }

    if (data.userId) {
        await deleteTestUser(data.userId);
    }

    console.log('✅ Scenario cleanup complete!\n');
}

// ============================================
// SAFETY CHECK
// ============================================

export async function confirmCleanup(): Promise<boolean> {
    const testUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, '%test-customer%'));

    const testProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(like(products.sku, 'TEST-%'));

    if (testUsers.length === 0 && testProducts.length === 0) {
        console.log('✅ No test data found');
        return true;
    }

    console.warn(`\n⚠️  WARNING: Found test data to clean:`);
    console.warn(`   - ${testUsers.length} test users`);
    console.warn(`   - ${testProducts.length} test products`);
    console.warn(`\n   Run cleanupAllTestData() to remove them.\n`);

    return false;
}
