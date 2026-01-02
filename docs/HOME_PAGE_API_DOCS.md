# Home Page - Backend API Documentation

> **Target Audience**: Backend Developers  
> **Frontend Reference**: `anant-enterprises-frontend/src/lib/data/home`  
> **Last Updated**: January 2026

---

## Overview

This document defines the API contracts required to support the **Home Page** on the customer frontend. The home page is composed of multiple sections, each requiring its own data endpoint.

### Frontend Data Fetchers Summary

| Fetcher | Endpoint Pattern | Backend Status |
|---------|-----------------|----------------|
| `getHeroSlides` | `GET /hero-slides` | 🆕 New CMS endpoint needed |
| `getFeaturedProducts` | `GET /products/featured` | 🆕 New endpoint needed |
| `getBrands` | `GET /brands` | 🆕 New endpoint needed |
| `getTestimonials` | `GET /testimonials` | 🆕 New endpoint needed |
| `getCategories` | `GET /categories` | 🆕 New endpoint needed |
| `getUsageTypes` | `GET /usage-types` | 🆕 New endpoint needed |
| `getCurrentDeal` | `GET /deals/current` | 🆕 New endpoint needed |

> [!NOTE]
> All home page endpoints are **CMS-driven content**. Consider implementing a unified CMS feature for managing these sections through the admin panel.

---

## Base URL & Authentication

```
Base URL: /api/v1
```

| Endpoint Type | Authentication | Notes |
|---------------|----------------|-------|
| All home page data | ❌ Public | Publicly accessible |
| CMS management | ✅ Required | Admin only for CRUD |

---

## 1. Hero Slides

### GET `/api/hero-slides`

> **Status**: 🆕 New CMS endpoint needed

Returns the carousel slides for the home page hero banner.

#### Frontend Expected: `HeroSlide[]`

```typescript
interface HeroSlide {
    id: number | string;
    image: string;                        // Full-width banner image URL
    alt: string;                          // Image alt text (SEO/accessibility)
    title?: string;                       // Optional overlay title
    description?: string;                 // Optional overlay description
    ctaText: string;                      // Button text
    link: string;                         // Button link
    priority?: boolean;                   // First slide priority (LCP optimization)
}
```

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "image": "https://cdn.example.com/banners/slide-1.jpg",
            "alt": "Premium water purifier in modern home kitchen",
            "title": "Pure Water, Pure Life",
            "description": "Advanced RO + UV protection for your family",
            "ctaText": "Book Service",
            "link": "/services",
            "priority": true
        },
        {
            "id": 2,
            "image": "https://cdn.example.com/banners/slide-2.jpg",
            "alt": "Pure mineral water glass in sunlight",
            "ctaText": "View Products",
            "link": "/collection"
        }
    ]
}
```

#### Suggested Schema

```sql
CREATE TABLE hero_slides (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,                -- Optional mobile-specific image
    alt_text VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    cta_text VARCHAR(100) NOT NULL,
    link VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,           -- Sort order
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP,                  -- Optional scheduling
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. Featured Products

### GET `/api/products/featured`

> **Status**: 🆕 New endpoint needed (extends existing product feature)

Returns products marked as featured for the home page.

#### Frontend Expected: `Product[]`

```typescript
interface Product {
    id: number | string;
    name: string;
    image: string;
    price: number;
    originalPrice?: number;               // For discount display
    rating?: number;                      // Average rating
    reviews?: number;                     // Review count
    tags?: string[];                      // Feature badges
    inStock?: boolean;
    isNew?: boolean;                      // New arrival badge
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
            "id": 1,
            "name": "Anant Pure X1",
            "tags": ["RO", "UV", "UF"],
            "rating": 4.8,
            "reviews": 124,
            "price": 12999,
            "originalPrice": 18999,
            "image": "https://cdn.example.com/products/x1.jpg",
            "isNew": true,
            "inStock": true
        }
    ]
}
```

#### Implementation Notes

Add `is_featured` boolean column to products table:

```sql
ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT false;
CREATE INDEX idx_products_featured ON products (is_featured) WHERE is_featured = true;
```

---

## 3. Brands

### GET `/api/brands`

> **Status**: 🆕 New endpoint needed

Returns brand information for the brand showcase section.

#### Frontend Expected: `Brand[]`

```typescript
interface Brand {
    id: number | string;
    name: string;
    logo: string;                         // Brand logo image URL
    category?: string;                    // Brand category/tagline
    link?: string;                        // Link to filtered collection
    description?: string;
}
```

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Aquaguard",
            "logo": "https://cdn.example.com/brands/aquaguard.png",
            "category": "Premium Protection",
            "link": "/collection?brand=aquaguard"
        }
    ]
}
```

#### Suggested Schema

```sql
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT NOT NULL,
    category VARCHAR(255),                -- e.g., "Premium Protection"
    description TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,           -- Display order
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add brand reference to products
ALTER TABLE products ADD COLUMN brand_id INTEGER REFERENCES brands(id);
```

---

## 4. Testimonials

### GET `/api/testimonials`

> **Status**: 🆕 New endpoint needed

Returns customer testimonials for the social proof section.

#### Frontend Expected: `Testimonial[]`

```typescript
interface Testimonial {
    id: number | string;
    name: string;                         // Customer name
    location: string;                     // City, Country
    text: string;                         // Testimonial content
    rating: number;                       // 1-5 stars
    outcome?: string;                     // Result highlight (e.g., "TDS reduced from 420 to 45")
    image: string;                        // Customer avatar
    verified?: boolean;                   // Verified purchase badge
    date?: Date;                          // Testimonial date
}
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 4 | Max testimonials |
| `featured` | boolean | true | Only featured testimonials |

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Priya Sharma",
            "location": "Mumbai, India",
            "text": "The installation was flawless and the water quality is noticeably better.",
            "rating": 5,
            "outcome": "TDS reduced from 420 to 45",
            "image": "https://cdn.example.com/avatars/priya.jpg",
            "verified": true
        }
    ]
}
```

#### Suggested Schema

```sql
CREATE TABLE testimonials (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),    -- Optional link to registered user
    customer_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    outcome VARCHAR(255),                 -- Result highlight
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,    -- Moderation
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Categories (Purification Types)

