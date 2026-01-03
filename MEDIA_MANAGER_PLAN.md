# Media Manager Feature - Implementation Plan (Option A)

**Approach**: Centralized Media Management  
**Timeline**: 4 phases over 1-2 weeks  
**Strategy**: Generic, reusable system for all entities (products, blogs, categories, users, etc.)

---

## Overview

Building a **centralized media manager** that handles images/files for ANY entity type through a generic relationship model. This eliminates code duplication and provides consistent APIs across all features.

---

## Architecture

### Entity-Agnostic Design

```typescript
// Instead of: product_images, blog_images, category_images...
// We have ONE table:
entity_media {
  id: uuid
  entity_type: 'product' | 'blog' | 'category' | 'user' | ...
  entity_id: uuid
  upload_id: integer
  media_type: 'image' | 'video' | 'document'
  display_order: integer
  is_primary: boolean
  ...
}
```

**Benefits**:
- ✅ Add blog images → zero new code
- ✅ Add category images → zero new code  
- ✅ Consistent APIs everywhere
- ✅ Centralized validation/processing

---

## Phase 1: Core Schema & Infrastructure

**Goal**: Create the database foundation for entity-agnostic media management

**Duration**: 2-3 hours

### Deliverables:

1. **Entity Media Table**
   - Generic relationship: `entity_type` + `entity_id`
   - Links to uploads table
   - Supports ordering, primary designation
   - Media categorization (image/video/document)

2. **Media Categories Enum**
   - `entity_type`: product, blog, category, user, collection, etc.
   - `media_type`: image, video, document, file

3. **Enhanced Uploads Table**
   - Add `media_category` for better filtering
   - Add `image_metadata` JSONB for dimensions, EXIF, etc.

### Schema Details:

```typescript
// src/features/media-manager/shared/entity-media.schema.ts

export const entityTypeEnum = pgEnum('entity_type', [
  'product',
  'blog',
  'category',
  'collection',
  'user',
  'brand',
  'vendor',
]);

export const mediaTypeEnum = pgEnum('media_type', [
  'image',
  'video',
  'document',
  'file',
]);

export const entityMedia = pgTable(
  'entity_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Generic entity relationship
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
    
    // SEO & Metadata
    alt_text: varchar('alt_text', { length: 255 }),
    caption: text('caption'),
    metadata: jsonb('metadata'), // Dimensions, EXIF, etc.
    
    // Audit
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for entity lookups (most common)
    entityIdx: index('entity_media_entity_idx').on(
      table.entity_type,
      table.entity_id
    ),
    // Index for ordered retrieval
    displayOrderIdx: index('entity_media_display_order_idx').on(
      table.entity_type,
      table.entity_id,
      table.display_order
    ),
    // Index for upload reverse lookups
    uploadIdIdx: index('entity_media_upload_id_idx').on(table.upload_id),
    // Unique constraint for primary images
    primaryUniqueIdx: index('entity_media_primary_unique_idx').on(
      table.entity_type,
      table.entity_id,
      table.is_primary
    ),
  })
);
```

### Files to Create:

- `src/features/media-manager/` (new feature)
- `src/features/media-manager/shared/entity-media.schema.ts`
- `src/features/media-manager/shared/index.ts`
- Update `src/database/drizzle.ts`
- Migration script (deferred)

### Verification:

- ✅ Schema compiles without errors
- ✅ Composite indexes are correct
- ✅ Enums are properly defined
- ✅ Foreign keys work

---

## Phase 2: Core Media Service & Queries

**Goal**: Build the service layer for media management

**Duration**: 4-6 hours

### Deliverables:

1. **Database Queries** (`entity-media.queries.ts`)
   - `createEntityMedia()`
   - `findEntityMedia(entityType, entityId)`
   - `findEntityMediaById()`
   - `updateEntityMedia()`
   - `deleteEntityMedia()`
   - `setPrimaryMedia()`
   - `reorderMedia()`

