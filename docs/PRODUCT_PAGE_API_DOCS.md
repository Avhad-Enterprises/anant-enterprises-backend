# Product Page - Backend API Documentation

> **Target Audience**: Backend Developers  
> **Frontend Reference**: `anant-enterprises-frontend/src/lib/data/product`  
> **Backend Feature**: `anant-enterprises-backend/src/features/product` + related features  
> **Last Updated**: January 2026

---

## Overview

This document defines the API contracts required to support the **Product Detail Page** and related features on the customer frontend. The frontend uses 8 data fetchers requiring various backend endpoints.

### Frontend Data Fetchers Summary

| Fetcher | Endpoint Pattern | Backend Status |
|---------|-----------------|----------------|
| `getProductById` | `GET /products/:id` | ✅ Exists (needs frontend mapping) |
| `getProductReviews` | `GET /products/:id/reviews` | 🔶 Schema exists, API needed |
| `getRelatedProducts` | `GET /products/:id/related` | 🆕 New endpoint needed |
| `getBrandProducts` | `GET /brands/:brandId/products` | 🆕 New endpoint needed |
| `getCategoryProducts` | `GET /categories/:categoryId/products` | 🆕 New endpoint needed |
| `getProductBundles` | `GET /products/:id/bundles` | 🔶 Schema exists, API needed |
| `getComparisonProducts` | `GET /products/compare` | 🆕 New endpoint needed |
| `searchProducts` | `GET /products/search` | 🆕 New endpoint needed |

---

## Base URL & Authentication

```
Base URL: /api/v1
```

| Endpoint Type | Authentication | Notes |
|---------------|----------------|-------|
| Product Detail | ❌ Public | Active products only |
| Product Reviews | ❌ Public | Approved reviews only |
| Related/Brand/Category | ❌ Public | Active products listing |
| Search | ❌ Public | Active products only |
| Admin CRUD | ✅ Required | Existing admin endpoints |

---

## 1. Get Product by ID (Product Detail)

### GET `/api/products/:id`

> **Status**: ✅ Exists - Needs response transformation for frontend  
> **Backend File**: [get-product-by-id.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/get-product-by-id.ts)

#### Frontend Expected: `ProductDetail`

```typescript
interface ProductDetail {
    id: string | number;
    name: string;                         // Product title
    subtitle?: string;                    // Secondary title
    tags: string[];                       // Technology/feature tags
    rating: number;                       // Average rating (computed)
    reviews: number;                      // Total review count (computed)
    price: number;                        // Selling price
    originalPrice?: number;               // Compare at price (strikethrough)
    discount?: number;                    // Discount percentage
    image: string;                        // Primary image URL
    images?: string[];                    // All images (primary + additional)
    inStock: boolean;                     // Stock availability
    sku?: string;
    category?: string;                    // Category name (tier 1)
    categoryId?: string;                  // Category slug/id
    brand?: string;                       // Brand name
    brandId?: string;                     // Brand slug/id
    features?: ProductFeature[];          // Icon feature cards
    colors?: ProductColor[];              // Color variants
    highlights?: string[];                // Bullet point highlights
}

interface ProductFeature {
    icon: string;                         // Lucide icon name
    title: string;
    description: string;
}

interface ProductColor {
    name: string;                         // Internal name
    label: string;                        // Display label
    hex: string;                          // Hex color code
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Transform |
|----------------|---------------------|-----------|
| `id` | `id` | Direct |
| `name` | `product_title` | ⚠️ Rename |
| `subtitle` | `secondary_title` | ⚠️ Rename |
| `tags` | *(new field needed)* | 🆕 Add to schema or derive from categories |
| `rating` | *(computed)* | AVG from reviews table |
| `reviews` | *(computed)* | COUNT from reviews table |
| `price` | `selling_price` | Parse to number |
| `originalPrice` | `compare_at_price` | Parse to number |
| `discount` | *(computed)* | `(compare_at_price - selling_price) / compare_at_price * 100` |
| `image` | `primary_image_url` | ⚠️ Rename |
| `images` | `[primary_image_url, ...additional_images]` | Combine arrays |
| `inStock` | *(computed)* | Query inventory table |
| `sku` | `sku` | Direct |
| `category` | `category_tier_1` | ⚠️ Rename |
| `categoryId` | *(derived)* | Slugify `category_tier_1` |
| `brand` | *(new field needed)* | 🆕 Add brand relationship |
| `brandId` | *(new field needed)* | 🆕 Add brand relationship |
| `features` | *(new field needed)* | 🆕 JSONB or separate table |
| `colors` | ` *(from variants)* | Query product_variants |
| `highlights` | *(parse from full_description or new field)* | 🆕 Add as JSONB array |

