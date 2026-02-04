/**
 * POST /api/tags/export
 * Export tags with various filters and formats
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { and, between, inArray, eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { 
    generateCSV, 
    generateExcelBuffer,
    baseExportSchema
} from '../../../utils/import-export';

// Tags-specific export schema
const tagExportSchema = baseExportSchema.extend({
    filters: z.object({
        type: z.enum(['customer', 'product', 'blogs', 'order']).optional(),
        status: z.boolean().optional(),
    }).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = tagExportSchema.safeParse(req.body);
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

    // Apply filters
    if (options.filters?.type) {
        conditions.push(eq(tags.type, options.filters.type));
    }

    if (options.filters?.status !== undefined) {
        conditions.push(eq(tags.status, options.filters.status));
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
    const data = await db
        .select()
        .from(tags)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (options.selectedColumns.length === 0) {
        throw new HttpException(400, 'Please select at least one column to export.');
    }

    // Format data
    const formattedData = data.map(tag => {
        const filtered: any = {};
        options.selectedColumns.forEach(col => {
            if (col in tag) {
                const value = tag[col as keyof typeof tag];
                // Format dates
                if (value instanceof Date) {
                    filtered[col] = value.toISOString();
                }
                // Format booleans
                else if (typeof value === 'boolean' && col === 'status') {
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
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `tags-export-${timestamp}`;

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
            sheetName: 'Tags'
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.setHeader('Content-Length', String(fileBuffer.length));
        return res.send(fileBuffer);
    }

    return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Unsupported export format', 400);
};

const router = Router();
router.post('/', requireAuth, requirePermission('tags:read'), handler);

export default router;