2. **Media Service** (`media.service.ts`)
   - `attachMediaToEntity()` - Upload + link
   - `getEntityMedia()` - Get all media with variants
   - `getMediaById()` - Single media with variants
   - `updateMediaMetadata()` - Alt text, caption
   - `deleteMedia()` - With primary reassignment
   - `setAsPrimary()` - Manage primary images
   - `reorderEntityMedia()` - Batch reorder

3. **Image Transformer Service** (`image-transformer.service.ts`)
   - `generateVariants()` - Thumbnail, small, medium, large, zoom
   - `getVariantUrl()` - Supabase transformation URLs
   - Integration with Supabase Storage

### Service Response Format:

```typescript
interface MediaResponse {
  id: string;
  entity_type: string;
  entity_id: string;
  media_type: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  caption: string | null;
  original_url: string;
  variants?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    zoom: string;
  };
  metadata: {
    filename: string;
    size: number;
    mime_type: string;
    dimensions?: { width: number; height: number };
    exif?: Record<string, any>;
  };
  created_at: Date;
  updated_at: Date;
}
```

### Files to Create:

- `src/features/media-manager/shared/entity-media.queries.ts`
- `src/features/media-manager/services/media.service.ts`
- `src/features/media-manager/services/image-transformer.service.ts`
- `src/features/media-manager/shared/interface.ts`

---

## Phase 3: REST APIs

**Goal**: Build generic, entity-agnostic REST APIs

**Duration**: 4-6 hours

### Deliverables:

1. **Upload Media**
   - `POST /api/media/:entityType/:entityId`
   - Multipart file upload
   - Automatically links to entity
   - Returns media with variants

2. **List Entity Media**
   - `GET /api/media/:entityType/:entityId`
   - Returns all media for entity (ordered)
   - Supports filtering by media_type

3. **Get Single Media**
   - `GET /api/media/:id`
   - Returns specific media with variants

4. **Update Media Metadata**
   - `PUT /api/media/:id`
   - Update alt_text, caption, display_order

5. **Delete Media**
   - `DELETE /api/media/:id`
   - Cascade-safe deletion
   - Auto primary reassignment

6. **Set Primary Media**
   - `PUT /api/media/:id/primary`
   - Set specific media as primary

7. **Reorder Media**
   - `PUT /api/media/:entityType/:entityId/reorder`
   - Batch update display orders

8. **Bulk Upload**
   - `POST /api/media/:entityType/:entityId/bulk`
   - Upload multiple files at once

### API Examples:

```bash
# Upload product image
POST /api/media/product/uuid-123
Content-Type: multipart/form-data
{ image: file, alt_text: "...", caption: "..." }

# List all product images
GET /api/media/product/uuid-123?media_type=image

# Upload blog thumbnail
POST /api/media/blog/uuid-456
{ image: file, is_primary: true }

# Get all user profile pictures
GET /api/media/user/uuid-789
```

### Files to Create:

- `src/features/media-manager/apis/upload-media.ts`
- `src/features/media-manager/apis/list-entity-media.ts`
- `src/features/media-manager/apis/get-media.ts`
- `src/features/media-manager/apis/update-media.ts`
- `src/features/media-manager/apis/delete-media.ts`
- `src/features/media-manager/apis/set-primary-media.ts`
- `src/features/media-manager/apis/reorder-media.ts`
- `src/features/media-manager/apis/bulk-upload-media.ts`
- `src/features/media-manager/route.ts`

---

## Phase 4: Validation & Advanced Features

**Goal**: Add validation, metadata extraction, and advanced features

**Duration**: 3-4 hours

### Deliverables:

1. **Media Validator Service**
   - Image validation (dimensions, size, format)
   - Video validation
   - Document validation
   - Entity-specific rules (e.g., products need 800x800 min)

2. **Metadata Extractor Service**
   - Extract image dimensions
   - Extract EXIF data
   - Extract video duration/codec
   - Color palette extraction (optional)

3. **Validation Rules by Entity Type**
   ```typescript
   const validationRules = {
     product: {
       image: {
         minWidth: 800,
         minHeight: 800,
         maxSize: 10 * 1024 * 1024,
         formats: ['jpg', 'png', 'webp'],
       },
     },
     user: {
       image: {
         maxSize: 2 * 1024 * 1024,
         aspectRatio: '1:1',
       },
     },
   };
   ```

