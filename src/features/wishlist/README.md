# Wishlist Feature API Documentation

> **Admin-Only APIs** for managing user wishlists. All endpoints require admin authentication and a `:userId` parameter.

## Overview

The Wishlist feature provides administrative endpoints to manage user wishlists across the platform. Admins can view, add, remove, and move wishlist items to cart on behalf of any user.

## Base Path
```
/api/wishlist
```

## Authentication
All endpoints require:
- Valid admin authentication token
- `requireOwnerOrPermission` middleware with appropriate permissions
- `userId` parameter for targeting specific users

---

## Endpoints

### 1. Get User's Wishlist

Retrieve all items in a specific user's wishlist with product details, stock status, pricing, ratings, and reviews.

**Endpoint:** `GET /api/wishlist/:userId/wishlist`

**Auth Required:** `requireOwnerOrPermission('userId', 'users:read')`

**URL Parameters:**
- `userId` (UUID, required) - Target user's ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": {
    "id": "wishlist-uuid",
    "access_token": "unique-access-token",
    "items": [
      {
        "product_id": "product-uuid",
        "product_name": "Product Name",
        "product_image": "https://cdn.example.com/image.jpg",
        "selling_price": "999.99",
        "compare_at_price": "1299.99",
        "sku": "SKU-12345",
        "inStock": true,
        "availableStock": 50,
        "notes": "Optional customer notes",
        "added_at": "2024-01-15T10:30:00Z",
        "added_to_cart_at": null,
        "purchased_at": null,
        "rating": 4.5,
        "reviews": 127
      }
    ],
    "itemCount": 1
  }
}
```

**No Wishlist Response (200):**
```json
{
  "success": true,
  "message": "No wishlist found",
  "data": {
    "id": null,
    "access_token": null,
    "items": [],
    "itemCount": 0
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

---

### 2. Add Product to User's Wishlist

Add a product to a specific user's wishlist.

**Endpoint:** `POST /api/wishlist/:userId/wishlist/:productId`

**Auth Required:** `requireOwnerOrPermission('userId', 'users:write')`

**URL Parameters:**
- `userId` (UUID, required) - Target user's ID
- `productId` (UUID, required) - Product to add

**Request Body (Optional):**
```json
{
  "notes": "Remember to buy this for the anniversary"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "product_id": "product-uuid",
    "product_name": "Product Name",
    "notes": "Remember to buy this for the anniversary",
    "added_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Product already in wishlist or product is deleted
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Product not found

---

### 3. Remove Product from User's Wishlist

Remove a specific product from a user's wishlist.

**Endpoint:** `DELETE /api/wishlist/:userId/wishlist/:productId`

**Auth Required:** `requireOwnerOrPermission('userId', 'users:write')`

**URL Parameters:**
- `userId` (UUID, required) - Target user's ID
- `productId` (UUID, required) - Product to remove

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product removed from wishlist",
  "data": {
    "product_id": "product-uuid"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Wishlist or product not found

---

### 4. Move Wishlist Item to Cart

Move a product from a user's wishlist to their cart. Optionally removes it from the wishlist.

**Endpoint:** `POST /api/wishlist/:userId/wishlist/:productId/move-to-cart`

**Auth Required:** `requireOwnerOrPermission('userId', 'users:write')`

**URL Parameters:**
- `userId` (UUID, required) - Target user's ID
- `productId` (UUID, required) - Product to move

**Request Body (Optional):**
```json
{
  "quantity": 2,
  "remove_from_wishlist": false
}
```

**Body Parameters:**
- `quantity` (number, optional, default: 1) - Number of units to add (min: 1, max: 100)
- `remove_from_wishlist` (boolean, optional, default: false) - Whether to remove from wishlist after adding to cart

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product Name moved to cart",
  "data": {
    "product_id": "product-uuid",
    "product_name": "Product Name",
    "quantity": 2,
    "removed_from_wishlist": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Product not available, insufficient stock, or invalid quantity
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Wishlist, product, or wishlist item not found

---

## Feature Architecture

### Directory Structure
```
src/features/wishlist/
├── apis/
│   ├── add-to-wishlist.ts       # Add product to wishlist
│   ├── get-wishlist.ts          # Get wishlist items
│   ├── move-to-cart.ts          # Move item to cart
│   └── remove-from-wishlist.ts  # Remove from wishlist
├── shared/
│   ├── interface.ts             # TypeScript interfaces
│   ├── queries.ts               # Reusable Drizzle subqueries
│   ├── wishlist.schema.ts       # Wishlist table schema
│   └── wishlist-items.schema.ts # Wishlist items table schema
├── index.ts                     # Feature router
└── README.md                    # This file
```

### Shared Resources

#### Interfaces (`shared/interface.ts`)
- `IWishlistItemResponse` - API response format for wishlist items
- `IWishlistResponse` - API response format for complete wishlist

#### Queries (`shared/queries.ts`)
Reusable Drizzle ORM subqueries for:
- `getProductStockSubquery()` - Calculate available stock
- `getProductRatingSubquery()` - Get average product rating
- `getProductReviewCountSubquery()` - Count product reviews

#### Schemas
- `wishlists` - Main wishlist table
- `wishlistItems` - Wishlist items with product references

---

## Database Schema

### Wishlists Table
```typescript
{
  id: uuid (PK),
  user_id: uuid (FK -> users.id),
  access_token: string (unique),
  status: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Wishlist Items Table
```typescript
{
  id: uuid (PK),
  wishlist_id: uuid (FK -> wishlists.id),
  product_id: uuid (FK -> products.id),
  notes: text (nullable),
  added_at: timestamp,
  added_to_cart_at: timestamp (nullable),
  purchased_at: timestamp (nullable),
  created_at: timestamp,
  updated_at: timestamp
}
```

---

## Business Rules

1. **Admin Access Only**: All endpoints require admin privileges
2. **Automatic Wishlist Creation**: Wishlist is created automatically when first item is added
3. **Stock Validation**: Moving to cart validates product availability and stock levels
4. **Active Products Only**: Only active, non-deleted products can be added
5. **Duplicate Prevention**: Cannot add the same product twice to a wishlist
6. **Cart Integration**: Moving to cart creates/updates cart automatically
7. **Quantity Limits**: Cart items limited to 1-100 units per product

---

## Related Features

- **[Cart](../cart)** - Shopping cart management
- **[Product](../product)** - Product catalog
- **[Inventory](../inventory)** - Stock management
- **[User](../user)** - User account management

---

## Migration Notes

> **Version 2.0 Breaking Changes** (Current)
> - **Removed all user-facing routes** - Wishlist feature now contains admin-only endpoints
> - **Deleted `check-wishlist.ts`** - No longer supports user wishlist status checks
> - User wishlist functionality must be implemented in a separate feature or client-side

**Previous User Routes (Deprecated):**
- `GET /api/wishlist/` ❌
- `POST /api/wishlist/items` ❌
- `DELETE /api/wishlist/items/:productId` ❌
- `POST /api/wishlist/items/:productId/move-to-cart` ❌
- `GET /api/wishlist/check/:productId` ❌

---

## Development Notes

### Code Quality
- ✅ Uses Drizzle ORM for all database operations
- ✅ Centralized interfaces in `shared/interface.ts`
- ✅ Reusable query helpers in `shared/queries.ts`
- ✅ Validation middleware on all routes
- ✅ Proper error handling with `HttpException`
- ✅ TypeScript strict mode compliant

### Testing
Run the test suite:
```bash
npm test -- wishlist
```

### Validation
All endpoints use Zod schemas for parameter validation via `validationMiddleware`.

---

## Support

For issues or questions about the Wishlist feature:
1. Check the [Feature Architecture Guidelines](../README.md)
2. Review database schema definitions in `shared/`
3. Consult API implementation in `apis/`
