/**
 * GET /api/orders/:id
 * Get full order details by ID
 */

import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { userAddresses } from '../../user/shared/addresses.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const orderId = req.params.id;

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Get order
    const [order] = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.id, orderId),
            eq(orders.is_deleted, false)
        ))
        .limit(1);

    if (!order) {
        throw new HttpException(404, 'Order not found');
    }

    // Verify ownership (unless admin - future enhancement)
    if (order.user_id !== userId) {
        throw new HttpException(403, 'Not authorized to view this order');
    }

    // Get order items
    const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));

    // Get shipping address
    let shippingAddress = null;
    if (order.shipping_address_id) {
        const [addr] = await db
            .select()
            .from(userAddresses)
            .where(eq(userAddresses.id, order.shipping_address_id))
            .limit(1);
        shippingAddress = addr || null;
    }

    // Get billing address
    let billingAddress = null;
    if (order.billing_address_id && order.billing_address_id !== order.shipping_address_id) {
        const [addr] = await db
            .select()
            .from(userAddresses)
            .where(eq(userAddresses.id, order.billing_address_id))
            .limit(1);
        billingAddress = addr || null;
    } else {
        billingAddress = shippingAddress;
    }

    return ResponseFormatter.success(res, {
        order: {
            id: order.id,
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            currency: order.currency,
            subtotal: order.subtotal,
            discount_amount: order.discount_amount,
            discount_code: order.discount_code,
            shipping_amount: order.shipping_amount,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            total_quantity: order.total_quantity,
            fulfillment_status: order.fulfillment_status,
            order_tracking: order.order_tracking,
            customer_note: order.customer_note,
            created_at: order.created_at,
            updated_at: order.updated_at,
        },
        items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.product_image,
            sku: item.sku,
            cost_price: item.cost_price,
            quantity: item.quantity,
            line_total: item.line_total,
            quantity_fulfilled: item.quantity_fulfilled,
            quantity_cancelled: item.quantity_cancelled,
            quantity_returned: item.quantity_returned,
        })),
        shipping_address: shippingAddress,
        billing_address: billingAddress,
    }, 'Order details retrieved successfully');
};

const router = Router();
router.get('/:id', requireAuth, handler);

export default router;
