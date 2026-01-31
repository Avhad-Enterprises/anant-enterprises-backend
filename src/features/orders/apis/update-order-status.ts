/**
 * PUT /api/admin/orders/:id/status
 * Admin: Update order status
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../shared/orders.schema';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
// import { eventPublisher } from '../../queue/services/event-publisher.service';
import { fulfillOrderInventory } from '../../inventory/services/inventory.service';
import { notificationService } from '../../notifications/services/notification.service';
import { auditService } from '../../audit/services/audit.service';
import { AuditAction, AuditResourceType } from '../../audit/shared/interface';
import { logger } from '../../../utils';

// Get base URL from environment for email links
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const updateStatusSchema = z.object({
    order_status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    payment_status: z.enum(['pending', 'authorized', 'partially_paid', 'paid', 'refunded', 'failed', 'partially_refunded']).optional(),
    fulfillment_status: z.enum(['unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled']).optional(),
    order_tracking: z.string().max(200).optional(),
    admin_comment: z.string().max(500).optional(),
}).refine(
    data => data.order_status || data.payment_status || data.fulfillment_status,
    { message: 'At least one status field must be provided' }
);

// Valid status transitions
const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'returned'],
    'delivered': ['refunded'],
    'cancelled': ['refunded'],
    'refunded': [],
};

const handler = async (req: RequestWithUser, res: Response) => {
    const userId = req.userId;
    const orderId = req.params.id as string;

    // Validate order ID format
    if (!z.string().uuid().safeParse(orderId).success) {
        throw new HttpException(400, 'Invalid order ID format');
    }

    if (!userId) {
        throw new HttpException(401, 'Authentication required');
    }

    const body = updateStatusSchema.parse(req.body);

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

    // Validate order status transition
    if (body.order_status && body.order_status !== order.order_status) {
        const allowedTransitions = validTransitions[order.order_status] || [];
        if (!allowedTransitions.includes(body.order_status)) {
            throw new HttpException(400, `Cannot transition from "${order.order_status}" to "${body.order_status}". Allowed: ${allowedTransitions.join(', ') || 'none'}`);
        }
    }

    // Build update object
    const updateData: Partial<typeof orders.$inferInsert> = {
        updated_at: new Date(),
        updated_by: userId,
    };

    if (body.order_status) {
        updateData.order_status = body.order_status;

        // Auto-update fulfillment status based on order status
        if (body.order_status === 'delivered') {
            updateData.fulfillment_status = 'fulfilled';
            updateData.fulfillment_date = new Date();
            updateData.delivery_date = new Date();
        } else if (body.order_status === 'cancelled') {
            updateData.fulfillment_status = 'cancelled';
        }
    }

    if (body.payment_status) {
        updateData.payment_status = body.payment_status;
        if (body.payment_status === 'paid') {
            updateData.paid_at = new Date();
        }
    }

    if (body.fulfillment_status) {
        updateData.fulfillment_status = body.fulfillment_status;
    }

    if (body.order_tracking) {
        updateData.order_tracking = body.order_tracking;
    }

    if (body.admin_comment) {
        updateData.admin_comment = body.admin_comment;
    }

    // Update order
    await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId));

    // Audit Log
    try {
        let action = AuditAction.UPDATE;
        if (body.order_status === 'shipped') action = AuditAction.ORDER_SHIPPED;
        else if (body.order_status === 'delivered') action = AuditAction.ORDER_DELIVERED;
        else if (body.order_status === 'cancelled') action = AuditAction.ORDER_CANCELLED;
        else if (body.order_status === 'refunded') action = AuditAction.ORDER_REFUNDED;
        else if (body.payment_status === 'paid') action = AuditAction.ORDER_PAID;

        await auditService.log({
            userId,
            action,
            resourceType: AuditResourceType.ORDER,
            resourceId: orderId,
            oldValues: {
                order_status: order.order_status,
                payment_status: order.payment_status,
                fulfillment_status: order.fulfillment_status,
            },
            newValues: body,
            metadata: {
                orderNumber: order.order_number,
                updateReason: 'Admin Status Update'
            }
        }, {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    } catch (error) {
        logger.error('Failed to create audit log for order status update', { error, orderId });
    }

    // STEP: Fulfill inventory when order is shipped
    if (body.order_status === 'shipped') {
        try {
            await fulfillOrderInventory(orderId, userId);
            logger.info(`Inventory fulfilled for order ${order.order_number}`);
        } catch (error: any) {
            // Log error but don't block order status update
            logger.error('Failed to fulfill inventory:', error);
            // In production: Send alert to admin for manual reconciliation
        }
    }

    // Send notifications based on status changes
    try {
        if (body.order_status && body.order_status !== order.order_status) {
            // Specific Status Notifications
            if (body.order_status === 'shipped') {
                await notificationService.createFromTemplate(
                    order.user_id!,
                    'order_shipped',
                    {
                        orderId: order.id,
                        orderNumber: order.order_number,
                        trackingNumber: body.order_tracking || 'Not available',
                        customerName: 'Customer',
                    },
                    {
                        actionUrl: `/profile/orders/${order.id}`,
                        actionText: 'Track Order',
                        priority: 'high'
                    }
                );
            } else if (body.order_status === 'delivered') {
                await notificationService.createFromTemplate(
                    order.user_id!,
                    'order_delivered',
                    {
                        orderId: order.id,
                        orderNumber: order.order_number,
                        customerName: 'Customer',
                    },
                    {
                        actionUrl: `/profile/orders/${order.id}`,
                        actionText: 'View Order',
                        priority: 'normal'
                    }
                );
            } else if (body.order_status === 'cancelled') {
                await notificationService.createFromTemplate(
                    order.user_id!,
                    'order_cancelled',
                    {
                        orderId: order.id,
                        orderNumber: order.order_number,
                        customerName: 'Customer',
                    },
                    {
                        actionUrl: `/profile/orders/${order.id}`,
                        actionText: 'View Order',
                        priority: 'high'
                    }
                );
            }
        }
    } catch (error) {
        logger.error('Failed to send order status notification:', error);
    }

    // Fetch updated order
    const [updatedOrder] = await db
        .select({
            id: orders.id,
            order_number: orders.order_number,
            order_status: orders.order_status,
            payment_status: orders.payment_status,
            fulfillment_status: orders.fulfillment_status,
            order_tracking: orders.order_tracking,
        })
        .from(orders)
        .where(eq(orders.id, orderId));

    return ResponseFormatter.success(res, updatedOrder, 'Order status updated successfully');
};

const router = Router();
router.put('/admin/orders/:id/status', requireAuth, requirePermission('orders:update'), handler);

export default router;
