import {
  pgTable,
  serial,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Product Attributes Schema
 * Reusable attributes (Size, Color, Material) and their values
 */

// Enums
export const attributeTypeEnum = pgEnum('attribute_type', ['dropdown', 'swatch', 'text']);

/**
 * Product Attributes Table
 * Defines reusable attribute types (e.g., Size, Color, Material)
 */
export const productAttributes = pgTable(
  'product_attributes',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    type: attributeTypeEnum('type').default('dropdown'),
    position: integer('position').default(0),
    is_active: boolean('is_active').default(true).notNull(),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('product_attributes_slug_unique_idx').on(table.slug),
    isActiveIdx: index('product_attributes_is_active_idx').on(table.is_active),
  })
);

/**
 * Product Attribute Values Table
 * Values for each attribute (e.g., Small, Medium, Large for Size)
 */
export const productAttributeValues = pgTable(
  'product_attribute_values',
  {
    id: serial('id').primaryKey(),
    attribute_id: integer('attribute_id')
      .notNull()
      .references(() => productAttributes.id, { onDelete: 'cascade' }),
    
    value: varchar('value', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    
    // For color swatches
    color_hex: varchar('color_hex', { length: 7 }),
    image_url: varchar('image_url', { length: 500 }),
    
    position: integer('position').default(0),
    is_active: boolean('is_active').default(true).notNull(),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    attributeIdIdx: index('product_attribute_values_attribute_id_idx').on(table.attribute_id),
    isActiveIdx: index('product_attribute_values_is_active_idx').on(table.is_active),
    attributeValueUniqueIdx: uniqueIndex('product_attribute_values_unique_idx').on(
      table.attribute_id,
      table.slug
    ),
  })
);

/**
 * Product Variant Attributes Junction Table
 * Links variants to their attribute values (e.g., Variant #1 → Size: Large, Color: Red)
 */
export const productVariantAttributes = pgTable(
  'product_variant_attributes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    variant_id: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    attribute_id: integer('attribute_id')
      .notNull()
      .references(() => productAttributes.id, { onDelete: 'cascade' }),
    attribute_value_id: integer('attribute_value_id')
      .notNull()
      .references(() => productAttributeValues.id, { onDelete: 'cascade' }),
    
    // Audit fields
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    variantIdIdx: index('product_variant_attributes_variant_id_idx').on(table.variant_id),
    attributeIdIdx: index('product_variant_attributes_attribute_id_idx').on(table.attribute_id),
    variantAttributeUniqueIdx: uniqueIndex('product_variant_attributes_unique_idx').on(
      table.variant_id,
      table.attribute_id
    ),
  })
);

// Export types
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type NewProductAttributeValue = typeof productAttributeValues.$inferInsert;
export type ProductVariantAttribute = typeof productVariantAttributes.$inferSelect;
export type NewProductVariantAttribute = typeof productVariantAttributes.$inferInsert;

// Note: Temporary reference - will be properly linked when product_variants table is created
const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
});
