import { Router, Response, Request, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { invoiceService } from '../services/invoice.service';
import { eventPublisher } from '../../queue/services/event-publisher.service';

const router = Router();

/**
 * GET /api/admin/orders/:id/invoices
 * List all invoices and versions for an order
 */
router.get(
  '/orders/:id/invoices',
  requireAuth,
  requirePermission('admin:system'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: orderId } = req.params as { id: string };
      const invoices = await invoiceService.getInvoicesForOrder(orderId);
      // Note: ResponseFormatter.success second argument is data, third is message
      ResponseFormatter.success(res, invoices, 'Invoices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/orders/:id/invoices
 * Trigger generation of a new invoice version
 */
router.post(
  '/orders/:id/invoices',
  requireAuth,
  requirePermission('admin:system'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: orderId } = req.params as { id: string };
      const { reason } = req.body;

      await eventPublisher.publishGenerateInvoice({
        orderId,
        reason: reason || 'CORRECTION',
        triggeredBy: req.userId || 'admin',
      });

      ResponseFormatter.success(res, null, 'Invoice generation triggered');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/invoices/:versionId/email
 * Manually resend invoice email
 */
router.post(
  '/invoices/:versionId/email',
  requireAuth,
  requirePermission('admin:system'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { versionId } = req.params as { versionId: string };

      const invoiceData = await invoiceService.getInvoiceByVersionId(versionId);

      if (!invoiceData || !invoiceData.version) {
        throw new HttpException(404, 'Invoice version not found');
      }

      if (!invoiceData.version.pdf_url) {
        throw new HttpException(400, 'Invoice PDF not generated yet');
      }

      // Trigger email
      // Dynamic import to avoid circular dependency if needed, but here we can import directly as it is in a route handler
      // But eventPublisher is already imported at top level which is fine for route handlers (lazy loaded essentially)

      await eventPublisher.publishEmailNotification({
        to: invoiceData.version.customer_email,
        subject: `Invoice #${invoiceData.version.invoice_number} (Resent)`,
        template: 'invoice_generated',
        templateData: {
          customerName: invoiceData.version.customer_name,
          orderNumber: invoiceData.order_id, // Accessing order_id from invoice parent
          invoiceNumber: invoiceData.version.invoice_number,
          date: new Date(invoiceData.version.created_at).toLocaleDateString(),
        },
        attachments: [
          {
            filename: `${invoiceData.version.invoice_number}.pdf`,
            path: invoiceData.version.pdf_url,
          },
        ],
        priority: 2,
      });

      ResponseFormatter.success(res, null, 'Invoice email resent successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
