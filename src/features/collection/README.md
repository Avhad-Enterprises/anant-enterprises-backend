# Collection Features

## Overview

The Collection feature provides functionality for managing and displaying curated product collections. Collections can be used for promotional campaigns, seasonal sales, or product categorization.

---

## Directory Structure

```
collection/
├── apis/                           # API endpoints
│   └── get-collection-by-slug.ts   # GET /api/collections/:slug
├── services/                       # Business logic services
│   └── collection-cache.service.ts # Redis/memory caching
├── shared/                         # Shared resources
│   ├── collection.schema.ts        # Database schema
│   ├── collection-products.schema.ts
│   ├── collection-rules.schema.ts
│   ├── interface.ts                # TypeScript interfaces
│   ├── queries.ts                  # Database query helpers
│   ├── sanitizeCollection.ts       # Data sanitization
│   └── index.ts                    # Shared exports
├── tests/                          # Unit/integration tests
│   └── queries.test.ts
├── index.ts                        # Route registration
└── README.md                       # This file
```

---

## API Endpoints

### Public Endpoints

| Endpoint                 | Method | Description            |
| ------------------------ | ------ | ---------------------- |
| `/api/collections/:slug` | GET    | Get collection by slug |

---

## Services

### CollectionCacheService

**Purpose**: Provides caching layer for collection data to reduce database load.

**Features**:

- Redis caching with in-memory fallback
- 1-hour cache TTL
- Cache by ID and slug
- Automatic cache invalidation on updates

**Usage**:

```typescript
import { collectionCacheService } from './services/collection-cache.service';

const collection = await collectionCacheService.getCollectionBySlug('summer-sale');
```

---

## Shared Resources

### Queries

Database query helpers that abstract common operations:

```typescript
import { findCollectionBySlug, findCollectionById } from './shared/queries';

// Find by slug (cached)
const collection = await findCollectionBySlug('summer-sale');

// Find by ID (cached)
const collection = await findCollectionById('uuid');
```

### Sanitization

Remove sensitive/internal fields from collection data:

```typescript
import { sanitizeCollection } from './shared/sanitizeCollection';

const sanitized = sanitizeCollection(collection);
// Removes: created_by
```

---

## Database Schema

### Collections Table

| Field                     | Type         | Description                      |
| ------------------------- | ------------ | -------------------------------- |
| `id`                      | UUID         | Primary key                      |
| `title`                   | VARCHAR(255) | Collection name                  |
| `slug`                    | VARCHAR(255) | URL-friendly identifier (unique) |
| `description`             | TEXT         | Rich text description            |
| `type`                    | ENUM         | manual \| automated              |
| `status`                  | ENUM         | active \| inactive \| draft      |
| `sort_order`              | ENUM         | Sort method for products         |
| `banner_image_url`        | TEXT         | Desktop banner image             |
| `mobile_banner_image_url` | TEXT         | Mobile banner image              |
| `meta_title`              | VARCHAR(255) | SEO title                        |
| `meta_description`        | TEXT         | SEO description                  |
| `tags`                    | JSONB        | Internal tags                    |
| `created_by`              | UUID         | Creator reference                |
| `created_at`              | TIMESTAMP    | Creation time                    |
| `updated_at`              | TIMESTAMP    | Last update                      |

**Indexes**:

- `slug` (unique)
- `status`
- `type`

---

## Testing

### Running Tests

```bash
# Run all collection tests
npm test -- collection

# Run specific test file
npm test -- queries.test.ts
```

### Test Coverage

- ✅ Query helpers (findBySlug, findById)
- ✅ API endpoints (get-by-slug)
- ✅ Cache service operations

---

## Development

### Adding a New API Endpoint

1. Create file in `apis/` directory:

```typescript
// apis/my-new-endpoint.ts
import { Router, Response, Request } from 'express';
// ... implementation
export default router;
```

2. Register in `index.ts`:

```typescript
const { default: myNewEndpointRouter } = await import('./apis/my-new-endpoint');
this.router.use(this.path, myNewEndpointRouter);
```

### Cache Invalidation

When modifying collection data, invalidate cache:

```typescript
import { collectionCacheService } from './services/collection-cache.service';

// After update
await collectionCacheService.invalidateCollectionById(id);
await collectionCacheService.invalidateCollectionBySlug(slug);
```

---

## Related Features

- **Product**: Products can be associated with collections
- **Collection Products**: Junction table for many-to-many relationship
- **Collection Rules**: Automated collection rules

---

## Performance Considerations

- **Caching**: Collections are cached for 1 hour (Redis + in-memory)
- **Indexes**: Slug and status fields are indexed for fast lookups
- **Active Only**: Public endpoints only return active collections

---

## Future Enhancements

- [ ] Admin CRUD endpoints
- [ ] Automated collection rules engine
- [ ] Collection analytics
- [ ] Product count per collection
- [ ] Collection search/filtering
