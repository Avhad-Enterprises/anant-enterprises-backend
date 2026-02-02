/**
 * DELETE /api/tags/:id
 * Soft delete a tag
 * Admin only
 */

import { Router, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
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

        // JSONB columns cleanup
        const jsonbEntities = [
            { table: products, column: products.tags },
            { table: blogs, column: blogs.tags },
            { table: orders, column: orders.tags },
            { table: tickets, column: tickets.tags },
            { table: discounts, column: discounts.tags },
            { table: collections, column: collections.tags },
        ];

        for (const entity of jsonbEntities) {
            await tx.update(entity.table)
                .set({
                    [entity.column.name]: sql`${entity.column} - ${tagName}`
                })
                .where(sql`${entity.column} ? ${tagName}`);
        }

        // Special case: discount_codes (jsonb column: required_customer_tags)
        await tx.update(discountCodes)
            .set({
                required_customer_tags: sql`required_customer_tags - ${tagName}`
            })
            .where(sql`required_customer_tags ? ${tagName}`);

        // Postgres array cleanup (array_remove(tags, 'tag_name'))
        await tx.update(users)
            .set({
                tags: sql`array_remove(${users.tags}, ${tagName})`
            })
            .where(sql`${tagName} = ANY(${users.tags})`);

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