### GET `/api/categories`

> **Status**: 🆕 New endpoint needed

Returns purification technology categories for the home page grid.

#### Frontend Expected: `Category[]`

```typescript
interface Category {
    id: number | string;
    title: string;                        // e.g., "RO Purification"
    description: string;                  // Short description
    iconName?: string;                    // Lucide icon name
    gradient: string;                     // Tailwind gradient classes
    shadow: string;                       // Tailwind shadow classes
    link?: string;                        // Link to filtered collection
}
```

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "title": "RO Purification",
            "description": "Removes heavy metals & salts",
            "iconName": "Droplets",
            "gradient": "from-blue-500 to-blue-600",
            "shadow": "shadow-blue-200",
            "link": "/collection?technology=ro"
        }
    ]
}
```

#### Suggested Schema

```sql
CREATE TABLE technology_categories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_name VARCHAR(100),               -- Lucide icon identifier
    gradient_classes VARCHAR(255),        -- Tailwind classes
    shadow_classes VARCHAR(255),          -- Tailwind classes
    link VARCHAR(255),
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Usage Types

### GET `/api/usage-types`

> **Status**: 🆕 New endpoint needed

Returns usage type cards (Domestic, Industrial, Office) for the home page.

#### Frontend Expected: `UsageType[]`

```typescript
interface UsageType {
    id: number | string;
    title: string;                        // e.g., "Domestic"
    description: string;                  // Short description
    image: string;                        // Background image URL
    link: string;                         // Link to filtered collection
}
```

