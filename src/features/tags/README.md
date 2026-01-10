# Tags Feature - API Documentation

## Overview

The Tags feature provides a centralized tag management system for the admin panel. Tags are automatically created when used in products/collections, and admins can also manually manage tags through CRUD operations. The system tracks tag usage counts for better autocomplete suggestions.

## Base URL

```
/api/tags
```

## Authentication Requirements

| Endpoint      | Authentication | Authorization           |
| ------------- | -------------- | ----------------------- |
| `POST /`      | ✅ Required    | Admin (`tags:create`)   |
| `GET /`       | ❌ Public      | None                    |
| `GET /:id`    | ❌ Public      | None                    |
| `PUT /:id`    | ✅ Required    | Admin (`tags:update`)   |
| `DELETE /:id` | ✅ Required    | Admin (`tags:delete`)   |

---

## Endpoints

### 1. Create Tag

Create a new tag manually.

**Endpoint:** `POST /api/tags`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`tags:create` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "premium",
  "type": "product",
  "status": true
}
```

#### Request Schema

| Field    | Type    | Required | Description                              |
| -------- | ------- | -------- | ---------------------------------------- |
| `name`   | string  | ✅       | Tag name (auto-lowercased, max 255)     |
| `type`   | string  | ❌       | Tag type: product, collection (default: product) |
| `status` | boolean | ❌       | Active status (default: true)            |

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "Tag created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "premium",
    "type": "product",
    "status": true,
    "usage_count": 0,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error            | Description                  |
| ------ | ---------------- | ---------------------------- |
| `400`  | Validation Error | Invalid request body         |
| `401`  | Unauthorized     | Missing or invalid JWT token |
| `403`  | Forbidden        | User is not an admin         |
| `409`  | Conflict         | Tag already exists           |

---

### 2. Get All Tags

Get all active tags (public endpoint for autocomplete).

**Endpoint:** `GET /api/tags`

**Authentication:** Public

#### Query Parameters

| Parameter | Type   | Default | Description                       |
| --------- | ------ | ------- | --------------------------------- |
| `type`    | string | -       | Filter by type (product, collection, etc.) |

#### Example Request

```
GET /api/tags?type=product
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Found 15 tags",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "premium",
      "type": "product",
      "usage_count": 42
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "bestseller",
      "type": "product",
      "usage_count": 28
    }
  ]
}
```

**Notes:**
- Returns only active tags (`status=true`, `is_deleted=false`)
- Sorted by `usage_count` DESC (most popular first)
- Used for autocomplete dropdowns in frontend

---

### 3. Get Tag by ID

Get a single tag's details.

**Endpoint:** `GET /api/tags/:id`

**Authentication:** Public

#### Path Parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `id`      | UUID | Tag ID      |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Tag retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "premium",
    "type": "product",
    "status": true,
    "usage_count": 42,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Responses

| Status | Error     | Description    |
| ------ | --------- | -------------- |
| `400`  | Bad Request | Invalid tag ID |
| `404`  | Not Found | Tag not found  |

---

### 4. Update Tag

Update tag information.

**Endpoint:** `PUT /api/tags/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`tags:update` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Path Parameters

| Parameter | Type | Description       |
| --------- | ---- | ----------------- |
| `id`      | UUID | Tag ID to update  |

#### Request Body

All fields are optional. Only include fields you want to update.

```json
{
  "name": "premium-quality",
  "type": "product",
  "status": true
}
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Tag updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "premium-quality",
    "type": "product",
    "status": true,
    "usage_count": 42,
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
| `404`  | Not Found        | Tag not found                |
| `409`  | Conflict         | Tag name already exists      |

---

### 5. Delete Tag

Soft delete a tag.

**Endpoint:** `DELETE /api/tags/:id`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin only (`tags:delete` permission)

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Path Parameters

| Parameter | Type | Description       |
| --------- | ---- | ----------------- |
| `id`      | UUID | Tag ID to delete  |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Tag deleted successfully",
  "data": null
}
```

#### Error Responses

| Status | Error        | Description                  |
| ------ | ------------ | ---------------------------- |
| `401`  | Unauthorized | Missing or invalid JWT token |
| `403`  | Forbidden    | User is not an admin         |
| `404`  | Not Found    | Tag not found                |

---

## Tag Schema

### Core Fields
- `id` (UUID) - Primary identifier
- `name` (string) - Tag name (unique, lowercase)
- `type` (string) - Tag type (product, collection, etc.)
- `usage_count` (integer) - Number of times tag is used
- `status` (boolean) - Active/Inactive flag

### Audit Fields (Hidden from responses)
- `created_by`, `created_at`, `updated_at`
- `is_deleted`, `deleted_at`

---

## Automatic Tag Management

Tags are automatically created when products/collections use them:

### Product Create/Update
```typescript
// When saving product with tags
const product = {
  title: "Widget",
  tags: ["premium", "new-tag", "bestseller"]
};

// Backend automatically:
// 1. Creates "new-tag" if it doesn't exist
// 2. Increments usage_count for all tags
```

### Tag Lifecycle
```
Product created with ["premium"] → tags.premium.usage_count += 1
Product updated to ["premium", "sale"] → tags.sale.usage_count += 1  
Product updated to ["sale"] → tags.premium.usage_count -= 1
Product deleted → All tag usage_counts -= 1
```

---

## Frontend Integration

### Autocomplete Dropdown
```typescript
// Fetch tags for autocomplete
const response = await fetch('/api/tags?type=product');
const tags = response.data; // Sorted by usage_count

// Display in dropdown
tags.map(tag => ({
  label: tag.name,
  value: tag.name,
  count: tag.usage_count
}));
```

### Manual Tag Creation
```typescript
// Admin creates new tag
await fetch('/api/tags', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "summer-2024",
    type: "product",
    status: true
  })
});
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "name",
      "message": "Tag already exists"
    }
  ]
}
```

---

## Use Cases

### 1. Admin Management
- Create tags proactively for upcoming campaigns
- Update tag names for consistency
- Deactivate outdated tags
- View tag usage statistics

### 2. Product Management
- Tags auto-created when products use them
- Popular tags shown first in autocomplete
- No manual tag management needed

### 3. Analytics
- Track which tags are most popular (usage_count)
- Identify unused tags for cleanup
- Organize products by tag type

---

## Related Features

- **Product Feature**: `/api/products` - Products use tags (JSONB array)
- **Collection Feature**: `/api/collections` - Collections can filter by tags
- **Tag Sync Service**: Automatic tag creation/usage tracking

---

## Notes

- Tag names are automatically lowercased for consistency
- Duplicate tag names are prevented
- Soft delete preserves tag history (is_deleted flag)
- Usage count automatically maintained by tag-sync service
- Public GET endpoints for autocomplete without auth
- Admin-only CREATE/UPDATE/DELETE operations
