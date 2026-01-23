import { Router, Response } from 'express';
import { z } from 'zod';
import xlsx from 'xlsx';
import { and, between, inArray } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
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

export const exportTagsRouter = Router();

/**
 * Generate CSV string from data
 */
function generateCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
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

/**
 * Generate Excel buffer from data
 */
function generateExcel(data: any[]): Buffer {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Tags');
  
  // Set column widths
  const columnWidths = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
  worksheet['!cols'] = columnWidths;
  
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * POST /api/tags/export
 * Export tags with various filters and formats
 */
exportTagsRouter.post(
  '/',
  requireAuth,
  requirePermission('tags:read'),
  async (req: RequestWithUser, res: Response) => {
    try {
      const options = exportSchema.parse(req.body);

    // Build query conditions
    const conditions = [];
    
    if (options.scope === 'selected' && options.selectedIds?.length) {
      conditions.push(inArray(tags.id, options.selectedIds));
    }
    
    if (options.dateRange?.from && options.dateRange?.to) {
      conditions.push(
        between(
          tags.created_at, 
          new Date(options.dateRange.from), 
          new Date(options.dateRange.to)
        )
      );
    }

    // Query data - only selected columns
    const query = db
      .select()
      .from(tags);
    
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const data = await query;

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

    if (filteredData.length === 0) {
      // Return empty file with headers only
      const emptyRow: any = {};
      options.selectedColumns.forEach(col => {
        emptyRow[col] = '';
      });
      filteredData.push(emptyRow);
    }

    // Generate file based on format
    let fileBuffer: Buffer;
    let contentType: string;
    let filename: string;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (options.format) {
      case 'csv':
        const csvString = generateCSV(filteredData);
        fileBuffer = Buffer.from(csvString, 'utf-8');
        contentType = 'text/csv';
        filename = `tags-export-${timestamp}.csv`;
        break;
      case 'xlsx':
        fileBuffer = generateExcel(filteredData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `tags-export-${timestamp}.xlsx`;
        break;
      default:
        throw new Error('Unsupported format');
    }

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    res.send(fileBuffer);
    } catch (error: any) {
      ResponseFormatter.error(res, 'EXPORT_FAILED', error.message || 'Export failed', 500);
    }
  }
);
