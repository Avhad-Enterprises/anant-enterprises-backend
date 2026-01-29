/**
 * GET /api/admin/orders/:id
 * Admin: Get full order details by ID (no ownership check)
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { userAddresses } from '../../user/shared/addresses.schema';
import { users } from '../../user/shared/user.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    const orderNumberOrId = req.params.id as string;

    logger.info(`GET /api/admin/orders/${orderNumberOrId}`);

    // Get order with user info - query by order_number (user-friendly) instead of UUID
    const [orderWithUser] = await db
        .select({
            id: orders.id,
            order_number: orders.order_number,
            user_id: orders.user_id,
            created_at: orders.created_at,
            updated_at: orders.updated_at,
            order_status: orders.order_status,
            payment_status: orders.payment_status,
            fulfillment_status: orders.fulfillment_status,
            subtotal: orders.subtotal,
            discount_amount: orders.discount_amount,
            shipping_amount: orders.shipping_amount,
            tax_amount: orders.tax_amount,
            total_amount: orders.total_amount,
            currency: orders.currency,
            total_quantity: orders.total_quantity,
            payment_method: orders.payment_method,
            shipping_address_id: orders.shipping_address_id,
            billing_address_id: orders.billing_address_id,
            order_tracking: orders.order_tracking,
            customer_note: orders.customer_note,
            channel: orders.channel,
            is_draft: orders.is_draft,
            // User info
            customer_name: users.name,
            customer_email: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id))
        .where(and(
            eq(orders.order_number, orderNumberOrId),
            eq(orders.is_deleted, false)
        ))
        .limit(1);

    if (!orderWithUser) {
        throw new HttpException(404, 'Order not found');
    }

    // Get order items using the actual UUID from the fetched order
    const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderWithUser.id));

    // Helper to map address
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapAddress = (addr: any) => {
        if (!addr) return null;
        return {
            id: addr.id,
            label: addr.label || 'Address',
            name: addr.recipient_name,
            phone: addr.phone_number,
            address: addr.address_line1 + (addr.address_line2 ? ', ' + addr.address_line2 : ''),
            address_line1: addr.address_line1,
            address_line2: addr.address_line2 || '',
            city: addr.city,
            state: addr.state_province,
            pincode: addr.postal_code,
            country: addr.country,
        };
    };

    // Get shipping address
    let shippingAddress = null;
    if (orderWithUser.shipping_address_id) {
        const [addr] = await db
            .select()
            .from(userAddresses)
            .where(eq(userAddresses.id, orderWithUser.shipping_address_id))
            .limit(1);
        shippingAddress = mapAddress(addr);
    }

    // Get billing address
    let billingAddress = null;
    if (orderWithUser.billing_address_id && orderWithUser.billing_address_id !== orderWithUser.shipping_address_id) {
        const [addr] = await db
            .select()
            .from(userAddresses)
            .where(eq(userAddresses.id, orderWithUser.billing_address_id))
            .limit(1);
        billingAddress = mapAddress(addr);
    } else {
        billingAddress = shippingAddress;
    }

    return ResponseFormatter.success(res, {
        id: orderWithUser.id,
        order_number: orderWithUser.order_number,
        user_id: orderWithUser.user_id,
        created_at: orderWithUser.created_at,
        updated_at: orderWithUser.updated_at,

        // Status
        order_status: orderWithUser.order_status,
        payment_status: orderWithUser.payment_status,
        fulfillment_status: orderWithUser.fulfillment_status,

        // Amounts
        subtotal: orderWithUser.subtotal,
        discount_amount: orderWithUser.discount_amount,
        shipping_amount: orderWithUser.shipping_amount,
        tax_amount: orderWithUser.tax_amount,
        total_amount: orderWithUser.total_amount,
        currency: orderWithUser.currency,

        // Details
        total_quantity: orderWithUser.total_quantity,
        payment_method: orderWithUser.payment_method,
        channel: orderWithUser.channel,
        order_tracking: orderWithUser.order_tracking,
        customer_note: orderWithUser.customer_note,
        is_draft: orderWithUser.is_draft,

        // Customer
        customer: {
            id: orderWithUser.user_id,
            name: orderWithUser.customer_name || 'Guest',
            email: orderWithUser.customer_email || '',
            phone: '',
        },

        // Addresses
        shipping_address: shippingAddress,
        billing_address: billingAddress,

        // Items
        items: items.map(item => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productSku: item.sku,
            productImage: item.product_image || '',
            quantity: item.quantity,
            costPrice: parseFloat(item.cost_price || '0'),
            lineTotal: parseFloat(item.line_total || '0'),
        })),
    }, 'Order details retrieved successfully');
};

const router = Router();
router.get('/admin/orders/:id', requireAuth, requirePermission('orders:read'), handler);

export default router;
