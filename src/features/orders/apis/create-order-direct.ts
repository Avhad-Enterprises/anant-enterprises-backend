/**
 * POST /api/admin/orders/direct
 * Admin: Create a direct order with custom items
 * - Allows admin to create orders manually
 * - Calculates pricing SERVER-SIDE (secure)
 * - Allows overselling (warns but doesn't block)
 * - Reserves stock for the order
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { reserveStockForOrder } from '../../inventory/services/inventory.service';
import { directOrderSchema, orderService, validateAndWarnStock, queueCustomerOrderNotification, queueAdminOrderNotification } from '../shared';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    // Use directOrderSchema (doesn't include pricing fields)
    const body = directOrderSchema.parse(req.body);

    const targetUserId = body.user_id || null; // Customer ID (nullable for guest orders)
    const creatorId = req.userId!; // Admin/Staff ID

    // 1. Validate Stock (warn but allow overselling for admin)
    const stockItems = body.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
    }));

    await validateAndWarnStock(stockItems, true); // allowOverselling = true

    // 2. Calculate pricing SERVER-SIDE (security fix)
    const pricing = await orderService.calculateOrderPricing({
        items: body.items.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            cost_price: item.cost_price || item.unit_price,
            discount_percentage: item.discount_percentage,
            discount_amount: item.discount_amount,
            tax_percentage: item.tax_percentage,
        })),
        discount_code: body.discount_code,
        giftcard_code: body.giftcard_code,
        shipping_amount: body.shipping_amount || 0,
        delivery_price: body.delivery_price || body.shipping_amount || 0,
        shipping_state: body.shipping_state,
        billing_state: body.billing_state,
        is_international: body.is_international,
    });

    const orderNumber = await orderService.generateOrderNumber();

    // 3. Create Order & Items
    const order = await db.transaction(async (tx) => {
        // Reserve stock (Allow Overselling = true for Admin)
        await reserveStockForOrder(stockItems, orderNumber, targetUserId || 'GUEST', true);

        // Insert Order with SERVER-CALCULATED pricing
        const [newOrder] = await tx.insert(orders).values({
            order_number: orderNumber,
            user_id: targetUserId,
            shipping_address_id: body.shipping_address_id || null,
            billing_address_id: body.billing_address_id || body.shipping_address_id || null,
            channel: body.channel,
            order_status: body.is_draft ? 'pending' : 'pending',
            is_draft: body.is_draft,
            payment_method: body.payment_method,
            payment_status: 'pending',
            currency: body.currency,

            // SERVER-SIDE CALCULATED PRICING (security fix)
            subtotal: pricing.subtotal.toFixed(2),
            discount_amount: pricing.discount_total.toFixed(2),
            cgst: pricing.cgst.toFixed(2),
            sgst: pricing.sgst.toFixed(2),
            igst: pricing.igst.toFixed(2),
            shipping_amount: pricing.shipping_amount.toFixed(2),
            delivery_price: pricing.delivery_price.toFixed(2),
            tax_amount: pricing.tax_amount.toFixed(2),
            giftcard_amount: pricing.giftcard_discount.toFixed(2),
            total_amount: pricing.total_amount.toFixed(2),
            total_quantity: pricing.total_quantity,
            advance_paid_amount: body.advance_paid_amount?.toFixed(2) || '0',

            customer_note: body.customer_note,
            admin_comment: body.admin_comment,
            amz_order_id: body.amz_order_id,
            tags: body.tags,

            created_by: creatorId,
            updated_by: creatorId,
        }).returning();

        if (!newOrder) {
            throw new HttpException(500, 'Failed to create order');
        }

        // Insert Items with calculated pricing
        const orderItemsData = body.items.map((item, index) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            sku: item.sku,
            product_name: item.product_name,
            product_image: item.product_image,
            cost_price: (item.cost_price || item.unit_price).toFixed(2),
            quantity: item.quantity,
            line_total: pricing.items[index].line_total.toFixed(2),
        }));

        await tx.insert(orderItems).values(orderItemsData);

        return newOrder;
    });

    // Send response first, then queue notifications
    const response = ResponseFormatter.success(res, {
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        pricing_breakdown: {
            subtotal: order.subtotal,
            discount: order.discount_amount,
            tax: order.tax_amount,
            shipping: order.shipping_amount,
            total: order.total_amount,
        },
        created_at: order.created_at,
    }, 'Order created successfully', 201);

    // Queue notifications AFTER response is sent (non-blocking)
    setImmediate(async () => {
        // 1. Notify customer if order is for a specific user
        if (targetUserId) {
            await queueCustomerOrderNotification(
                targetUserId,
                order.id,
                order.order_number,
                order.total_amount,
                order.currency || 'INR'
            );
        }

        // 2. Notify all admins about new order
        let customerName = 'Guest';
        if (targetUserId) {
            const [customer] = await db
                .select({ name: users.first_name })
                .from(users)
                .where(eq(users.id, targetUserId))
                .limit(1);
            customerName = customer?.name || 'Guest';
        }

        await queueAdminOrderNotification(
            order.id,
            order.order_number,
            customerName,
            order.total_amount
        );
    });

    return response;
};

const router = Router();
router.post('/direct', requireAuth, requirePermission('orders:create'), handler);

export default router;

