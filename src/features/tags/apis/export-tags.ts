/**
 * POST /api/tags/export
 * Export tags with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as xlsx from 'xlsx';
import { and, between, inArray } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Export options schema
const exportSchema = z.object({
  scope: z.enum(['all', 'selected']),
  format: z.enum(['csv', 'xlsx']),
  selectedIds: z.array(z.string()).optional(),
  selectedColumns: z.array(z.string()),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
});

/**
 * Generate CSV string from data
 */
function generateCSV(data: any[], columns: string[]): string {
  if (data.length === 0) {
    return columns.join(',') + '\n';
  }

  const csvRows = [columns.join(',')];

  for (const row of data) {
    const values = columns.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Convert to string
      const stringValue = String(value);
      // Escape commas, quotes, and newlines
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

const handler = async (req: RequestWithUser, res: Response) => {
  // Validate request body
  const validation = exportSchema.safeParse(req.body);
  if (!validation.success) {
    throw new HttpException(400, 'Invalid request data', {
      details: validation.error.issues,
    });
  }

  const options = validation.data;

  // Build query conditions
  const conditions = [];

  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(tags.id, options.selectedIds));
  }

  if (options.dateRange?.from && options.dateRange?.to) {
    const toDate = new Date(options.dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    conditions.push(
      between(
        tags.created_at,
        new Date(options.dateRange.from),
        toDate
      )
    );
  }

  // Query data
  const query = db
    .select()
    .from(tags);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const data = await query;

  // Validate selected columns exist
  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Filter selected columns and format data
  const filteredData = data.map(tag => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      if (col in tag) {
        const value = tag[col as keyof typeof tag];
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString();
        }
        // Format booleans
        else if (typeof value === 'boolean') {
          filtered[col] = value ? 'Active' : 'Inactive';
        }
        else {
          filtered[col] = value;
        }
      }
    });
    return filtered;
  });

  // Generate file based on format
  let fileBuffer: Buffer;
  let contentType: string;
  let filename: string;
  const timestamp = new Date().toISOString().split('T')[0];

  switch (options.format) {
    case 'csv':
      const csvString = generateCSV(filteredData, options.selectedColumns);
      fileBuffer = Buffer.from(csvString, 'utf-8');
      contentType = 'text/csv';
      filename = `tags-export-${timestamp}.csv`;
      break;
    case 'xlsx':
      try {
        const worksheet = xlsx.utils.json_to_sheet(filteredData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Tags');

        // Set column widths
        const columnWidths = Object.keys(filteredData[0] || {}).map(() => ({ wch: 15 }));
        (worksheet as any)['!cols'] = columnWidths;

        fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `tags-export-${timestamp}.xlsx`;
      } catch (error) {
        // Log the error (assuming logger exists, otherwise console.error)
        console.error('Excel generation failed:', error);
        throw new HttpException(500, 'Failed to generate Excel file');
      }
      break;
    default:
      return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Unsupported export format', 400);
  }

  // Set response headers for file download
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(fileBuffer.length));
  return res.send(fileBuffer);
};

const router = Router();
router.post('/', requireAuth, requirePermission('tags:read'), handler);

export default router;
