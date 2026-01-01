# Product Feature - Frontend Integration Guide

## Overview

The Product feature provides comprehensive product management capabilities including creating products, listing all products with filters, viewing individual product details, updating product information, and deleting products. It supports role-based access control where admins have elevated privileges for managing products, while active products are publicly accessible.

## Base URL

```
/api/products
```

## Authentication Requirements

| Endpoint      | Authentication | Authorization                           |
| ------------- | -------------- | --------------------------------------- |
| `POST /`      | ✅ Required    | Admin only (`products:create`)          |
| `GET /`       | ✅ Required    | Admin only (`products:read`)            |
| `GET /:id`    | ⚠️ Conditional | Public for active, Admin for draft/archived |
| `PUT /:id`    | ✅ Required    | Admin only (`products:update`)          |
| `DELETE /:id` | ✅ Required    | Admin only (`products:delete`)          |

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
  "sku": "WIDGET-2024-001",
  "selling_price": "299.99",
  "cost_price": "150.00",
  "compare_at_price": "399.99",
  "category_tier_1": "Electronics",
  "category_tier_2": "Widgets",
  "primary_image_url": "https://example.com/images/widget.jpg",
  "additional_images": ["https://example.com/images/widget-2.jpg"],
  "meta_title": "Premium Widget 2024 - Best Widget",
  "meta_description": "Buy the best premium widget of 2024"
}
```

#### Request Schema

| Field                  | Type     | Required | Description                                    |
| ---------------------- | -------- | -------- | ---------------------------------------------- |
| `slug`                 | string   | ✅       | URL-friendly identifier                        |
| `product_title`        | string   | ✅       | Product name                                   |
| `sku`                  | string   | ✅       | Stock Keeping Unit (unique)                    |
| `selling_price`        | string   | ✅       | Selling price (decimal format: "99.99")        |
| `status`               | enum     | ❌       | draft, active, archived, schedule (default: draft) |
| `cost_price`           | string   | ❌       | Cost price (default: "0.00")                   |
| `compare_at_price`     | string   | ❌       | Original price for comparison                  |
| `category_tier_1-4`    | string   | ❌       | Category hierarchy                             |
| `primary_image_url`    | string   | ❌       | Main product image URL                         |
| `additional_images`    | array    | ❌       | Additional image URLs                          |
| `meta_title`           | string   | ❌       | SEO meta title                                 |
| `meta_description`     | string   | ❌       | SEO meta description                           |

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
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error            | Description                     |
| ------ | ---------------- | ------------------------------- |
| `400`  | Validation Error | Invalid request body            |
| `401`  | Unauthorized     | Missing or invalid JWT token    |
| `403`  | Forbidden        | User is not an admin            |
| `409`  | Conflict         | SKU or slug already exists      |

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

| Parameter         | Type   | Default | Max   | Description                              |
| ----------------- | ------ | ------- | ----- | ---------------------------------------- |
| `page`            | number | `1`     | -     | Page number (min: 1)                     |
| `limit`           | number | `20`    | `100` | Items per page                           |
| `status`          | string | -       | -     | Filter by status (draft/active/archived) |
| `category_tier_1` | string | -       | -     | Filter by category                       |

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
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
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

**Authentication:** Conditional (Required for draft/archived products)

**Authorization:** 
- Public can view active products
- Admin required for draft/archived products

#### Path Parameters

| Parameter | Type | Description      |
| --------- | ---- | ---------------- |
| `id`      | UUID | Product ID       |

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
    "sku": "WIDGET-2024-001",
    "selling_price": "299.99",
    "cost_price": "150.00",
    "compare_at_price": "399.99",
    "category_tier_1": "Electronics",
    "category_tier_2": "Widgets",
    "primary_image_url": "https://example.com/images/widget.jpg",
    "additional_images": ["https://example.com/images/widget-2.jpg"],
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error        | Description                                |
| ------ | ------------ | ------------------------------------------ |
| `401`  | Unauthorized | Auth required for draft/archived products  |
| `403`  | Forbidden    | No permission to view draft/archived       |
| `404`  | Not Found    | Product not found                          |

---

### 4. Update Product

Update product information.

**Endpoint:** `PUT /api/products/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`products:update` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
| `id`      | UUID | Product ID to update |

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "product_title": "Updated Premium Widget 2024",
  "selling_price": "279.99",
  "status": "active"
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

| Parameter | Type | Description         |
| --------- | ---- | ------------------- |
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

## Frontend Implementation Example

### TypeScript Service

```typescript
// product.service.ts

const API_BASE = '/api/products';

interface Product {
  id: string;
  slug: string;
  product_title: string;
  sku: string;
  selling_price: string;
  status: 'draft' | 'active' | 'archived' | 'schedule';
  created_at: string;
  updated_at: string;
}

interface CreateProductData {
  slug: string;
  product_title: string;
  sku: string;
  selling_price: string;
  status?: 'draft' | 'active' | 'archived' | 'schedule';
  cost_price?: string;
  category_tier_1?: string;
  primary_image_url?: string;
  meta_title?: string;
  meta_description?: string;
}

interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

// Get auth header
const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Create product (admin only)
export const createProduct = async (data: CreateProductData): Promise<Product> => {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data: product } = await response.json();
  return product;
};

// Get all products (admin only)
export const getAllProducts = async (
  page = 1,
  limit = 20,
  filters?: { status?: string; category_tier_1?: string }
): Promise<PaginatedProducts> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.category_tier_1 && { category_tier_1: filters.category_tier_1 }),
  });

  const response = await fetch(`${API_BASE}?${params}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const result = await response.json();
  return {
    products: result.data,
    total: result.pagination.total,
    page: result.pagination.page,
    limit: result.pagination.limit,
  };
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data } = await response.json();
  return data;
};

// Update product (admin only)
export const updateProduct = async (
  id: string,
  data: Partial<CreateProductData>
): Promise<Product> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data: product } = await response.json();
  return product;
};

// Delete product (admin only)
export const deleteProduct = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
};
```

### React Component Example

```tsx
// ProductList.tsx

import { useState, useEffect } from 'react';
import { getAllProducts, deleteProduct, Product } from './product.service';

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getAllProducts(page, limit);
      setProducts(result.products);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete ${product.product_title}?`)) return;

    try {
      await deleteProduct(product.id);
      setProducts(products.filter(p => p.id !== product.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  if (loading) return <p>Loading products...</p>;

  return (
    <div className="product-list">
      <h2>Product Management</h2>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>{product.product_title}</td>
              <td>{product.sku}</td>
              <td>${product.selling_price}</td>
              <td>
                <span className={`badge badge-${product.status}`}>
                  {product.status}
                </span>
              </td>
              <td>
                <button onClick={() => window.location.href = `/products/${product.id}/edit`}>
                  Edit
                </button>
                <button onClick={() => handleDelete(product)} className="danger">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(total / limit)}
        </span>
        <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Response Sanitization

All product responses are sanitized to exclude internal/audit fields:

### Excluded Fields

- `is_deleted` - Internal soft delete flag
- `deleted_at` - Internal audit field
- `deleted_by` - Internal audit field
- `created_by` - Internal audit field
- `updated_by` - Internal audit field

### Included Fields

All product data including pricing, inventory, metadata, and timestamps are included in responses.

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

## Related Features

- **Inventory Feature**: `/api/inventory` - Product inventory management
- **Orders Feature**: `/api/orders` - Order processing with products
- **Cart Feature**: `/api/cart` - Shopping cart with products
