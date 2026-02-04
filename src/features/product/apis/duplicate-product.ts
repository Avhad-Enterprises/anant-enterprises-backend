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

/**
 * Generate a unique product title based on the original
 */
const generateUniqueTitle = (originalTitle: string, duplicateCount: number = 1): string => {
  if (duplicateCount === 1) {
    return `${originalTitle} (Copy)`;
  }
  return `${originalTitle} (Copy ${duplicateCount})`;
};

async function duplicateProducts(ids: string[], userId: string): Promise<number> {
  // 1. Fetch original products
  const originalProducts = await db.select().from(products).where(inArray(products.id, ids));

  if (originalProducts.length === 0) {
    throw new HttpException(404, 'No products found to duplicate');
  }

  // 2. Pre-fetch inventory data for all products BEFORE transactions
  // This ensures consistent stock data across all duplications
  const inventoryData = new Map<string, {
    available_quantity: number;
    reserved_quantity: number; 
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    condition: 'sellable' | 'damaged' | 'quarantined' | 'expired';
  }>();

  for (const product of originalProducts) {
    const [productInventory] = await db
      .select({
        available_quantity: inventory.available_quantity,
        reserved_quantity: inventory.reserved_quantity,
        status: inventory.status,
        condition: inventory.condition,
      })
      .from(inventory)
      .where(eq(inventory.product_id, product.id))
      .limit(1);

    inventoryData.set(product.id, productInventory || {
      available_quantity: 0,
      reserved_quantity: 0,
      status: 'out_of_stock' as const,
      condition: 'sellable' as const,
    });
  }

  let successCount = 0;
  
  // Track how many copies of each product we've created for unique naming
  const productCopyCount = new Map<string, number>();

  // Process sequentially to handle transactions properly
  for (const original of originalProducts) {
    await db.transaction(async (tx) => {
      try {
        // Increment copy counter for this specific product
        const currentCopyCount = (productCopyCount.get(original.id) || 0) + 1;
        productCopyCount.set(original.id, currentCopyCount);

        // Use pre-fetched inventory data for consistent stock levels
        const stockToCopy = inventoryData.get(original.id)!;

        // 2. Prepare new product data
        // Copy the original product properties while maintaining proper field mappings
        const newProductData: typeof products.$inferInsert = {
          slug: generateUniqueSlug(original.slug),
          product_title: generateUniqueTitle(original.product_title, currentCopyCount),
          secondary_title: original.secondary_title,
          short_description: original.short_description,
          full_description: original.full_description,
          admin_comment: original.admin_comment, // Copy admin notes

          status: original.status, // Copy original status instead of forcing draft
          featured: original.featured, // Copy original featured status

          cost_price: original.cost_price,
          selling_price: original.selling_price,
          compare_at_price: original.compare_at_price,

          sku: generateUniqueSku(original.sku),
          hsn_code: original.hsn_code,
          barcode: original.barcode, // Copy barcode

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
              barcode: null, // Reset barcode for uniqueness
              cost_price: v.cost_price,
              selling_price: v.selling_price,
              compare_at_price: v.compare_at_price,
              // Phase 2A: inventory_quantity removed - variants use inventory table
              image_url: v.image_url,
              thumbnail_url: v.thumbnail_url,
              is_default: v.is_default,
              is_active: v.is_active,
              created_by: userId,
              updated_by: userId,
            }));

            // Insert variants and get their IDs
            const insertedVariants = await tx.insert(productVariants).values(newVariantsData).returning();

            // Find default location for variant inventory
            const [defaultLocation] = await tx
              .select({ id: inventoryLocations.id })
              .from(inventoryLocations)
              .where(eq(inventoryLocations.is_default, true))
              .limit(1);

            // Fallback to any active location if no default
            let variantLocationId = defaultLocation?.id;
            if (!variantLocationId) {
              const [activeLocation] = await tx
                .select({ id: inventoryLocations.id })
                .from(inventoryLocations)
                .where(eq(inventoryLocations.is_active, true))
                .limit(1);
              variantLocationId = activeLocation?.id;
            }

            // Phase 2A: Create inventory records for duplicated variants
            if (variantLocationId && insertedVariants.length > 0) {
              for (let i = 0; i < originalVariants.length; i++) {
                const originalVariant = originalVariants[i];
                const newVariant = insertedVariants[i];
                
                if (newVariant && originalVariant) {
                  // Get original variant's inventory
                  const originalVariantInventory = await tx
                    .select({
                      available_quantity: inventory.available_quantity,
                      reserved_quantity: inventory.reserved_quantity,
                      status: inventory.status,
                      condition: inventory.condition,
                    })
                    .from(inventory)
                    .where(eq(inventory.variant_id, originalVariant.id))
                    .limit(1);

                  const variantStockToCopy = originalVariantInventory[0] || {
                    available_quantity: 0,
                    reserved_quantity: 0,
                    status: 'out_of_stock' as const,
                    condition: 'sellable' as const,
                  };

                  // Create inventory for the new variant
                  const [newVariantInventory] = await tx.insert(inventory).values({
                    variant_id: newVariant.id, // For variants, only set variant_id (not product_id)
                    location_id: variantLocationId,
                    available_quantity: variantStockToCopy.available_quantity,
                    reserved_quantity: 0, // Reset reserved quantity
                    status: variantStockToCopy.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
                    condition: variantStockToCopy.condition,
                    updated_by: userId
                  }).returning();

                  // Create adjustment record if there's stock to copy
                  if (variantStockToCopy.available_quantity > 0 && newVariantInventory) {
                    await tx.insert(inventoryAdjustments).values({
                      inventory_id: newVariantInventory.id,
                      adjustment_type: 'increase',
                      quantity_change: variantStockToCopy.available_quantity,
                      reason: `Initial variant stock (Duplicated from ${original.product_title})`,
                      quantity_before: 0,
                      quantity_after: variantStockToCopy.available_quantity,
                      adjusted_by: userId,
                      notes: `Variant duplicated with ${variantStockToCopy.available_quantity} units`
                    });
                  }
                }
              }
            }
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

        // 6. Initialize Inventory 
        // For products WITHOUT variants: create inventory with product_id
        // For products WITH variants: create inventory with variant_id only (not base product)

        if (!original.has_variants) {
          // Base product inventory (only for products without variants)
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
            // Create inventory with original stock levels
            await tx.insert(inventory).values({
              product_id: newProduct.id, // Only for base products without variants
              location_id: locationId,
              available_quantity: stockToCopy.available_quantity,
              reserved_quantity: 0, // Reset reserved quantity for new product
              status: stockToCopy.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
              condition: stockToCopy.condition,
              updated_by: userId
            });

            // Get the inventory ID we just created
            const [newInventory] = await tx.select().from(inventory).where(eq(inventory.product_id, newProduct.id));

            if (newInventory && stockToCopy.available_quantity > 0) {
              // Create inventory adjustment record for the copied stock
              await tx.insert(inventoryAdjustments).values({
                inventory_id: newInventory.id,
                adjustment_type: 'increase',
                quantity_change: stockToCopy.available_quantity,
                reason: `Initial stock (Duplicated from ${original.product_title})`,
                quantity_before: 0,
                quantity_after: stockToCopy.available_quantity,
                adjusted_by: userId,
                notes: `System duplicated product with ${stockToCopy.available_quantity} units`
              });
            }
          } else {
            logger.warn(`[Duplicate] No inventory location found. Skipping inventory creation for ${newProduct.id}`);
          }
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
        // Copy count is tracked per product ID in the Map

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
