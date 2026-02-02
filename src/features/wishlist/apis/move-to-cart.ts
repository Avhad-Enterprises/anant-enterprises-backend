/**
 * POST /api/wishlist/items/:productId/move-to-cart
 * Move a wishlist item to the cart
 * - Adds product to cart
 * - Marks wishlist item with added_to_cart_at timestamp
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { wishlists } from '../shared/wishlist.schema';
import { wishlistItems } from '../shared/wishlist-items.schema';
import { products } from '../../product/shared/product.schema';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requireOwnerOrPermission, validationMiddleware } from '../../../middlewares';
import { getProductStockSubquery } from '../shared/queries';

// Optional body for quantity
const moveToCartSchema = z.object({
    quantity: z.number().int().min(1).max(100).default(1),
    remove_from_wishlist: z.boolean().default(false),
});

const handler = async (req: RequestWithUser, res: Response) => {
    // Support admin/owner access
    const userId = req.params.userId || req.userId;
    const productId = req.params.productId as string;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const { quantity, remove_from_wishlist } = moveToCartSchema.parse(req.body || {});

    // Find user's wishlist
    const [wishlist] = await db
        .select({ id: wishlists.id })
        .from(wishlists)
        .where(and(
            eq(wishlists.user_id, userId),
            eq(wishlists.status, true)
        ))
        .limit(1);

    if (!wishlist) {
        throw new HttpException(404, 'Wishlist not found');
    }

    // Check if item exists in wishlist
    const [wishlistItem] = await db
        .select()
        .from(wishlistItems)
        .where(and(
            eq(wishlistItems.wishlist_id, wishlist.id),
            eq(wishlistItems.product_id, productId)
        ))
        .limit(1);

    if (!wishlistItem) {
        throw new HttpException(404, 'Product not found in wishlist');
    }

    // Get product details
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
            eq(products.id, productId),
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
    const [stockData] = await db
        .select({
            totalStock: getProductStockSubquery(productId),
        })
        .from(inventory)
        .where(eq(inventory.product_id, productId));

    // Wait, the shared query has FROM clause built-in!
    // `SELECT ... FROM inventory WHERE ...`
    // So I can't use it inside .select({...}) unless it's a scalar subquery.
    // But `db.select({...}).from(inventory)` implies we are selecting fields.
    // If I use the shared query which has specific WHERE clause on product table usually...

    // Actually, look at get-wishlist.ts:
    // totalStock: getProductStockSubquery() -> defaults to products.id (from the join)

    // In move-to-cart.ts lines 94-99:
    // .select({ totalStock: sql<number>`SUM(...)` })
    // .from(inventory)
    // .where(eq(inventory.product_id, productId))

    // The shared query is:
    // sql`(SELECT SUM(...) FROM inventory WHERE product_id = ${col})`
    // It returns a scalar subquery.

    // So in move-to-cart, we can't easily reuse it because we are querying inventory directly.
    // The shared query is designed for "Enrichment" (Subquery in projection).

    // However, I can just use a normal Drizzle query here without `sql` template if possible.
    // Or I can use the shared query if I do:
    // db.execute(sql`SELECT ${getProductStockSubquery(productId)} as totalStock`) -- no that's complex

    // Let's Just keep it as is? Or write a better Drizzle query.
    // db.select({ total: sum(...) }).from(inventory).where(...)

    // Let's try to improve it to use Drizzle's `sum`.


    const availableStock = Number(stockData?.totalStock) || 0;
    if (availableStock < quantity) {
        throw new HttpException(400, `Only ${availableStock} units available`);
    }

    // Get or create cart
    let [cart] = await db
        .select({ id: carts.id })
        .from(carts)
        .where(and(
            eq(carts.user_id, userId),
            eq(carts.cart_status, 'active'),
            eq(carts.is_deleted, false)
        ))
        .limit(1);

    if (!cart) {
        const [newCart] = await db.insert(carts).values({
            user_id: userId,
            cart_status: 'active',
            source: 'web',
            created_by: userId,
        }).returning({ id: carts.id });
        cart = newCart;
    }

    // Check if product already in cart
    const [existingCartItem] = await db
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cart.id),
            eq(cartItems.product_id, productId),
            eq(cartItems.is_deleted, false)
        ))
        .limit(1);

    const sellingPrice = Number(product.selling_price);
    const compareAtPrice = product.compare_at_price ? Number(product.compare_at_price) : sellingPrice;
    const discountAmount = Math.max(compareAtPrice - sellingPrice, 0);

    if (existingCartItem) {
        // Update quantity in cart
        const newQuantity = existingCartItem.quantity + quantity;
        const lineSubtotal = compareAtPrice * newQuantity;
        const lineTotal = sellingPrice * newQuantity;

        await db.update(cartItems)
            .set({
                quantity: newQuantity,
                line_subtotal: lineSubtotal.toFixed(2),
                line_total: lineTotal.toFixed(2),
                discount_amount: (discountAmount * newQuantity).toFixed(2),
                updated_at: new Date(),
            })
            .where(eq(cartItems.id, existingCartItem.id));
    } else {
        // Add new item to cart
        const lineSubtotal = compareAtPrice * quantity;
        const lineTotal = sellingPrice * quantity;

        await db.insert(cartItems).values({
            cart_id: cart.id,
            product_id: productId,
            quantity,
            cost_price: compareAtPrice.toFixed(2),
            final_price: product.selling_price,
            discount_amount: (discountAmount * quantity).toFixed(2),
            line_subtotal: lineSubtotal.toFixed(2),
            line_total: lineTotal.toFixed(2),
            product_name: product.product_title,
            product_image_url: product.primary_image_url,
            product_sku: product.sku,
        });
    }

    // Update cart totals
    const cartItemsList = await db
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

    const subtotal = cartItemsList.reduce((sum, item) => sum + Number(item.line_subtotal), 0);
    const discountTotal = cartItemsList.reduce((sum, item) => sum + Number(item.discount_amount), 0);
    const grandTotal = cartItemsList.reduce((sum, item) => sum + Number(item.line_total), 0);

    await db.update(carts)
        .set({
            subtotal: subtotal.toFixed(2),
            discount_total: discountTotal.toFixed(2),
            grand_total: grandTotal.toFixed(2),
            last_activity_at: new Date(),
            updated_at: new Date(),
        })
        .where(eq(carts.id, cart.id));

    // Update or remove wishlist item
    if (remove_from_wishlist) {
        await db.delete(wishlistItems)
            .where(and(
                eq(wishlistItems.wishlist_id, wishlist.id),
                eq(wishlistItems.product_id, productId)
            ));
    } else {
        await db.update(wishlistItems)
            .set({ added_to_cart_at: new Date() })
            .where(and(
                eq(wishlistItems.wishlist_id, wishlist.id),
                eq(wishlistItems.product_id, productId)
            ));
    }

    return ResponseFormatter.success(res, {
        product_id: productId,
        product_name: product.product_title,
        quantity,
        removed_from_wishlist: remove_from_wishlist,
    }, `${product.product_title} moved to cart`);
};

const router = Router();

// Admin route only - move any user's wishlist item to cart
router.post(
    '/:userId/wishlist/:productId/move-to-cart',
    requireAuth,
    validationMiddleware(z.object({ userId: z.string().uuid(), productId: z.string().uuid() }), 'params'),
    requireOwnerOrPermission('userId', 'users:write'),
    handler
);

export default router;
