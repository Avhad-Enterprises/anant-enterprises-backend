import { Router } from 'express';
import { z } from 'zod';
import { ResponseFormatter } from '../../../utils';
import { requireAuth, requirePermission } from '../../../middlewares';
import { HttpException } from '../../../utils';
import {
  queryProductsForExport,
  formatProductExportData,
  transformArraysForExcel,
} from '../services/product-export.service';
import {
  baseExportSchema,
  generateCSV,
  generateExcelBuffer,
  sendFileResponse,
} from '../../../utils/import-export';

/**
 * Product export schema with product-specific fields
 */
const productExportSchema = baseExportSchema.extend({
  scope: z.enum(['all', 'selected']).optional().default('all'),
  selectedIds: z.array(z.string()).optional().default([]),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  categoryId: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
  selectedColumns: z.array(z.string()).min(1, 'At least one column must be selected'),
});

/**
 * Export Products Handler
 * Exports products based on filters and selected columns
 */
const handler = async (req: any, res: any) => {
  try {
    // Validate request
    const validationResult = productExportSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return ResponseFormatter.error(
        res,
        'VALIDATION_ERROR',
        'Invalid export options',
        400
      );
    }

    const options = validationResult.data;

    // Validate selected columns
    if (options.selectedColumns.length === 0) {
      throw new HttpException(400, 'Please select at least one column to export.');
    }

    // Query products based on filters
    const queryOptions = {
      scope: options.scope,
      selectedIds: options.selectedIds,
      startDate: options.startDate,
      endDate: options.endDate,
      status: options.status,
      categoryId: options.categoryId,
      search: options.search,
    };

    const data = await queryProductsForExport(queryOptions);

    // Format data based on selected columns
    const formattedData = formatProductExportData(data, {
      selectedColumns: options.selectedColumns,
    });

    // Generate file based on format
    const timestamp = new Date().toISOString().split('T')[0];
    let fileBuffer: Buffer;
    let filename: string;

    switch (options.format) {
      case 'csv':
        const csvString = generateCSV(formattedData, options.selectedColumns);
        fileBuffer = Buffer.from(csvString, 'utf-8');
        filename = `products-export-${timestamp}.csv`;
        break;

      case 'xlsx':
        // Transform arrays to strings for Excel compatibility
        const excelData = transformArraysForExcel(formattedData);
        
        fileBuffer = await generateExcelBuffer(excelData, options.selectedColumns);
        filename = `products-export-${timestamp}.xlsx`;
        break;

      default:
        return ResponseFormatter.error(
          res,
          'UNSUPPORTED_FORMAT',
          'Unsupported export format',
          400
        );
    }

    // Send file response
    return sendFileResponse(res, fileBuffer, {
      format: options.format,
      filename: filename.replace(/\.[^/.]+$/, ''), // Remove extension, will be added by helper
      includeTimestamp: false, // We already added timestamp
    });
  } catch (error: any) {
    console.error('Product export failed:', error);
    
    if (error instanceof HttpException) {
      return ResponseFormatter.error(res, 'EXPORT_ERROR', error.message, error.status);
    }
    
    return ResponseFormatter.error(
      res,
      'EXPORT_ERROR',
      'Failed to export products',
      500
    );
  }
};

const router = Router();
router.post('/export', requireAuth, requirePermission('products:read'), handler);

export default router;
