# Product Feature - API Documentation

## Overview

The Product feature provides core product management capabilities for the admin panel. It supports creating products, listing all products with filters, viewing individual product details, updating product information, and soft-deleting products. All product operations require admin authentication.

## Base URL

```
/api/products
```

## Authentication Requirements

| Endpoint      | Authentication | Authorization              |
| ------------- | -------------- | -------------------------- |
| `POST /`      | ✅ Required    | Admin (`products:create`)  |
| `GET /`       | ✅ Required    | Admin (`products:read`)    |
| `GET /:id`    | ✅ Required    | Admin (`products:read`)    |
| `PUT /:id`    | ✅ Required    | Admin (`products:update`)  |
| `DELETE /:id` | ✅ Required    | Admin (`products:delete`)  |

---

## Endpoints

### 1. Create Product

Create a new product in the system.

**Endpoint:** `POST /api/products`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:create` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "slug": "premium-widget-2024",
  "product_title": "Premium Widget 2024",
  "secondary_title": "The Ultimate Widget",
  "short_description": "A premium quality widget",
  "full_description": "<p>Detailed HTML description...</p>",
  "status": "draft",
  "featured": false,
  "sku": "WIDGET-2024-001",
  "selling_price": "299.99",
  "cost_price": "150.00",
  "compare_at_price": "399.99",
  "category_tier_1": "Electronics",
  "category_tier_2": "Widgets",
  "primary_image_url": "https://example.com/images/widget.jpg",
  "additional_images": ["https://example.com/images/widget-2.jpg"],
  "tags": ["premium", "widget", "2024"],
  "weight": "1.5",
  "length": "10.0",
  "breadth": "8.0",
  "height": "5.0",
  "hsn_code": "8543",
  "meta_title": "Premium Widget 2024 - Best Widget",
  "meta_description": "Buy the best premium widget of 2024",
  "product_url": "/products/premium-widget-2024",
  "faqs": [
    {
      "question": "What is the warranty?",
      "answer": "1 year manufacturer warranty"
    }
  ],
  "inventory_quantity": 100
}
```

#### Request Schema

| Field                | Type    | Required | Description                                     |
| -------------------- | ------- | -------- | ----------------------------------------------- |
| `slug`               | string  | ✅       | URL-friendly identifier (unique)                |
| `product_title`      | string  | ✅       | Product name                                    |
| `sku`                | string  | ✅       | Stock Keeping Unit (unique)                     |
| `selling_price`      | string  | ✅       | Selling price (decimal format: "99.99")         |
| `status`             | enum    | ❌       | draft, active, archived (default: draft)        |
| `featured`           | boolean | ❌       | Featured product flag (default: false)          |
| `cost_price`         | string  | ❌       | Cost price (default: "0.00")                    |
| `compare_at_price`   | string  | ❌       | Original price for comparison                   |
| `category_tier_1-4`  | string  | ❌       | Category hierarchy (4 tiers)                    |
| `primary_image_url`  | string  | ❌       | Main product image URL                          |
| `additional_images`  | array   | ❌       | Array of additional image URLs                  |
| `tags`               | array   | ❌       | Array of tag strings                            |
| `weight`             | string  | ❌       | Product weight in kg                            |
| `length/breadth/height` | string  | ❌    | Product dimensions in cm                        |
| `hsn_code`           | string  | ❌       | HSN/SAC code for tax                            |
| `meta_title`         | string  | ❌       | SEO meta title                                  |
| `meta_description`   | string  | ❌       | SEO meta description                            |
| `product_url`        | string  | ❌       | Custom product URL path                         |
| `faqs`               | array   | ❌       | Array of FAQ objects (question/answer pairs)    |
| `inventory_quantity` | number  | ❌       | Initial inventory quantity (default: 0)         |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "premium-widget-2024",
    "product_title": "Premium Widget 2024",
    "sku": "WIDGET-2024-001",
    "selling_price": "299.99",
    "status": "draft",
    "featured": false,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error            | Description                  |
| ------ | ---------------- | ---------------------------- |
| `400`  | Validation Error | Invalid request body         |
| `401`  | Unauthorized     | Missing or invalid JWT token |
| `403`  | Forbidden        | User is not an admin         |
| `409`  | Conflict         | SKU or slug already exists   |