#### Required API Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "title": "Domestic",
            "description": "Perfect for modern kitchens & families",
            "image": "https://cdn.example.com/usage/domestic.jpg",
            "link": "/collection?category=residential"
        }
    ]
}
```

#### Suggested Schema

```sql
CREATE TABLE usage_types (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Current Deal / Deal of the Day

### GET `/api/deals/current`

> **Status**: 🆕 New endpoint needed

Returns the active promotional deal for the home page.

#### Frontend Expected: `Deal`

```typescript
interface Deal {
    id: number | string;
    title: string;                        // Deal title
    description: string;                  // Deal description
    features: string[];                   // Bullet points
    image: string;                        // Product/service image
    price: number;                        // Deal price
    originalPrice: number;                // Original price
    discount: number;                     // Discount percentage
    expiresAt: Date;                      // Countdown timer target
    ctaText?: string;                     // Button text
    ctaLink?: string;                     // Button link
    tags?: string[];                      // Value proposition tags
    terms?: string;                       // Terms line
}
```

#### Required API Response

```json
{
    "success": true,
    "data": {
        "id": 1,
        "title": "Premium AMC Protection",
        "description": "Experience zero downtime with our comprehensive maintenance plans.",
        "features": [
            "Comprehensive Filter Replacement",
            "3 Free Preventive Maintenance Visits",
            "24/7 Priority Breakdown Support"
        ],
        "image": "https://cdn.example.com/deals/amc.jpg",
        "price": 5100,
        "originalPrice": 8500,
        "discount": 40,
        "expiresAt": "2026-01-03T23:59:59Z",
        "ctaText": "Chat with a Water Expert",
        "ctaLink": "/services",
        "tags": ["Zero Downtime", "Genuine Parts", "Priority Support"],
        "terms": "Instant activation • No hidden charges • Tax inclusive"
    }
}
```

#### Suggested Schema

```sql
CREATE TABLE deals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    features JSONB DEFAULT '[]',          -- Array of feature strings
    image_url TEXT NOT NULL,
    product_id UUID REFERENCES products(id),  -- Optional product link
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2) NOT NULL,
    discount_percent INTEGER NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    cta_text VARCHAR(100),
    cta_link VARCHAR(255),
    tags JSONB DEFAULT '[]',
    terms TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,           -- For multiple active deals
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Query for current deal
-- SELECT * FROM deals 
-- WHERE is_active = true AND starts_at <= NOW() AND ends_at >= NOW()
-- ORDER BY priority DESC LIMIT 1;
```

---

## Implementation Priority

| Priority | Endpoint | Complexity | Notes |
|----------|----------|------------|-------|
| 🔴 High | Featured Products | Low | Add `is_featured` column |
| 🔴 High | Hero Slides | Medium | New CMS table |
| 🔴 High | Current Deal | Medium | New schema with scheduling |
| 🟡 Medium | Brands | Medium | New schema + product FK |
| 🟡 Medium | Categories | Low | Simple CMS table |
| 🟡 Medium | Usage Types | Low | Simple CMS table |
| 🟡 Medium | Testimonials | Medium | Moderation support |

---

## CMS Architecture Recommendation

Consider creating a unified **CMS Feature** to manage all home page content:

```
src/features/cms/
├── apis/
│   ├── hero-slides/
│   ├── testimonials/
│   ├── deals/
│   └── usage-types/
├── shared/
│   ├── hero-slides.schema.ts
│   ├── testimonials.schema.ts
│   ├── deals.schema.ts
│   ├── technology-categories.schema.ts
│   └── usage-types.schema.ts
└── index.ts
```

---

## Caching Strategy

| Endpoint | Cache Duration | Invalidation |
|----------|----------------|--------------|
| Hero Slides | 1 hour | On slide CRUD |
| Featured Products | 30 minutes | On product update |
| Brands | 24 hours | On brand CRUD |
| Testimonials | 1 hour | On testimonial CRUD |
| Categories | 24 hours | On category CRUD |
| Usage Types | 24 hours | On usage type CRUD |
| Current Deal | 5 minutes | On deal update/expiry |

---

## Frontend Reference Files

| File | Description |
|------|-------------|
| [home.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/types/home.ts) | All TypeScript interfaces |
| [getHeroSlides.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getHeroSlides.ts) | Hero slides fetcher |
| [getFeaturedProducts.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getFeaturedProducts.ts) | Featured products fetcher |
| [getBrands.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getBrands.ts) | Brands fetcher |
| [getTestimonials.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getTestimonials.ts) | Testimonials fetcher |
| [getCategoriesAndUsageTypes.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getCategoriesAndUsageTypes.ts) | Categories & usage types |
| [getCurrentDeal.ts](file:///c:/Users/adity/Documents/anant%20enterprieses/anant-enterprises-frontend/src/lib/data/home/getCurrentDeal.ts) | Current deal fetcher |
