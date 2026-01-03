# Enhanced Media Management - Implementation Plan

**Approach**: Lightweight Extension (Option 1)  
**Timeline**: 4 phases over 1-2 weeks  
**Strategy**: Leverage existing Supabase Storage, add product-image relationships

---

## Overview

We're extending the existing upload system to support product images without rebuilding what Supabase already provides (CDN, transformations, optimization). This plan focuses on the **missing database relationships** and **product-specific features**.

---

## Phase 1: Database Schema & Foundation

**Goal**: Create the database structure for product-image relationships

**Duration**: 2-3 hours

### Deliverables:

1. **New Table: `product_images`**
   - Links products to uploaded images
   - Supports ordering and primary image designation
   - Includes SEO fields (alt text)

2. **Enhanced `uploads` Table**
   - Add `image_category` enum: `product | variant | user_avatar | document | other`
   - Better categorization for filtering

3. **Migration Scripts**
   - Drizzle migration for new table
   - Safe migration with rollback capability

### Schema Details:

```typescript
// src/features/upload/shared/product-images.schema.ts
export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    upload_id: serial('upload_id')
      .notNull()
      .references(() => uploads.id, { onDelete: 'cascade' }),
    display_order: integer('display_order').notNull().default(0),
    is_primary: boolean('is_primary').default(false).notNull(),
    alt_text: varchar('alt_text', { length: 255 }),
    caption: text('caption'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('product_images_product_id_idx').on(table.product_id),
    displayOrderIdx: index('product_images_display_order_idx').on(
      table.product_id,
      table.display_order
    ),
    uploadIdIdx: index('product_images_upload_id_idx').on(table.upload_id),
  })
);
```

### Files to Create/Modify:

- `src/features/upload/shared/product-images.schema.ts` (new)
- `src/features/upload/shared/schema.ts` (modify - add enum)
- `src/database/schema.ts` (modify - export new table)
- `drizzle/migrations/XXXX_add_product_images.sql` (new migration)

### Verification Steps:

1. ✅ Migration runs successfully (`npm run db:migrate`)
2. ✅ New table appears in Drizzle Studio (`npm run db:studio`)
3. ✅ Foreign key constraints work (cascade delete)
4. ✅ Indexes are created correctly
5. ✅ TypeScript types are generated

### Success Criteria:

- Database schema is ready for product images
- No breaking changes to existing upload functionality
- Migration is reversible

---

## Phase 2: Core Product Image APIs

**Goal**: Basic CRUD operations for product images

**Duration**: 4-6 hours

### Deliverables:

1. **Upload Image for Product** - `POST /api/products/:productId/images`
2. **List Product Images** - `GET /api/products/:productId/images`
3. **Get Single Product Image** - `GET /api/products/:productId/images/:imageId`
4. **Delete Product Image** - `DELETE /api/products/:productId/images/:imageId`

---

## Phase 3: Image Management Features

**Goal**: Advanced features for managing product images

**Duration**: 3-4 hours

### Deliverables:

1. **Update Image Order** - `PUT /api/products/:productId/images/:imageId/order`
2. **Set Primary Image** - `PUT /api/products/:productId/images/:imageId/primary`
3. **Update Image Metadata** - `PUT /api/products/:productId/images/:imageId`
4. **Bulk Upload** - `POST /api/products/:productId/images/bulk`
5. **Reorder All Images** - `PUT /api/products/:productId/images/reorder`

---

## Phase 4: Enhanced Metadata & Validation

**Goal**: Add image validation and enhanced metadata extraction

**Duration**: 3-4 hours

### Deliverables:

1. **Image Validation Rules** - Min dimensions, max size, allowed formats
2. **Metadata Extraction** - Dimensions, EXIF data
3. **Enhanced Upload Response** - Include metadata
4. **Image Analytics** (optional) - Track views and performance

---

**Ready to start with Phase 1?**
