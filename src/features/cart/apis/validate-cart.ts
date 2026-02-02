/**
 * POST /api/cart/validate
 * Validate cart before checkout
 * - Check stock availability for all items
 * - Detect price changes
 * - Verify product availability (active status)
 */

import { Router, Response, Request } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../shared/carts.schema';
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/products.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';

interface ValidationIssue {
    itemId: string;
    productId: string | null;
    productName: string | null;
    type: 'out_of_stock' | 'insufficient_stock' | 'price_changed' | 'product_unavailable';
    message: string;
    details: {
        requestedQuantity?: number;
        availableQuantity?: number;
        oldPrice?: string;
        newPrice?: string;
    };
}

interface ValidationResult {
    valid: boolean;
    cartId: string;
    issues: ValidationIssue[];
    updatedTotals: {
        subtotal: string;
        discount_total: string;
        grand_total: string;
    } | null;
}

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;

    if (!userId && !sessionId) {
        throw new HttpException(401, 'Authentication or session ID required');
    }

    // Find active cart
    let cart;
    if (userId) {
        [cart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.user_id, userId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    } else if (sessionId) {
        [cart] = await db
            .select()
            .from(carts)
            .where(and(
                eq(carts.session_id, sessionId),
                eq(carts.cart_status, 'active'),
                eq(carts.is_deleted, false)
            ))
            .limit(1);
    }

    if (!cart) {
        throw new HttpException(404, 'No active cart found');
    }

    // Get all cart items
    const items = await db
        .select()
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cart.id),
            eq(cartItems.is_deleted, false)
        ));

    if (items.length === 0) {
        throw new HttpException(400, 'Cart is empty');
    }

    const issues: ValidationIssue[] = [];
    let needsRecalculation = false;

    // Validate each item
    for (const item of items) {
        if (!item.product_id) continue;

        // Get current product data
        const [product] = await db
            .select({
                id: products.id,
                status: products.status,
                selling_price: products.selling_price,
                compare_at_price: products.compare_at_price,
                product_title: products.product_title,
            })
            .from(products)
            .where(and(
                eq(products.id, item.product_id),
                eq(products.is_deleted, false)
            ))
            .limit(1);

        // Check if product exists and is active
        if (!product) {
            issues.push({
                itemId: item.id,
                productId: item.product_id,
                productName: item.product_name,
                type: 'product_unavailable',
                message: `${item.product_name || 'Product'} is no longer available`,
                details: {},
            });
            continue;
        }

        if (product.status !== 'active') {
            issues.push({
                itemId: item.id,
                productId: item.product_id,
                productName: product.product_title,
                type: 'product_unavailable',
                message: `${product.product_title} is currently not available for purchase`,
                details: {},
            });
            continue;
        }

        // Check stock availability
        const [stockData] = await db
            .select({
                totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
            })
            .from(inventory)
            .where(eq(inventory.product_id, item.product_id));

        const availableStock = Number(stockData?.totalStock) || 0;

        if (availableStock === 0) {
            issues.push({
                itemId: item.id,
                productId: item.product_id,
                productName: product.product_title,
                type: 'out_of_stock',
                message: `${product.product_title} is out of stock`,
                details: {
                    requestedQuantity: item.quantity,
                    availableQuantity: 0,
                },
            });
        } else if (availableStock < item.quantity) {
            issues.push({
                itemId: item.id,
                productId: item.product_id,
                productName: product.product_title,
                type: 'insufficient_stock',
                message: `Only ${availableStock} units of ${product.product_title} available`,
                details: {
                    requestedQuantity: item.quantity,
                    availableQuantity: availableStock,
                },
            });
        }

        // Check for price changes
        if (item.final_price !== product.selling_price) {
            issues.push({
                itemId: item.id,
                productId: item.product_id,
                productName: product.product_title,
                type: 'price_changed',
                message: `Price of ${product.product_title} has changed`,
                details: {
                    oldPrice: item.final_price,
                    newPrice: product.selling_price,
                },
            });
            needsRecalculation = true;

            // Update item with new price
            const currentPrice = Number(product.selling_price);
            const comparePrice = product.compare_at_price ? Number(product.compare_at_price) : currentPrice;
            const discountAmount = Math.max(comparePrice - currentPrice, 0);

            await db.update(cartItems)
                .set({
                    final_price: product.selling_price,
                    cost_price: comparePrice.toFixed(2),
                    discount_amount: (discountAmount * item.quantity).toFixed(2),
                    line_subtotal: (comparePrice * item.quantity).toFixed(2),
                    line_total: (currentPrice * item.quantity).toFixed(2),
                    updated_at: new Date(),
                })
                .where(eq(cartItems.id, item.id));
        }
    }

    // Recalculate totals if needed
    let updatedTotals = null;
    if (needsRecalculation) {
        const updatedItems = await db
            .select({
                line_total: cartItems.line_total,
                line_subtotal: cartItems.line_subtotal,
                discount_amount: cartItems.discount_amount,
            })
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, cart.id),
                eq(cartItems.is_deleted, false)
            ));

        const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.line_subtotal), 0);
        const discountTotal = updatedItems.reduce((sum, item) => sum + Number(item.discount_amount), 0);
        const grandTotal = updatedItems.reduce((sum, item) => sum + Number(item.line_total), 0);

        await db.update(carts)
            .set({
                subtotal: subtotal.toFixed(2),
                discount_total: discountTotal.toFixed(2),
                grand_total: grandTotal.toFixed(2),
                last_activity_at: new Date(),
                updated_at: new Date(),
            })
            .where(eq(carts.id, cart.id));

        updatedTotals = {
            subtotal: subtotal.toFixed(2),
            discount_total: discountTotal.toFixed(2),
            grand_total: grandTotal.toFixed(2),
        };
    }

    const result: ValidationResult = {
        valid: issues.filter(i => i.type !== 'price_changed').length === 0,
        cartId: cart.id,
        issues,
        updatedTotals,
    };

    const statusCode = result.valid ? 200 : 200; // Still 200 for validation results
    const message = result.valid
        ? 'Cart is valid and ready for checkout'
        : `Found ${issues.length} issue(s) with your cart`;

    return ResponseFormatter.success(res, result, message, statusCode);
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.post('/validate', optionalAuth, handler);

export default router;
