# Profile Page - Backend API Documentation

> **Target Audience**: Backend Developers  
> **Frontend Reference**: `anant-enterprises-frontend/src/lib/data/profile`  
> **Backend Feature**: `anant-enterprises-backend/src/features/user` + related features  
> **Last Updated**: January 2026

---

## Overview

This document defines the API contracts required to support the **User Profile Page** on the customer frontend. The profile page consists of 5 tabs:

| Tab | Data Source | Backend Status |
|-----|-------------|----------------|
| **Account** | User Profile | ✅ Exists (`/api/users/:id`) |
| **Orders** | User Orders | 🔶 Schema exists, API needed |
| **Addresses** | User Addresses | 🔶 Schema exists, API needed |
| **Wishlist** | User Wishlist | 🔶 Schema exists, API needed |
| **AMC Plans** | AMC Subscriptions | 🆕 New feature required |

---

## Base URL & Authentication

```
Base URL: /api/v1
Authentication: Bearer Token (JWT)
```

All profile endpoints require authentication. The user can only access their own data.

---

## 1. User Profile (Account Tab)

### GET `/api/users/:id`

> **Status**: ✅ Already Implemented  
> **Backend File**: [get-user-by-id.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/get-user-by-id.ts)

#### Frontend Expected Response

```typescript
interface UserProfile {
    name: string;           // Full name
    email: string;          // Email address
    phone: string;          // Phone number with country code
    dob?: string;           // Date of birth (YYYY-MM-DD)
}
```

#### Current Backend Response

```json
{
    "success": true,
    "message": "User retrieved successfully",
    "data": {
        "id": "uuid",
        "name": "Ramesh Kumar",
        "email": "ramesh.kumar@email.com",
        "phone_number": "+91 98765 43210",
        "date_of_birth": "1990-05-15",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    }
}
```

#### Field Mapping

| Frontend Field | Backend Field | Notes |
|----------------|---------------|-------|
| `name` | `name` | ✅ Direct mapping |
| `email` | `email` | ✅ Direct mapping |
| `phone` | `phone_number` | ⚠️ Frontend expects `phone` |
| `dob` | `date_of_birth` | ⚠️ Frontend expects `dob` |

> [!IMPORTANT]
> Consider adding a `/api/users/me` convenience endpoint that auto-resolves the current user from JWT.

---

### PUT `/api/users/:id`

> **Status**: ✅ Already Implemented  
> **Backend File**: [update-user.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/update-user.ts)

#### Request Body

```json
{
    "name": "Ramesh Kumar",
    "email": "ramesh.kumar@email.com",
    "phone_number": "+91 98765 43210",
    "date_of_birth": "1990-05-15"
}
```

---

## 2. User Orders (Orders Tab)

### GET `/api/users/:userId/orders`

> **Status**: 🔶 Schema exists, API implementation needed  
> **Schema File**: [orders.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/orders/shared/orders.schema.ts)

#### Frontend Expected Response

```typescript
interface Order {
    id: string;                           // Order ID (e.g., "ORD-2024-001")
    date: string;                         // Order date (display format)
    status: 'delivered' | 'shipped' | 'processing' | 'cancelled';
    total: number;                        // Total amount in INR
    deliveryDate?: string;                // Expected/actual delivery date
    trackingNumber?: string;              // Shipping tracking number
    items: OrderItem[];
}

interface OrderItem {
    name: string;                         // Product name
    quantity: number;
    price: number;                        // Line total
    image: string;                        // Product image URL
}
```

#### Required API Response

```json
{
    "success": true,
    "message": "Orders retrieved successfully",
    "data": [
        {
            "id": "ORD-2024-001",
            "date": "Dec 2, 2024",
            "status": "delivered",
            "total": 12999,
            "deliveryDate": "Dec 5, 2024",
            "trackingNumber": "TRK123456789",
            "items": [
                {
                    "name": "Anant Pure X1 Pro",
                    "quantity": 1,
                    "price": 12999,
                    "image": "/assets/product-123.png"
                }
            ]
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25
    }
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Table |
|----------------|---------------------|-------|
| `id` | `order_number` | `orders` |
| `date` | `created_at` | `orders` |
| `status` | `order_status` | `orders` |
| `total` | `total_amount` | `orders` |
| `deliveryDate` | `delivery_date` | `orders` |
| `trackingNumber` | `order_tracking` | `orders` |
| `items[].name` | `product_name` | `order_items` |
| `items[].quantity` | `quantity` | `order_items` |
| `items[].price` | `line_total` | `order_items` |
| `items[].image` | `product_image` | `order_items` |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Pagination page |
| `limit` | number | 10 | Items per page (max: 50) |
| `status` | string | - | Filter by status |

#### Implementation Notes

```
Location: anant-enterprises-backend/src/features/orders/apis/get-user-orders.ts (NEW)

