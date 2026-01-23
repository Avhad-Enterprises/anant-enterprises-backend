/**
 * POST /api/tags/import
 * Import tags from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';

// Validation schema for a single tag import
const tagImportSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    type: z.enum(['customer', 'product', 'blogs', 'order'] as const),
    status: z.boolean().or(z.string().transform(val => val === 'true' || val === '1')).optional().default(true),
});

// Validation schema for the import request
const importTagsSchema = z.object({
    data: z.array(tagImportSchema).min(1).max(1000), // Limit to 1000 tags per import
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

type ImportMode = 'create' | 'update' | 'upsert';
type ImportResult = {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; name: string; error: string }>;
};

/**
 * Import a single tag based on the mode
 */
async function importTag(
    tagData: z.infer<typeof tagImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const normalizedName = tagData.name.toLowerCase();

    try {
        // Check if tag exists
        const existing = await db
            .select()
            .from(tags)
            .where(eq(tags.name, normalizedName))
            .limit(1);

        const tagExists = existing.length > 0;

        if (mode === 'create') {
            if (tagExists) {
                return { success: false, error: 'Tag already exists' };
            }

            // Create new tag
            await db.insert(tags).values({
                name: normalizedName,
                type: tagData.type,
                status: tagData.status,
                created_by: userId,
            });

            return { success: true };
        }

        if (mode === 'update') {
            if (!tagExists) {
                return { success: false, error: 'Tag does not exist' };
            }

            // Update existing tag
            await db
                .update(tags)
                .set({
                    type: tagData.type,
                    status: tagData.status,
                    updated_at: new Date(),
                })
                .where(eq(tags.name, normalizedName));

            return { success: true };
        }

        if (mode === 'upsert') {
            if (tagExists) {
                // Update existing tag
                await db
                    .update(tags)
                    .set({
                        type: tagData.type,
                        status: tagData.status,
                        updated_at: new Date(),
                    })
                    .where(eq(tags.name, normalizedName));
            } else {
                // Create new tag
                await db.insert(tags).values({
                    name: normalizedName,
                    type: tagData.type,
                    status: tagData.status,
                    created_by: userId,
                });
            }

            return { success: true };
        }

        return { success: false, error: 'Invalid import mode' };
    } catch (error) {
        logger.error('Error importing tag', { error, tagData });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    // Log the incoming request for debugging
    logger.info('Import tags request received', { 
        bodyKeys: Object.keys(req.body),
        dataLength: req.body?.data?.length,
        mode: req.body?.mode,
        sampleData: req.body?.data?.slice(0, 2), // Log first 2 rows
    });

    // Validate request body
    const validation = importTagsSchema.safeParse(req.body);
    if (!validation.success) {
        logger.error('Import validation failed', { 
            errors: validation.error.issues,
            body: req.body,
        });
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues,
        });
    }

    const { data: tagsData, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        throw new HttpException(401, 'User not authenticated');
    }

    logger.info(`Importing ${tagsData.length} tags in ${mode} mode`, { userId });

    const result: ImportResult = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [],
    };

    // Process each tag
    for (let i = 0; i < tagsData.length; i++) {
        const tagData = tagsData[i];
        const rowNumber = i + 1;

        const importResult = await importTag(tagData, mode, userId);

        if (importResult.success) {
            result.success++;
        } else {
            if (importResult.error === 'Tag already exists') {
                result.skipped++;
            } else {
                result.failed++;
            }

            result.errors.push({
                row: rowNumber,
                name: tagData.name,
                error: importResult.error || 'Unknown error',
            });
        }
    }

    logger.info('Tag import completed', { result });

    // Return result
    const statusCode = result.failed === 0 ? 200 : 207; // 207 = Multi-Status (partial success)
    
    return ResponseFormatter.success(res, result, 'Tag import completed', statusCode);
};

const router = Router();
router.post('/', requireAuth, requirePermission('tags:create'), handler);

export default router;
