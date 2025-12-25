import {
  pgTable,
  bigserial,
  timestamp,
  boolean,
  integer,
  varchar,
  text,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

/**
 * Media Library Schema
 * Centralized asset management for images, videos, documents
 */

// Enums
export const mediaTypeEnum = pgEnum('media_type', ['image', 'video', 'document', 'audio', 'other']);
export const mediaMimeTypeEnum = pgEnum('media_mime_type', [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'text/plain',
  'other',
]);

/**
 * Media Library Table
 * Stores references to all uploaded files
 */
export const mediaLibrary = pgTable(
  'media_library',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    
    // File info
    filename: varchar('filename', { length: 255 }).notNull(),
    original_filename: varchar('original_filename', { length: 255 }).notNull(),
    file_path: varchar('file_path', { length: 500 }).notNull(),
    file_url: varchar('file_url', { length: 500 }).notNull(),
    
    // File metadata
    type: mediaTypeEnum('type').notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    file_size: integer('file_size').notNull(),
    
    // Image-specific
    width: integer('width'),
    height: integer('height'),
    thumbnail_url: varchar('thumbnail_url', { length: 500 }),
    
    // Organization
    title: varchar('title', { length: 255 }),
    alt_text: varchar('alt_text', { length: 255 }),
    caption: text('caption'),
    description: text('description'),
    
    // Categorization
    folder: varchar('folder', { length: 255 }),
    tags: varchar('tags', { length: 500 }),
    
    // Usage tracking
    usage_count: integer('usage_count').default(0),
    
    // Storage details
    storage_provider: varchar('storage_provider', { length: 50 }).default('s3'),
    
    // Audit fields
    uploaded_by: integer('uploaded_by'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_by: integer('updated_by'),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
    is_deleted: boolean('is_deleted').default(false).notNull(),
    deleted_by: integer('deleted_by'),
    deleted_at: timestamp('deleted_at'),
  },
  (table) => ({
    filenameIdx: index('media_library_filename_idx').on(table.filename),
    typeIdx: index('media_library_type_idx').on(table.type),
    mimeTypeIdx: index('media_library_mime_type_idx').on(table.mime_type),
    folderIdx: index('media_library_folder_idx').on(table.folder),
    uploadedByIdx: index('media_library_uploaded_by_idx').on(table.uploaded_by),
    createdAtIdx: index('media_library_created_at_idx').on(table.created_at),
  })
);

// Export types
export type MediaLibrary = typeof mediaLibrary.$inferSelect;
export type NewMediaLibrary = typeof mediaLibrary.$inferInsert;
