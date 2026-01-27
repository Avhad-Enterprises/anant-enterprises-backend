/**
 * POST /api/tiers/export
 * Export tiers to CSV/XLSX with hierarchy information
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, inArray, gte, lte, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import * as XLSX from 'xlsx';

const exportRequestSchema = z.object({
    scope: z.enum(['all', 'selected']),
    format: z.enum(['csv', 'xlsx']),
    selectedIds: z.array(z.string().uuid()).optional(),
    selectedColumns: z.array(z.string()),
    dateRange: z.object({
        from: z.string(),
        to: z.string(),
    }).optional(),
});

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data: any[], columns: string[]): string {
    if (data.length === 0) {
        return columns.join(',') + '\n';
    }

    // Header row
    const header = columns.join(',');

    // Data rows
    const rows = data.map(row => {
        return columns.map(col => {
            const value = row[col];
            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }
            // Handle strings with commas or quotes
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    });

    return header + '\n' + rows.join('\n');
}

/**
 * Convert array of objects to XLSX buffer
 */


const handler = async (req: RequestWithUser, res: Response) => {
    const validation = exportRequestSchema.safeParse(req.body);

    if (!validation.success) {
        throw new HttpException(400, 'Invalid export options');
    }

    const { scope, format, selectedIds, selectedColumns, dateRange } = validation.data;

    // Build query conditions
    const conditions: any[] = [eq(tiers.is_deleted, false)];

    if (scope === 'selected' && selectedIds && selectedIds.length > 0) {
        conditions.push(inArray(tiers.id, selectedIds));
    }

    if (dateRange) {
        conditions.push(
            gte(tiers.created_at, new Date(dateRange.from)),
            lte(tiers.created_at, new Date(dateRange.to))
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
        .where(and(...conditions))
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

    // Transform data for export
    const exportData = tiersData.map(tier => {
        const row: any = {};

        // Map database fields to export columns
        const columnMap: Record<string, any> = {
            id: tier.id,
            name: tier.name,
            code: tier.code,
            description: tier.description || '',
            level: tier.level,
            parent_id: tier.parent_id || '',
            parent_code: tier.parent_id ? parentMap.get(tier.parent_id) || '' : '',
            priority: tier.priority,
            status: tier.status,
            usage_count: tier.usage_count,
            created_at: tier.created_at?.toISOString() || '',
            updated_at: tier.updated_at?.toISOString() || '',
        };

        // Include only selected columns
        selectedColumns.forEach(col => {
            if (col in columnMap) {
                row[col] = columnMap[col];
            }
        });

        return row;
    });

    logger.info('Exporting tiers', {
        count: exportData.length,
        format,
        scope,
        userId: req.userId,
    });

    // Generate file based on format
    if (format === 'csv') {
        const csv = convertToCSV(exportData, selectedColumns);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=tiers-export-${Date.now()}.csv`);
        return res.send(csv);

    } else if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        // Set column widths
        const columnWidths = selectedColumns.map(() => ({ wch: 15 }));
        // Provide typed access to !cols
        (worksheet as any)['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tiers');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=tiers-export-${Date.now()}.xlsx`);
        return res.send(buffer);
    } else {
        // Technically unreachable due to Zod validation
        return ResponseFormatter.error(res, 'INVALID_FORMAT', 'Invalid export format', 400);
    }
};

const router = Router();
router.post(
    '/export',
    requireAuth,
    requirePermission('tiers:read'),
    handler
);

export default router;