#### Required API Response

```json
{
    "success": true,
    "message": "Product retrieved successfully",
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Anant Pure X1 Pro",
        "subtitle": "Advanced RO + UV + UF Water Purifier",
        "tags": ["RO", "UV", "UF"],
        "rating": 4.8,
        "reviews": 342,
        "price": 12999,
        "originalPrice": 18999,
        "discount": 32,
        "image": "https://cdn.example.com/products/x1-pro.jpg",
        "images": [
            "https://cdn.example.com/products/x1-pro.jpg",
            "https://cdn.example.com/products/x1-pro-2.jpg"
        ],
        "inStock": true,
        "sku": "ANT-PX1-PRO-2024",
        "category": "Residential Purifiers",
        "categoryId": "residential",
        "brand": "Anant",
        "brandId": "anant",
        "features": [
            {
                "icon": "Shield",
                "title": "5 Year Warranty",
                "description": "Comprehensive coverage"
            }
        ],
        "colors": [
            { "name": "white", "label": "Pearl White", "hex": "#FFFFFF" }
        ],
        "highlights": [
            "Multi-stage RO + UV + UF purification",
            "10 Litre storage capacity"
        ]
    }
}
```

> [!IMPORTANT]
> **Schema Extensions Required**:
> - Add `brand_id` FK to products table (or `brand_name` varchar)
> - Add `tags` JSONB array column for feature tags
> - Add `highlights` JSONB array column for bullet points
> - Add `features` JSONB column for feature cards (icon, title, description)

---

## 2. Get Product Reviews

### GET `/api/products/:productId/reviews`

> **Status**: 🔶 Schema exists, API endpoint needed  
> **Schema File**: [reviews.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/reviews/shared/reviews.schema.ts)

#### Frontend Expected: `ReviewsResponse`

```typescript
interface ProductReview {
    id: number;
    author: string;                       // User name
    avatar?: string;                      // User avatar URL
    rating: number;                       // 1-5
    date: string;                         // Display format "2 weeks ago"
    timestamp?: string;                   // ISO date
    verified: boolean;                    // Verified purchase
    title?: string;
    content: string;                      // Review comment
    helpful: number;                      // Helpful votes count
    images?: string[];                    // Review images
}

interface ReviewsResponse {
    reviews: ProductReview[];
    total: number;
    averageRating: number;
    ratingDistribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Notes |
|----------------|---------------------|-------|
| `id` | `id` | Direct |
| `author` | JOIN with `users.name` | Query user table |
| `avatar` | JOIN with `users.profile_image_url` | Query user table |
| `rating` | `rating` | Direct |
| `date` | `created_at` | Format as relative ("2 weeks ago") |
| `timestamp` | `created_at` | ISO string |
| `verified` | `is_verified_purchase` | ⚠️ Rename |
| `title` | `title` | Direct |
| `content` | `comment` | ⚠️ Rename |
| `helpful` | `helpful_votes` | ⚠️ Rename |
| `images` | `media_urls` | ⚠️ Rename |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Pagination |
| `limit` | number | 10 | Items per page (max 50) |
| `sort` | string | `recent` | `recent`, `helpful`, `rating_high`, `rating_low` |

#### Required API Response

```json
{
    "success": true,
    "message": "Reviews retrieved successfully",
    "data": {
        "reviews": [
            {
                "id": 1,
                "author": "Rajesh Kumar",
                "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh",
                "rating": 5,
                "date": "2 weeks ago",
                "timestamp": "2025-12-18T10:00:00.000Z",
                "verified": true,
                "content": "Excellent water purifier!",
                "helpful": 24,
                "images": []
            }
        ],
        "total": 342,
        "averageRating": 4.8,
        "ratingDistribution": {
            "5": 240,
            "4": 65,
            "3": 20,
            "2": 10,
            "1": 7
        }
    }
}
```

#### Implementation Notes

```
Location: anant-enterprises-backend/src/features/reviews/apis/get-product-reviews.ts (NEW)

