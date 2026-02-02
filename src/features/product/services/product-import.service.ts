/**
 * Product Import Service
 * 
 * Feature-specific logic for importing products.
 * Uses common import-export utilities for validation and result tracking.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../../database';
import { products } from '../shared/products.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../../inventory/shared/inventory-adjustments.schema';
import { tiers } from '../../tiers/shared/tiers.schema';
import { updateTagUsage } from '../../tags/services/tag-sync.service';
import { findProductBySku } from '../shared/queries';
import { createInventoryForProduct } from '../../inventory/services/inventory.service';
import { logger } from '../../../utils/logging/logger';
import { ImportMode } from '../../../utils/import-export';

/**
 * Generate unique slug for product
 */
export function generateProductSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Math.random().toString(36).substring(2, 6);
}

/**
 * Resolve category ID by name
 */
export async function resolveCategoryByName(categoryName: string): Promise<string | null> {
  const [cat] = await db
    .select({ id: tiers.id })
    .from(tiers)
    .where(and(
      eq(tiers.name, categoryName.trim()),
      eq(tiers.level, 1) // Only Tier 1 for now
    ))
    .limit(1);

  return cat?.id || null;
}

/**
 * Import a single product
 */
export async function importSingleProduct(
  rawData: any,
  mode: ImportMode,
  userId: string
): Promise<{ success: boolean; error?: string; recordId?: string; skipped?: boolean }> {
  try {
    const normalizedSku = rawData.sku.trim();

    // Check existing
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.sku, normalizedSku))
      .limit(1);

    const exists = existing.length > 0;
    const currentProduct = exists ? existing[0] : null;

    // Validate mode
    if (mode === 'create' && exists) {
      return { success: false, error: 'Product already exists (SKU conflict)', skipped: true };
    }
    if (mode === 'update' && !exists) {
      return { success: false, error: 'Product SKU does not exist' };
    }

    // Resolve category if provided
    let categoryId: string | null = null;
    if (rawData.category_name && rawData.category_name.trim()) {
      categoryId = await resolveCategoryByName(rawData.category_name);
      if (!categoryId) {
        return { success: false, error: `Category '${rawData.category_name}' not found` };
      }
    }

    // Prepare payload
    const payload: any = {
      sku: normalizedSku,
      product_title: rawData.product_title,
      slug: rawData.slug || (exists ? undefined : generateProductSlug(rawData.product_title)),

      // Prices
      selling_price: String(rawData.selling_price),
      cost_price: String(rawData.cost_price),
      compare_at_price: rawData.compare_at_price ? String(rawData.compare_at_price) : null,

      // Category
      category_tier_1: categoryId,

      // Status
      status: rawData.status,
      featured: rawData.featured,

      // Dimensions
      weight: rawData.weight ? String(rawData.weight) : null,
      length: rawData.length ? String(rawData.length) : null,
      breadth: rawData.breadth ? String(rawData.breadth) : null,
      height: rawData.height ? String(rawData.height) : null,

      // Logistics
      hsn_code: rawData.hsn_code,
      barcode: rawData.barcode,

      // Content
      short_description: rawData.short_description,
      full_description: rawData.full_description,

      // Meta
      meta_title: rawData.meta_title,
      meta_description: rawData.meta_description,
      product_url: rawData.product_url,

      // Images
      primary_image_url: rawData.primary_image_url,
      additional_images: rawData.additional_images,

      // Tags
      tags: rawData.tags,

      // Audit
      updated_at: new Date(),
      updated_by: userId,
    };

    const shouldLinkTags = rawData.tags && rawData.tags.length > 0;
    let recordId: string | undefined;

    if (!exists) {
      // Create new product
      payload.created_by = userId;
      await db.insert(products).values(payload);

      // Get the created product ID
      const createdProduct = await findProductBySku(normalizedSku);
      recordId = createdProduct?.id;

      // Sync tags
      if (shouldLinkTags) {
        await updateTagUsage([], rawData.tags, 'product');
      }
    } else {
      // Update existing product
      const oldTags = (currentProduct?.tags as string[]) || [];
      await db.update(products).set(payload).where(eq(products.sku, normalizedSku));
      
      recordId = currentProduct!.id;

      // Sync tags
      if (shouldLinkTags || oldTags.length > 0) {
        await updateTagUsage(oldTags, rawData.tags || [], 'product');
      }
    }

    // Handle inventory
    if (rawData.inventory_quantity !== undefined && rawData.inventory_quantity !== null) {
      const targetProductId = exists ? currentProduct!.id : recordId;

      if (targetProductId) {
        await handleInventoryImport(
          targetProductId,
          rawData.inventory_quantity,
          userId,
          mode
        );
      }
    }

    return { success: true, recordId };

  } catch (error: any) {
    logger.error('Product Import Error', { sku: rawData.sku, error });
    return { success: false, error: error.message || 'Database error' };
  }
}

/**
 * Handle inventory during import
 */
async function handleInventoryImport(
  productId: string,
  quantity: number,
  userId: string,
  mode: ImportMode
): Promise<void> {
  const [existingInv] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.product_id, productId))
    .limit(1);

  if (!existingInv) {
    // Create new inventory
    await createInventoryForProduct(productId, quantity, userId);
  } else {
    // Update existing inventory
    const oldQty = existingInv.available_quantity;
    const newQty = quantity;

    if (newQty !== oldQty) {
      const diff = newQty - oldQty;

      await db.update(inventory)
        .set({
          available_quantity: newQty,
          updated_at: new Date(),
          updated_by: userId || undefined,
        })
        .where(eq(inventory.id, existingInv.id));

      // Log adjustment
      if (userId) {
        try {
          await db.insert(inventoryAdjustments).values({
            inventory_id: existingInv.id,
            adjustment_type: 'correction',
            quantity_change: diff,
            reason: 'Product Import Update',
            quantity_before: oldQty,
            quantity_after: newQty,
            adjusted_by: userId,
            notes: `Imported via CSV. Mode: ${mode}`,
          });
        } catch (adjErr) {
          logger.warn('Failed to create inventory adjustment log during import', { error: adjErr });
        }
      }
    }
  }
}
