# Phase 5: API Integration Guide

## Overview

This guide shows how to integrate queue event publishing into your Order, Payment, and Inventory APIs. The pattern is simple: **After successful database operations, publish events to the queue**.

## Integration Pattern

```typescript
// 1. Perform database operation
const result = await db.insert(orders).values(orderData).returning();

// 2. Publish event to queue
await eventPublisher.publishOrderCreated({
  orderId: result[0].id,
  orderNumber: result[0].order_number,
  // ... other data
});

// 3. Return API response
return ResponseFormatter.success(result[0]);
```

## Key Principles

✅ **Fire and Forget**: Event publishing should NOT block the API response  
✅ **Error Handling**: Log errors but don't fail the API if event publishing fails  
✅ **Type Safety**: Use the typed event publisher methods  
✅ **Async**: Always use `await` for event publishing  

---

## Example 1: Create Order API

### File: `src/features/orders/apis/create-order.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../../../database';
import { orders, orderItems } from '../shared';
import { ResponseFormatter } from '../../../utils';
import { eventPublisher } from '../../queue';
import { logger } from '../../../utils';

// Validation schema
const createOrderSchema = z.object({
  user_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
    price: z.string(),
  })),
  shipping_address_id: z.number(),
  billing_address_id: z.number(),
  payment_method: z.string().optional(),
  currency: z.string().default('INR'),
  // ... other fields
});

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Validate input
    const data = createOrderSchema.parse(req.body);

    // 2. Calculate totals
    const subtotal = data.items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    
    const tax = subtotal * 0.18; // Example: 18% GST
    const shipping = 50; // Example fixed shipping
    const total = subtotal + tax + shipping;

    // 3. Insert order into database
    const [newOrder] = await db.insert(orders).values({
      user_id: data.user_id,
      order_number: `ORD-${Date.now()}`, // Generate unique number
      shipping_address_id: data.shipping_address_id,
      billing_address_id: data.billing_address_id,
      payment_method: data.payment_method,
      currency: data.currency,
      subtotal: subtotal.toFixed(2),
      tax_amount: tax.toFixed(2),
      shipping_amount: shipping.toFixed(2),
      total_amount: total.toFixed(2),
      total_quantity: data.items.reduce((sum, item) => sum + item.quantity, 0),
      order_status: 'pending',
      payment_status: 'pending',
    }).returning();

    // 4. Insert order items
    await db.insert(orderItems).values(
      data.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.price,
        //... other fields
      }))
    );

    // 5. Publish ORDER_CREATED event (fire and forget)
    try {
      await eventPublisher.publishOrderCreated({
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        userId: data.user_id,
        userEmail: req.user?.email || '', // From auth middleware
        userName: req.user?.name || 'Customer',
        items: data.items.map(item => ({
          productId: item.product_id,
          variantId: item.variantId,
          quantity: item.quantity,
          name: 'Product Name', // Fetch from DB if needed
          price: item.price,
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shipping: shipping.toFixed(2),
        total: total.toFixed(2),
        currency: data.currency,
      });

      logger.info('Order created event published', { orderId: newOrder.id });
    } catch (eventError) {
      // Log error but don't fail the API
      logger.error('Failed to publish order created event', {
        orderId: newOrder.id,
        error: eventError,
      });
    }

    // 6. Return success response
    res.status(201).json(
      ResponseFormatter.success(newOrder, 'Order created successfully')
    );
  } catch (error) {
    next(error);
  }
};
```

---

## Example 2: Update Order Status API

### File: `src/features/orders/apis/update-order-status.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { orders } from '../shared';
import { ResponseFormatter } from '../../../utils';
import { eventPublisher } from '../../queue';
import { logger } from '../../../utils';

const updateStatusSchema = z.object({
  order_id: z.string().uuid(),
  order_status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
});

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = updateStatusSchema.parse(req.body);

    // 1. Get current order
    const [currentOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, data.order_id));

    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // 2. Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        order_status: data.order_status,
        order_tracking: data.tracking_number,
        updated_at: new Date(),
      })
      .where(eq(orders.id, data.order_id))
      .returning();

    // 3. Publish appropriate event based on status change
    try {
      if (data.order_status === 'confirmed' && currentOrder.payment_status === 'paid') {
        await eventPublisher.publishOrderPaid({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          userId: updatedOrder.user_id!,
          paymentId: updatedOrder.payment_ref || '',
          amount: updatedOrder.total_amount,
          currency: updatedOrder.currency,
          paymentMethod: updatedOrder.payment_method || '',
          paidAt: updatedOrder.paid_at || new Date(),
        });
      } else if (data.order_status === 'shipped') {
        await eventPublisher.publishOrderShipped({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          userId: updatedOrder.user_id!,
          userEmail: 'user@example.com', // Fetch from user table
          trackingNumber: data.tracking_number,
          carrier: data.carrier,
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      } else if (data.order_status === 'cancelled') {
        await eventPublisher.publishOrderCancelled({
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.order_number,
          userId: updatedOrder.user_id!,
          items: [], // Fetch order items
          reason: 'Customer request',
          cancelledBy: req.user?.id || updatedOrder.user_id!,
        });
      }

      logger.info('Order status event published', { 
        orderId: updatedOrder.id,
        status: data.order_status 
      });
    } catch (eventError) {
      logger.error('Failed to publish order status event', {
        orderId: updatedOrder.id,
        error: eventError,
      });
    }

    res.json(
      ResponseFormatter.success(updatedOrder, 'Order status updated successfully')
    );
  } catch (error) {
    next(error);
  }
};
```

---

## Example 3: Payment Processing

### File: `src/features/orders/apis/process-payment.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { orders } from '../shared';
import { ResponseFormatter } from '../../../utils';
import { eventPublisher } from '../../queue';
import { logger } from '../../../utils';

