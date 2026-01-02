# API Input/Output Examples - What We Send vs What We Get

This document shows EXACTLY what data we send to each API and what we receive back.

---

## 📋 ORDERS API

### 1. GET /api/users/:userId/orders

#### 📥 INPUT (What We Send)
```
Method: GET
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/orders
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}
Body: (none - GET request)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "id": "order-uuid-123",
      "orderNumber": "ORD-2024-001",
      "orderDate": "2024-01-01T10:30:00Z",
      "status": "delivered",
      "totalAmount": 15999.00,
      "items": [
        {
          "productName": "Anant Pure X1 Pro",
          "quantity": 1,
          "price": 15999.00
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

---

## 🏠 ADDRESSES API

### 2. POST /api/users/:userId/addresses (Create Address)

#### 📥 INPUT (What We Send)
```json
{
  "type": "Home",
  "name": "Ramesh Kumar",
  "phone": "+91 98765 43210",
  "addressLine1": "123, Green Valley Apartments",
  "addressLine2": "MG Road",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "isDefault": true
}
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "id": 1,
    "type": "Home",
    "name": "Ramesh Kumar",
    "phone": "+91 98765 43210",
    "addressLine1": "123, Green Valley Apartments",
    "addressLine2": "MG Road",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "isDefault": true
  }
}
```

### 3. GET /api/users/:userId/addresses

#### 📥 INPUT (What We Send)
```
Method: GET
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/addresses
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Addresses retrieved successfully",
  "data": [
    {
      "id": 1,
      "type": "Home",
      "name": "Ramesh Kumar",
      "phone": "+91 98765 43210",
      "addressLine1": "123, Green Valley Apartments",
      "addressLine2": "MG Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "isDefault": true
    },
    {
      "id": 2,
      "type": "Office",
      "name": "Ramesh Kumar",
      "phone": "+91 98765 43211",
      "addressLine1": "456, Tech Park",
      "addressLine2": "Sector 5",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "isDefault": false
    }
  ]
}
```

### 4. PUT /api/users/:userId/addresses/:id (Update Address)

#### 📥 INPUT (What We Send)
```json
{
  "city": "Navi Mumbai",
  "addressLine2": "Near Phoenix Mall"
}
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Address updated successfully",
  "data": {
    "id": 1,
    "type": "Home",
    "name": "Ramesh Kumar",
    "phone": "+91 98765 43210",
    "addressLine1": "123, Green Valley Apartments",
    "addressLine2": "Near Phoenix Mall",
    "city": "Navi Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "isDefault": true
  }
}
```

### 5. PATCH /api/users/:userId/addresses/:id/default (Set as Default)

#### 📥 INPUT (What We Send)
```
Method: PATCH
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/addresses/2/default
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Default address updated successfully"
}
```

### 6. DELETE /api/users/:userId/addresses/:id

#### 📥 INPUT (What We Send)
```
Method: DELETE
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/addresses/1
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

---

## ❤️ WISHLIST API

### 7. GET /api/users/:userId/wishlist (Empty)

#### 📥 INPUT (What We Send)
```
Method: GET
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/wishlist
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": []
}
```

### 8. POST /api/users/:userId/wishlist/:productId (Add to Wishlist)

#### 📥 INPUT (What We Send)
```
Method: POST
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/wishlist/product-uuid-456
Body: (none - product ID is in URL)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Product added to wishlist successfully",
  "data": {
    "productId": "product-uuid-456",
    "message": "Product added to wishlist"
  }
}
```

### 9. GET /api/users/:userId/wishlist (With Products)

#### 📥 INPUT (What We Send)
```
Method: GET
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/wishlist
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": [
    {
      "id": "product-uuid-456",
      "name": "Test Product for API Testing",
      "price": 150.00,
      "originalPrice": 200.00,
      "rating": 4.5,
      "reviews": 128,
      "image": "/test/product.png",
      "inStock": true
    }
  ]
}
```

### 10. POST /api/users/:userId/wishlist/:productId/move-to-cart

#### 📥 INPUT (What We Send)
```
Method: POST
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/wishlist/product-uuid-456/move-to-cart
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Product moved to cart successfully",
  "data": {
    "cartId": "cart-uuid-789",
    "productId": "product-uuid-456",
    "message": "Product moved to cart"
  }
}
```

**Note:** Product stays in wishlist with `added_to_cart_at` timestamp (Option B)

### 11. DELETE /api/users/:userId/wishlist/:productId

#### 📥 INPUT (What We Send)
```
Method: DELETE
URL: /api/users/f8d0f170-782e-486e-88d5-9a79178fdf0b/wishlist/product-uuid-456
Body: (none)
```

#### 📤 OUTPUT (What We Get)
```json
{
  "success": true,
  "message": "Product removed from wishlist successfully"
}
```

---

## ❌ Error Responses

### 401 Unauthorized (Missing/Invalid Token)
```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "message": "Unauthorized - Invalid or missing token"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Address not found"
  }
}
```

### 409 Conflict (Duplicate)
```json
{
  "success": false,
  "error": {
    "statusCode": 409,
    "message": "Product already in wishlist"
  }
}
```

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      {
        "field": "addressLine1",
        "message": "Address line 1 is required"
      }
    ]
  }
}
```

---

## 📊 Response Pattern Summary

### All Successful Responses Include:
```json
{
  "success": true,           // Always true for successful requests
  "message": "...",           // Human-readable success message
  "data": { ... },            // The actual data
  "meta": { ... }             // Optional metadata (pagination, etc.)
}
```

### All Error Responses Include:
```json
{
  "success": false,           // Always false for errors
  "error": {
    "statusCode": 400,        // HTTP status code
    "message": "...",         // Error description
    "details": [ ... ]        // Optional validation details
  }
}
```

---

## 🎯 Key Takeaways

1. **Consistent Format**: All APIs follow the same response structure
2. **Clear Status Codes**: 200 (OK), 201 (Created), 404 (Not Found), etc.
3. **Validation**: Zod validates all inputs before processing
4. **Authorization**: All endpoints require Bearer token
5. **Error Handling**: Clear error messages for debugging

---

## 🚀 Try It Yourself

Use these exact inputs in Thunder Client or Postman to test each endpoint!
