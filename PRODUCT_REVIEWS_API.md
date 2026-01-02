# GET /api/products/:productId/reviews - Product Reviews API

## ✅ Implementation Complete

### Endpoint
```
GET http://localhost:3000/api/products/:productId/reviews
```

### Features Implemented

✅ **All Backend Field Names Preserved** - Frontend will handle mapping
✅ **Computed Fields**:
- `date` - Relative time format ("2 weeks ago", "3 months ago")
- `timestamp` - ISO date string
- `averageRating` - Computed from all approved reviews
- `ratingDistribution` - Count for each rating (1-5 stars)
- `total` - Total count of approved reviews

✅ **User Join** - Fetches author name and avatar from users table
✅ **Pagination** - page, limit parameters
✅ **Sorting** - recent, helpful, rating_high, rating_low
✅ **Filtering** - Only approved, non-deleted reviews
✅ **Public Access** - No authentication required

---

## 📥 Request Examples

### Basic Request
```http
GET /api/products/71ee8b31-0830-4baa-b112-26b98bd0cce1/reviews HTTP/1.1
Host: localhost:3000
```

### With Query Parameters
```http
GET /api/products/71ee8b31-0830-4baa-b112-26b98bd0cce1/reviews?page=1&limit=10&sort=helpful HTTP/1.1
Host: localhost:3000
```

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (min: 1) |
| `limit` | number | 10 | Items per page (min: 1, max: 50) |
| `sort` | string | recent | Sort order: `recent`, `helpful`, `rating_high`, `rating_low` |

---

## 📤 Response Format

```json
{
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "reviews": [
      {
        // === REVIEW FIELDS (Backend Names) ===
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "rating": 5,
        "title": "Excellent product!",
        "comment": "This water purifier exceeded my expectations. Crystal clear water!",
        "media_urls": [
          "https://cdn.example.com/review-img-1.jpg",
          "https://cdn.example.com/review-img-2.jpg"
        ],
        "helpful_votes": 24,
        "is_verified_purchase": true,
        "created_at": "2025-12-18T10:00:00.000Z",
        
        // === USER FIELDS (From Join) ===
        "author_name": "Rajesh Kumar",
        "author_avatar": "https://cdn.example.com/avatars/rajesh.jpg",
        
        // === COMPUTED FIELDS ===
        "date": "2 weeks ago",
        "timestamp": "2025-12-18T10:00:00.000Z"
      }
    ],
    
    // === STATISTICS (Computed) ===
    "total": 342,
    "averageRating": 4.8,
    "ratingDistribution": {
      "5": 240,
      "4": 65,
      "3": 20,
      "2": 10,
      "1": 7
    },
    
    // === PAGINATION ===
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 35
    }
  }
}
```

---

## 🗺️ Frontend Mapping

The frontend should map these fields as needed:

| Frontend Field | Backend Field | Notes |
|---|---|---|
| `id` | `id` | Direct |
| `author` | `author_name` | From user join |
| `avatar` | `author_avatar` | From user join |
| `rating` | `rating` | Direct |
| `date` | `date` | Already computed! |
| `timestamp` | `timestamp` | Already computed! |
| `verified` | `is_verified_purchase` | Direct |
| `title` | `title` | Direct |
| `content` | `comment` | Direct |
| `helpful` | `helpful_votes` | Direct |
| `images` | `media_urls` | Direct |

**Example Frontend Mapping:**
```typescript
const frontendReview = {
  id: backendReview.id,
  author: backendReview.author_name,
  avatar: backendReview.author_avatar,
  rating: backendReview.rating,
  date: backendReview.date,
  timestamp: backendReview.timestamp,
  verified: backendReview.is_verified_purchase,
  title: backendReview.title,
  content: backendReview.comment,
  helpful: backendReview.helpful_votes,
  images: backendReview.media_urls,
};
```

---

## 🧪 How to Test

### Option 1: Browser/Thunder Client
```
http://localhost:3000/api/products/71ee8b31-0830-4baa-b112-26b98bd0cce1/reviews
```

### Option 2: With Sorting & Pagination
```
http://localhost:3000/api/products/71ee8b31-0830-4baa-b112-26b98bd0cce1/reviews?page=1&limit=5&sort=helpful
```

### Option 3: Thunder Client Setup
- Method: GET
- URL: `http://localhost:3000/api/products/{PRODUCT_ID}/reviews`
- Query Params:
  - page: 1
  - limit: 10
  - sort: recent
- Click Send!

---

## ✨ Key Features

### 1. Smart Sorting
- `recent` - Newest reviews first
- `helpful` - Most helpful reviews first
- `rating_high` - Highest rated first
- `rating_low` - Lowest rated first

### 2. Relative Time Formatting
Automatic conversion of dates:
- "just now" (< 1 minute)
- "5 minutes ago"
- "2 hours ago"
- "3 days ago"
- "2 weeks ago"
- "1 month ago"
- "1 year ago"

### 3. Rating Distribution
Computed in a single query:
```json
{
  "5": 240,  // 240 five-star reviews
  "4": 65,   // 65 four-star reviews
  "3": 20,   // 20 three-star reviews
  "2": 10,   // 10 two-star reviews
  "1": 7     // 7 one-star reviews
}
```

### 4. User Information
Automatically joined with users table:
- `author_name` from users.name
- `author_avatar` from users.profile_picture
- Falls back to "Anonymous" if user not found

### 5. Verified Purchases
`is_verified_purchase` indicates if review is from confirmed buyer

---

## 📊 Response Summary

| Field | Type | Description |
|---|---|---|
| `reviews` | array | List of review items with user info |
| `total` | number | Total count of all approved reviews |
| `averageRating` | number | Average rating (1 decimal place) |
| `ratingDistribution` | object | Count for each star rating (1-5) |
| `pagination` | object | Pagination info (page, limit, totalPages) |

---

## 🚀 After Server Restart

The endpoint will be available at:
```
GET /api/products/:productId/reviews
```

Public access, no authentication required!

Test with product ID: `71ee8b31-0830-4baa-b112-26b98bd0cce1`
