# Collection Page - Backend API Documentation

> **Target Audience**: Backend Developers  
> **Frontend Reference**: `anant-enterprises-frontend/src/lib/data/collection`  
> **Backend Feature**: `anant-enterprises-backend/src/features/collection`  
> **Last Updated**: January 2026

---

## Overview

This document defines the API contracts required to support the **Collection/Shop Page** on the customer frontend. The collection page provides product browsing with advanced filtering, sorting, and pagination capabilities.

### Frontend Data Fetchers Summary

| Fetcher | Endpoint Pattern | Backend Status |
|---------|-----------------|----------------|
| `getCollectionProducts` | `GET /products` | 🔶 Exists but needs consumer-facing enhancements |
| `getFilterOptions` | `GET /products/filters` | 🆕 New endpoint needed |

---

## Base URL & Authentication

```
Base URL: /api/v1
```

| Endpoint | Authentication | Notes |
|----------|----------------|-------|
| GET Products (with filters) | ❌ Public | Active products only |
| GET Filter Options | ❌ Public | Dynamic filter metadata |
| Collection CRUD | ✅ Required | Admin endpoints |

---

## 1. Get Collection Products (Filtered Product Listing)

### GET `/api/products`

> **Status**: 🔶 Exists for admin, needs consumer-facing enhancements  
> **Enhancement**: Add filtering by technologies, ratings, price range

This is the main product listing endpoint used by the collection/shop page with comprehensive filtering support.

#### Frontend Expected: `CollectionResponse`

