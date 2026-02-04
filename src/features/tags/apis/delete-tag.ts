/**
 * DELETE /api/tags/:id
 * Soft delete a tag
 * Admin only
 */

import { Router, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { tagIdParamSchema, findTagById, softDeleteTag } from '../shared';

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = tagIdParamSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    const { id } = validation.data;

    // Check if tag exists
    const existing = await findTagById(id);
    if (!existing) {
        throw new HttpException(404, 'Tag not found');
    }

    // Soft delete
    await db.transaction(async (tx) => {
        // 1. Remove tag from associated entities
        const tagName = existing.name;

        // JSONB columns cleanup - only tables that are confirmed to exist
        const jsonbEntities = [
            { tableName: 'products', columnName: 'tags' },
            { tableName: 'blogs', columnName: 'tags' },
            { tableName: 'orders', columnName: 'tags' },
        ];

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
                        WHERE elem != '${tagName.replace(/'/g, "''")}'
                    )
                    WHERE "${entity.tableName}"."${entity.columnName}" @> '["${tagName.replace(/'/g, "''")}"]'::jsonb
                `));
            } catch (error) {
                // Skip if table doesn't exist or has issues
                console.warn(`Failed to update ${entity.tableName}.${entity.columnName} for tag "${tagName}":`, error);
            }
        }

        // Postgres array cleanup for users table
        try {
            await tx.update(users)
                .set({
                    tags: sql`array_remove(${users.tags}, ${tagName})`
                })
                .where(sql`${tagName} = ANY(${users.tags})`);
        } catch (error) {
            console.warn(`Failed to update users.tags for tag "${tagName}":`, error);
        }
        // 2. Finally soft delete the tag itself using shared function
        await softDeleteTag(id, req.userId!, tx);
    });

    return ResponseFormatter.success(
        res,
        null,
        'Tag deleted successfully'
    );
};

const router = Router();
router.delete('/:id', requireAuth, requirePermission('tags:delete'), handler);

export default router;
