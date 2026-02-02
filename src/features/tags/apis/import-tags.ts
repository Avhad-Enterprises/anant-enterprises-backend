/**
 * POST /api/tags/import
 * Import tags from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
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
import {
    importTagsRequestSchema,
    tagImportSchema,
    findTagByName,
    createTag,
    updateTagById,
} from '../shared';
import { z } from 'zod';

/**
 * Process a single tag import record
 */
async function processTagRecord(
    tagData: z.infer<typeof tagImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
        // Check if tag exists
        const existing = await findTagByName(tagData.name);
        const tagExists = !!existing;

        if (mode === 'create') {
            if (tagExists) {
                return { success: false, error: 'Tag already exists' };
            }

            const newTag = await createTag({
                name: tagData.name,
                type: tagData.type,
                status: tagData.status,
                usage_count: 0,
                created_by: userId,
            });

            return { success: true, recordId: newTag.id };
        }

        if (mode === 'update') {
            if (!tagExists) {
                return { success: false, error: 'Tag does not exist' };
            }

            await updateTagById(existing!.id, {
                type: tagData.type,
                status: tagData.status,
                updated_by: userId,
            });

            return { success: true, recordId: existing!.id };
        }

        if (mode === 'upsert') {
            if (tagExists) {
                await updateTagById(existing!.id, {
                    type: tagData.type,
                    status: tagData.status,
                    updated_by: userId,
                });
                
                return { success: true, recordId: existing!.id };
            } else {
                const newTag = await createTag({
                    name: tagData.name,
                    type: tagData.type,
                    status: tagData.status,
                    usage_count: 0,
                    created_by: userId,
                });

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
    const validation = importTagsRequestSchema.safeParse(req.body);
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