4. **Bulk Operations**
   - Bulk upload with error handling
   - Partial success support
   - Transaction safety

### Files to Create:

- `src/features/media-manager/services/media-validator.service.ts`
- `src/features/media-manager/services/metadata-extractor.service.ts`
- `src/features/media-manager/utils/validation-rules.ts`

---

## Integration Examples

### Using with Products

```typescript
// Upload product  image
POST /api/media/product/prod-uuid-123
{ image: file, alt_text: "Blue Widget" }

// Get product images in product API
const productWithImages = {
  ...product,
  images: await mediaService.getEntityMedia('product', product.id)
};
```

### Using with Blogs

```typescript
// Upload blog cover image
POST /api/media/blog/blog-uuid-456
{ image: file, is_primary: true }

// Get blog with cover in blog API
const blog = {
  ...blogData,
  coverImage: await mediaService.getPrimaryMedia('blog', blogData.id),
  galleryImages: await mediaService.getEntityMedia('blog', blogData.id)
};
```

### Using with Categories

```typescript
// Upload category thumbnail
POST /api/media/category/cat-uuid-789
{ image: file }
```

---

## Migration Strategy

### From Product Images (if needed)

```sql
-- Migrate existing product_images to entity_media
INSERT INTO entity_media (
  entity_type,
  entity_id,
  upload_id,
  media_type,
  display_order,
  is_primary,
  alt_text,
  caption
)
SELECT
  'product',
  product_id,
  upload_id,
  'image',
  display_order,
  is_primary,
  alt_text,
  caption
FROM product_images;
```

---

## Advantages of This Approach

### 1. **Extreme Reusability**
```typescript
// Same code works for ANY entity
mediaService.attachMediaToEntity('product', productId, file);
mediaService.attachMediaToEntity('blog', blogId, file);
mediaService.attachMediaToEntity('user', userId, file);
```

### 2. **Consistent APIs**
```
POST /api/media/product/:id     # Products
POST /api/media/blog/:id         # Blogs  
POST /api/media/category/:id     # Categories
POST /api/media/user/:id         # Users
```

### 3. **Single Source of Truth**
- One service for validation
- One service for transformations
- One service for metadata extraction
- One set of tests

### 4. **Easy to Extend**
```typescript
// Add new entity type? Just add to enum!
export const entityTypeEnum = pgEnum('entity_type', [
  'product',
  'blog',
  'category',
  'brand',      // ← New
  'promotion',  // ← New
]);
```

---

## Testing Strategy

### Unit Tests:
- MediaService methods
- ImageTransformerService
- MediaValidatorService
- MetadataExtractorService

### Integration Tests:
- Upload media for product
- Upload media for blog
- Bulk upload
- Primary image management
- Cross-entity operations

---

## Performance Considerations

1. **Composite Indexes**: `(entity_type, entity_id, display_order)`
2. **Pagination**: Limit media queries
3. **CDN Caching**: Supabase handles variants
4. **Lazy Loading**: Don't fetch media unless needed

---

## Documentation

After implementation:

1. `src/features/media-manager/README.md`
2. API documentation with examples
3. Integration guide for new entities
4. Migration guide from entity-specific tables

---

## Phase Breakdown Summary

| Phase | Focus | Duration | Deliverables |
|-------|-------|----------|--------------|
| 1 | Schema | 2-3h | entity_media table, enums, migrations |
| 2 | Service | 4-6h | Queries, MediaService, transformers |
| 3 | APIs | 4-6h | 8 REST endpoints, route integration |
| 4 | Advanced | 3-4h | Validation, metadata, bulk ops |

**Total**: 13-19 hours (~2-3 days)

---

## Review Checkpoints

**After Phase 1**:
- Review schema design
- Verify composite indexes
- Check enum values

**After Phase 2**:
- Review service architecture
- Test query performance
- Verify variant generation

**After Phase 3**:
- Review API design
- Test all endpoints
- Verify auth/permissions

**After Phase 4**:
- Review validation rules
- Test metadata extraction
- Final integration check

---

**Ready to start Phase 1?**
