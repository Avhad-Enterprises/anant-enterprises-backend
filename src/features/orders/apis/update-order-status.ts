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
    order_status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned']).optional(),
    payment_status: z.enum(['pending', 'paid', 'refunded', 'failed', 'partially_refunded']).optional(),
    fulfillment_status: z.enum(['unfulfilled', 'fulfilled', 'returned', 'cancelled']).optional(),
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
    'cancelled': ['refunded'], // Allow refund after cancellation if payment was captured
    'refunded': [],
    'returned': ['refunded']
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

    // 1. Validate Order Status Transition
    if (body.order_status && body.order_status !== order.order_status) {
        // Allow admin to bypass transition rules if needed? For now, strict.
        const allowedTransitions = validTransitions[order.order_status] || [];

        // Special Case: Allow 'cancelled' -> 'pending' (Re-open) or similar manual overrides? 
        // For now, adhere to strict business rules.

        if (!allowedTransitions.includes(body.order_status)) {
            throw new HttpException(400, `Cannot change status from "${order.order_status}" to "${body.order_status}". Allowed transitions: ${allowedTransitions.join(', ') || 'None (Terminal State)'}`);
        }

        // REQUIREMENT: Tracking Number for 'Shipped'
        if (body.order_status === 'shipped') {
            // Check if tracking is provided in this request OR already exists
            const hasTracking = body.order_tracking || order.order_tracking;
            if (!hasTracking) {
                throw new HttpException(400, 'Tracking number is required when marking an order as Shipped.');
            }
        }
    }

    // 2. Validate Payment Status
    if (body.payment_status && body.payment_status !== order.payment_status) {
        // Prevent setting 'refunded' if it wasn't paid/partially_paid? 
        if (body.payment_status === 'refunded' && !['paid', 'partially_paid'].includes(order.payment_status)) {
            throw new HttpException(400, 'Cannot mark as Refunded if the order was never Paid.');
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
            updateData.fulfillment_date = new Date(); // Actual delivery date
            if (!order.delivery_date) updateData.delivery_date = new Date();
        } else if (body.order_status === 'shipped') {
            // Simplified: If marked shipped, assume fulfillment started/completed.
            if (order.fulfillment_status === 'unfulfilled') {
                updateData.fulfillment_status = 'fulfilled'; // Changed from 'partial' to 'fulfilled' to match schema
            }
        } else if (body.order_status === 'cancelled') {
            updateData.fulfillment_status = 'cancelled';

            // INVENTORY: Release reservation if not yet shipped
            if (order.fulfillment_status === 'unfulfilled') {
                try {
                    // Need to import dynamically or ensure import exists
                    const { releaseReservation } = await import('../../inventory/services/inventory.service');
                    await releaseReservation(orderId, userId!);
                    logger.info(`Inventory reservation released for cancelled order ${order.order_number}`);
                } catch (err) {
                    logger.error('Failed to release inventory reservation:', err);
                }
            }
            // If already shipped/fulfilled, cancellation implies return logic might be needed manually or via 'returned' status
        } else if (body.order_status === 'returned') {
            updateData.fulfillment_status = 'returned';

            // INVENTORY: Process return (restock)
            try {
                const { processOrderReturn } = await import('../../inventory/services/inventory.service');
                await processOrderReturn(orderId, userId!);
                logger.info(`Inventory restocked for returned order ${order.order_number}`);
            } catch (err) {
                logger.error('Failed to restock inventory on return:', err);
            }
        }
    }

    if (body.payment_status) {
        updateData.payment_status = body.payment_status;
        if (body.payment_status === 'paid' && !order.paid_at) {
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

        // Determine specific change description
        let prompt = "Admin Status Update";
        if (body.order_status === 'cancelled' && body.admin_comment) prompt = `Cancelled: ${body.admin_comment}`;

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
                updateReason: prompt
            }
        }, {
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    } catch (error) {
        logger.error('Failed to create audit log for order status update', { error, orderId });
    }

    // STEP: Fulfill inventory when order is shipped
    // NOTE: This might need to be smarter. If it's already fulfilled, don't run again.
    if (body.order_status === 'shipped' && order.order_status !== 'shipped') {
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
                        trackingNumber: body.order_tracking || order.order_tracking || 'Not available',
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
            admin_comment: orders.admin_comment,
        })
        .from(orders)
        .where(eq(orders.id, orderId));

    return ResponseFormatter.success(res, updatedOrder, 'Order status updated successfully');
};

const router = Router();
router.put('/admin/orders/:id/status', requireAuth, requirePermission('orders:update'), handler);

export default router;