Query Logic:
1. Filter orders by user_id = authenticated user
2. Filter out is_draft = true and is_deleted = true
3. Join with order_items to get line items
4. Format dates for display
5. Map order_status to frontend status enum
```

---

## 3. User Addresses (Addresses Tab)

### GET `/api/users/:userId/addresses`

> **Status**: 🔶 Schema exists, API implementation needed  
> **Schema File**: [addresses.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/shared/addresses.schema.ts)

#### Frontend Expected Response

```typescript
interface Address {
    id: number;
    type: 'Home' | 'Office' | 'Other';
    name: string;                         // Recipient name
    phone: string;                        // Contact phone
    addressLine: string;                  // Full street address
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}
```

#### Required API Response

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
            "addressLine": "123, Green Valley Apartments, MG Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "isDefault": true
        }
    ]
}
```

#### Backend Schema → Frontend Mapping

| Frontend Field | Backend Schema Field | Notes |
|----------------|---------------------|-------|
| `id` | `id` | ✅ Direct |
| `type` | `address_type` | ⚠️ Map: `shipping`→`Home`, `company`→`Office`, `both`→`Other` |
| `name` | `recipient_name` | ✅ Direct |
| `phone` | `phone_number` (with `phone_country_code`) | Concatenate with country code |
| `addressLine` | `address_line1` + `address_line2` | Combine lines |
| `city` | `city` | ✅ Direct |
| `state` | `state_province` | ✅ Direct |
| `pincode` | `postal_code` | ✅ Direct |
| `isDefault` | `is_default` | ✅ Direct |

#### Additional Endpoints Needed

```
POST   /api/users/:userId/addresses        → Create new address
PUT    /api/users/:userId/addresses/:id    → Update address
DELETE /api/users/:userId/addresses/:id    → Delete address (soft delete)
PATCH  /api/users/:userId/addresses/:id/default → Set as default
```

---

### POST `/api/users/:userId/addresses`

#### Request Body

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
    "isDefault": false
}
```

---

## 4. User Wishlist (Wishlist Tab)

### GET `/api/users/:userId/wishlist`

> **Status**: 🔶 Schema exists, API implementation needed  
> **Schema Files**: 
> - [wishlist.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/wishlist/shared/wishlist.schema.ts)
> - [wishlist-items.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/wishlist/shared/wishlist-items.schema.ts)

#### Frontend Expected Response

```typescript
interface WishlistItem {
    id: number;                           // Product ID
    name: string;                         // Product name
    price: number;                        // Current price
    originalPrice: number;                // Original price (for discount display)
    rating: number;                       // Average rating (1-5)
    reviews: number;                      // Review count
    image: string;                        // Product image URL
    inStock: boolean;                     // Availability status
}
```

#### Required API Response

```json
{
    "success": true,
    "message": "Wishlist retrieved successfully",
    "data": [
        {
            "id": 1,
            "name": "Anant Pure X1 Pro",
            "price": 12999,
            "originalPrice": 15999,
            "rating": 4.8,
            "reviews": 128,
            "image": "/assets/product-123.png",
            "inStock": true
        }
    ],
    "meta": {
        "totalItems": 3
    }
}
```

#### Implementation Notes

```
Location: anant-enterprises-backend/src/features/wishlist/apis/get-user-wishlist.ts (NEW)

