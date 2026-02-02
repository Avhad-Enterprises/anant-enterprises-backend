/**
 * POST /api/tags/import
 * Import tags from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { 
    createImportResult,
    recordSuccess,
    recordFailure,
    recordSkipped,
    formatImportSummary,
    type ImportMode 
} from '../../../utils/import-export';

// Validation schema for a single tag import
const tagImportSchema = z.object({
    name: z.string().min(1).max(255).trim(),
    type: z.enum(['customer', 'product', 'blogs', 'order'] as const),
    status: z.boolean().or(z.string().transform(val => val === 'true' || val === '1')).optional().default(true),
});

// Validation schema for the import request
const importTagsSchema = z.object({
    data: z.array(tagImportSchema).min(1).max(1000),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

/**
 * Process a single tag import record
 */
async function processTagRecord(
    tagData: z.infer<typeof tagImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
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

            const [newTag] = await db.insert(tags).values({
                name: normalizedName,
                type: tagData.type,
                status: tagData.status,
                created_by: userId,
            }).returning({ id: tags.id });

            return { success: true, recordId: newTag.id };
        }

        if (mode === 'update') {
            if (!tagExists) {
                return { success: false, error: 'Tag does not exist' };
            }

            await db
                .update(tags)
                .set({
                    type: tagData.type,
                    status: tagData.status,
                    updated_at: new Date(),
                })
                .where(eq(tags.name, normalizedName));

            return { success: true, recordId: existing[0].id };
        }

        if (mode === 'upsert') {
            if (tagExists) {
                await db
                    .update(tags)
                    .set({
                        type: tagData.type,
                        status: tagData.status,
                        updated_at: new Date(),
                    })
                    .where(eq(tags.name, normalizedName));
                
                return { success: true, recordId: existing[0].id };
            } else {
                const [newTag] = await db.insert(tags).values({
                    name: normalizedName,
                    type: tagData.type,
                    status: tagData.status,
                    created_by: userId,
                }).returning({ id: tags.id });

                return { success: true, recordId: newTag.id };
            }
        }

        return { success: false, error: 'Invalid import mode' };
    } catch (error: unknown) {
        logger.error('Error importing tag', { error, tagData });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = importTagsSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues,
        });
    }

    const { data: tagsData, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        throw new HttpException(401, 'User not authenticated');
    }

    const result = createImportResult();
    logger.info(`Importing ${tagsData.length} tags in ${mode} mode`, { userId });

    // Process each tag
    for (let i = 0; i < tagsData.length; i++) {
        const tagData = tagsData[i];
        const rowNumber = i + 1;
        // const entityKey = tagData.name; // Entity identifier for logging

        const importResult = await processTagRecord(tagData, mode, userId);

        if (importResult.success) {
            recordSuccess(result, mode, importResult.recordId);
        } else {
            if (importResult.error === 'Tag already exists') {
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
router.post('/', requireAuth, requirePermission('tags:create'), handler);

export default router;