---

### 2. Get All Products

Get paginated list of all products with optional filters.

**Endpoint:** `GET /api/products`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:read` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter         | Type   | Default | Max   | Description                           |
| ----------------- | ------ | ------- | ----- | ------------------------------------- |
| `page`            | number | `1`     | -     | Page number (min: 1)                  |
| `limit`           | number | `20`    | `100` | Items per page                        |
| `status`          | string | -       | -     | Filter by status (draft/active/archived) |
| `category_tier_1` | string | -       | -     | Filter by primary category            |
| `featured`        | boolean| -       | -     | Filter by featured products           |

#### Example Request

```
GET /api/products?page=1&limit=20&status=active&category_tier_1=Electronics
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "premium-widget-2024",
      "product_title": "Premium Widget 2024",
      "sku": "WIDGET-2024-001",
      "selling_price": "299.99",
      "status": "active",
      "featured": true,
      "primary_image_url": "https://example.com/images/widget.jpg",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### Error Responses

| Status | Error        | Description                  |
| ------ | ------------ | ---------------------------- |
| `401`  | Unauthorized | Missing or invalid JWT token |
| `403`  | Forbidden    | User is not an admin         |

---

### 3. Get Product by ID

Get a specific product's details.

**Endpoint:** `GET /api/products/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:read` permission)

#### Path Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `id`      | UUID | Product ID  |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "premium-widget-2024",
    "product_title": "Premium Widget 2024",
    "secondary_title": "The Ultimate Widget",
    "short_description": "A premium quality widget",
    "full_description": "<p>Detailed HTML description...</p>",
    "status": "active",
    "featured": true,
    "sku": "WIDGET-2024-001",
    "selling_price": "299.99",
    "cost_price": "150.00",
    "compare_at_price": "399.99",
    "discount": 25,
    "inStock": true,
    "total_stock": 100,
    "category_tier_1": "Electronics",
    "category_tier_2": "Widgets",
    "category_tier_3": null,
    "category_tier_4": null,
    "primary_image_url": "https://example.com/images/widget.jpg",
    "additional_images": ["https://example.com/images/widget-2.jpg"],
    "images": ["https://example.com/images/widget.jpg", "https://example.com/images/widget-2.jpg"],
    "tags": ["premium", "widget", "2024"],
    "weight": "1.5",
    "length": "10.0",
    "breadth": "8.0",
    "height": "5.0",
    "hsn_code": "8543",
    "meta_title": "Premium Widget 2024 - Best Widget",
    "meta_description": "Buy the best premium widget of 2024",
    "product_url": "/products/premium-widget-2024",
    "rating": 4.5,
    "review_count": 23,
    "faqs": [
      {
        "id": "faq-1",
        "question": "What is the warranty?",
        "answer": "1 year manufacturer warranty"
      }
    ],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error        | Description                  |
| ------ | ------------ | ---------------------------- |
| `401`  | Unauthorized | Missing or invalid JWT token |
| `403`  | Forbidden    | User is not an admin         |
| `404`  | Not Found    | Product not found            |

---

### 4. Update Product

Update product information. All fields are optional.

**Endpoint:** `PUT /api/products/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:update` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type | Description          |
| --------- | ---- | -------------------- |
| `id`      | UUID | Product ID to update |

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "product_title": "Updated Premium Widget 2024",
  "selling_price": "279.99",
  "status": "active",
  "featured": true,
  "inventory_quantity": 150
}
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "premium-widget-2024",
    "product_title": "Updated Premium Widget 2024",
    "selling_price": "279.99",
    "status": "active",
    "featured": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-16T14:20:00.000Z"
  }
}
```

#### Error Responses

| Status | Error            | Description                  |
| ------ | ---------------- | ---------------------------- |
| `400`  | Validation Error | Invalid request body         |
| `401`  | Unauthorized     | Missing or invalid JWT token |
| `403`  | Forbidden        | User is not an admin         |
| `404`  | Not Found        | Product not found            |
| `409`  | Conflict         | SKU or slug already exists   |

---

### 5. Delete Product

Soft delete a product.

**Endpoint:** `DELETE /api/products/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:delete` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description          |
| --------- | ---- | -------------------- |
| `id`      | UUID | Product ID to delete |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Product deleted successfully",
  "data": null
}
```

