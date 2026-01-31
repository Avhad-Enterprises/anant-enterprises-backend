/**
 * POST /api/webhooks/razorpay
 *
 * Handles asynchronous payment events from Razorpay.
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR PAYMENT STATUS.
 *
 * The client-side /verify endpoint marks payments as 'paid'.
 * This webhook handler is responsible for:
 * - Confirming payments (marking as 'paid' / 'captured')
 * - Recording payment failures
 * - Processing refunds
 *
 * Supported Events:
 * - payment.authorized: Payment authorized (treated as captured)
 * - payment.captured: Payment successfully captured (SOURCE OF TRUTH)
 * - payment.failed: Payment attempt failed
 * - refund.processed: Refund successfully processed
 * - refund.failed: Refund failed
 * - order.paid: Order fully paid
 *
 * SECURITY:
 * - Verifies webhook signature before processing
 * - Uses idempotency to prevent duplicate processing
 * - Wraps all updates in database transactions
 * - Returns 200 OK even on processing errors (to prevent infinite retries)
 */

import { Router, Request, Response } from 'express';
import { eq, and, inArray, ne } from 'drizzle-orm';
import { logger } from '../../../utils';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { paymentTransactions } from '../shared/payment-transactions.schema';
import { paymentWebhookLogs } from '../shared/webhook-logs.schema';
import { RazorpayService } from '../services/razorpay.service';
import { eventPublisher } from '../../queue/services/event-publisher.service';
import {
  IRazorpayWebhookEvent,
  IRazorpayPaymentEntity,
  IRazorpayRefundEntity,
} from '../shared/interface';

// ============================================
// SUPPORTED EVENTS
// ============================================

const SUPPORTED_EVENTS = [
  'payment.authorized',
  'payment.captured',
  'payment.failed',
  'refund.processed',
  'refund.failed',
  'order.paid',
] as const;

type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

// ============================================
// HANDLER
// ============================================

