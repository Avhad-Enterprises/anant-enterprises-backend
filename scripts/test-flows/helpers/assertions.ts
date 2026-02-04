/**
 * Assertion Helpers for Tests
 * Common assertions for order flow, inventory, payments, etc.
 */

import {
    getOrderById,
    getOrderItems,
    getProductInventory,
    getCartItems,
    getActiveCart,
} from './database';

// ============================================
// ORDER ASSERTIONS
// ============================================

export async function assertOrderExists(orderId: string, message?: string) {
    const order = await getOrderById(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} does not exist`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
    return order;
}

export async function assertOrderStatus(
    orderId: string,
    expectedStatus: string,
    message?: string
) {
    const order = await getOrderById(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} does not exist`);
    }
    if (order.order_status !== expectedStatus) {
        throw new Error(`Order ${orderId} status is ${order.order_status}, expected ${expectedStatus}`);
    }
    if (message) {
        console.log(`✅ ${message}: order_status = ${expectedStatus}`);
    }
    return order;
}

export async function assertPaymentStatus(
    orderId: string,
    expectedStatus: string,
    message?: string
) {
    const order = await getOrderById(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} does not exist`);
    }
    if (order.payment_status !== expectedStatus) {
        throw new Error(`Order ${orderId} payment status is ${order.payment_status}, expected ${expectedStatus}`);
    }
    if (message) {
        console.log(`✅ ${message}: payment_status = ${expectedStatus}`);
    }
    return order;
}

export async function assertFulfillmentStatus(
    orderId: string,
    expectedStatus: string,
    message?: string
) {
    const order = await getOrderById(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} does not exist`);
    }
    if (order.fulfillment_status !== expectedStatus) {
        throw new Error(`Order ${orderId} fulfillment status is ${order.fulfillment_status}, expected ${expectedStatus}`);
    }
    if (message) {
        console.log(`✅ ${message}: fulfillment_status = ${expectedStatus}`);
    }
    return order;
}

export async function assertOrderTotal(
    orderId: string,
    expectedTotal: string,
    message?: string
) {
    const order = await getOrderById(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} does not exist`);
    }
    if (order.total_amount !== expectedTotal) {
        throw new Error(`Order ${orderId} total is ${order.total_amount}, expected ${expectedTotal}`);
    }
    if (message) {
        console.log(`✅ ${message}: total_amount = ₹${expectedTotal}`);
    }
    return order;
}

export async function assertOrderItemCount(
    orderId: string,
    expectedCount: number,
    message?: string
) {
    const items = await getOrderItems(orderId);
    if (items.length !== expectedCount) {
        throw new Error(`Order ${orderId} has ${items.length} items, expected ${expectedCount}`);
    }
    if (message) {
        console.log(`✅ ${message}: ${expectedCount} items`);
    }
    return items;
}

// ============================================
// INVENTORY ASSERTIONS
// ============================================

export async function assertInventoryQuantity(
    productId: string,
    expected: {
        available?: number;
        reserved?: number;
        total?: number;
    },
    message?: string
) {
    const inventory = await getProductInventory(productId);
    if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
    }

    if (expected.available !== undefined) {
        if (inventory.available_quantity !== expected.available) {
            throw new Error(`Product ${productId} available quantity is ${inventory.available_quantity}, expected ${expected.available}`);
        }
    }

    if (expected.reserved !== undefined) {
        if (inventory.reserved_quantity !== expected.reserved) {
            throw new Error(`Product ${productId} reserved quantity is ${inventory.reserved_quantity}, expected ${expected.reserved}`);
        }
    }

    if (expected.total !== undefined) {
        const actualTotal = inventory.available_quantity + inventory.reserved_quantity;
        if (actualTotal !== expected.total) {
            throw new Error(`Product ${productId} total quantity is ${actualTotal}, expected ${expected.total}`);
        }
    }

    if (message) {
        console.log(
            `✅ ${message}: available=${inventory.available_quantity}, reserved=${inventory.reserved_quantity}`
        );
    }

    return inventory;
}

export async function assertStockDeducted(
    productId: string,
    previousAvailable: number,
    deductionAmount: number,
    message?: string
) {
    const inventory = await getProductInventory(productId);
    if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
    }

    const expectedAvailable = previousAvailable - deductionAmount;
    if (inventory.available_quantity !== expectedAvailable) {
        throw new Error(`Product ${productId} available quantity is ${inventory.available_quantity}, expected ${expectedAvailable}`);
    }

    if (message) {
        console.log(
            `✅ ${message}: ${previousAvailable} - ${deductionAmount} = ${expectedAvailable}`
        );
    }

    return inventory;
}

export async function assertStockReserved(
    productId: string,
    previousReserved: number,
    reservationAmount: number,
    message?: string
) {
    const inventory = await getProductInventory(productId);
    if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
    }

    const expectedReserved = previousReserved + reservationAmount;
    if (inventory.reserved_quantity !== expectedReserved) {
        throw new Error(`Product ${productId} reserved quantity is ${inventory.reserved_quantity}, expected ${expectedReserved}`);
    }

    if (message) {
        console.log(
            `✅ ${message}: ${previousReserved} + ${reservationAmount} = ${expectedReserved}`
        );
    }

    return inventory;
}

export async function assertStockReleased(
    productId: string,
    previousReserved: number,
    releaseAmount: number,
    message?: string
) {
    const inventory = await getProductInventory(productId);
    if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
    }

    const expectedReserved = previousReserved - releaseAmount;
    if (inventory.reserved_quantity !== expectedReserved) {
        throw new Error(`Product ${productId} reserved quantity is ${inventory.reserved_quantity}, expected ${expectedReserved}`);
    }

    if (message) {
        console.log(
            `✅ ${message}: ${previousReserved} - ${releaseAmount} = ${expectedReserved}`
        );
    }

    return inventory;
}

// ============================================
// CART ASSERTIONS
// ============================================

export async function assertCartExists(userId: string, message?: string) {
    const cart = await getActiveCart(userId);
    if (!cart) {
        throw new Error(`Cart not found for user ${userId}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
    return cart;
}

