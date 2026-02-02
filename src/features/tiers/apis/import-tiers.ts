/**
 * POST /api/tiers/import
 * Import tiers from CSV data with hierarchy validation
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
    createImportResult,
    recordSuccess,
    recordFailure,
    recordSkipped,
    formatImportSummary,
    caseInsensitiveEnum,
    type ImportMode
} from '../../../utils/import-export';

// Validation schema for import data
const tierImportSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    code: z.string().min(1).max(255).trim().optional(),
    description: z.string().optional(),
    level: z.number().int().min(1).max(4),
    parent_code: z.string().optional(),
    priority: z.number().int().optional(),
    status: caseInsensitiveEnum(['active', 'inactive']).default('active'),
});

const importRequestSchema = z.object({
    data: z.array(tierImportSchema),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
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

/**
 * Process a single tier import record
 */
async function processTierRecord(
    tierData: z.infer<typeof tierImportSchema>,
    mode: ImportMode,
    parentCache: Map<string, string>
): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
        const code = tierData.code || generateCode(tierData.name);
        
        // Find parent_id if parent_code is provided
        let parent_id: string | null = null;
        
        if (tierData.parent_code) {
            if (parentCache.has(tierData.parent_code)) {
                parent_id = parentCache.get(tierData.parent_code)!;
            } else {
                return { success: false, error: `Parent tier with code "${tierData.parent_code}" not found` };
            }
        }

        // Validate level vs parent
        if (tierData.level > 1 && !parent_id) {
            return { success: false, error: `Level ${tierData.level} tier requires a parent_code` };
        }

        // Check if tier exists by code
        const [existingTier] = await db
            .select()
            .from(tiers)
            .where(eq(tiers.code, code))
            .limit(1);

        if (mode === 'create') {
            if (existingTier) {
                return { success: false, error: 'Tier already exists' };
            }
            
            const [newTier] = await db.insert(tiers).values({
                name: tierData.name,
                code: code,
                description: tierData.description || null,
                level: tierData.level,
                parent_id: parent_id,
                priority: tierData.priority ?? 0,
                status: tierData.status as 'active' | 'inactive',
                usage_count: 0,
                is_deleted: false,
            }).returning({ id: tiers.id });
            
            // Add to parent cache for next iterations
            parentCache.set(code, newTier.id);
            return { success: true, recordId: newTier.id };
            
        } else if (mode === 'update') {
            if (!existingTier) {
                return { success: false, error: 'Tier not found' };
            }
            
            await db
                .update(tiers)
                .set({
                    name: tierData.name,
                    description: tierData.description || null,
                    level: tierData.level,
                    parent_id: parent_id,
                    priority: tierData.priority ?? existingTier.priority,
                    status: tierData.status as 'active' | 'inactive' || existingTier.status,
                    updated_at: new Date(),
                })
                .where(eq(tiers.id, existingTier.id));
            
            return { success: true, recordId: existingTier.id };
            
        } else if (mode === 'upsert') {
            if (existingTier) {
                // Update
                await db
                    .update(tiers)
                    .set({
                        name: tierData.name,
                        description: tierData.description || null,
                        level: tierData.level,
                        parent_id: parent_id,
                        priority: tierData.priority ?? existingTier.priority,
                        status: tierData.status as 'active' | 'inactive' || existingTier.status,
                        updated_at: new Date(),
                    })
                    .where(eq(tiers.id, existingTier.id));
                    
                return { success: true, recordId: existingTier.id };
            } else {
                // Create
                const [newTier] = await db.insert(tiers).values({
                    name: tierData.name,
                    code: code,
                    description: tierData.description || null,
                    level: tierData.level,
                    parent_id: parent_id,
                    priority: tierData.priority ?? 0,
                    status: tierData.status as 'active' | 'inactive',
                    usage_count: 0,
                    is_deleted: false,
                }).returning({ id: tiers.id });
                
                // Add to parent cache
                parentCache.set(code, newTier.id);
                return { success: true, recordId: newTier.id };
            }
        }

        return { success: false, error: 'Invalid import mode' };
    } catch (error) {
        logger.error('Tier import error', { error, tierData });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = importRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
        return ResponseFormatter.error(res, 'VALIDATION_ERROR', 'Invalid request data', 400, {
            details: validation.error.issues,
        });
    }

    const { data, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        return ResponseFormatter.error(res, 'UNAUTHORIZED', 'User not authenticated', 401);
    }

    const result = createImportResult();
    logger.info(`Importing ${data.length} tiers in ${mode} mode`, { userId });

    // Sort by level to ensure parents are created before children
    const sortedData = [...data].sort((a, b) => a.level - b.level);

    // Cache for parent lookups by code
    const parentCache = new Map<string, string>();

    // Pre-load existing tiers into cache
    const existingTiers = await db
        .select({ id: tiers.id, code: tiers.code })
        .from(tiers)
        .where(eq(tiers.is_deleted, false));
    
    existingTiers.forEach(tier => parentCache.set(tier.code, tier.id));

    // Process each tier
    for (let i = 0; i < sortedData.length; i++) {
        const tierData = sortedData[i];
        const rowNumber = i + 1;

        const importResult = await processTierRecord(tierData, mode, parentCache);

        if (importResult.success) {
            recordSuccess(result, mode, importResult.recordId);
        } else {
            if (importResult.error === 'Tier already exists') {
                recordSkipped(result, rowNumber, 'Already exists');
            } else {
                recordFailure(result, rowNumber, importResult.error || 'Unknown error');
            }
        }
    }

    const statusCode = result.failed === 0 ? 200 : 207;
    return ResponseFormatter.success(res, result, formatImportSummary(result), statusCode);
};

const router = Router();
router.post(
    '/',
    requireAuth,
    requirePermission('tiers:create'),
    handler
);

export default router;