Query Logic:
1. Filter reviews by product_id
2. Filter status = 'approved' only (moderation)
3. Filter is_deleted = false
4. Join with users table for author name/avatar
5. Compute ratingDistribution with GROUP BY
6. Compute averageRating with AVG()
```

---

## 3. Get Related Products

### GET `/api/products/:productId/related`

> **Status**: 🆕 New endpoint needed

Returns similar products based on category, tags, or recommendation algorithm.

#### Frontend Expected: `Product[]`

```typescript
interface Product {
    id: number | string;
    name: string;
    tags?: string[];
    rating?: number;
    reviews?: number;
    price: number;
    originalPrice?: number;
    image: string;
}
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 4 | Max products to return |

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": "101",
            "name": "Anant Pure X2 Max",
            "tags": ["RO", "UV", "Copper"],
            "rating": 4.9,
            "reviews": 156,
            "price": 15999,
            "originalPrice": 21999,
            "image": "https://cdn.example.com/products/x2-max.jpg"
        }
    ]
}
```

#### Implementation Strategy

```sql
-- Simple category-based recommendation
SELECT p.* 
FROM products p
WHERE p.category_tier_1 = (
    SELECT category_tier_1 FROM products WHERE id = :productId
)
AND p.id != :productId
AND p.status = 'active'
AND p.is_deleted = false
ORDER BY p.selling_price DESC
LIMIT :limit;
```

---

## 4. Get Brand Products

### GET `/api/brands/:brandId/products`

> **Status**: 🆕 New endpoint needed (requires brand field in products)

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 6 | Max products to return |
| `exclude` | string | - | Product ID to exclude |

#### Required API Response

Same format as Related Products.

> [!WARNING]
> **Prerequisite**: Products table needs a `brand` or `brand_id` column. Currently, brand information is not stored.

---

## 5. Get Category Products

### GET `/api/categories/:categoryId/products`

> **Status**: 🆕 New endpoint needed

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 6 | Max products to return |
| `exclude` | string | - | Product ID to exclude |

#### Implementation Notes

```sql
SELECT p.* 
FROM products p
WHERE LOWER(REPLACE(p.category_tier_1, ' ', '-')) = :categoryId
   OR LOWER(REPLACE(p.category_tier_2, ' ', '-')) = :categoryId
AND p.status = 'active'
AND p.is_deleted = false
ORDER BY p.created_at DESC
LIMIT :limit;
```

---

## 6. Get Product Bundles

### GET `/api/products/:productId/bundles`

> **Status**: 🔶 Schema exists, API endpoint needed  
> **Schema Files**: 
> - [bundles.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/bundles/shared/bundles.schema.ts)
> - [bundle-items.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/bundles/shared/bundle-items.schema.ts)

#### Frontend Expected: `ProductBundle[]`

```typescript
interface BundleItem {
    name: string;
    image: string;
    price: number;
    originalPrice: number;
}

