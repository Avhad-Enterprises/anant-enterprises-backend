/**
 * POST /api/cart/items
 * Add a product or bundle to the cart
 * - Authenticated users: cart linked to user_id
 * - Guest users: cart linked to session_id (from header)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter, decimalSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
// carts removed
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/product.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { reserveCartStock, releaseCartStock } from '../../inventory/services/inventory.service';
import { CART_RESERVATION_CONFIG } from '../../../config/cart-reservation.config';

// Validation schema
const addToCartSchema = z.object({
    product_id: z.string().uuid().optional(),
    bundle_id: z.string().uuid().optional(),
    quantity: z.number().int().min(1).max(100).default(1),
    customization_data: z.array(z.object({
        option_id: z.string(),
        option_name: z.string(),
        selected_value: z.string(),
        price_adjustment: decimalSchema.default('0.00'),
    })).optional().default([]),
}).refine(
    data => data.product_id || data.bundle_id,
    { message: 'Either product_id or bundle_id is required' }
);

import { cartService } from '../services';

const handler = async (req: Request, res: Response) => {
    const userReq = req as RequestWithUser;
    const userId = userReq.userId || undefined;
    const sessionId = req.headers['x-session-id'] as string || undefined;

    

    // Parse and validate request body
    const data = addToCartSchema.parse(req.body);

    // Get or create cart (validates cart is active)
    const cart = await cartService.getOrCreateCart(userId, sessionId);

    // Double-check cart is still active (race condition protection)
    await cartService.ensureActiveCart(cart.id);

    const cartId = cart.id;
    

    // Validate product exists and is active
    if (data.product_id) {
        const [product] = await db
            .select({
                id: products.id,
                product_title: products.product_title,
                primary_image_url: products.primary_image_url,
                sku: products.sku,
                selling_price: products.selling_price,
                compare_at_price: products.compare_at_price,
                status: products.status,
            })
            .from(products)
            .where(and(
                eq(products.id, data.product_id),
                eq(products.is_deleted, false)
            ))
            .limit(1);

        if (!product) {
            throw new HttpException(404, 'Product not found');
        }

        if (product.status !== 'active') {
            throw new HttpException(400, 'Product is not available for purchase');
        }

        // Check stock availability
        // TODO: Move this checking logic to InventoryService or CartService
        const [stockData] = await db
            .select({
                totalStock: sql<number>`SUM(${inventory.available_quantity} - ${inventory.reserved_quantity})`,
            })
            .from(inventory)
            .where(eq(inventory.product_id, data.product_id));

        const totalStock = Number(stockData?.totalStock) || 0;
        if (totalStock < data.quantity) {
            throw new HttpException(400, `Insufficient stock. Only ${totalStock} units available.`);
        }

        // Check if item already exists in cart
        const [existingItem] = await db
            .select({ id: cartItems.id, quantity: cartItems.quantity })
            .from(cartItems)
            .where(and(
                eq(cartItems.cart_id, cartId),
                eq(cartItems.product_id, data.product_id),
                eq(cartItems.is_deleted, false)
            ))
            .limit(1);

        const sellingPrice = Number(product.selling_price);
        const compareAtPrice = product.compare_at_price ? Number(product.compare_at_price) : sellingPrice;
        // Discount amount is per unit
        const discountAmount = Math.max(compareAtPrice - sellingPrice, 0);

        if (existingItem) {
            // Update quantity
            const newQuantity = existingItem.quantity + data.quantity;

            // Verify stock for new quantity
            if (totalStock < newQuantity) {
                throw new HttpException(400, `Cannot add more items. Only ${totalStock} units available.`);
            }

            const lineSubtotal = compareAtPrice * newQuantity;
            const lineTotal = sellingPrice * newQuantity;

            await db.update(cartItems)
                .set({
                    quantity: newQuantity,
                    line_subtotal: lineSubtotal.toFixed(2),
                    line_total: lineTotal.toFixed(2),
                    discount_amount: (discountAmount * newQuantity).toFixed(2), // Product discount
                    updated_at: new Date(),
                })
                .where(eq(cartItems.id, existingItem.id));

            // Phase 2: Re-reserve with new quantity
            if (CART_RESERVATION_CONFIG.ENABLED) {
                try {
                    // Release old reservation and create new one
                    await releaseCartStock(existingItem.id);
                    await reserveCartStock(
                        data.product_id,
                        newQuantity,
                        existingItem.id,
                        CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT
                    );
                } catch (error: any) {
                    // Continue - cart still works without reservation
                }
            }
        } else {
            // Create new cart item
            // cost_price = compareAt (List Price)
            // final_price = sellingPrice (Sale Price)
            const lineSubtotal = compareAtPrice * data.quantity;
            const lineTotal = sellingPrice * data.quantity;

            const [cartItem] = await db.insert(cartItems).values({
                cart_id: cartId,
                product_id: data.product_id,
                quantity: data.quantity,
                cost_price: compareAtPrice.toFixed(2),
                final_price: sellingPrice.toFixed(2),
                discount_amount: (discountAmount * data.quantity).toFixed(2),
                line_subtotal: lineSubtotal.toFixed(2),
                line_total: lineTotal.toFixed(2),
                product_name: product.product_title,
                product_image_url: product.primary_image_url,
                product_sku: product.sku,
                customization_data: data.customization_data,
            }).returning();

            // Phase 2: Reserve stock with 30-minute timeout
            if (CART_RESERVATION_CONFIG.ENABLED && cartItem) {
                try {
                    await reserveCartStock(
                        data.product_id,
                        data.quantity,
                        cartItem.id,
                        CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT
                    );
                } catch (error: any) {
                    // Continue - cart still works without reservation
                }
            }
        }
    }

    // Recalculate cart totals (handling discounts)
    await cartService.recalculate(cartId);

    // Fetch updated cart
    const updatedCart = await cartService.getCart(cartId);

    const cartItemsList = await db
        .select()
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cartId),
            eq(cartItems.is_deleted, false)
        ));

    return ResponseFormatter.success(res, {
        cart: updatedCart,
        items: cartItemsList,
        itemCount: cartItemsList.length,
    }, 'Item added to cart successfully', 201);
};

import { optionalAuth } from '../../../middlewares/auth.middleware';

const router = Router();
router.post('/items', optionalAuth, handler);

export default router;
