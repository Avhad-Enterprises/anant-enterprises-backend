/**
 * GET /api/collections/:slug
 * Get collection by slug
 * - Public access
 * - Returns collection metadata and banner images
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';
import { shortTextSchema } from '../../../utils';

const paramsSchema = z.object({
  slug: shortTextSchema,
});

interface CollectionResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerImage: string | null;
  mobileBannerImage: string | null;
}

const handler = async (req: Request, res: Response) => {
  const { slug } = paramsSchema.parse(req.params);

  // Get collection by slug (only active collections for public)
  const [collection] = await db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      banner_image_url: collections.banner_image_url,
      mobile_banner_image_url: collections.mobile_banner_image_url,
      status: collections.status,
    })
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.status, 'active')))
    .limit(1);

  if (!collection) {
    throw new HttpException(404, 'Collection not found');
  }

  // Format response with frontend field names
  const formattedCollection: CollectionResponse = {
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description,
    bannerImage: collection.banner_image_url,
    mobileBannerImage: collection.mobile_banner_image_url,
  };

  return ResponseFormatter.success(res, formattedCollection, 'Collection retrieved successfully');
};

const router = Router();
router.get('/:slug', handler);

export default router;
