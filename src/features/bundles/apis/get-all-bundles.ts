/**
 * GET /api/bundles
 * Get all bundles with pagination and filtering
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, sql, and, desc } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import validationMiddleware from '../../../middlewares/validation.middleware';
import { ResponseFormatter, paginationSchema } from '../../../utils';
import { db } from '../../../database';
import { bundles, BUNDLE_STATUSES } from '../shared/bundles.schema';

// Query validation schema
const querySchema = paginationSchema.extend({
    status: z.enum(BUNDLE_STATUSES).optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
    const { page, limit, status } = req.query as unknown as z.infer<typeof querySchema>;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(bundles.is_deleted, false)];
    if (status) {
        conditions.push(eq(bundles.status, status));
    }

    // Query
    const [bundlesList, countResult] = await Promise.all([
        db.select()
            .from(bundles)
            .where(and(...conditions))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(bundles.created_at)),

        db.select({ count: sql<number>`count(*)` })
            .from(bundles)
            .where(and(...conditions))
    ]);

    const total = Number(countResult[0]?.count || 0);

    ResponseFormatter.paginated(
        res,
        bundlesList,
        { page, limit, total },
        'Bundles retrieved successfully'
    );
};

const router = Router();
router.get(
    '/',
    validationMiddleware(querySchema, 'query'),
    handler
);

export default router;
