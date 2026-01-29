/**
 * GET /api/admin/abandoned-carts/:cartId
 * Admin: Get full abandoned cart details
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { carts } from '../../cart/shared/carts.schema';
import { cartItems } from '../../cart/shared/cart-items.schema';
import { users } from '../../user/shared/user.schema';
import { userAddresses } from '../../user/shared/addresses.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const paramsSchema = z.object({
    cartId: z.string().uuid(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { cartId } = paramsSchema.parse(req.params);

    // Get cart with user info
    const [cart] = await db
        .select({
            // Cart fields
            id: carts.id,
            user_id: carts.user_id,
            session_id: carts.session_id,
            currency: carts.currency,
            subtotal: carts.subtotal,
            discount_total: carts.discount_total,
            giftcard_total: carts.giftcard_total,
            shipping_total: carts.shipping_total,
            tax_total: carts.tax_total,
            grand_total: carts.grand_total,
            applied_discount_codes: carts.applied_discount_codes,
            applied_giftcard_codes: carts.applied_giftcard_codes,
            cart_status: carts.cart_status,
            source: carts.source,
            last_activity_at: carts.last_activity_at,
            abandoned_at: carts.abandoned_at,
            recovery_email_sent: carts.recovery_email_sent,
            recovery_email_sent_at: carts.recovery_email_sent_at,
            created_at: carts.created_at,
            // User fields
            customer_name: users.name,
            customer_email: users.email,
            customer_phone: users.phone_number,
        })
        .from(carts)
        .leftJoin(users, eq(carts.user_id, users.id))
        .where(and(
            eq(carts.id, cartId),
            eq(carts.is_deleted, false)
        ));

    if (!cart) {
        return ResponseFormatter.error(res, 'CART_NOT_FOUND', 'Cart not found', 404);
    }

    // Get cart items
    const items = await db
        .select({
            id: cartItems.id,
            product_id: cartItems.product_id,
            bundle_id: cartItems.bundle_id,
            product_name: cartItems.product_name,
            product_image_url: cartItems.product_image_url,
            product_sku: cartItems.product_sku,
            quantity: cartItems.quantity,
            cost_price: cartItems.cost_price,
            final_price: cartItems.final_price,
            discount_amount: cartItems.discount_amount,
            line_subtotal: cartItems.line_subtotal,
            line_total: cartItems.line_total,
            customization_data: cartItems.customization_data,
        })
        .from(cartItems)
        .where(and(
            eq(cartItems.cart_id, cartId),
            eq(cartItems.is_deleted, false)
        ));

    // Get customer addresses if user exists
    let addresses: typeof userAddresses.$inferSelect[] = [];
    if (cart.user_id) {
        addresses = await db
            .select()
            .from(userAddresses)
            .where(and(
                eq(userAddresses.user_id, cart.user_id),
                eq(userAddresses.is_deleted, false)
            ));
    }

    // Calculate recovery status
    let recoveryStatus: 'not-contacted' | 'email-sent' | 'recovered' = 'not-contacted';
    if (cart.cart_status === 'converted') {
        recoveryStatus = 'recovered';
    } else if (cart.recovery_email_sent) {
        recoveryStatus = 'email-sent';
    }

    // Format response
    const response = {
        cart_id: cart.id,
        customer: {
            user_id: cart.user_id,
            name: cart.customer_name || 'Guest',
            email: cart.customer_email || (cart.session_id ? `Guest (${cart.session_id.substring(0, 8)}...)` : 'Unknown'),
            phone: cart.customer_phone,
            addresses: addresses.map(addr => ({
                id: addr.id,
                address_type: addr.address_type,
                recipient_name: addr.recipient_name,
                company_name: addr.company_name,
                address_line1: addr.address_line1,
                address_line2: addr.address_line2,
                city: addr.city,
                state_province: addr.state_province,
                postal_code: addr.postal_code,
                country: addr.country,
                is_default: addr.is_default,
            })),
        },
        pricing: {
            currency: cart.currency,
            subtotal: cart.subtotal,
            discount_total: cart.discount_total,
            giftcard_total: cart.giftcard_total,
            shipping_total: cart.shipping_total,
            tax_total: cart.tax_total,
            grand_total: cart.grand_total,
        },
        items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            bundle_id: item.bundle_id,
            product_name: item.product_name,
            product_image_url: item.product_image_url,
            product_sku: item.product_sku,
            quantity: item.quantity,
            cost_price: item.cost_price,
            final_price: item.final_price,
            discount_amount: item.discount_amount,
            line_subtotal: item.line_subtotal,
            line_total: item.line_total,
            customization: item.customization_data,
        })),
        applied_codes: {
            discount_codes: cart.applied_discount_codes,
            giftcard_codes: cart.applied_giftcard_codes,
        },
        status: {
            cart_status: cart.cart_status,
            recovery_status: recoveryStatus,
        },
        timeline: {
            created_at: cart.created_at,
            last_activity_at: cart.last_activity_at,
            abandoned_at: cart.abandoned_at,
            recovery_email_sent_at: cart.recovery_email_sent_at,
        },
        channel: cart.source,
    };

    return ResponseFormatter.success(res, response, 'Cart details retrieved successfully');
};

const router = Router();
router.get('/admin/abandoned-carts/:cartId', requireAuth, requirePermission('orders:read'), handler);

export default router;
