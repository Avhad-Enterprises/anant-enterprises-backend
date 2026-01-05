/**
 * DELETE /api/products/:id
 * Soft delete product (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { uuidSchema } from '../../../utils';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { validationMiddleware } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { db } from '../../../database';
import { products } from '../shared/product.schema';
import { findProductById } from '../shared/queries';
import { productCacheService } from '../services/product-cache.service';

const paramsSchema = z.object({
    id: uuidSchema,
});

async function deleteProduct(id: string, deletedBy: string): Promise<{ sku: string; slug: string }> {
    const existingProduct = await findProductById(id);
    if (!existingProduct) {
        throw new HttpException(404, 'Product not found');
    }

    await db
        .update(products)
        .set({
            is_deleted: true,
            deleted_by: deletedBy,
            deleted_at: new Date(),
        })
        .where(eq(products.id, id));

    return { sku: existingProduct.sku, slug: existingProduct.slug };
}

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = paramsSchema.parse(req.params);
    const userId = req.userId;
    if (!userId) {
        throw new HttpException(401, 'User authentication required');
    }

    const { sku, slug } = await deleteProduct(id, userId);

    // Invalidate cache for deleted product
    await productCacheService.invalidateProduct(id, sku, slug);

    ResponseFormatter.success(res, null, 'Product deleted successfully');
};

const router = Router();
router.delete(
    '/:id',
    requireAuth,
    requirePermission('products:delete'),
    validationMiddleware(paramsSchema, 'params'),
    handler
);

export default router;