export async function assertCartItemCount(
    cartId: string,
    expectedCount: number,
    message?: string
) {
    const items = await getCartItems(cartId);
    if (items.length !== expectedCount) {
        throw new Error(`Cart ${cartId} has ${items.length} items, expected ${expectedCount}`);
    }
    if (message) {
        console.log(`✅ ${message}: ${expectedCount} items`);
    }
    return items;
}

export async function assertCartStatus(
    cartId: string,
    expectedStatus: string,
    message?: string
) {
    const cart = await getActiveCart(cartId);
    if (!cart) {
        throw new Error(`Cart ${cartId} not found`);
    }
    if (cart.cart_status !== expectedStatus) {
        throw new Error(`Cart ${cartId} status is ${cart.cart_status}, expected ${expectedStatus}`);
    }
    if (message) {
        console.log(`✅ ${message}: status = ${expectedStatus}`);
    }
    return cart;
}

// ============================================
// API RESPONSE ASSERTIONS
// ============================================

export function assertApiSuccess(response: any, message?: string) {
    if (!response) {
        throw new Error('Response is undefined');
    }
    if (response.success !== true) {
        throw new Error(`API response success is ${response.success}, expected true`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

export function assertApiError(response: any, expectedStatus?: number, message?: string) {
    if (!response) {
        throw new Error('Response is undefined');
    }
    if (response.success !== false) {
        throw new Error(`API response success is ${response.success}, expected false`);
    }

    if (expectedStatus) {
        const status = response.statusCode || response.status;
        if (status !== expectedStatus) {
            throw new Error(`API response status is ${status}, expected ${expectedStatus}`);
        }
    }

    if (message) {
        console.log(`✅ ${message}`);
    }
}

export function assertHasProperty(obj: any, property: string, message?: string) {
    if (!obj || !obj.hasOwnProperty(property)) {
        throw new Error(`Object does not have property ${property}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

// ============================================
// GENERIC ASSERTIONS
// ============================================

export function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

export function assertNotEqual<T>(actual: T, notExpected: T, message?: string) {
    if (actual === notExpected) {
        throw new Error(`Expected not ${notExpected}, but got ${actual}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

export function assertGreaterThan(actual: number, threshold: number, message?: string) {
    if (actual <= threshold) {
        throw new Error(`Expected ${actual} to be greater than ${threshold}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

export function assertLessThan(actual: number, threshold: number, message?: string) {
    if (actual >= threshold) {
        throw new Error(`Expected ${actual} to be less than ${threshold}`);
    }
    if (message) {
        console.log(`✅ ${message}`);
    }
}

// ============================================
// LOGGING HELPERS
// ============================================

export function logTestStep(step: number, description: string) {
    console.log(`\n📍 Step ${step}: ${description}`);
}

export function logSuccess(message: string) {
    console.log(`✅ ${message}`);
}

export function logWarning(message: string) {
    console.warn(`⚠️  ${message}`);
}

export function logError(message: string) {
    console.error(`❌ ${message}`);
}

export function logInfo(message: string) {
    console.log(`ℹ️  ${message}`);
}
