# Anant Enterprises API Documentation

Base URL: `http://localhost:8000/api`

## Authentication
Some endpoints require authentication (Admin access).
Header: `Authorization: Bearer <token>`

---

## Products Feature
Base Path: `/products`

### 1. Create Product
**POST** `/products`
- **Auth**: Required (Admin)
- **Description**: Create a new product.

**Request Body:**
```json
{
  "slug": "sample-product-slug",
  "product_title": "Sample Product",
  "sku": "SKU-12345",
  "status": "draft",
  "cost_price": "100.00",
  "selling_price": "150.00",
  "inventory_quantity": 50,
  "category_tier_1": "uuid-tier-1",
  "faqs": [
    {
      "question": "What is this?",
      "answer": "A sample product."
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "product_title": "Sample Product",
    ...
  },
  "message": "Product created successfully"
}
```

### 2. Get All Products (List)
**GET** `/products`
- **Auth**: Optional (Admin sees all, Public sees active only)
- **Query Parameters**:
  - `page`: number (default 1)
  - `limit`: number (default 20, max 50)
  - `sort`: `newest` | `price-asc` | `price-desc` | `rating`
  - `categories`: comma-separated slugs (Public filter)
  - `minPrice`: number
  - `maxPrice`: number
  - `status`: `draft` | `active` | `archived` (Admin only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [ 
      {
        "id": "uuid...",
        "slug": "product-slug",
        "product_title": "Product Title",
        ...
      }
    ],
    "total": 100,
    "totalPages": 5,
    "currentPage": 1
  },
  "message": "Products retrieved successfully"
}
```

### 3. Get Product Filters
**GET** `/products/filters`
- **Auth**: Public
- **Description**: Get dynamic filter options (categories, prices, technologies, ratings).
- **Query Parameters**: 
  - `categories`: category code (context for fetching sub-categories)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [ { "id": "code", "label": "Name", "count": 10 } ],
    "technologies": [ ... ],
    "priceRange": { "min": 0, "max": 1000 },
    "ratings": [ { "value": "4", "count": 5 } ]
  },
  "message": "Filter options retrieved successfully"
}
```

### 4. Get Product by ID
**GET** `/products/:id`
- **Auth**: Optional (Admin sees all, Public sees active)
- **Description**: Get full product details by UUID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "product_title": "Product Name",
    "inStock": true,
    "total_stock": 50,
    "rating": 4.5,
    "reviews": 10,
    "images": ["url1", "url2"],
    "faqs": [ ... ]
  },
  "message": "Product retrieved successfully"
}
```

### 5. Get Product by Slug
**GET** `/products/slug/:slug`
- **Auth**: Public
- **Description**: Get full product details by URL slug.

**Response**: Same as Get Product by ID.

### 6. Update Product
**PUT** `/products/:id`
- **Auth**: Required (Admin)
- **Description**: Update an existing product. Partial updates allowed.

**Request Body:**
```json
{
  "product_title": "Updated Title",
  "selling_price": "140.00",
  "inventory_quantity": 60,
  "tags": ["new-tag"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...product_object },
  "message": "Product updated successfully"
}
```

### 7. Delete Product
**DELETE** `/products/:id`
- **Auth**: Required (Admin)
- **Description**: Soft delete a product.

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Product deleted successfully"
}
```

---

## Tiers Feature (Categories)
Base Path: `/tiers`

### 1. Create Tier
**POST** `/tiers`
- **Auth**: Required (Admin)
- **Description**: Create a new category/tier.

**Request Body:**
```json
{
  "name": "Electronics",
  "level": 1,
  "status": "active",
  "description": "Electronic items",
  "code": "electronics" // optional, auto-generated if missing
}
```
*Note: For sub-tiers (level > 1), `parent_id` is required.*

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "name": "Electronics",
    ...
  },
  "message": "Tier created successfully"
}
```

### 2. Get All Tiers
**GET** `/tiers`
- **Auth**: Public
- **Query Parameters**:
  - `status`: `active` | `inactive`
  - `level`: number
  - `parentId`: uuid
  - `search`: string

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Tier Name", "level": 1, ... }
  ],
  "message": "Tiers retrieved successfully"
}
```

### 3. Get Tier Hierarchy
**GET** `/tiers/hierarchy`
- **Auth**: Public
- **Description**: Get the full tree structure of categories.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tiers": [
      {
        "id": "uuid",
        "name": "Root Tier",
        "children": [ ... ]
      }
    ]
  },
  "message": "Tier hierarchy retrieved successfully"
}
```

### 4. Get Tier by ID
**GET** `/tiers/:id`
- **Auth**: Public
- **Query Parameters**:
  - `includeChildren`: `true` | `false`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Tier Name",
    "children": [ ... ] // if requested
  },
  "message": "Tier retrieved successfully"
}
```

### 5. Update Tier
**PUT** `/tiers/:id`
- **Auth**: Required (Admin)
- **Description**: Update a tier.

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "inactive"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ...tier_object },
  "message": "Tier updated successfully"
}
```

### 6. Delete Tier
**DELETE** `/tiers/:id`
- **Auth**: Required (Admin)
- **Description**: Soft delete a tier. Fails if tier has children or is used by products.

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Tier deleted successfully"
}
```