const handler = async (req: Request, res: Response) => {
  // Get raw body and signature
  const rawBody = (req as Request & { rawBody?: string }).rawBody;
  const signature = req.headers['x-razorpay-signature'] as string;

  // Validate required headers
  if (!signature) {
    logger.warn('Webhook received without signature');
    return res.status(401).json({ status: 'error', message: 'Missing signature' });
  }

  if (!rawBody) {
    logger.error('Webhook received without raw body - check middleware configuration');
    return res.status(400).json({ status: 'error', message: 'Missing body' });
  }

  // Parse the event FIRST (before signature check to get event details for logging)
  let event: IRazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    logger.warn('Failed to parse webhook body');
    return res.status(400).json({ status: 'error', message: 'Invalid JSON' });
  }

  const eventType = event.event as SupportedEvent;

  // Extract references for idempotency and logging
  const razorpayOrderId =
    event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
  const razorpayPaymentId =
    event.payload?.payment?.entity?.id || event.payload?.refund?.entity?.payment_id;

  // Create unique event identifier for idempotency
  // Use payment_id + event_type for uniqueness (same payment can have multiple event types)
  const eventIdentifier = `${razorpayPaymentId || razorpayOrderId}_${eventType}`;

  // Verify signature FIRST
  const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);

  // Log webhook receipt with idempotency protection
  // Use INSERT ... ON CONFLICT DO UPDATE to handle race conditions atomically
  let webhookLogId: string | null = null;
  try {
    const [inserted] = await db
      .insert(paymentWebhookLogs)
      .values({
        event_id: eventIdentifier,
        event_type: eventType,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        raw_payload: event,
        signature_verified: isValid,
        received_at: new Date(),
      })
      .onConflictDoUpdate({
        target: paymentWebhookLogs.event_id,
        set: {
          received_at: new Date(),
        },
      })
      .returning({ id: paymentWebhookLogs.id, processed: paymentWebhookLogs.processed });

    webhookLogId = inserted?.id || null;

    // Check if already processed (idempotency)
    if (inserted?.processed) {
      logger.info('Webhook already processed (idempotency hit)', {
        eventType,
        razorpayPaymentId,
        eventIdentifier,
      });
      return res.status(200).json({ status: 'already_processed' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to log webhook', { error: errorMessage });
    // Return 200 to prevent webhook retries on database errors
    return res.status(200).json({ status: 'error', message: 'Database error' });
  }

  // Reject invalid signatures
  if (!isValid) {
    logger.error('Webhook signature verification failed', {
      eventType,
      razorpayOrderId,
    });
    return res.status(401).json({ status: 'error', message: 'Invalid signature' });
  }

  // Check if event type is supported
  if (!SUPPORTED_EVENTS.includes(eventType as SupportedEvent)) {
    logger.info('Ignoring unsupported webhook event', { eventType });
    return res.status(200).json({ status: 'ignored', message: 'Unsupported event type' });
  }

  // Process the event
  try {
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment!.entity);
        break;

      case 'payment.authorized':
        await handlePaymentAuthorized(event.payload.payment!.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment!.entity);
        break;

      case 'refund.processed':
        await handleRefundProcessed(event.payload.refund!.entity);
        break;

      case 'refund.failed':
        await handleRefundFailed(event.payload.refund!.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(event.payload.order!.entity);
        break;

      default:
        logger.info('Unhandled event type', { eventType });
    }

    // Mark webhook as processed
    if (webhookLogId) {
      await db
        .update(paymentWebhookLogs)
        .set({
          processed: true,
          processed_at: new Date(),
        })
        .where(eq(paymentWebhookLogs.id, webhookLogId));
    }

    logger.info('Webhook processed successfully', {
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
    });

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Webhook processing error', {
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
      error: errorMessage,
    });

    // Log error but return 200 to prevent Razorpay retries
    if (webhookLogId) {
      await db
        .update(paymentWebhookLogs)
        .set({
          processing_error: errorMessage,
          retry_count: 1,
        })
        .where(eq(paymentWebhookLogs.id, webhookLogId));
    }

    // Return 200 to prevent infinite retries for application errors
    return res.status(200).json({ status: 'error', message: errorMessage });
  }
};

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle payment.captured event
 * THIS IS THE SOURCE OF TRUTH - marks payment as 'paid'
 */
