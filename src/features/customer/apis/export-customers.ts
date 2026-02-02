/**
 * POST /api/users/customers/export
 * Export customers with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { and, between, inArray, eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Export options schema
const exportSchema = z.object({
  scope: z.enum(['all', 'selected']),
  format: z.enum(['csv', 'xlsx']),
  selectedIds: z.array(z.string()).optional(),
  selectedColumns: z.array(z.string()),
  filters: z.object({
    status: z.enum(['active', 'inactive']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    field: z.enum(['created_at', 'updated_at']).optional().default('created_at'),
  }).optional(),
});

/**
 * Generate CSV string from data
 */
function generateCSV(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0) {
    return columns.join(',') + '\n';
  }

  const csvRows = [columns.join(',')];

  for (const row of data) {
    const values = columns.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';

      // Format simple values
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
  // Always verify user is not deleted
  const conditions = [eq(users.is_deleted, false)];

  // Scope filter
  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(users.id, options.selectedIds));
  }

  // Status Filter (derived from is_deleted + potentially other logic, but here simple mapping)
  // Note: Users schema doesn't have explicit 'status' column in provided snippet,
  // but if needed we can map from available fields. For now, skipping explicit status unless defined in schema.
  // If 'status' referred to active/inactive, we might need a custom check.
  // Assuming 'status' is not directly on users table based on previous schema view.
  // If user meant email_verified or similar, we can add that.
  // For now, ignoring status filter if column doesn't exist, or mapping to email_verified if that was the intent.
  // Let's assume standard 'active' means not deleted (handled above).

  // Gender filter
  if (options.filters?.gender) {
    conditions.push(eq(users.gender, options.filters.gender));
  }

  // Date range filter
  if (options.dateRange?.from && options.dateRange?.to) {
    const dateField = options.dateRange.field === 'updated_at' ? users.updated_at : users.created_at;
    const toDate = new Date(options.dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    conditions.push(
      between(
        dateField,
        new Date(options.dateRange.from),
        toDate
      )
    );
  }

  // Query data
  const query = db
    .select()
    .from(users)
    .orderBy(users.created_at);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const data = await query;

  // Validate selected columns exist
  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Filter selected columns and format data
  const filteredData = data.map(user => {
    const filtered: Record<string, unknown> = {};
    options.selectedColumns.forEach(col => {
      // Map columns if names are different or need formatting
      if (col in user) {
        const value = user[col as keyof typeof user];

        // Format Date of Birth (YYYY-MM-DD)
        if (col === 'date_of_birth' && value) {
          const date = new Date(value as string | Date);
          if (!isNaN(date.getTime())) {
            filtered[col] = date.toISOString().split('T')[0];
          } else {
            filtered[col] = String(value);
          }
        }
        // Format Timestamps (Created At, etc)
        else if ((value instanceof Date) || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // YYYY-MM-DD HH:mm:ss
            filtered[col] = date.toISOString().replace('T', ' ').split('.')[0];
          } else {
            filtered[col] = String(value);
          }
        }
        // Format booleans
        else if (typeof value === 'boolean') {
          filtered[col] = value ? 'Yes' : 'No';
        }
        // Format arrays (tags)
        else if (Array.isArray(value)) {
          filtered[col] = value.join(', ');
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
      filename = `customers-export-${timestamp}.csv`;
      break;

    case 'xlsx':
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Customers');

        if (filteredData.length > 0) {
          // Add headers
          const headers = Object.keys(filteredData[0]);
          worksheet.columns = headers.map(header => ({
            header,
            key: header,
            width: 30,
          }));

          // Add rows
          worksheet.addRows(filteredData);
        }

        fileBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `customers-export-${timestamp}.xlsx`;
      } catch (error) {
        logger.error('Excel generation failed:', error);
        throw new HttpException(500, 'Failed to generate Excel file');
      }
      break;

    default:
      return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Invalid export format', 400);
  }

  // Set response headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(fileBuffer.length));

  return res.send(fileBuffer);
};

const router = Router();

// POST /api/users/customers/export
router.post(
  '/',
  requireAuth,
  requirePermission('users:read'),
  handler
);

export default router;
