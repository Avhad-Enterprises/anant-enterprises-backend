
import { Request, Response, NextFunction } from 'express';
import { db } from '../../../database';
import { bundles } from '../shared/bundles.schema';
import { eq, sql, and, desc } from 'drizzle-orm';

export const getAllBundles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status as string;

        // Build conditions
        const conditions = [eq(bundles.is_deleted, false)];
        if (status && ['draft', 'active', 'inactive', 'archived'].includes(status)) {
            conditions.push(eq(bundles.status, status as 'draft' | 'active' | 'inactive' | 'archived'));
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

        res.status(200).json({
            success: true,
            message: "Bundles retrieved successfully",
            data: {
                bundles: bundlesList,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};