interface ProductBundle {
    id: number;
    name: string;                         // Bundle title
    items: BundleItem[];                  // Bundle components
    totalPrice: number;                   // Bundle price
    originalPrice: number;                // Total if bought separately
    discount: number;                     // Savings percentage
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Notes |
|----------------|---------------------|-------|
| `id` | `bundles.id` | Direct |
| `name` | `bundles.title` | ⚠️ Rename |
| `items` | JOIN `bundle_items` → `products` | Fetch each item's product details |
| `totalPrice` | `bundles.price_value` (if fixed_price) | Conditional logic |
| `originalPrice` | *(computed)* | Sum of individual product prices |
| `discount` | *(computed)* | `(originalPrice - totalPrice) / originalPrice * 100` |

#### Query Logic

```sql
SELECT b.*, 
       bi.product_id, bi.quantity,
       p.product_title, p.primary_image_url, p.selling_price, p.compare_at_price
FROM bundles b
JOIN bundle_items bi ON bi.bundle_id = b.id
JOIN products p ON p.id = bi.product_id
WHERE bi.product_id = :productId  -- Main product must be in bundle
  AND b.status = 'active'
  AND b.is_deleted = false
  AND (b.starts_at IS NULL OR b.starts_at <= NOW())
  AND (b.ends_at IS NULL OR b.ends_at >= NOW());
```

---

## 7. Get Comparison Products

### GET `/api/products/compare`

> **Status**: 🆕 New endpoint needed

Returns products formatted for comparison table with specifications.

#### Frontend Expected: `ComparisonProduct[]`

```typescript
interface ComparisonProduct {
    id: string;
    name: string;
    image: string;
    price: number;
    rating: number;
    category: string;
    description: string;
    bestValue?: boolean;                  // Highlight flag
    highlight?: string;                   // "Most Popular", "Premium"
    specs: {
        technology: string;
        storage: string;
        stages: string;
        mineral: boolean;
        display: boolean;
        power: string;
        warranty: string;
        dimensions: string;
        certification: string;
    };
}
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ids` | string | Comma-separated product IDs |
| `category` | string | Category to fetch comparison products from |
| `limit` | number | Max products (default: 5) |

> [!IMPORTANT]
> **Schema Extension Required**: Products need a `specs` JSONB column or a separate `product_specifications` table to store technical specifications.

---

## 8. Search Products

### GET `/api/products/search`

> **Status**: 🆕 New endpoint needed

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `category` | string | Filter by category |
| `limit` | number | Max results (default: 20) |

#### Frontend Expected: `Product[]`

Same format as Related Products, with optional `category` field.

#### Implementation Notes

```sql
SELECT p.*
FROM products p
WHERE p.status = 'active'
  AND p.is_deleted = false
  AND (
      p.product_title ILIKE '%' || :query || '%'
      OR p.secondary_title ILIKE '%' || :query || '%'
      OR p.category_tier_1 ILIKE '%' || :query || '%'
      OR p.category_tier_2 ILIKE '%' || :query || '%'
      OR p.sku ILIKE '%' || :query || '%'
  )
ORDER BY 
    CASE WHEN p.product_title ILIKE :query || '%' THEN 0 ELSE 1 END,
    p.product_title
LIMIT :limit;
```

> [!TIP]
> Consider implementing PostgreSQL full-text search with `tsvector` for better performance and relevance ranking.

---

## Response Format Standards

### Success Response

```json
{
    "success": true,
    "message": "Operation successful",
    "data": { ... },
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100
    }
}
```

### Error Response

```json
{
    "success": false,
    "message": "Product not found",
    "errors": []
}
```

---

## Schema Extensions Summary

| Extension | Type | Priority | Description |
|-----------|------|----------|-------------|
| `brand` / `brand_id` | varchar/FK | 🔴 High | Brand relationship |
| `tags` | JSONB | 🔴 High | Feature tags array |
| `highlights` | JSONB | 🟡 Medium | Bullet points array |
| `features` | JSONB | 🟡 Medium | Feature cards with icons |
| `specs` | JSONB | 🟢 Low | Technical specifications |

---

## Implementation Priority

| Priority | Endpoint | Complexity | Dependencies |
|----------|----------|------------|--------------|
| 🔴 High | Product Reviews API | Medium | reviews schema exists |
| 🔴 High | Search Products | Medium | None |
| 🔴 High | Related Products | Low | None |
| 🟡 Medium | Category Products | Low | None |
| 🟡 Medium | Brand Products | Low | Requires brand field |
| 🟡 Medium | Product Bundles API | Medium | bundles schema exists |
| 🟢 Low | Comparison Products | High | Requires specs field |

---

## Related Backend Files

### Existing Schemas

| Schema | Location |
|--------|----------|
| Products | [product.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/shared/product.schema.ts) |
| Product Variants | [product-variants.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/shared/product-variants.schema.ts) |
| Reviews | [reviews.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/reviews/shared/reviews.schema.ts) |
| Bundles | [bundles.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/bundles/shared/bundles.schema.ts) |
| Bundle Items | [bundle-items.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/bundles/shared/bundle-items.schema.ts) |

### Existing Product APIs

| Endpoint | File |
|----------|------|
| POST /api/products | [create-product.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/create-product.ts) |
| GET /api/products | [get-all-products.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/get-all-products.ts) |
| GET /api/products/:id | [get-product-by-id.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/get-product-by-id.ts) |
| PUT /api/products/:id | [update-product.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/update-product.ts) |
| DELETE /api/products/:id | [delete-product.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/delete-product.ts) |

---

## Frontend Reference Files

| File | Description |
|------|-------------|
| [product.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/types/product.ts) | TypeScript interfaces |
| [getProductById.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getProductById.ts) | Product detail fetcher |
| [getProductReviews.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getProductReviews.ts) | Reviews fetcher |
| [getRelatedProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getRelatedProducts.ts) | Related products |
| [getBrandProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getBrandProducts.ts) | Brand products |
| [getCategoryProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getCategoryProducts.ts) | Category products |
| [getProductBundles.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getProductBundles.ts) | Product bundles |
| [getComparisonProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/getComparisonProducts.ts) | Comparison table |
| [searchProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/product/searchProducts.ts) | Product search |
