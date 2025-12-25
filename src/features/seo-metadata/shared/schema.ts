import {
  pgTable,
  bigserial,
  timestamp,
  integer,
  varchar,
  text,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * SEO Metadata Schema
 * Centralized SEO management for all entities (products, pages, collections, etc.)
 */

// Enums
export const seoEntityTypeEnum = pgEnum('seo_entity_type', [
  'product',
  'category',
  'collection',
  'page',
  'blog',
  'other',
]);

/**
 * SEO Metadata Table
 * Stores SEO data for any entity
 */
export const seoMetadata = pgTable(
  'seo_metadata',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // Entity reference
    entity_type: seoEntityTypeEnum('entity_type').notNull(),
    entity_id: integer('entity_id').notNull(),
    
    // SEO fields
    title: varchar('title', { length: 255 }),
    description: varchar('description', { length: 500 }),
    keywords: varchar('keywords', { length: 500 }),
    canonical_url: varchar('canonical_url', { length: 500 }),
    
    // Open Graph
    og_title: varchar('og_title', { length: 255 }),
    og_description: varchar('og_description', { length: 500 }),
    og_image: varchar('og_image', { length: 500 }),
    og_type: varchar('og_type', { length: 50 }).default('website'),
    
    // Twitter Card
    twitter_title: varchar('twitter_title', { length: 255 }),
    twitter_description: varchar('twitter_description', { length: 500 }),
    twitter_image: varchar('twitter_image', { length: 500 }),
    twitter_card: varchar('twitter_card', { length: 50 }).default('summary_large_image'),
    
    // Structured data
    schema_markup: text('schema_markup'),
    
    // Indexing
    robots: varchar('robots', { length: 100 }).default('index,follow'),
    
    // Audit fields
    created_by: integer('created_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    entityTypeIdx: index('seo_metadata_entity_type_idx').on(table.entity_type),
    entityIdIdx: index('seo_metadata_entity_id_idx').on(table.entity_id),
    entityUniqueIdx: uniqueIndex('seo_metadata_entity_unique_idx').on(
      table.entity_type,
      table.entity_id
    ),
  })
);

// Export types
export type SeoMetadata = typeof seoMetadata.$inferSelect;
export type NewSeoMetadata = typeof seoMetadata.$inferInsert;
