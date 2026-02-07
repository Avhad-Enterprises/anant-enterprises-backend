/**
 * PUT /api/admin/orders/:id
 * Admin: Update full order details
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { orderItems } from '../shared/order-items.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { validateStockAvailability } from '../../inventory/services/order-reservation.service';

const orderItemSchema = z.object({
  // Relaxed product validation (allow empty string for custom items)
  product_id: z.string().optional().or(z.literal('')),
  variant_id: z.string().optional().or(z.literal('')).nullable(),
  quantity: z.number().min(1),
  cost_price: z.union([z.string(), z.number()]),
  line_total: z.union([z.string(), z.number()]),
  product_name: z.string().optional(),
  sku: z.string().optional(),
  product_image: z.string().optional(),
});

const updateOrderSchema = z.object({
  // Editable fields
  // Handle empty strings coming from frontend by checking for literal('')
  shipping_address_id: z.string().optional().or(z.literal('')),
  billing_address_id: z.string().optional().or(z.literal('')),
  payment_method: z.string().optional(),
  customer_note: z.string().optional(),
  admin_comment: z.string().optional(),

  // Statuses (relaxed to strings)
  order_status: z.string().optional(),
  payment_status: z.string().optional(),
  fulfillment_status: z.string().optional(),

  // Items (Full replacement)
  items: z.array(orderItemSchema).optional(),

  // Pricing (Admin override)
  subtotal: z.union([z.string(), z.number()]).optional(),
  discount_total: z.union([z.string(), z.number()]).optional(),
  tax_amount: z.union([z.string(), z.number()]).optional(),
  shipping_total: z.union([z.string(), z.number()]).optional(),
  total_amount: z.union([z.string(), z.number()]).optional(),

  // Tax components (Added to match mapper)
  tax_type: z.string().optional(), // Relaxed Enum
  cgst_amount: z.union([z.string(), z.number()]).optional(),
  sgst_amount: z.union([z.string(), z.number()]).optional(),
  igst_amount: z.union([z.string(), z.number()]).optional(),
  cod_charges: z.union([z.string(), z.number()]).optional(),
  giftcard_total: z.union([z.string(), z.number()]).optional(),
  advance_paid_amount: z.union([z.string(), z.number()]).optional(),

  // Metadata/Extra (Added to match mapper)
  user_id: z.string().optional().or(z.literal('')), // Customer ID
  channel: z.string().optional(), // Relaxed Enum
  is_draft: z.boolean().optional(),
  is_international_order: z.boolean().optional(),
  amz_order_id: z.string().optional(),
  currency: z.string().optional(),

  tags: z.array(z.string()).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const orderNumberOrId = req.params.id as string;
  const body = updateOrderSchema.parse(req.body);
  const userId = req.userId!;

  // 1. Find Order
  // Fix: Check if input is UUID to determine query field
  // This prevents "invalid input syntax for type uuid" when querying with order number
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumberOrId);

  const whereClause = and(
    isUuid
      ? eq(orders.id, orderNumberOrId)
      : eq(orders.order_number, orderNumberOrId),
    eq(orders.is_deleted, false)
  );

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(whereClause)
    .limit(1);

  if (!existingOrder) {
    throw new HttpException(404, 'Order not found');
  }

  const orderId = existingOrder.id;

  // 2. Perform Update Transaction
  await db.transaction(async (tx) => {
    // Update Order Fields
    const updateData: Partial<typeof orders.$inferInsert> = {
      updated_at: new Date(),
      updated_by: userId,
    };

    // Address handling: explicit null check for empty strings
    if (body.shipping_address_id !== undefined) {
      updateData.shipping_address_id = body.shipping_address_id || null;
    }
    if (body.billing_address_id !== undefined) {
      updateData.billing_address_id = body.billing_address_id || null;
    }

    // Customer handling
    if (body.user_id !== undefined) updateData.user_id = body.user_id || null;

    if (body.payment_method) updateData.payment_method = body.payment_method;
    if (body.customer_note !== undefined) updateData.customer_note = body.customer_note;
    if (body.admin_comment !== undefined) updateData.admin_comment = body.admin_comment;

    if (body.order_status) updateData.order_status = body.order_status as any;
    if (body.payment_status) updateData.payment_status = body.payment_status as any;
    if (body.fulfillment_status) updateData.fulfillment_status = body.fulfillment_status as any;

    // Pricing Overrides
    if (body.subtotal) updateData.subtotal = String(body.subtotal);
    if (body.discount_total) updateData.discount_amount = String(body.discount_total);
    if (body.shipping_total) updateData.shipping_amount = String(body.shipping_total);
    if (body.tax_amount) updateData.tax_amount = String(body.tax_amount);
    if (body.total_amount) updateData.total_amount = String(body.total_amount);

    // Tax components
    if (body.cgst_amount) updateData.cgst = String(body.cgst_amount);
    if (body.sgst_amount) updateData.sgst = String(body.sgst_amount);
    if (body.igst_amount) updateData.igst = String(body.igst_amount);
    if (body.cod_charges) updateData.partial_cod_charges = String(body.cod_charges);
    if (body.giftcard_total) updateData.giftcard_amount = String(body.giftcard_total);
    if (body.advance_paid_amount) updateData.advance_paid_amount = String(body.advance_paid_amount);

    // Metadata
    if (body.channel) updateData.channel = body.channel as any;
    if (body.is_draft !== undefined) updateData.is_draft = body.is_draft;
    if (body.amz_order_id) updateData.amz_order_id = body.amz_order_id;
    if (body.currency) updateData.currency = body.currency;

    if (body.tags) updateData.tags = body.tags;

    await tx.update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));

    // 3. Update Items (If provided)
    if (body.items) {
      // STRICT: Validate stock availability before updating items
      const stockItems = body.items
        .filter(item => item.product_id) // Only validate items with product_id
        .map(item => ({
          product_id: item.product_id!,
          quantity: item.quantity,
          variant_id: item.variant_id || null,
        }));

      if (stockItems.length > 0) {
        const stockValidation = await validateStockAvailability(stockItems);
        const insufficientStock = stockValidation.filter(v => !v.available);
        
        if (insufficientStock.length > 0) {
          const messages = insufficientStock.map(v => v.message).join('; ');
          throw new HttpException(400, `Insufficient stock: ${messages}`);
        }
      }

      // Delete existing items
      await tx.delete(orderItems).where(eq(orderItems.order_id, orderId));

      // Insert new items
      if (body.items.length > 0) {
        const newItems = body.items.map(item => ({
          order_id: orderId,
          product_id: item.product_id || null, // Handle empty string
          sku: item.sku || 'UNKNOWN',
          product_name: item.product_name || 'Unknown Product',
          product_image: item.product_image,
          cost_price: String(item.cost_price),
          quantity: item.quantity,
          line_total: String(item.line_total),
        }));

        await tx.insert(orderItems).values(newItems);

        // Recalculate total quantity
        const totalQty = body.items.reduce((sum, item) => sum + item.quantity, 0);
        await tx.update(orders).set({ total_quantity: totalQty }).where(eq(orders.id, orderId));
      }
    }
  });

  // 4. Return Updated Order
  const [updatedOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

  return ResponseFormatter.success(res, updatedOrder, 'Order updated successfully');
};

const router = Router();
router.put('/admin/orders/:id', requireAuth, requirePermission('orders:update'), handler);

export default router;