```typescript
interface CollectionProduct {
    id: number | string;
    name: string;
    tags?: string[];                      // Feature tags (e.g., "RO", "UV")
    rating?: number;                      // Average rating
    reviews?: number;                     // Review count
    price: number;                        // Selling price
    originalPrice?: number;               // Compare-at price
    image: string;                        // Primary image URL
    isNew?: boolean;                      // New arrival flag
    category: string;                     // Category slug
    technologies: string[];               // Technology tags for filtering
}

interface CollectionResponse {
    products: CollectionProduct[];
    total: number;                        // Total matching products
    totalPages: number;                   // Total pages
    currentPage: number;                  // Current page number
}
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `categories` | string | - | Comma-separated category slugs |
| `technologies` | string | - | Comma-separated technology IDs |
| `ratings` | string | - | Comma-separated min ratings (e.g., "4,3") |
| `minPrice` | number | 0 | Minimum price filter |
| `maxPrice` | number | 200000 | Maximum price filter |
| `sort` | string | `newest` | Sort option (see below) |
| `page` | number | 1 | Page number |
| `limit` | number | 6 | Items per page (max: 50) |

#### Sort Options

| Value | Description | SQL |
|-------|-------------|-----|
| `newest` | Newest first | `ORDER BY created_at DESC` |
| `price-asc` | Price: Low to High | `ORDER BY selling_price ASC` |
| `price-desc` | Price: High to Low | `ORDER BY selling_price DESC` |
| `rating` | Highest rated first | `ORDER BY avg_rating DESC` |

#### Example Request

```
GET /api/products?categories=residential,commercial&technologies=ro,uv&minPrice=5000&maxPrice=50000&sort=price-asc&page=1&limit=12
```

#### Required API Response

```json
{
    "success": true,
    "message": "Products retrieved successfully",
    "data": {
        "products": [
            {
                "id": 1,
                "name": "Anant Pure X1",
                "tags": ["RO", "UV", "UF"],
                "rating": 4.8,
                "reviews": 124,
                "price": 12999,
                "originalPrice": 18999,
                "image": "https://cdn.example.com/products/x1.jpg",
                "isNew": false,
                "category": "residential",
                "technologies": ["ro", "uv", "uf"]
            }
        ],
        "total": 45,
        "totalPages": 4,
        "currentPage": 1
    }
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Transform/Notes |
|----------------|---------------------|-----------------|
| `id` | `products.id` | Direct |
| `name` | `products.product_title` | ⚠️ Rename |
| `tags` | *(new field)* | 🆕 Add `tags` JSONB to products |
| `rating` | *(computed)* | AVG from reviews WHERE status='approved' |
| `reviews` | *(computed)* | COUNT from reviews WHERE status='approved' |
| `price` | `products.selling_price` | Parse to number |
| `originalPrice` | `products.compare_at_price` | Parse to number |
| `image` | `products.primary_image_url` | ⚠️ Rename |
| `isNew` | *(computed)* | `created_at > NOW() - INTERVAL '30 days'` |
| `category` | `products.category_tier_1` | Slugify or add slug column |
| `technologies` | *(new field)* | 🆕 Add `technologies` JSONB array |

#### SQL Query Template

```sql
SELECT 
    p.id,
    p.product_title AS name,
    p.tags,
    COALESCE(AVG(r.rating), 0) AS rating,
    COUNT(r.id) AS reviews,
    p.selling_price::numeric AS price,
    p.compare_at_price::numeric AS "originalPrice",
    p.primary_image_url AS image,
    (p.created_at > NOW() - INTERVAL '30 days') AS "isNew",
    LOWER(REPLACE(p.category_tier_1, ' ', '-')) AS category,
    p.technologies
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'approved' AND r.is_deleted = false
WHERE p.status = 'active'
  AND p.is_deleted = false
  -- Category filter
  AND (:categories IS NULL OR LOWER(REPLACE(p.category_tier_1, ' ', '-')) = ANY(:categories))
  -- Technology filter (JSONB array overlap)
  AND (:technologies IS NULL OR p.technologies && :technologies::jsonb)
  -- Price range filter
  AND p.selling_price >= :minPrice
  AND p.selling_price <= :maxPrice
GROUP BY p.id
-- Rating filter (having clause for aggregated value)
HAVING (:minRating IS NULL OR AVG(r.rating) >= :minRating)
ORDER BY 
    CASE WHEN :sort = 'newest' THEN p.created_at END DESC,
    CASE WHEN :sort = 'price-asc' THEN p.selling_price END ASC,
    CASE WHEN :sort = 'price-desc' THEN p.selling_price END DESC,
    CASE WHEN :sort = 'rating' THEN AVG(r.rating) END DESC NULLS LAST
LIMIT :limit OFFSET :offset;
```

---

## 2. Get Filter Options

### GET `/api/products/filters`

> **Status**: 🆕 New endpoint needed

Returns available filter options with product counts for each option. This enables dynamic filter UI that shows only relevant options.

#### Frontend Expected: `FilterOptions`

```typescript
interface FilterOptions {
    categories: {
        id: string;                       // Category slug
        label: string;                    // Display name
        count: number;                    // Products in category
    }[];
    technologies: {
        id: string;                       // Technology ID
        label: string;                    // Display name
        count: number;                    // Products with technology
    }[];
    ratings: {
        value: string;                    // Min rating value ("4", "3", etc.)
        count: number;                    // Products with rating >= value
    }[];
    priceRange: {
        min: number;                      // Minimum product price
        max: number;                      // Maximum product price
    };
}
```

#### Required API Response

```json
{
    "success": true,
    "data": {
        "categories": [
            { "id": "residential", "label": "Residential Purifiers", "count": 24 },
            { "id": "commercial", "label": "Commercial Systems", "count": 12 },
            { "id": "industrial", "label": "Industrial Plants", "count": 8 },
            { "id": "accessories", "label": "Accessories & Spares", "count": 35 }
        ],
        "technologies": [
            { "id": "ro", "label": "RO (Reverse Osmosis)", "count": 28 },
            { "id": "uv", "label": "UV Purification", "count": 22 },
            { "id": "uf", "label": "UF (Ultra Filtration)", "count": 18 },
            { "id": "alkaline", "label": "Alkaline", "count": 10 },
            { "id": "copper", "label": "Copper Infusion", "count": 8 },
            { "id": "mineralizer", "label": "Mineralizer", "count": 6 }
        ],
        "ratings": [
            { "value": "4", "count": 45 },
            { "value": "3", "count": 12 },
            { "value": "2", "count": 3 }
        ],
        "priceRange": {
            "min": 1499,
            "max": 159999
        }
    }
}
```

#### SQL Queries for Filter Options

##### Categories

```sql
SELECT 
    LOWER(REPLACE(category_tier_1, ' ', '-')) AS id,
    category_tier_1 AS label,
    COUNT(*) AS count
FROM products
WHERE status = 'active' AND is_deleted = false
GROUP BY category_tier_1
ORDER BY count DESC;
```

##### Technologies

```sql
-- Requires technologies JSONB column to be added
SELECT 
    tech AS id,
    CASE tech
        WHEN 'ro' THEN 'RO (Reverse Osmosis)'
        WHEN 'uv' THEN 'UV Purification'
        WHEN 'uf' THEN 'UF (Ultra Filtration)'
        WHEN 'alkaline' THEN 'Alkaline'
        WHEN 'copper' THEN 'Copper Infusion'
        WHEN 'mineralizer' THEN 'Mineralizer'
        ELSE tech
    END AS label,
    COUNT(DISTINCT p.id) AS count
FROM products p,
     jsonb_array_elements_text(p.technologies) AS tech
WHERE p.status = 'active' AND p.is_deleted = false
GROUP BY tech
ORDER BY count DESC;
```

##### Rating Distribution

```sql
SELECT 
    floor(avg_rating)::text AS value,
    COUNT(*) AS count
FROM (
    SELECT 
        p.id,
        COALESCE(AVG(r.rating), 0) AS avg_rating
    FROM products p
    LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'approved'
    WHERE p.status = 'active' AND p.is_deleted = false
    GROUP BY p.id
) sub
WHERE avg_rating >= 2
GROUP BY floor(avg_rating)
ORDER BY value DESC;
```

##### Price Range

```sql
SELECT 
    MIN(selling_price)::numeric AS min,
    MAX(selling_price)::numeric AS max
FROM products
WHERE status = 'active' AND is_deleted = false;
```

---

## 3. Get Collection by Slug (Optional)

### GET `/api/collections/:slug`

> **Status**: 🟡 Optional - for curated collection pages

If you want to support named collections (e.g., "/collections/summer-sale"), implement this endpoint.

#### Response

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "title": "Summer Sale",
        "slug": "summer-sale",
        "description": "Hot deals on water purifiers",
        "bannerImage": "https://cdn.example.com/banners/summer.jpg",
        "mobileBannerImage": "https://cdn.example.com/banners/summer-mobile.jpg"
    }
}
```

---

## Schema Extensions Required

### Products Table Additions

| Column | Type | Priority | Description |
|--------|------|----------|-------------|
| `technologies` | JSONB | 🔴 High | Array of technology tags for filtering |
| `tags` | JSONB | 🔴 High | Display tags (already suggested in product docs) |

#### Migration Example

```sql
-- Add technologies column
ALTER TABLE products 
ADD COLUMN technologies JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for JSONB array queries
CREATE INDEX idx_products_technologies ON products USING GIN (technologies);

