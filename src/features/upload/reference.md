# Deferred Upload & Thumbnail System Implementation Guide

This guide explains how to implement the deferred upload pattern with automatic thumbnail generation for any feature (Blogs, Customers, etc.).

## Overview

The "Deferred Upload" pattern means files are:
1.  **Selected locally** (previewed via Blob URLs)
2.  **Held in memory** until the form is submitted
3.  **Uploaded sequentially** during the save process
4.  **Linked** to the entity (product/blog/customer) via the returned URLs

**Key Features:**
*   **Automatic Thumbnails**: Backend automatically generates compressed (400x400) thumbnails for images.
*   **Optimization**: Use thumbnails in grids/tables; use originals in lightboxes/details.
*   **Security**: Validates file types (JPG, PNG, WebP) and sanitizes filenames.

---

## 1. Frontend Implementation

### A. Setup Hook
Use `useDeferredUpload` to manage file state.

```tsx
import { useDeferredUpload } from '@/features/products/hooks';

// Inside your form component
const {
  pendingPrimaryImage,
  setPendingPrimaryImage,
  pendingAdditionalImages,
  setPendingAdditionalImages,
  uploadPendingImages,
} = useDeferredUpload();
```

### B. UI Component
Use `DeferredImageUploader` (or `DeferredMediaSection` wrapper) to render the UI.
Pass both image URLs and thumbnail URLs if editing.

```tsx
import { DeferredMediaSection } from '@/features/products/components/form-sections/DeferredMediaSection';

<DeferredMediaSection
  // Pending State (New Uploads)
  pendingPrimaryImage={pendingPrimaryImage}
  pendingAdditionalImages={pendingAdditionalImages}
  onPendingPrimaryChange={setPendingPrimaryImage}
  onPendingAdditionalChange={setPendingAdditionalImages}
  
  // Existing State (Edit Mode)
  existingPrimaryImage={existingData?.imageUrl}
  existingPrimaryThumbnail={existingData?.thumbnailUrl} // <--- Pass thumbnail
  existingAdditionalImages={existingData?.galleryImages}
  existingAdditionalThumbnails={existingData?.galleryThumbnails} // <--- Pass thumbnails
  
  // Handlers for removing existing images
  onExistingPrimaryChange={(url) => { /* handle removal */ }}
  onExistingAdditionalChange={(urls) => { /* handle removal */ }}
/>
```

### C. Handling Form Submission

**1. Define Folder Path:**
Standardize paths: `[feature-plural]/{slug-or-id}/`.
Example: `blogs/my-first-blog`, `customers/user-123`.

**2. Execute Upload:**
Call `uploadPendingImages` before saving your entity.

```tsx
const handleSave = async () => {
    // 1. Upload Images
    const folderPath = `blogs/${formData.slug}`; // e.g.
    
    // Result contains both original and thumbnail URLs
    const { 
        primaryUrl, 
        primaryThumbnailUrl, 
        additionalUrls, 
        additionalThumbnailUrls 
    } = await uploadPendingImages(folderPath);

    // 2. Prepare Data for API
    const apiPayload = {
        ...formData,
        // Prefer new upload, fallback to existing
        image_url: primaryUrl || existingData.image_url,
        thumbnail_url: primaryThumbnailUrl || existingData.thumbnail_url, // <--- Save this!
    };

    // 3. Call your create/update mutation
    saveMutation.mutate(apiPayload);
};
```

---

## 2. Backend Implementation

The backend logic is centralized. No changes needed unless adding new file types.

*   **API**: `POST /api/upload`
*   **Service**: `supabaseStorage.ts`
*   **Behavior**: 
    *   Uploads original file.
    *   If image, generates `_thumb.jpg` using `sharp`.
    *   Returns `url` (original) and `thumbnailUrl`.

### Database Schema Recommendation
Ensure your feature's table supports storing the thumbnail URL.

```sql
-- Example Schema Update
ALTER TABLE blogs 
ADD COLUMN thumbnail_url TEXT; 
-- or for gallery tables
ALTER TABLE blog_images
ADD COLUMN thumbnail_url TEXT;
```

---

## Reference Files

*   **Hook**: `anant-enterprises-admin/src/features/products/hooks/useDeferredUpload.ts`
*   **Component**: `anant-enterprises-admin/src/features/products/components/DeferredImageUploader.tsx`
*   **Backend Storage**: `anant-enterprises-backend/src/utils/supabaseStorage.ts`
*   **Example Usage**: `anant-enterprises-admin/src/features/products/pages/ProductDetailPage.tsx`