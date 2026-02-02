import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../database';
import { productVariants } from '../shared/product-variants.schema';
import { inventory } from '../../inventory/shared/inventory.schema';
import { HttpException } from '../../../utils';
import { updateProductSchema } from '../shared/validation';
import { findVariantsByProductId, isSkuTaken } from '../shared/queries';
import { createInventoryForProduct } from '../../inventory/services/inventory.service';

type UpdateProductData = z.infer<typeof updateProductSchema>;

type VariantUpdateInput = NonNullable<UpdateProductData['variants']>[number];

type VariantUpdateOptions = {
  productId: string;
  hasVariants?: UpdateProductData['has_variants'];
  variants?: UpdateProductData['variants'];
  updatedBy: string;
};

export async function updateProductVariants({
  productId,
  hasVariants,
  variants,
  updatedBy,
}: VariantUpdateOptions): Promise<void> {
  if (hasVariants === undefined && variants === undefined) {
    return;
  }

  const existingVariants = await findVariantsByProductId(productId);
  const existingVariantIds = new Set(existingVariants.map(v => v.id));

  if (variants && variants.length > 0) {
    await validateVariantSkus(variants, existingVariants, productId);

    for (const variant of variants) {
      if (variant.id && existingVariantIds.has(variant.id)) {
        await updateExistingVariant(variant, updatedBy);
        await updateVariantInventory(productId, variant, updatedBy);
      } else {
        const newVariantId = await createNewVariant(productId, variant, updatedBy);
        await createInventoryForProduct(
          productId,
          variant.inventory_quantity || 0,
          updatedBy,
          undefined,
          newVariantId
        );
      }
    }

    await softDeleteMissingVariants(existingVariants, variants, updatedBy);
    return;
  }

  if (hasVariants === false && existingVariants.length > 0) {
    await softDeleteAllVariants(existingVariants, updatedBy);
  }
}

async function validateVariantSkus(
  variants: VariantUpdateInput[],
  existingVariants: Awaited<ReturnType<typeof findVariantsByProductId>>,
  productId: string
): Promise<void> {
  for (const variant of variants) {
    const skuTaken = await isSkuTaken(variant.sku, productId);
    if (skuTaken) {
      const sameVariant = existingVariants.find(v => v.sku === variant.sku && v.id === variant.id);
      if (!sameVariant) {
        throw new HttpException(409, `SKU '${variant.sku}' is already in use`);
      }
    }
  }
}

async function updateExistingVariant(
  variant: VariantUpdateInput,
  updatedBy: string
): Promise<void> {
  await db
    .update(productVariants)
    .set({
      option_name: variant.option_name,
      option_value: variant.option_value,
      sku: variant.sku,
      barcode: variant.barcode,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      compare_at_price: variant.compare_at_price,
      image_url: variant.image_url,
      thumbnail_url: variant.thumbnail_url,
      is_active: variant.is_active ?? true,
      updated_at: new Date(),
      updated_by: updatedBy,
    })
    .where(eq(productVariants.id, variant.id!));
}

async function updateVariantInventory(
  productId: string,
  variant: VariantUpdateInput,
  updatedBy: string
): Promise<void> {
  if (variant.inventory_quantity === undefined || !variant.id) {
    return;
  }

  const existingInv = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variant_id, variant.id))
    .limit(1);

  if (existingInv.length > 0) {
    await db
      .update(inventory)
      .set({ available_quantity: variant.inventory_quantity, updated_at: new Date() })
      .where(eq(inventory.id, existingInv[0].id));
  } else {
    await createInventoryForProduct(productId, variant.inventory_quantity, updatedBy, undefined, variant.id);
  }
}

async function createNewVariant(
  productId: string,
  variant: VariantUpdateInput,
  updatedBy: string
): Promise<string> {
  const [newVariant] = await db
    .insert(productVariants)
    .values({
      product_id: productId,
      option_name: variant.option_name,
      option_value: variant.option_value,
      sku: variant.sku,
      barcode: variant.barcode,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      compare_at_price: variant.compare_at_price,
      image_url: variant.image_url,
      thumbnail_url: variant.thumbnail_url,
      is_active: variant.is_active ?? true,
      is_default: false,
      created_by: updatedBy,
      updated_by: updatedBy,
    })
    .returning();

  return newVariant.id;
}

async function softDeleteMissingVariants(
  existingVariants: Awaited<ReturnType<typeof findVariantsByProductId>>,
  variants: VariantUpdateInput[],
  updatedBy: string
): Promise<void> {
  const updatedVariantIds = new Set(variants.filter(v => v.id).map(v => v.id!));
  const variantsToDelete = existingVariants.filter(v => !updatedVariantIds.has(v.id));

  for (const variant of variantsToDelete) {
    await db
      .update(productVariants)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: updatedBy,
      })
      .where(eq(productVariants.id, variant.id));
  }
}

async function softDeleteAllVariants(
  existingVariants: Awaited<ReturnType<typeof findVariantsByProductId>>,
  updatedBy: string
): Promise<void> {
  for (const variant of existingVariants) {
    await db
      .update(productVariants)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: updatedBy,
      })
      .where(eq(productVariants.id, variant.id));
  }
}