async function handlePaymentCaptured(payment: IRazorpayPaymentEntity) {
  const { id: paymentId, order_id: razorpayOrderId, amount, method } = payment;

  logger.info('Processing payment.captured (source of truth)', {
    paymentId,
    razorpayOrderId,
    amount,
    method,
  });

  // Find the transaction first (outside transaction for read)
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.razorpay_order_id, razorpayOrderId))
    .limit(1);

  if (!transaction) {
    logger.warn('Transaction not found for captured payment', { razorpayOrderId });
    return;
  }

  // Skip if already captured (idempotency)
  if (transaction.status === 'captured' && transaction.webhook_verified) {
    logger.info('Transaction already captured, skipping', { razorpayOrderId });
    return;
  }

  // SECURITY: Verify payment amount matches expected order amount
  // This is critical to prevent amount manipulation attacks
  const expectedAmountPaise = Math.round(Number(transaction.amount) * 100);
  if (amount !== expectedAmountPaise) {
    logger.error('SECURITY ALERT: Payment amount mismatch detected!', {
      razorpayOrderId,
      paymentId,
      expectedAmountPaise,
      actualAmountPaise: amount,
      transactionId: transaction.id,
      orderId: transaction.order_id,
    });

    // Mark transaction as failed due to amount mismatch
    await db
      .update(paymentTransactions)
      .set({
        status: 'failed',
        error_code: 'AMOUNT_MISMATCH',
        error_description: `Expected ${expectedAmountPaise} paise but received ${amount} paise`,
        webhook_verified: true,
        webhook_received_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    // Do NOT update order to paid - this is a security issue
    return;
  }

  // Use transaction for atomic updates
  await db.transaction(async tx => {
    // Update transaction to 'captured' (final status)
    await tx
      .update(paymentTransactions)
      .set({
        status: 'captured',
        razorpay_payment_id: paymentId,
        payment_method: method,
        payment_method_details: extractPaymentMethodDetails(payment),
        webhook_verified: true,
        webhook_received_at: new Date(),
        verified_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    // Update order to 'paid' and 'confirmed' (SOURCE OF TRUTH)
    await tx
      .update(orders)
      .set({
        payment_status: 'paid',
        order_status: 'confirmed',
        transaction_id: paymentId,
        paid_at: new Date(),
        last_payment_error: null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(orders.id, transaction.order_id),
          // Only update if not already in final state
          ne(orders.payment_status, 'refunded')
        )
      );
  });

  logger.info('Payment captured - order confirmed (SOURCE OF TRUTH)', {
    orderId: transaction.order_id,
    paymentId,
    amount: amount / 100, // Convert paise to rupees for logging
  });

  // Explicit console log for development visibility
  console.log('---------------------------------------------------');
  console.log(`💰 PAYMENT CAPTURED - ORDER CONFIRMED`);
  console.log(`📄 Order ID: ${transaction.order_id}`);
  console.log(`💳 Payment ID: ${paymentId}`);
  console.log(`💵 Amount: ₹${amount / 100}`);
  console.log('---------------------------------------------------');

  // Trigger invoice generation
  await eventPublisher.publishGenerateInvoice({
    orderId: transaction.order_id,
    reason: 'INITIAL',
    triggeredBy: 'system',
  });
}

/**
 * Handle payment.authorized event (now treated as payment capture)
 */
async function handlePaymentAuthorized(payment: IRazorpayPaymentEntity) {
  const { id: paymentId, order_id: razorpayOrderId } = payment;

  logger.info('Processing payment.authorized (treating as captured)', { paymentId, razorpayOrderId });

  // Find the transaction first
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.razorpay_order_id, razorpayOrderId))
    .limit(1);

  if (!transaction) {
    logger.warn('Transaction not found for authorized payment', { razorpayOrderId });
    return;
  }

  // Skip if already in a terminal state
  if (['captured', 'refunded'].includes(transaction.status)) {
    logger.info('Transaction already in terminal state, skipping payment processing', { razorpayOrderId });
    return;
  }

  await db.transaction(async tx => {
    await tx
      .update(paymentTransactions)
      .set({
        status: 'captured',
        razorpay_payment_id: paymentId,
        webhook_received_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    // Update order to paid status (if not already paid)
    await tx
      .update(orders)
      .set({
        payment_status: 'paid',
        updated_at: new Date(),
      })
      .where(
        and(
          eq(orders.id, transaction.order_id),
          inArray(orders.payment_status, ['pending', 'failed'])
        )
      );
  });
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payment: IRazorpayPaymentEntity) {
  const {
    id: paymentId,
    order_id: razorpayOrderId,
    error_code,
    error_description,
    error_source,
    error_step,
    error_reason,
  } = payment;

  logger.info('Processing payment.failed', {
    paymentId,
    razorpayOrderId,
    errorCode: error_code,
    errorDescription: error_description,
  });

  // Find the transaction first
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.razorpay_order_id, razorpayOrderId))
    .limit(1);

  if (!transaction) {
    logger.warn('Transaction not found for failed payment', { razorpayOrderId });
    return;
  }

  // Skip if already in a success state (failure arrived out of order)
  if (['captured', 'refunded'].includes(transaction.status)) {
    logger.info('Transaction already in success state, ignoring failure', { razorpayOrderId });
    return;
  }

  await db.transaction(async tx => {
    await tx
      .update(paymentTransactions)
      .set({
        status: 'failed',
        razorpay_payment_id: paymentId,
        error_code,
        error_description,
        error_source,
        error_step,
        error_reason,
        webhook_received_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    await tx
      .update(orders)
      .set({
        payment_status: 'failed',
        last_payment_error: error_description || error_reason || 'Payment failed',
        updated_at: new Date(),
      })
      .where(
        and(
          eq(orders.id, transaction.order_id),
          // Only mark as failed if not already paid
          inArray(orders.payment_status, ['pending'])
        )
      );
  });
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(refund: IRazorpayRefundEntity) {
  const { id: refundId, payment_id: paymentId, amount } = refund;

  logger.info('Processing refund.processed', { refundId, paymentId, amount });

  // Find the transaction first
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.razorpay_payment_id, paymentId))
    .limit(1);

  if (!transaction) {
    logger.warn('Transaction not found for refund', { paymentId });
    return;
  }

  const refundAmount = amount / 100; // Convert paise to rupees
  const previousRefund = Number(transaction.refund_amount || 0);
  const totalRefunded = previousRefund + refundAmount;
  const orderAmount = Number(transaction.amount);

  const isFullRefund = totalRefunded >= orderAmount;

  await db.transaction(async tx => {
    await tx
      .update(paymentTransactions)
      .set({
        status: isFullRefund ? 'refunded' : 'partially_refunded',
        refund_id: refundId,
        refund_amount: totalRefunded.toFixed(2),
        refunded_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));

    await tx
      .update(orders)
      .set({
        payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
        order_status: isFullRefund ? 'refunded' : undefined,
        updated_at: new Date(),
      })
      .where(eq(orders.id, transaction.order_id));
  });
}

/**
 * Handle refund.failed event
 */
async function handleRefundFailed(refund: IRazorpayRefundEntity) {
  const { id: refundId, payment_id: paymentId } = refund;

  logger.warn('Refund failed', { refundId, paymentId });

  // Log for admin review - refund failure needs manual intervention
  const [transaction] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.razorpay_payment_id, paymentId))
    .limit(1);

  if (transaction) {
    await db
      .update(paymentTransactions)
      .set({
        error_description: 'Refund failed - manual review required',
        updated_at: new Date(),
      })
      .where(eq(paymentTransactions.id, transaction.id));
  }
}

