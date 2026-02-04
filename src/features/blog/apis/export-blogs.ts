/**
 * POST /api/blogs/export
 * Export blogs with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { and, between, inArray, eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { blogs } from '../shared/blog.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
  generateCSV,
  generateExcelBuffer,
  baseExportSchema
} from '../../../utils/import-export';

// Blog-specific export schema
const blogExportSchema = baseExportSchema.extend({
  filters: z.object({
    status: z.enum(['public', 'private', 'draft']).optional(),
    category: z.string().optional(),
    author: z.string().optional(),
  }).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const validation = blogExportSchema.safeParse(req.body);
  if (!validation.success) {
    throw new HttpException(400, 'Invalid request data', {
      details: validation.error.issues,
    });
  }

  const options = validation.data;

  // Build query conditions
  const conditions = [];

  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(blogs.id, options.selectedIds));
  }

  // Apply filters
  if (options.filters?.status) {
    conditions.push(eq(blogs.status, options.filters.status));
  }

  if (options.filters?.category) {
    conditions.push(eq(blogs.category, options.filters.category));
  }

  if (options.filters?.author) {
    conditions.push(eq(blogs.author, options.filters.author));
  }

  if (options.dateRange?.from && options.dateRange?.to) {
    const dateField = options.dateRange.field === 'published_at' ? blogs.published_at : blogs.created_at;
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
    .from(blogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(blogs.created_at);

  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Format data
  const formattedData = data.map(blog => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      if (col in blog) {
        const value = blog[col as keyof typeof blog];
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
  const filename = `blogs-export-${timestamp}`;

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
      sheetName: 'Blogs'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.send(fileBuffer);
  }

  return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Unsupported export format', 400);
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
