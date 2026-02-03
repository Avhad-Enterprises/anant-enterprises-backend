/**
 * Database Helper Functions for Tests
 * Direct database access for setup, verification, and cleanup
 */

import { db } from '../../../src/database';
import { users } from '../../../src/features/user/shared/user.schema';
import { products } from '../../../src/features/product/shared/products.schema';
import { productVariants } from '../../../src/features/product/shared/product-variants.schema';
import { inventory } from '../../../src/features/inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../../../src/features/inventory/shared/inventory-adjustments.schema';
import { orders } from '../../../src/features/orders/shared/orders.schema';
import { orderItems } from '../../../src/features/orders/shared/order-items.schema';
import { carts } from '../../../src/features/cart/shared/carts.schema';
import { cartItems } from '../../../src/features/cart/shared/cart-items.schema';
import { userAddresses } from '../../../src/features/address/shared/addresses.schema';
import { inventoryLocations } from '../../../src/features/inventory/shared/inventory-locations.schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// ============================================
// USER QUERIES
// ============================================

export async function getUserById(userId: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    return user;
}

export async function getUserByEmail(email: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    return user;
}

// ============================================
// PRODUCT QUERIES
// ============================================

export async function getProductById(productId: string) {
    const [product] = await db
        .select()
        .from(products)
        .where(and(
            eq(products.id, productId),
            eq(products.is_deleted, false)
        ))
        .limit(1);
    return product;
}

export async function getProductInventory(productId: string) {
    const [inv] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, productId))
        .limit(1);
    return inv;
}

export async function getInventoryAdjustments(inventoryId: string) {
    return await db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.inventory_id, inventoryId));
}

// ============================================
// ORDER QUERIES
// ============================================

export async function getOrderById(orderId: string) {
    const [order] = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.id, orderId),
            eq(orders.is_deleted, false)
        ))
        .limit(1);
    return order;
}

export async function getOrderByNumber(orderNumber: string) {
    const [order] = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.order_number, orderNumber),
            eq(orders.is_deleted, false)
        ))
        .limit(1);
    return order;
}

export async function getOrderItems(orderId: string) {
    return await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));
}

export async function getUserOrders(userId: string) {
    return await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.user_id, userId),
            eq(orders.is_deleted, false)
        ))
        .orderBy(orders.created_at);
}

// ============================================
// CART QUERIES
// ============================================

export async function getActiveCart(userId: string) {
    const [cart] = await db
        .select()
        .from(carts)
        .where(and(
            eq(carts.user_id, userId),
            eq(carts.cart_status, 'active'),
            eq(carts.is_deleted, false)
        ))
        .limit(1);
    return cart;
}

export async function getCartItems(cartId: string) {
    return await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cart_id, cartId));
}

// ============================================
// ADDRESS QUERIES
// ============================================

export async function getUserAddresses(userId: string) {
    return await db
        .select()
        .from(userAddresses)
        .where(and(
            eq(userAddresses.user_id, userId),
            eq(userAddresses.is_deleted, false)
        ));
}

export async function getDefaultLocation() {
    const [location] = await db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.is_default, true))
        .limit(1);
    return location;
}

// ============================================
// RAW SQL QUERIES (for complex scenarios)
// ============================================

export async function executeRawQuery<T = any>(query: string): Promise<T[]> {
    const result = await db.execute(sql.raw(query));
    return result.rows as T[];
}

// ============================================
// TRANSACTION HELPER
// ============================================

export async function withTransaction<T>(
    callback: (tx: any) => Promise<T>
): Promise<T> {
    return await db.transaction(callback);
}
