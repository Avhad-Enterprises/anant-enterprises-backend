/**
 * POST /api/tags/bulk-delete
 * Bulk delete tags
 */

import { Router, Response } from 'express';
import { inArray, sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { users } from '../../user/shared/user.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { tagIdsSchema, bulkSoftDeleteTags } from '../shared';

const handler = async (req: RequestWithUser, res: Response) => {
    // Validate request body
    const validation = tagIdsSchema.safeParse(req.body);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid request data', {
            details: validation.error.issues,
        });
    }

    const { ids } = validation.data;

    if (ids.length === 0) {
        return ResponseFormatter.success(res, null, 'No tags selected');
    }

    // Soft Delete in a transaction with cleanup
    const deletedCount = await db.transaction(async (tx) => {
        // 1. Get tag names for these IDs
        const tagsToDelete = await tx
            .select({ name: tags.name })
            .from(tags)
            .where(inArray(tags.id, ids));

        const tagNames = tagsToDelete.map(t => t.name);

        if (tagNames.length > 0) {
            // JSONB columns cleanup - only tables that are confirmed to exist
            const jsonbEntities = [
                { tableName: 'products', columnName: 'tags' },
                { tableName: 'blogs', columnName: 'tags' },
                { tableName: 'orders', columnName: 'tags' },
            ];

            for (const name of tagNames) {
                for (const entity of jsonbEntities) {
                    // Use raw SQL with string interpolation for table/column names
                    try {
                        await tx.execute(sql.raw(`
                            UPDATE "${entity.tableName}"
                            SET "${entity.columnName}" = (
                                SELECT COALESCE(
                                    jsonb_agg(to_jsonb(elem)),
                                    '[]'::jsonb
                                )
                                FROM jsonb_array_elements_text("${entity.tableName}"."${entity.columnName}") AS elem
                                WHERE elem != '${name.replace(/'/g, "''")}'
                            )
                            WHERE "${entity.tableName}"."${entity.columnName}" @> '["${name.replace(/'/g, "''")}"]'::jsonb
                        `));
                    } catch (error) {
                        // Skip if table doesn't exist or has issues
                        console.warn(`Failed to update ${entity.tableName}.${entity.columnName} for tag "${name}":`, error);
                    }
                }

                // Postgres array cleanup for users table
                try {
                    await tx.update(users)
                        .set({
                            tags: sql`array_remove(${users.tags}, ${name})`
                        })
                        .where(sql`${name} = ANY(${users.tags})`);
                } catch (error) {
                    console.warn(`Failed to update users.tags for tag "${name}":`, error);
                }
            }
        }

        // 2. Finally soft delete the tags using shared function
        const deleted = await bulkSoftDeleteTags(ids, req.userId!, tx);
        return deleted;
    });

    return ResponseFormatter.success(
        res,
        { deleted: deletedCount },
        `${deletedCount} tags deleted successfully`
    );
};

const router = Router();
router.delete('/bulk', requireAuth, requirePermission('tags:delete'), handler);

export default router;