#### Error Responses

| Status | Error        | Description                  |
| ------ | ------------ | ---------------------------- |
| `401`  | Unauthorized | Missing or invalid JWT token |
| `403`  | Forbidden    | User is not an admin         |
| `404`  | Not Found    | Product not found            |

---

## Product Schema (30 Core Fields)

### Core Fields
- `id` (UUID) - Primary identifier
- `slug` (string) - URL-friendly identifier
- `product_title` (string) - Product name
- `secondary_title` (string) - Subtitle/tagline
- `short_description` (text) - Brief description
- `full_description` (text) - Complete HTML description

### Status & Visibility
- `status` (enum) - draft | active | archived
- `featured` (boolean) - Featured product flag

### Pricing
- `cost_price` (decimal) - Internal cost
- `selling_price` (decimal) - Public selling price
- `compare_at_price` (decimal) - Original price for discount display

### Identification
- `sku` (string) - Stock Keeping Unit
- `hsn_code` (string) - Tax classification code

### Dimensions
- `weight` (decimal)
- `length` (decimal)
- `breadth` (decimal)
- `height` (decimal)

### Categorization
- `category_tier_1` (string) - Primary category
- `category_tier_2` (string) - Secondary category
- `category_tier_3` (string) - Tertiary category
- `category_tier_4` (string) - Quaternary category

### Media
- `primary_image_url` (string) - Main product image
- `additional_images` (jsonb) - Array of additional images

### SEO
- `meta_title` (string)
- `meta_description` (string)
- `product_url` (string)

### Additional
- `tags` (jsonb) - Array of tag strings

### Audit Fields (Hidden from responses)
- `created_at`, `updated_at`
- `created_by`, `updated_by`
- `is_deleted`, `deleted_at`, `deleted_by`

---

## Related Features

### FAQs
Product FAQs are stored in a separate `product_faqs` table but returned with product details.

### Inventory
Product inventory is managed through the `/api/inventory` feature and linked by `product_id`.

### Reviews
Product ratings and reviews are managed separately but aggregate data (rating, review_count) is included in product responses.

---

## Response Sanitization

All product responses are sanitized to exclude internal/audit fields:

### Excluded Fields
- `is_deleted` - Internal soft delete flag
- `deleted_at` - Internal audit field
- `deleted_by` - Internal audit field
- `created_by` - Internal audit field
- `updated_by` - Internal audit field

---

## Caching

The product feature uses Redis-based caching with in-memory fallback:

- **Cache Keys**: Products are cached by ID, SKU, and slug
- **TTL**: 5 minutes
- **Invalidation**: Automatic on update/delete operations
- **Fallback**: In-memory cache when Redis unavailable

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "sku",
      "message": "Product with this SKU already exists"
    }
  ]
}
```

---

## Notes

### Removed Features
The following features were removed during schema simplification:
- Product scheduling (schedule status, scheduled_publish_at)
- Product delisting (is_delisted, delist_date)
- Brand management (brand_name, brand_slug)
- Product grouping (size_group, accessories_group)
- Internal comments (admin_comment)
- Product enhancements (highlights, features, specs)

### Storefront-Specific APIs Removed
The following APIs were removed as they're storefront-specific (not needed for admin panel):
- `GET /products/compare` - Product comparison
- `GET /products/filters` - Collection filters
- `GET /products/search` - Product search
- `GET /products/search/autocomplete` - Search suggestions
- `GET /products/search/popular` - Popular searches
- `GET /products/:id/bundles` - Product bundles
- `GET /products/:id/related` - Related products
- `GET /products/:id/reviews` - Product reviews
- `GET /products/category/:slug` - Category products

### Current API Surface
**5 Core CRUD APIs**
- POST / - Create product
- GET / - List products
- GET /:id - Get product detail
- PUT /:id - Update product
- DELETE /:id - Delete product