Query Logic:
1. Find user's wishlist by user_id
2. Join wishlist_items with products table
3. Include product pricing, images, and stock status
4. Calculate rating from reviews (if reviews feature exists)
```

#### Additional Endpoints Needed

```
POST   /api/users/:userId/wishlist/:productId    → Add to wishlist
DELETE /api/users/:userId/wishlist/:productId    → Remove from wishlist
POST   /api/users/:userId/wishlist/:productId/move-to-cart → Move to cart
```

---

## 5. AMC Plans (AMC Tab)

### GET `/api/users/:userId/amc-plans`

> **Status**: 🆕 New feature - Schema and API needed  
> **Suggested Location**: `anant-enterprises-backend/src/features/amc/`

#### Frontend Expected Response

```typescript
interface AMCPlan {
    id: string;                           // Plan ID (e.g., "AMC-2024-001")
    planName: string;                     // Plan name
    productName: string;                  // Associated product
    status: 'active' | 'upcoming' | 'expired';
    startDate: string;                    // Display date
    endDate: string;                      // Display date
    servicesRemaining: number;            // Remaining service visits
    totalServices: number;                // Total allowed visits
    nextServiceDate?: string;             // Next scheduled service
    lastServiceDate?: string;             // Last completed service
    price: number;                        // Plan price
}
```

#### Required API Response

```json
{
    "success": true,
    "message": "AMC plans retrieved successfully",
    "data": [
        {
            "id": "AMC-2024-001",
            "planName": "Premium Annual Care",
            "productName": "Anant Pure X1 Pro",
            "status": "active",
            "startDate": "Jan 15, 2024",
            "endDate": "Jan 14, 2025",
            "servicesRemaining": 3,
            "totalServices": 4,
            "nextServiceDate": "Jan 5, 2025",
            "lastServiceDate": "Oct 10, 2024",
            "price": 2499
        }
    ]
}
```

#### Suggested Schema Design

```sql
-- AMC Plans Master
CREATE TABLE amc_plans (
    id UUID PRIMARY KEY,
    plan_code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    services_included INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User AMC Subscriptions
CREATE TABLE user_amc_subscriptions (
    id UUID PRIMARY KEY,
    subscription_code VARCHAR(40) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    plan_id UUID REFERENCES amc_plans(id),
    order_id UUID REFERENCES orders(id),
    
    status VARCHAR(20) DEFAULT 'active',  -- active, expired, cancelled
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    services_total INTEGER NOT NULL,
    services_used INTEGER DEFAULT 0,
    
    next_service_date DATE,
    last_service_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AMC Service History
CREATE TABLE amc_service_visits (
    id UUID PRIMARY KEY,
    subscription_id UUID REFERENCES user_amc_subscriptions(id),
    service_date DATE NOT NULL,
    technician_name VARCHAR(255),
    service_notes TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Response Format Standards

All API responses should follow this structure:

### Success Response

```json
{
    "success": true,
    "message": "Operation successful",
    "data": { ... },
    "pagination": {                       // Optional, for list endpoints
        "page": 1,
        "limit": 10,
        "total": 100,
        "totalPages": 10
    }
}
```

### Error Response

```json
{
    "success": false,
    "message": "Error description",
    "errors": [
        {
            "field": "email",
            "message": "Invalid email format"
        }
    ]
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful GET, PUT, PATCH |
| `201` | Successful POST (resource created) |
| `400` | Validation error |
| `401` | Authentication required |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate email) |
| `500` | Server error |

---

## Implementation Priority

| Priority | Feature | Complexity | Dependencies |
|----------|---------|------------|--------------|
| 🔴 High | User Orders API | Medium | orders schema exists |
| 🔴 High | User Addresses API | Low | addresses schema exists |
| 🟡 Medium | User Wishlist API | Medium | wishlist schema exists, needs product join |
| 🟢 Low | AMC Plans Feature | High | New schema + APIs needed |

---

## Related Backend Files

### Existing Schemas (Ready for API implementation)

| Schema | Location |
|--------|----------|
| Users | [user.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/shared/user.schema.ts) |
| Addresses | [addresses.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/shared/addresses.schema.ts) |
| Orders | [orders.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/orders/shared/orders.schema.ts) |
| Order Items | [order-items.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/orders/shared/order-items.schema.ts) |
| Wishlist | [wishlist.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/wishlist/shared/wishlist.schema.ts) |
| Customer Profile | [customer-profiles.schema.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/shared/customer-profiles.schema.ts) |

### Existing User APIs

| Endpoint | File |
|----------|------|
| GET /api/users | [get-all-users.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/get-all-users.ts) |
| GET /api/users/:id | [get-user-by-id.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/get-user-by-id.ts) |
| PUT /api/users/:id | [update-user.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/update-user.ts) |
| DELETE /api/users/:id | [delete-user.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-backend/src/features/user/apis/delete-user.ts) |

---

## Frontend Reference Files

| File | Description |
|------|-------------|
| [types.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/types.ts) | TypeScript interfaces for all profile data |
| [mock.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/mock.ts) | Mock data structure (API should match this) |
| [getUserProfile.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/getUserProfile.ts) | Profile fetch function |
| [getUserOrders.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/getUserOrders.ts) | Orders fetch function |
| [getUserAddresses.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/getUserAddresses.ts) | Addresses fetch function |
| [getUserWishlist.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/getUserWishlist.ts) | Wishlist fetch function |
| [getUserAMCPlans.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/profile/getUserAMCPlans.ts) | AMC Plans fetch function |
