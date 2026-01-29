/**
 * DELETE /api/tags/:id
 * Soft delete a tag
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { tags } from '../shared/tags.schema';
import { products } from '../../product/shared/product.schema';
import { blogs } from '../../blog/shared/blog.schema';
import { users } from '../../user/shared/user.schema';
import { orders } from '../../orders/shared/orders.schema';
import { tickets } from '../../tickets/shared/tickets.schema';
import { discounts } from '../../discount/shared/discount.schema';
import { collections } from '../../collection/shared/collection.schema';
import { discountCodes } from '../../discount/shared/discount-codes.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';

// Validation schema
const paramsSchema = z.object({
    id: z.string().uuid(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
        throw new HttpException(400, 'Invalid tag ID');
    }

    const { id } = validation.data;

    // Check if tag exists
    const [existing] = await db
        .select()
        .from(tags)
        .where(and(
            eq(tags.id, id),
            eq(tags.is_deleted, false)
        ))
        .limit(1);

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

        // 2. Finally soft delete the tag itself
        await tx
            .update(tags)
            .set({
                is_deleted: true,
                updated_at: new Date(),
            })
            .where(eq(tags.id, id));
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