const processPaymentSchema = z.object({
  order_id: z.string().uuid(),
  payment_method: z.string(),
  transaction_id: z.string(),
  status: z.enum(['authorized', 'paid', 'failed']),
  error_message: z.string().optional(),
});

export const processPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = processPaymentSchema.parse(req.body);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, data.order_id));

    if (!order) {
      throw new Error('Order not found');
    }

    // Update payment status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        payment_method: data.payment_method,
        transaction_id: data.transaction_id,
        payment_status: data.status,
        paid_at: data.status === 'paid' ? new Date() : null,
      })
      .where(eq(orders.id, data.order_id))
      .returning();

    // Publish payment events
    try {
      if (data.status === 'authorized') {
        await eventPublisher.publishPaymentAuthorized({
          paymentId: data.transaction_id,
          orderId: order.id,
          userId: order.user_id!,
          amount: order.total_amount,
          currency: order.currency,
          paymentMethod: data.payment_method,
          authorizedAt: new Date(),
        });
      } else if (data.status === 'paid') {
        await eventPublisher.publishPaymentCaptured({
          paymentId: data.transaction_id,
          orderId: order.id,
          userId: order.user_id!,
          amount: order.total_amount,
          currency: order.currency,
          paymentMethod: data.payment_method,
          transactionId: data.transaction_id,
          capturedAt: new Date(),
        });
      } else if (data.status === 'failed') {
        await eventPublisher.publishPaymentFailed({
          paymentId: data.transaction_id,
          orderId: order.id,
          userId: order.user_id!,
          amount: order.total_amount,
          currency: order.currency,
          paymentMethod: data.payment_method,
          errorMessage: data.error_message || 'Payment processing failed',
          failedAt: new Date(),
        });
      }

      logger.info('Payment event published', {
        orderId: order.id,
        status: data.status,
      });
    } catch (eventError) {
      logger.error('Failed to publish payment event', {
        orderId: order.id,
        error: eventError,
      });
    }

    res.json(
      ResponseFormatter.success(updatedOrder, `Payment ${data.status} successfully`)
    );
  } catch (error) {
    next(error);
  }
};
```

---

## Example 4: Inventory Management

### File: `src/features/inventory/apis/adjust-inventory.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { inventory } from '../shared';
import { ResponseFormatter } from '../../../utils';
import { eventPublisher } from '../../queue';
import { logger } from '../../../utils';

const adjustInventorySchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  adjustment_type: z.enum(['increase', 'decrease', 'recount']),
  quantity: z.number().int(),
  reason: z.string(),
});

