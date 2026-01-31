import { Router, Response, Request, NextFunction } from 'express';
import { requireAuth } from '../../../middlewares';
import { HttpException } from '../../../utils';
import { invoiceService } from '../services/invoice.service';
import { downloadFromStorage } from '../../../utils/supabaseStorage';

/**
 * GET /api/invoices/:versionId/download
 * Download invoice PDF from storage
 */
const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { versionId } = req.params as { versionId: string };

    // Get invoice version
    const invoiceData = await invoiceService.getInvoiceByVersionId(versionId);
    const invoiceVersion = invoiceData.version;

    if (!invoiceVersion) {
      throw new HttpException(404, 'Invoice version not found');
    }

    if (!invoiceVersion.pdf_path) {
      throw new HttpException(404, 'PDF not generated for this invoice version');
    }

    // Download from storage
    const storageResult = await downloadFromStorage(invoiceVersion.pdf_path);

    // Set headers for download
    res.setHeader('Content-Type', storageResult.contentType);
    res.setHeader('Content-Length', storageResult.contentLength.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceVersion.invoice_number}.pdf"`);

    // Send file
    res.send(storageResult.blob);
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.get('/:versionId/download', requireAuth, handler);

export default router;
