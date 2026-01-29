/**
 * GET /api/users/tags
 * Get distinct tags used in customers
 */

import { Router, Response } from 'express';
import { sql } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';

const handler = async (req: RequestWithUser, res: Response) => {
  // Determine the raw SQL query based on database dialect (assuming Postgres here given the context)
  // We want unnest(tags) to expand the arrays, then distinct to get unique values

  const query = sql`
        SELECT DISTINCT unnest(${users.tags}) as tag
        FROM ${users}
        WHERE ${users.is_deleted} = false
        AND ${users.tags} IS NOT NULL
        ORDER BY tag ASC
    `;

  const result = await db.execute(query);

  // Result rows might vary depending on driver, but usually it's array of objects
  const tags = result.rows.map((row: any) => row.tag).filter(Boolean);

  ResponseFormatter.success(
    res,
    tags,
    'Tags retrieved successfully'
  );
};

const router = Router();
router.get(
  '/tags',
  requireAuth,
  handler
);

export default router;