/**
 * Handle order.paid event
 * Secondary confirmation - ensures order is marked paid even if payment.captured was missed
 */
async function handleOrderPaid(order: { id: string; amount_paid: number; status: string }) {
  const { id: razorpayOrderId, amount_paid, status } = order;

  logger.info('Processing order.paid', { razorpayOrderId, amountPaid: amount_paid, status });

  // Find the order first
  const [dbOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpay_order_id, razorpayOrderId))
    .limit(1);

  if (!dbOrder) {
    logger.warn('Order not found for order.paid event', { razorpayOrderId });
    return;
  }

  // Ensure order is marked as paid (backup for payment.captured)
  if (dbOrder.payment_status !== 'paid' && dbOrder.payment_status !== 'refunded') {
    await db.transaction(async tx => {
      await tx
        .update(orders)
        .set({
          payment_status: 'paid',
          order_status: 'confirmed',
          paid_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(orders.id, dbOrder.id));
    });

    logger.info('Order status updated via order.paid event (backup)', {
      orderId: dbOrder.id,
      previousStatus: dbOrder.payment_status,
    });

    // Trigger invoice generation (backup trigger)
    await eventPublisher.publishGenerateInvoice({
      orderId: dbOrder.id,
      reason: 'INITIAL',
      triggeredBy: 'system',
    });
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Extract payment method details for storage
 */
function extractPaymentMethodDetails(payment: IRazorpayPaymentEntity): Record<string, unknown> {
  const { method, card, vpa, bank, wallet } = payment;

  switch (method) {
    case 'card':
      return {
        card_id: card?.id,
        network: card?.network,
        last4: card?.last4,
        issuer: card?.issuer,
        type: card?.type,
      };
    case 'upi':
      return {
        vpa,
      };
    case 'netbanking':
      return {
        bank_code: bank,
      };
    case 'wallet':
      return {
        wallet,
      };
    default:
      return { method };
  }
}

// ============================================
// ROUTER
// ============================================

const router = Router();

// Note: Raw body parsing is handled in app.ts middleware
router.post('/', handler);

export default router;
