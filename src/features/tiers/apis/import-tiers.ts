/**
 * POST /api/tiers/import
 * Import tiers from CSV data with hierarchy validation
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema for import data
const tierImportSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    code: z.string().min(1).max(255).trim().optional(),
    description: z.string().optional(),
    level: z.number().int().min(1).max(4),
    parent_code: z.string().optional(), // Use parent code instead of ID for easier CSV import
    priority: z.number().int().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const importRequestSchema = z.object({
    data: z.array(tierImportSchema),
    mode: z.enum(['create', 'update', 'upsert']),
});

/**
 * Generate URL-friendly code from name
 */
function generateCode(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = importRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
        throw new HttpException(400, 'Invalid import data format');
    }

    const { data, mode } = validation.data;
    
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; name: string; error: string }> = [];

    // Process in order to maintain hierarchy
    // Sort by level to ensure parents are created before children
    const sortedData = [...data].sort((a, b) => a.level - b.level);

    // Cache for parent lookups by code
    const parentCache = new Map<string, string>(); // code -> id

    // Pre-load existing tiers into cache
    const existingTiers = await db
        .select({ id: tiers.id, code: tiers.code })
        .from(tiers)
        .where(eq(tiers.is_deleted, false));
    
    existingTiers.forEach(tier => parentCache.set(tier.code, tier.id));

    for (let i = 0; i < sortedData.length; i++) {
        const row = sortedData[i];
        const rowNumber = i + 1;

        try {
            // Generate code if not provided
            const code = row.code || generateCode(row.name);

            // Find parent_id if parent_code is provided
            let parent_id: string | null = null;
            
            if (row.parent_code) {
                // Check cache
                if (parentCache.has(row.parent_code)) {
                    parent_id = parentCache.get(row.parent_code)!;
                } else {
                    errors.push({
                        row: rowNumber,
                        name: row.name,
                        error: `Parent tier with code "${row.parent_code}" not found`,
                    });
                    failedCount++;
                    continue;
                }
            }

            // Validate level vs parent
            if (row.level > 1 && !parent_id) {
                errors.push({
                    row: rowNumber,
                    name: row.name,
                    error: `Level ${row.level} tier requires a parent_code`,
                });
                failedCount++;
                continue;
            }

            // Check if tier exists by code
            const [existingTier] = await db
                .select()
                .from(tiers)
                .where(eq(tiers.code, code))
                .limit(1);

            if (mode === 'create') {
                if (existingTier) {
                    skippedCount++;
                    continue;
                }
                
                // Create new tier
                const [newTier] = await db.insert(tiers).values({
                    name: row.name,
                    code: code,
                    description: row.description || null,
                    level: row.level,
                    parent_id: parent_id,
                    priority: row.priority ?? 0,
                    status: row.status || 'active',
                    usage_count: 0,
                    is_deleted: false,
                }).returning();
                
                successCount++;
                
                // Add to parent cache for next iterations
                parentCache.set(code, newTier.id);
                
            } else if (mode === 'update') {
                if (!existingTier) {
                    skippedCount++;
                    continue;
                }
                
                // Update existing tier
                await db
                    .update(tiers)
                    .set({
                        name: row.name,
                        description: row.description || null,
                        level: row.level,
                        parent_id: parent_id,
                        priority: row.priority ?? existingTier.priority,
                        status: row.status || existingTier.status,
                        updated_at: new Date(),
                    })
                    .where(eq(tiers.id, existingTier.id));
                
                successCount++;
                
            } else if (mode === 'upsert') {
                if (existingTier) {
                    // Update
                    await db
                        .update(tiers)
                        .set({
                            name: row.name,
                            description: row.description || null,
                            level: row.level,
                            parent_id: parent_id,
                            priority: row.priority ?? existingTier.priority,
                            status: row.status || existingTier.status,
                            updated_at: new Date(),
                        })
                        .where(eq(tiers.id, existingTier.id));
                } else {
                    // Create
                    const [newTier] = await db.insert(tiers).values({
                        name: row.name,
                        code: code,
                        description: row.description || null,
                        level: row.level,
                        parent_id: parent_id,
                        priority: row.priority ?? 0,
                        status: row.status || 'active',
                        usage_count: 0,
                        is_deleted: false,
                    }).returning();
                    
                    // Add to parent cache
                    parentCache.set(code, newTier.id);
                }
                
                successCount++;
            }
        } catch (error) {
            logger.error(`Failed to import tier row ${rowNumber}:`, error);
            errors.push({
                row: rowNumber,
                name: row.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            failedCount++;
        }
    }

    logger.info('Tier import completed', {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        mode,
    });

    return ResponseFormatter.success(res, {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        errors,
    });
};

const router = Router();
router.post(
    '/import',
    requireAuth,
    requirePermission('tiers:create'),
    handler
);

export default router;
