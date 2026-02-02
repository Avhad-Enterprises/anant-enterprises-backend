/**
 * GET /api/users/tags
 * Get distinct tags used in customers
 */

import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { getDistinctUserTags } from '../../user/shared/queries';

const handler = async (req: RequestWithUser, res: Response) => {
  const tags = await getDistinctUserTags();

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
