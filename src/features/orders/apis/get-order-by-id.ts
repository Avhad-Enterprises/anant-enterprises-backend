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
import { logger } from '../../../utils';

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  const orderId = req.params.id;

  logger.info(`[GetOrderById] Request received - OrderID: ${orderId}, UserID: ${userId}`);

  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  // Get order
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.is_deleted, false)))
    .limit(1);

  if (!order) {
    throw new HttpException(404, 'Order not found');
  }

  // Verify ownership (unless admin - future enhancement)
  if (order.user_id !== userId) {
    throw new HttpException(403, 'Not authorized to view this order');
  }

  // Get order items
  const items = await db.select().from(orderItems).where(eq(orderItems.order_id, orderId));

  // Helper to map address - defined inside handler to have access to types if needed, or just pure function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapAddress = (addr: any) => {
    if (!addr) return null;
    return {
      name: addr.recipient_name,
      phone: addr.phone_number,
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
  if (order.shipping_address_id) {
    const [addr] = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.id, order.shipping_address_id))
      .limit(1);
    shippingAddress = mapAddress(addr);
  }

  // Get billing address
  let billingAddress = null;
  if (order.billing_address_id && order.billing_address_id !== order.shipping_address_id) {
    const [addr] = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.id, order.billing_address_id))
      .limit(1);
    billingAddress = mapAddress(addr);
  } else {
    billingAddress = shippingAddress;
  }

  return ResponseFormatter.success(
    res,
    {
      id: order.id,
      order_number: order.order_number,
      user_id: order.user_id,
      created_at: order.created_at,

      // Status
      order_status: order.order_status,
      payment_status: order.payment_status,
      fulfillment_status: order.fulfillment_status,

      // Amounts
      subtotal: order.subtotal,
      discount_amount: order.discount_amount,
      shipping_amount: order.shipping_amount,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency,

      // Details
      total_quantity: order.total_quantity,
      payment_method: order.payment_method,
      shipping_address_id: order.shipping_address_id,
      billing_address_id: order.billing_address_id,

      order_tracking: order.order_tracking,
      customer_note: order.customer_note,
      updated_at: order.updated_at,

      // Expanded Data
      shipping_address: shippingAddress,
      billing_address: billingAddress,
      items: items.map(item => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        sku: item.sku,
        product_name: item.product_name,
        product_image: item.product_image,
        cost_price: item.cost_price,
        quantity: item.quantity,
        line_total: item.line_total,
        // Extra backend fields not in strict frontend type but harmless
        quantity_fulfilled: item.quantity_fulfilled,
        quantity_cancelled: item.quantity_cancelled,
        quantity_returned: item.quantity_returned,
      })),
    },
    'Order details retrieved successfully'
  );
};

const router = Router();
router.get('/:id', requireAuth, handler);

export default router;
