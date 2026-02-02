/**
 * POST /api/tags/bulk-delete
 * Bulk delete tags
 */

import { Router, Response } from 'express';
import { inArray, sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { products } from '../../product/shared/products.schema';
import { blogs } from '../../blog/shared/blog.schema';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';
import { tickets } from '../../tickets/shared/tickets.schema';
import { discounts } from '../../discount/shared/discount.schema';
import { collections } from '../../collection/shared/collection.schema';
import { discountCodes } from '../../discount/shared/discount-codes.schema';
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
            // JSONB columns cleanup
            const jsonbEntities = [
                { table: products, column: products.tags },
                { table: blogs, column: blogs.tags },
                { table: orders, column: orders.tags },
                { table: tickets, column: tickets.tags },
                { table: discounts, column: discounts.tags },
                { table: collections, column: collections.tags },
            ];

            for (const name of tagNames) {
                for (const entity of jsonbEntities) {
                    await tx.update(entity.table)
                        .set({
                            [entity.column.name]: sql`${entity.column} - ${name}`
                        })
                        .where(sql`${entity.column} ? ${name}`);
                }

                // Special case: discount_codes
                await tx.update(discountCodes)
                    .set({
                        required_customer_tags: sql`required_customer_tags - ${name}`
                    })
                    .where(sql`required_customer_tags ? ${name}`);

                // Postgres array cleanup
                await tx.update(users)
                    .set({
                        tags: sql`array_remove(${users.tags}, ${name})`
                    })
                    .where(sql`${name} = ANY(${users.tags})`);
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
