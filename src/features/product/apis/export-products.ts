/**
 * POST /api/products/export
 * Export products with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { and, between, inArray, eq, sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Export options schema
const exportSchema = z.object({
  scope: z.enum(['all', 'selected']),
  format: z.enum(['csv', 'xlsx']),
  selectedIds: z.array(z.string()).optional(),
  selectedColumns: z.array(z.string()),
  // Filters
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  status: z.union([z.enum(['active', 'draft', 'archived', '']), z.array(z.string())]).optional(),
  stockStatus: z.union([z.string(), z.array(z.string())]).optional(),
  categoryId: z.union([z.string(), z.array(z.string())]).optional(),
  search: z.string().optional(),
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
      
      // Handle arrays (like tags)
      if (Array.isArray(value)) {
         const stringValue = value.join('; '); // Semicolon separated for arrays in CSV
         if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
         }
         return stringValue;
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

const handler = async (req: RequestWithUser, res: Response) => {
  // Validate request body
  const validation = exportSchema.safeParse(req.body);
  if (!validation.success) {
    console.error('Export validation failed:', {
      body: req.body,
      errors: validation.error.issues
    });
    throw new HttpException(400, 'Invalid request data', {
      details: validation.error.issues,
    });
  }

  const options = validation.data;

  // Build query conditions
  const conditions = [];

  // 1. Scope (Selected IDs)
  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(products.id, options.selectedIds));
  }

  // 2. Date Range
  if (options.dateRange?.from && options.dateRange?.to) {
    const toDate = new Date(options.dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    conditions.push(
      between(
        products.created_at,
        new Date(options.dateRange.from),
        toDate
      )
    );
  }

  // 3. Status
  if (options.status) {
    if (Array.isArray(options.status)) {
      // If status is an array, use inArray
      if (options.status.length > 0) {
        conditions.push(inArray(products.status, options.status as any[]));
      }
    } else {
      // If status is a single value, use eq
      conditions.push(eq(products.status, options.status as any));
    }
  }

  // 4. Stock Status (Calculated/Approximated logic since we removed inventory_quantity)
  // Note: Since inventory is now external, we verify what 'stockStatus' implies.
  // Ideally, we would join with inventory table, but for simple export, we might skip complex stock logic
  // or use the 'status' field if it correlates.
  // For now, ignoring pure stock count filters in export unless heavily requested to join tables.

  // 5. Category (Tier 1-4)
  if (options.categoryId) {
    if (Array.isArray(options.categoryId)) {
      // If multiple categories, check if any tier matches any category
      if (options.categoryId.length > 0) {
        const categoryConditions = options.categoryId.map(catId => 
          sql`(${products.category_tier_1} = ${catId} OR 
               ${products.category_tier_2} = ${catId} OR 
               ${products.category_tier_3} = ${catId} OR 
               ${products.category_tier_4} = ${catId})`
        );
        conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
      }
    } else {
      // Single category
      conditions.push(
        sql`(${products.category_tier_1} = ${options.categoryId} OR 
             ${products.category_tier_2} = ${options.categoryId} OR 
             ${products.category_tier_3} = ${options.categoryId} OR 
             ${products.category_tier_4} = ${options.categoryId})`
      );
    }
  }

  // 6. Search
  if (options.search) {
      conditions.push(
          sql`(${products.product_title} ILIKE ${`%${options.search}%`} OR ${products.sku} ILIKE ${`%${options.search}%`})`
      );
  }
  
  // Don't export deleted products unless specifically requested? usually we ignore them.
  conditions.push(eq(products.is_deleted, false));


  // Query data
  const query = db
    .select()
    .from(products);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const data = await query;

  // Validate selected columns exist
  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Filter selected columns and format data
  const filteredData = data.map(product => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      // Map 'column name' to data
      // For arrays/jsonb like tags, we might want to pre-process
      
      if (col in product) {
        const value = product[col as keyof typeof product];
        
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString();
        }
        // Format booleans
        else if (typeof value === 'boolean') {
           if (col === 'featured') filtered[col] = value ? 'Yes' : 'No';
           else filtered[col] = value ? 'True' : 'False';
        }
        // Format JSON types
        else if (typeof value === 'object' && value !== null) {
            // Arrays (tags)
            if (Array.isArray(value)) {
                // If it's CSV, we handle it in generateCSV or join here.
                // xlsx handles arrays well? Not always. Let's stringify for consistency across formats if needed.
                // Actually, let's keep it as array for execution logic and handle formatting later.
                filtered[col] = value; 
            } else {
                filtered[col] = JSON.stringify(value);
            }
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
      filename = `products-export-${timestamp}.csv`;
      break;
    case 'xlsx':
      try {
        // Pre-process for Excel: Convert arrays to strings
        const excelData = filteredData.map(row => {
            const newRow: any = { ...row };
            for(const key in newRow) {
                if(Array.isArray(newRow[key])) {
                    newRow[key] = newRow[key].join(', ');
                }
            }
            return newRow;
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Products');

        if (excelData.length > 0) {
          // Add headers
          const headers = Object.keys(excelData[0]);
          worksheet.columns = headers.map(header => ({
            header,
            key: header,
            width: 20,
          }));

          // Add rows
          worksheet.addRows(excelData);
        }

        fileBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `products-export-${timestamp}.xlsx`;
      } catch (error) {
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
router.post('/export', requireAuth, requirePermission('products:read'), handler);

export default router;