-- Populate initial data based on category/title keywords
UPDATE products SET technologies = 
    CASE 
        WHEN product_title ILIKE '%RO%' AND product_title ILIKE '%UV%' THEN '["ro", "uv"]'::jsonb
        WHEN product_title ILIKE '%RO%' THEN '["ro"]'::jsonb
        WHEN product_title ILIKE '%UV%' THEN '["uv"]'::jsonb
        ELSE '[]'::jsonb
    END;
```

---

## Performance Considerations

### Indexes Recommended

```sql
-- Composite index for common filter combinations
CREATE INDEX idx_products_collection_filters 
ON products (status, is_deleted, category_tier_1, selling_price)
WHERE is_deleted = false AND status = 'active';

-- GIN index for JSONB technologies array
CREATE INDEX idx_products_technologies 
ON products USING GIN (technologies);

-- Covering index for list queries
CREATE INDEX idx_products_listing 
ON products (created_at DESC, selling_price, id)
INCLUDE (product_title, primary_image_url, compare_at_price, category_tier_1)
WHERE is_deleted = false AND status = 'active';
```

### Caching Strategy

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| Filter options | 1 hour | On product create/update/delete |
| Product listing | 30 minutes | On product update |
| Individual product | 1 hour | On specific product update |

---

## Implementation Priority

| Priority | Endpoint | Complexity | Dependencies |
|----------|----------|------------|--------------|
| 🔴 High | Products with filters | Medium | Technologies column needed |
| 🔴 High | Filter options | Medium | Technologies column needed |
| 🟢 Low | Collection by slug | Low | Schema exists |

---

## Related Backend Files

### Existing Schemas

| Schema | Location |
|--------|----------|
| Products | [product.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/shared/product.schema.ts) |
| Collections | [collection.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/collection/shared/collection.schema.ts) |
| Collection Products | [collection-products.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/collection/shared/collection-products.schema.ts) |
| Reviews | [reviews.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/reviews/shared/reviews.schema.ts) |

### Existing Product APIs

| Endpoint | File | Notes |
|----------|------|-------|
| GET /api/products | [get-all-products.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/product/apis/get-all-products.ts) | Admin only - enhance for public |

---

## Frontend Reference Files

| File | Description |
|------|-------------|
| [collection.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/types/collection.ts) | TypeScript interfaces |
| [getCollectionProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/collection/getCollectionProducts.ts) | Products fetcher with filters |
| [getFilterOptions.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/collection/getFilterOptions.ts) | Filter options fetcher |
| [parseSearchParams.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/collection/parseSearchParams.ts) | URL param parser |

---

## URL Parameter Mapping

The frontend uses these URL search params that map to API query params:

| URL Param | API Param | Example |
|-----------|-----------|---------|
| `category` | `categories` | `?category=residential,commercial` |
| `technology` | `technologies` | `?technology=ro,uv` |
| `rating` | `ratings` | `?rating=4,3` |
| `minPrice` | `minPrice` | `?minPrice=5000` |
| `maxPrice` | `maxPrice` | `?maxPrice=50000` |
| `sort` | `sort` | `?sort=price-asc` |
| `page` | `page` | `?page=2` |
