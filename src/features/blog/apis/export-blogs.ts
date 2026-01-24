/**
 * POST /api/blogs/export
 * Export blogs with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import xlsx from 'xlsx';
import { and, between, inArray, eq } from 'drizzle-orm';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { blogs } from '../shared/blog.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Export options schema
const exportSchema = z.object({
  scope: z.enum(['all', 'selected']),
  format: z.enum(['csv', 'xlsx']),
  selectedIds: z.array(z.string()).optional(),
  selectedColumns: z.array(z.string()),
  filters: z.object({
    status: z.enum(['public', 'private', 'draft']).optional(),
    category: z.string().optional(),
    author: z.string().optional(),
  }).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    field: z.enum(['created_at', 'published_at']).optional().default('created_at'),
  }).optional(),
});

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
      // Convert arrays to comma-separated strings (for tags)
      if (Array.isArray(value)) {
        const arrayString = value.join('; ');
        return `"${arrayString.replace(/"/g, '""')}"`;
      }
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
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Blogs');
  
  // Set column widths
  const columnWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  worksheet['!cols'] = columnWidths;
  
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
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
  
  // Scope filter
  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(blogs.id, options.selectedIds));
  }
  
  // Status filter
  if (options.filters?.status) {
    conditions.push(eq(blogs.status, options.filters.status));
  }
  
  // Category filter
  if (options.filters?.category) {
    conditions.push(eq(blogs.category, options.filters.category));
  }
  
  // Author filter
  if (options.filters?.author) {
    conditions.push(eq(blogs.author, options.filters.author));
  }
  
  // Date range filter
  if (options.dateRange?.from && options.dateRange?.to) {
    const dateField = options.dateRange.field === 'published_at' ? blogs.published_at : blogs.created_at;
    conditions.push(
      between(
        dateField,
        new Date(options.dateRange.from),
        new Date(options.dateRange.to)
      )
    );
  }

  // Query data
  const query = db
    .select()
    .from(blogs)
    .orderBy(blogs.created_at);
  
  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const data = await query;

  // Validate selected columns exist
  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Check if no data found
  if (data.length === 0) {
    throw new HttpException(
      422,
      'No blogs found matching your export criteria. Please adjust your filters or date range.',
      { code: 'NO_DATA_FOUND' }
    );
  }

  // Filter selected columns and format data
  const filteredData = data.map(blog => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      if (col in blog) {
        const value = blog[col as keyof typeof blog];
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString();
        }
        // Format arrays (tags)
        else if (Array.isArray(value)) {
          filtered[col] = value.join(', ');
        }
        // Format status
        else if (col === 'status') {
          filtered[col] = value;
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

  switch (options.format) {
    case 'csv':
      fileBuffer = Buffer.from(generateCSV(filteredData), 'utf-8');
      contentType = 'text/csv';
      filename = `blogs-export-${Date.now()}.csv`;
      break;
      
    case 'xlsx':
      fileBuffer = generateExcel(filteredData);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `blogs-export-${Date.now()}.xlsx`;
      break;
      
    default:
      throw new HttpException(400, 'Invalid export format');
  }

  // Set response headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fileBuffer.length);

  // Send file
  return res.send(fileBuffer);
};

const router = Router();

// POST /api/blogs/export
router.post(
  '/',
  requireAuth,
  requirePermission('blogs:read'),
  handler
);

export default router;
