/**
 * POST /api/users/customers/export
 * Export customers with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { and, between, inArray, eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
  generateCSV,
  generateExcelBuffer,
  baseExportSchema
} from '../../../utils/import-export';

// Customer-specific export schema
const customerExportSchema = baseExportSchema.extend({
  filters: z.object({
    status: z.enum(['active', 'inactive']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const validation = customerExportSchema.safeParse(req.body);
  if (!validation.success) {
    throw new HttpException(400, 'Invalid request data', {
      details: validation.error.issues,
    });
  }

  const options = validation.data;

  // Build query conditions
  const conditions = [eq(users.is_deleted, false)];

  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(users.id, options.selectedIds));
  }

  // Apply filters
  if (options.filters?.gender) {
    conditions.push(eq(users.gender, options.filters.gender));
  }

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
  const data = await db
    .select()
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Format data
  const formattedData = data.map(user => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      if (col in user) {
        const value = user[col as keyof typeof user];
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString();
        }
        // Format arrays
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

  // Generate file
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `customers-export-${timestamp}`;

  if (options.format === 'csv') {
    const csvString = generateCSV(formattedData, options.selectedColumns);
    const fileBuffer = Buffer.from(csvString, 'utf-8');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.send(fileBuffer);
  }

  if (options.format === 'xlsx') {
    const fileBuffer = await generateExcelBuffer(formattedData, options.selectedColumns, {
      sheetName: 'Customers'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.send(fileBuffer);
  }

  return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Unsupported export format', 400);
};

const router = Router();
router.post('/', requireAuth, requirePermission('customers:read'), handler);

export default router;

