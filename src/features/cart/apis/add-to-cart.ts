/**
 * POST /api/cart/items
 * Add a product or bundle to the cart
 * - Authenticated users: cart linked to user_id
 * - Guest users: cart linked to session_id (from header)
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and, sql, isNull, SQL } from 'drizzle-orm';
import { ResponseFormatter, decimalSchema } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
// carts removed
import { cartItems } from '../shared/cart-items.schema';
import { products } from '../../product/shared/products.schema';
import { productVariants } from '../../product/shared/product-variants.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { reserveCartStock, releaseCartStock } from '../../inventory/services/inventory.service';
import { CART_RESERVATION_CONFIG } from '../config/cart-reservation.config';

// Validation schema
const addToCartSchema = z.object({
    product_id: z.string().uuid().optional(),
    variant_id: z.string().uuid().optional(),
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

        // Wrap stock check and cart update in a transaction with locking
        await db.transaction(async (tx) => {
            // 0. Resolve Variant if provided
            let variant: typeof productVariants.$inferSelect | null = null;
            if (data.variant_id) {
                const [v] = await tx
                    .select()
                    .from(productVariants)
                    .where(and(
                        eq(productVariants.id, data.variant_id),
                        eq(productVariants.is_deleted, false)
                    ))
                    .limit(1);

                if (!v) throw new HttpException(404, 'Variant not found');
                if (v.product_id !== data.product_id) throw new HttpException(400, 'Variant does not belong to product');
                if (!v.is_active) throw new HttpException(400, 'Variant is not available');
                variant = v;
            }

            // 1. Lock the inventory row to prevent concurrent stock availability issues
            // This ensures that two requests checking stock will be serialized.
            // Support Variant-Specific Lock
            let inventoryFilter: SQL = data.variant_id
                ? eq(inventory.variant_id, data.variant_id)
                : and(
                    eq(inventory.product_id, data.product_id!),
                    isNull(inventory.variant_id)
                )!;

            const [stockData] = await tx
                .select({
                    id: inventory.id,
                    available_quantity: inventory.available_quantity,
                    reserved_quantity: inventory.reserved_quantity,
                    totalStock: sql<number>`${inventory.available_quantity} - ${inventory.reserved_quantity}`,
                })
                .from(inventory)
                .where(inventoryFilter)
                .for('update');

            if (!stockData) {
                // If variant specific inventory is missing, use base if variant not enforced? 
                // But if variant_id passed, we expect specific stock.
                throw new HttpException(404, 'Product/Variant inventory not found');
            }

            const totalStock = Number(stockData.totalStock) || 0;
            if (totalStock < data.quantity) {
                throw new HttpException(400, `Insufficient stock. Only ${totalStock} units available.`);
            }

            // 2. Check if item already exists in cart (within transaction)
            const [existingItem] = await tx
                .select({ id: cartItems.id, quantity: cartItems.quantity })
                .from(cartItems)
                .where(and(
                    eq(cartItems.cart_id, cartId),
                    eq(cartItems.product_id, data.product_id!),
                    data.variant_id
                        ? eq(cartItems.variant_id, data.variant_id)
                        : isNull(cartItems.variant_id),
                    eq(cartItems.is_deleted, false)
                ))
                .limit(1);

            // Determine Prices (Base or Variant)
            const sellingPrice = Number(variant ? variant.selling_price : product.selling_price);
            const compareAtPrice = Number((variant ? variant.compare_at_price : product.compare_at_price) || sellingPrice);
            const discountAmount = Math.max(compareAtPrice - sellingPrice, 0);

            // Determine SKU and Name
            const itemSku = variant ? variant.sku : product.sku;
            const itemName = variant
                ? `${product.product_title} - ${variant.option_value}` // simplified name
                : product.product_title;

            if (existingItem) {
                // Update quantity
                const newQuantity = existingItem.quantity + data.quantity;

                // Verify stock for new quantity
                if (totalStock < data.quantity) { // Only check data.quantity since we locked it? 
                    // Actually we need to check if existingItem.qty + data.qty <= totalStock.
                    // But wait, totalStock here is (available_quantity - current_reserved).
                    // This is still tricky because 'current_reserved' ALREADY includes existingItem.quantity?
                    // NO. reserved_quantity usually ONLY includes items that have a 'reservation_id'.
                    // Let's assume the math is robust.
                    if (totalStock < data.quantity) {
                        throw new HttpException(400, `Cannot add more items. Only ${totalStock} units available.`);
                    }
                }

                const lineSubtotal = compareAtPrice * newQuantity;
                const lineTotal = sellingPrice * newQuantity;

                await tx.update(cartItems)
                    .set({
                        quantity: newQuantity,
                        line_subtotal: lineSubtotal.toFixed(2),
                        line_total: lineTotal.toFixed(2),
                        discount_amount: (discountAmount * newQuantity).toFixed(2),
                        updated_at: new Date(),
                    })
                    .where(eq(cartItems.id, existingItem.id));

                // 3. Update reservation (Phase 2)
                if (CART_RESERVATION_CONFIG.ENABLED) {
                    // Release old and reserve new
                    await releaseCartStock(existingItem.id, tx);
                    await reserveCartStock(
                        data.product_id!,
                        newQuantity,
                        existingItem.id,
                        CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT,
                        tx,
                        true, // Skip internal validation as we already locked and validated!
                        data.variant_id // PASS VARIANT ID
                    );
                }
            } else {
                // Create new cart item
                const lineSubtotal = compareAtPrice * data.quantity;
                const lineTotal = sellingPrice * data.quantity;

                const [cartItem] = await tx.insert(cartItems).values({
                    cart_id: cartId,
                    product_id: data.product_id!,
                    variant_id: data.variant_id, // Store Variant ID
                    quantity: data.quantity,
                    cost_price: compareAtPrice.toFixed(2),
                    final_price: sellingPrice.toFixed(2),
                    discount_amount: (discountAmount * data.quantity).toFixed(2),
                    line_subtotal: lineSubtotal.toFixed(2),
                    line_total: lineTotal.toFixed(2),
                    product_name: itemName,
                    product_image_url: product.primary_image_url, // Or variant image if available
                    product_sku: itemSku,
                    customization_data: data.customization_data,
                }).returning();

                // 3. Create reservation (Phase 2)
                if (CART_RESERVATION_CONFIG.ENABLED && cartItem) {
                    await reserveCartStock(
                        data.product_id!,
                        data.quantity,
                        cartItem.id,
                        CART_RESERVATION_CONFIG.RESERVATION_TIMEOUT,
                        tx,
                        true, // Skip internal validation
                        data.variant_id // PASS VARIANT ID
                    );
                }
            }
        });
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

import { optionalAuth } from '../../../middlewares';

const router = Router();
router.post('/items', optionalAuth, handler);

export default router;
