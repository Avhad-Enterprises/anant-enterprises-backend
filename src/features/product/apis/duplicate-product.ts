/**
 * POST /api/products/duplicate
 * Duplicate one or more products (Admin only)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { eq, inArray } from 'drizzle-orm';
import { products } from '../shared/products.schema';
import { productVariants } from '../shared/product-variants.schema';
import { productFaqs } from '../shared/product-faqs.schema';
import { productCacheService } from '../services/product-cache.service';
import { inventory } from '../../inventory/shared/inventory.schema';
import { inventoryLocations } from '../../inventory/shared/inventory-locations.schema';
import { inventoryAdjustments } from '../../inventory/shared/inventory-adjustments.schema';
import { syncTags } from '../../tags/services/tag-sync.service';
import { incrementTierUsage } from '../../tiers/services/tier-sync.service';

// Validation schema
const duplicateProductSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
});

/**
 * Generate a unique SKU based on the original
 */
const generateUniqueSku = (originalSku: string): string => {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  return `${originalSku}-CPY-${timestamp}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Generate a unique Slug based on the original
 */
const generateUniqueSlug = (originalSlug: string): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `${originalSlug}-copy-${timestamp}-${Math.floor(Math.random() * 1000)}`;
};

async function duplicateProducts(ids: string[], userId: string): Promise<number> {
  // 1. Fetch original products
  const originalProducts = await db.select().from(products).where(inArray(products.id, ids));

  if (originalProducts.length === 0) {
    throw new HttpException(404, 'No products found to duplicate');
  }

  let successCount = 0;

  // Process sequentially to handle transactions properly
  for (const original of originalProducts) {
    await db.transaction(async (tx) => {
      try {
        // 2. Prepare new product data
        // We exclude ID, timestamps, and created_by/updated_by to let DB/defaults handle them
        // We modify SKU, Slug, Title, Status, and reset search_vector (generated)
        const newProductData: typeof products.$inferInsert = {
          slug: generateUniqueSlug(original.slug),
          product_title: `${original.product_title} (Copy)`,
          secondary_title: original.secondary_title,
          short_description: original.short_description,
          full_description: original.full_description,
          status: 'draft', // Always draft for safety
          featured: false, // Reset featured
          
          cost_price: original.cost_price,
          selling_price: original.selling_price,
          compare_at_price: original.compare_at_price,
          
          sku: generateUniqueSku(original.sku),
          hsn_code: original.hsn_code,
          barcode: null, // Barcode should probably not be duplicated generally, or needs to be unique? Resetting to null for safety.
          
          weight: original.weight,
          length: original.length,
          breadth: original.breadth,
          height: original.height,
          
          category_tier_1: original.category_tier_1,
          category_tier_2: original.category_tier_2,
          category_tier_3: original.category_tier_3,
          category_tier_4: original.category_tier_4,
          
          tags: original.tags,
          
          primary_image_url: original.primary_image_url,
          thumbnail_url: original.thumbnail_url,
          additional_images: original.additional_images,
          additional_thumbnails: original.additional_thumbnails,
          
          has_variants: original.has_variants,
          
          meta_title: original.meta_title,
          meta_description: original.meta_description,
          product_url: original.product_url ? `${original.product_url}-copy` : null,
          
          created_by: userId,
          updated_by: userId,
          is_deleted: false,
        };

        // 3. Insert new product
        const [newProduct] = await tx.insert(products).values(newProductData).returning();

        if (!newProduct) {
            throw new Error(`Failed to insert duplicate product for ID ${original.id}`);
        }

        // 4. Duplicate Variants
        if (original.has_variants) {
            const originalVariants = await tx.select().from(productVariants).where(eq(productVariants.product_id, original.id));
            
            if (originalVariants.length > 0) {
                const newVariantsData = originalVariants.map(v => ({
                    product_id: newProduct.id,
                    option_name: v.option_name,
                    option_value: v.option_value,
                    sku: generateUniqueSku(v.sku), // Unique SKU for variant
                    barcode: null, // Reset barcode
                    cost_price: v.cost_price,
                    selling_price: v.selling_price,
                    compare_at_price: v.compare_at_price,
                    inventory_quantity: 0, // Reset inventory
                    image_url: v.image_url,
                    thumbnail_url: v.thumbnail_url,
                    is_default: v.is_default,
                    is_active: v.is_active,
                    created_by: userId,
                    updated_by: userId,
                }));
                
                await tx.insert(productVariants).values(newVariantsData);
            }
        }

        // 5. Duplicate FAQs
        const originalFaqs = await tx.select().from(productFaqs).where(eq(productFaqs.product_id, original.id));
        if (originalFaqs.length > 0) {
            const newFaqsData = originalFaqs.map(f => ({
                product_id: newProduct.id,
                question: f.question,
                answer: f.answer,
            }));
            await tx.insert(productFaqs).values(newFaqsData);
        }

        // 6. Initialize Inventory (Base Product) using TX
        // We must use the same transaction to see the new product
        
        // Find default location
        const [defaultLocation] = await tx
            .select({ id: inventoryLocations.id })
            .from(inventoryLocations)
            .where(eq(inventoryLocations.is_default, true))
            .limit(1);

        // Fallback to any active location if no default
        let locationId = defaultLocation?.id;
        if (!locationId) {
             const [activeLocation] = await tx
                .select({ id: inventoryLocations.id })
                .from(inventoryLocations)
                .where(eq(inventoryLocations.is_active, true))
                .limit(1);
             locationId = activeLocation?.id;
        }

        if (locationId) {
             // Import inventory schemas (assuming they are exported from somewhere, need to check imports)
             // We'll trust the tool to add imports or I will add them in a separate block if needed.
             // Actually, I need to make sure 'inventory' and 'inventoryLocations' are imported.
             // I will assume they are NOT and add them to the top of the file in a separate edit or finding them.
             
             await tx.insert(inventory).values({
                 product_id: newProduct.id,
                 location_id: locationId,
                 available_quantity: 0,
                 status: 'out_of_stock',
                 condition: 'sellable',
                 updated_by: userId
             });
             
             // Get the inventory ID we just created (Need to capture it)
             const [newInventory] = await tx.select().from(inventory).where(eq(inventory.product_id, newProduct.id));
             
             if (newInventory) {
                  // Import inventoryAdjustments (assuming it's imported or I will adding imports in next step)
                  await tx.insert(inventoryAdjustments).values({
                        inventory_id: newInventory.id,
                        adjustment_type: 'correction',
                        quantity_change: 0,
                        reason: `Initial stock (Duplicated from ${original.product_title})`,
                        quantity_before: 0,
                        quantity_after: 0,
                        adjusted_by: userId,
                        notes: 'System duplicated product'
                  });
             }
        } else {
            logger.warn(`[Duplicate] No inventory location found. Skipping inventory creation for ${newProduct.id}`);
        }
        
        // Variant inventory logic removed as it was incorrect (redundant base product calls)

        // 7. Sync Tags
        if (newProduct.tags && Array.isArray(newProduct.tags) && newProduct.tags.length > 0) {
             // Cast to string[] because Drizzle jsonb is unknown
             await syncTags(newProduct.tags as string[], 'product');
        }

        // 8. Sync Tiers
        await incrementTierUsage([
            newProduct.category_tier_1,
            newProduct.category_tier_2,
            newProduct.category_tier_3,
            newProduct.category_tier_4,
        ]);

        // 9. Cache
        await productCacheService.cacheProduct(newProduct);

        successCount++;

      } catch (err: unknown) {
        logger.error(`Failed to duplicate product ${original.id}:`, err);
        // We continue processing other products, but log the error (or we could throw to abort all)
        // For bulk actions, usually best to process as many as possible or atomic. 
        // Logic here: Atomic PER product. One failure shouldn't stop others if they are independent.
        // However, if the user expects all or nothing, we should handle differently.
        // Given the request, "Duplicate Product" usually implies specific intent.
        // We'll throw to rollback the current transaction of this product, but the loop continues?
        // Actually, explicit transaction block wraps per-product logic.
        throw err; // Re-throw to fail this specific transaction
      }
    }); // End Transaction
  }

  return successCount;
}

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'User authentication required');
  }

  const { ids } = duplicateProductSchema.parse(req.body);
  const count = await duplicateProducts(ids, userId);

  ResponseFormatter.success(res, { count }, `Successfully duplicated ${count} product(s)`, 201);
};

const router = Router();
router.post(
  '/duplicate',
  requireAuth,
  requirePermission('products:create'), // Re-use create permission
  validationMiddleware(duplicateProductSchema),
  handler
);

export default router;