export const adjustInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = adjustInventorySchema.parse(req.body);

    // 1. Get current inventory
    const [currentInventory] = await db
      .select()
      .from(inventory)
      .where(
        data.variant_id
          ? eq(inventory.variant_id, data.variant_id)
          : eq(inventory.product_id, data.product_id)
      );

    const oldQuantity = currentInventory?.stock_on_hand || 0;
    let newQuantity = oldQuantity;

    if (data.adjustment_type === 'increase') {
      newQuantity = oldQuantity + data.quantity;
    } else if (data.adjustment_type === 'decrease') {
      newQuantity = oldQuantity - data.quantity;
    } else {
      newQuantity = data.quantity; // recount
    }

    // 2. Update inventory
    const [updatedInventory] = await db
      .update(inventory)
      .set({
        stock_on_hand: newQuantity,
        updated_at: new Date(),
      })
      .where(
        data.variant_id
          ? eq(inventory.variant_id, data.variant_id)
          : eq(inventory.product_id, data.product_id)
      )
      .returning();

    // 3. Publish inventory adjusted event
    try {
      await eventPublisher.publishInventoryAdjusted({
        productId: data.product_id,
        variantId: data.variant_id,
        oldQuantity,
        newQuantity,
        adjustmentType: data.adjustment_type,
        reason: data.reason,
        adjustedBy: req.user?.id || '',
      });

      // Check for low stock alert
      const lowStockThreshold = 10; // Example threshold
      if (newQuantity > 0 && newQuantity <= lowStockThreshold) {
        await eventPublisher.publishLowStockAlert({
          productId: data.product_id,
          variantId: data.variant_id,
          productName: 'Product Name', // Fetch from DB
          currentStock: newQuantity,
          threshold: lowStockThreshold,
        });
      } else if (newQuantity === 0) {
        await eventPublisher.publishOutOfStockAlert({
          productId: data.product_id,
          variantId: data.variant_id,
          productName: 'Product Name', // Fetch from DB
        });
      }

      logger.info('Inventory events published', {
        productId: data.product_id,
        newQuantity,
      });
    } catch (eventError) {
      logger.error('Failed to publish inventory events', {
        productId: data.product_id,
        error: eventError,
      });
    }

    res.json(
      ResponseFormatter.success(updatedInventory, 'Inventory adjusted successfully')
    );
  } catch (error) {
    next(error);
  }
};
```

---

## Implementation Checklist

### Orders
- [ ] Create Order API → Publish `ORDER_CREATED`
- [ ] Update Order Status → Publish `ORDER_PAID`, `ORDER_SHIPPED`, `ORDER_CANCELLED`
- [ ] Cancel Order → Publish `ORDER_CANCELLED`

### Payments
- [ ] Authorize Payment → Publish `PAYMENT_AUTHORIZED`
- [ ] Capture Payment → Publish `PAYMENT_CAPTURED`
- [ ] Payment Failed → Publish `PAYMENT_FAILED`
- [ ] Refund Payment → Publish `PAYMENT_REFUNDED`

### Inventory
- [ ] Reserve Inventory (on order) → Publish `INVENTORY_RESERVED`
- [ ] Release Inventory (on cancel) → Publish `INVENTORY_RELEASED`
- [ ] Adjust Inventory → Publish `INVENTORY_ADJUSTED`
- [ ] Stock Checks → Publish `LOW_STOCK_ALERT` / `OUT_OF_STOCK_ALERT`

---

## Best Practices

1. **Always wrap event publishing in try-catch**
   ```typescript
   try {
     await eventPublisher.publishOrderCreated({...});
   } catch (error) {
     logger.error('Event publishing failed', { error });
     // Don't throw - API should still succeed
   }
   ```

2. **Log all events for debugging**
   ```typescript
   logger.info('Event published', { type: 'ORDER_CREATED', orderId });
   ```

3. **Use typed event publisher methods**
   - ✅ `eventPublisher.publishOrderCreated()`
   - ❌ `eventPublisher.publishEvent('ORDER_CREATED', {})`

4. **Don't block API responses**
   - Events are processed asynchronously by workers
   - API should return immediately after DB operation

5. **Handle failures gracefully**
   - If event publishing fails, log it but don't fail the API
   - Workers have retry logic to handle transient failures

---

## Testing

```typescript
// Example test
it('should publish ORDER_CREATED event after creating order', async () => {
  const mockPublish = jest.spyOn(eventPublisher, 'publishOrderCreated');
  
  await createOrder(req, res, next);
  
  expect(mockPublish).toHaveBeenCalledWith(
    expect.objectContaining({
      orderId: expect.any(String),
      orderNumber: expect.any(String),
    })
  );
});
```

---

## What Happens Next?

1. **API creates order** → Returns response immediately
2. **Event published to queue** → BullMQ stores in Redis
3. **OrderWorker picks up job** → Processes in background
4. **Email sent** → Customer gets order confirmation
5. **Inventory reserved** → Stock levels updated
6. **Audit log created** → Action tracked for compliance

All of this happens **asynchronously** without blocking your API! 🚀
