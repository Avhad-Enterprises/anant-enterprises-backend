import { Router, Response, Request, NextFunction } from 'express';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException, logger } from '../../../utils';
import { invoiceService } from '../services/invoice.service';
import { db } from '../../../database';
import { orders } from '../../orders/shared/orders.schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/orders/:id/invoices/latest
 * Get latest invoice for order
 */
const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orderId } = req.params as { id: string };

    let invoiceData;

    try {
      invoiceData = await invoiceService.getLatestInvoiceForOrder(orderId);
    } catch (error) {
      // If invoice not found, ignore error and try lazy generation
      if (error instanceof HttpException && error.status === 404) {
        logger.info('Invoice not found via getLatestInvoiceForOrder, attempting lazy generation', {
          orderId,
        });
        invoiceData = null;
      } else {
        throw error;
      }
    }

    if (!invoiceData) {
      // Lazy generation: If invoice doesn't exist but order is paid, generate it now
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

      if (order && order.payment_status === 'paid') {
        logger.info('Lazy triggering invoice generation for paid order', { orderId });
        invoiceData = await invoiceService.generateInvoice(orderId);
      } else {
        logger.warn('Invoice not found and order not eligible for lazy generation', {
          orderId,
          paymentStatus: order?.payment_status,
        });
        throw new HttpException(404, 'Invoice not found');
      }
    }

    ResponseFormatter.success(res, invoiceData, 'Invoice retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.get('/orders/:id/invoices/latest', requireAuth, handler);

export default router;
