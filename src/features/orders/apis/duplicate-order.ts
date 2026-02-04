/**
 * POST /api/admin/orders/:orderId/duplicate
 * Admin: Duplicate an existing order
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { HttpException, ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { logger } from '../../../utils';
import { orderService } from '../shared';

const paramsSchema = z.object({
    orderId: z.string().uuid(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { orderId } = paramsSchema.parse(req.params);

    // Get original order
    const [originalOrder] = await db
        .select()
        .from(orders)
        .where(and(
            eq(orders.id, orderId),
            eq(orders.is_deleted, false)
        ));

    if (!originalOrder) {
        throw new HttpException(404, 'Order not found');
    }

    // Get order items
    const originalItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, orderId));

    try {
        const result = await db.transaction(async (tx) => {
            // Generate new order number using service
            const newOrderNumber = await orderService.generateOrderNumber();

            // Create duplicate order (exclude specific fields)
            const [newOrder] = await tx
                .insert(orders)
                .values({
                    // Copy most fields from original
                    user_id: originalOrder.user_id,
                    order_number: newOrderNumber,

                    // Set as draft
                    order_status: 'pending',
                    payment_status: 'pending',
                    fulfillment_status: 'unfulfilled',
                    is_draft: true,

                    // Copy address IDs
                    shipping_address_id: originalOrder.shipping_address_id,
                    billing_address_id: originalOrder.billing_address_id,

                    // Copy pricing
                    subtotal: originalOrder.subtotal,
                    discount_id: originalOrder.discount_id,
                    discount_code_id: originalOrder.discount_code_id,
                    discount_type: originalOrder.discount_type,
                    discount_value: originalOrder.discount_value,
                    discount_amount: originalOrder.discount_amount,
                    discount_code: originalOrder.discount_code,
                    giftcard_code: originalOrder.giftcard_code,
                    giftcard_amount: originalOrder.giftcard_amount,
                    shipping_amount: originalOrder.shipping_amount,
                    shipping_method: originalOrder.shipping_method,
                    shipping_option: originalOrder.shipping_option,
                    delivery_price: originalOrder.delivery_price,
                    tax_rule_id: originalOrder.tax_rule_id,
                    tax_amount: originalOrder.tax_amount,
                    cgst: originalOrder.cgst,
                    sgst: originalOrder.sgst,
                    igst: originalOrder.igst,
                    total_amount: originalOrder.total_amount,
                    total_quantity: originalOrder.total_quantity,

                    // Copy metadata
                    payment_method: originalOrder.payment_method,
                    channel: originalOrder.channel,
                    customer_note: originalOrder.customer_note,
                    admin_comment: originalOrder.admin_comment,
                    tags: originalOrder.tags,
                    order_tracking: originalOrder.order_tracking,
                    currency: originalOrder.currency,

                    // Skip payment-specific fields (razorpay_order_id, payment_id, paid_at)
                    // Skip timestamps (created_at, updated_at auto-set)

                    created_by: req.userId,
                    updated_by: req.userId,
                })
                .returning();

            // Duplicate order items
            for (const item of originalItems) {
                await tx.insert(orderItems).values({
                    order_id: newOrder.id,
                    product_id: item.product_id,
                    sku: item.sku,
                    product_name: item.product_name,
                    product_image: item.product_image,
                    cost_price: item.cost_price,
                    quantity: item.quantity,
                    line_total: item.line_total,
                });
            }

            return newOrder;
        });

        logger.info('Order duplicated successfully', {
            originalOrderId: orderId,
            newOrderId: result.id,
            newOrderNumber: result.order_number,
            userId: req.userId,
        });

        return ResponseFormatter.success(res, {
            order: result,
        }, 'Order duplicated successfully');
    } catch (error) {
        logger.error('Failed to duplicate order', {
            orderId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new HttpException(500, 'Failed to duplicate order');
    }
};

const router = Router();
router.post('/admin/orders/:orderId/duplicate', requireAuth, requirePermission('orders:write'), handler);

export default router;
