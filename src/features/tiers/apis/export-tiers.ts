/**
 * POST /api/tiers/export
 * Export tiers to CSV/XLSX with hierarchy information
 * Admin only
 */

import { Router, Response } from 'express';
import { eq, inArray, and, between } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
  generateCSV,
  generateExcelBuffer,
  baseExportSchema
} from '../../../utils/import-export';

// Tiers-specific export schema
const tiersExportSchema = baseExportSchema;

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = tiersExportSchema.safeParse(req.body);

    if (!validation.success) {
        throw new HttpException(400, 'Invalid export options', {
            details: validation.error.issues,
        });
    }

    const options = validation.data;

    // Build query conditions
    const conditions = [eq(tiers.is_deleted, false)];

    if (options.scope === 'selected' && options.selectedIds?.length) {
        conditions.push(inArray(tiers.id, options.selectedIds));
    }

    if (options.dateRange?.from && options.dateRange?.to) {
        const dateField = options.dateRange.field === 'updated_at' ? tiers.updated_at : tiers.created_at;
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

    // Fetch tiers with parent information
    const tiersData = await db
        .select({
            id: tiers.id,
            name: tiers.name,
            code: tiers.code,
            description: tiers.description,
            level: tiers.level,
            parent_id: tiers.parent_id,
            priority: tiers.priority,
            status: tiers.status,
            usage_count: tiers.usage_count,
            created_at: tiers.created_at,
            updated_at: tiers.updated_at,
        })
        .from(tiers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(tiers.level, tiers.priority);

    // Fetch parent codes for export
    const parentIds = tiersData
        .map(t => t.parent_id)
        .filter((id): id is string => id !== null);

    const parentMap = new Map<string, string>();

    if (parentIds.length > 0) {
        const parents = await db
            .select({
                id: tiers.id,
                code: tiers.code,
            })
            .from(tiers)
            .where(inArray(tiers.id, parentIds));

        parents.forEach(p => parentMap.set(p.id, p.code));
    }

    if (options.selectedColumns.length === 0) {
        throw new HttpException(400, 'Please select at least one column to export.');
    }

    // Format data for export
    const formattedData = tiersData.map(tier => {
        const filtered: any = {};
        options.selectedColumns.forEach(col => {
            if (col === 'parent_code') {
                filtered[col] = tier.parent_id ? parentMap.get(tier.parent_id) || '' : '';
            } else if (col in tier) {
                const value = tier[col as keyof typeof tier];
                // Format dates
                if (value instanceof Date) {
                    filtered[col] = value.toISOString();
                } else {
                    filtered[col] = value;
                }
            }
        });
        return filtered;
    });

    logger.info('Exporting tiers', {
        count: formattedData.length,
        format: options.format,
        scope: options.scope,
        userId: req.userId,
    });

    // Generate file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `tiers-export-${timestamp}`;

    if (options.format === 'csv') {
        const csvString = generateCSV(formattedData, options.selectedColumns);
        const fileBuffer = Buffer.from(csvString, 'utf-8');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.setHeader('Content-Length', String(fileBuffer.length));
        return res.send(fileBuffer);
    }

    if (options.format === 'xlsx') {
        const fileBuffer = await generateExcelBuffer(formattedData, options.selectedColumns, {
            sheetName: 'Tiers'
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.setHeader('Content-Length', String(fileBuffer.length));
        return res.send(fileBuffer);
    }

    return ResponseFormatter.error(res, 'INVALID_FORMAT', 'Invalid export format', 400);
};

const router = Router();
router.post(
    '/',
    requireAuth,
    requirePermission('tiers:read'),
    handler
);

export default router;
