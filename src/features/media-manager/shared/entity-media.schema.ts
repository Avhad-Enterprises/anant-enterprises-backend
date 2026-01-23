/**
 * Entity Media Schema
 *
 * Generic, entity-agnostic media management system.
 * Supports images, videos, and documents for ANY entity type.
 */

import {
    pgTable,
    uuid,
    integer,
    varchar,
    text,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uploads } from '../../upload';

// ============================================
// ENUMS
// ============================================

/**
 * Entity types that can have media attached
 * Add new entity types here as needed
 */
export const entityTypeEnum = pgEnum('entity_type', [
    'product',
    'blog',
    'category',
    'collection',
    'user',
    'brand',
    'vendor',
]);

/**
 * Media type classification
 */
export const mediaTypeEnum = pgEnum('media_type', [
    'image',
    'video',
    'document',
    'file',
]);

// ============================================
// ENTITY MEDIA TABLE
// ============================================

/**
 * Entity Media table
 * Generic relationship table linking ANY entity to uploaded media.
 *
 * Design:
 * - Uses composite key (entity_type, entity_id) for flexibility
 * - Links to uploads table for actual file data
 * - Supports ordering, primary designation, and metadata
 * - Cascade delete when entity or upload is removed
 *
 * Examples:
 * - Product images: entity_type='product', entity_id=product.id
 * - Blog cover: entity_type='blog', entity_id=blog.id, is_primary=true
 * - User avatar: entity_type='user', entity_id=user.id
 * - Category thumbnail: entity_type='category', entity_id=category.id
 *
 * Indexes:
 * - entity_idx: For querying all media of a specific entity
 * - display_order_idx: For efficient ordered retrieval
 * - upload_id_idx: For reverse lookups
 * - primary_idx: For finding primary media quickly
 */
export const entityMedia = pgTable(
    'entity_media',
    {
        // Identity
        id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`),

        // Generic entity relationship (polymorphic)
        entity_type: entityTypeEnum('entity_type').notNull(),
        entity_id: uuid('entity_id').notNull(),

        // Media reference
        upload_id: integer('upload_id')
            .notNull()
            .references(() => uploads.id, { onDelete: 'cascade' }),

        media_type: mediaTypeEnum('media_type').notNull(),

        // Display & Ordering
        display_order: integer('display_order').notNull().default(0),
        is_primary: boolean('is_primary').default(false).notNull(),

        // SEO & Accessibility
        alt_text: varchar('alt_text', { length: 255 }),
        caption: text('caption'),

        // Flexible metadata storage (dimensions, EXIF, duration, etc.)
        metadata: jsonb('metadata').$type<{
            width?: number;
            height?: number;
            duration?: number; // For videos
            exif?: Record<string, any>;
            palette?: string[]; // Dominant colors
            [key: string]: any; // Extensible
        }>(),

        // Audit Fields
        created_at: timestamp('created_at').defaultNow().notNull(),
        updated_at: timestamp('updated_at').defaultNow().notNull(),
    },
    (table) => ({
        // Composite index for entity lookups (most common query)
        entityIdx: index('entity_media_entity_idx').on(table.entity_type, table.entity_id),

        // Composite index for ordered retrieval
        displayOrderIdx: index('entity_media_display_order_idx').on(
            table.entity_type,
            table.entity_id,
            table.display_order
        ),

        // Index for upload reverse lookups
        uploadIdIdx: index('entity_media_upload_id_idx').on(table.upload_id),

        // Index for finding primary media
        primaryIdx: index('entity_media_primary_idx').on(
            table.entity_type,
            table.entity_id,
            table.is_primary
        ),

        // Index for media type filtering
        mediaTypeIdx: index('entity_media_type_idx').on(
            table.entity_type,
            table.entity_id,
            table.media_type
        ),
    })
);

// Types
export type EntityMedia = typeof entityMedia.$inferSelect;
export type NewEntityMedia = typeof entityMedia.$inferInsert;

// Export entity type values for validation
export const ENTITY_TYPES = [
    'product',
    'blog',
    'category',
    'collection',
    'user',
    'brand',
    'vendor',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// Export media type values for validation
export const MEDIA_TYPES = ['image', 'video', 'document', 'file'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];
