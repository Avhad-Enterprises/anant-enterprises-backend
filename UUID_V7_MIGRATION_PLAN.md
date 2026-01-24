# UUID v4 to UUID v7 Migration Plan

**Project**: Anant Enterprises Backend  
**Date**: January 23, 2026  
**Status**: Planning Phase  
**Estimated Timeline**: 2-3 weeks

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Migration Strategy](#migration-strategy)
4. [Technical Implementation](#technical-implementation)
5. [Risk Assessment & Mitigation](#risk-assessment--mitigation)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

### What We're Doing
Migrating from **UUID v4 (random)** to **UUID v7 (time-ordered)** for primary key generation across all database tables.

### Why We're Doing It
- **50-70% better database performance** for inserts and queries
- **Sequential IDs** prevent index fragmentation
- **Time-ordered sorting** built into IDs
- **Better caching** and query optimization
- **Smaller index size** due to better locality

### Migration Approach
**Hybrid Strategy**: New records use UUID v7, existing records remain UUID v4 (backward compatible).

### Risk Level
**Medium** - No data migration needed, but requires careful testing of all UUID operations.

---

## Current State Analysis

### Affected Tables (58 tables total)

#### Core Business Tables
- **Users & Auth**: users, sessions, admin_profiles, customer_profiles, business_profiles
- **Products**: products, product_variants, product_faqs, product_questions
- **Orders**: orders, order_items
- **Inventory**: inventory, inventory_locations, inventory_adjustments, inventory_transfers, production_orders
- **Cart**: carts, cart_items
- **Payments**: payment_transactions, webhook_logs

#### Feature Tables
- **Collections**: collections, collection_rules
- **Discounts**: discounts, discount_usage, discount_daily_usage, discount_advanced_rules
- **Bundles**: bundles, bundle_items
- **Tags**: tags
- **Reviews**: reviews, product_questions
- **Notifications**: notifications, notification_preferences, notification_templates, notification_delivery_logs
- **Wishlist**: wishlists, wishlist_items
- **Tickets**: tickets, ticket_messages
- **Gift Cards**: gift_cards, gift_card_templates, gift_card_transactions
- **Media**: entity_media
- **RBAC**: roles, permissions
- **Company**: companies, company_rules
- **Catalogue**: catalogues, catalogue_rules
- **Tiers**: tiers
- **Blog**: blogs, blog_subsections
- **FAQ**: faqs
- **Settings**: currencies, tax_rules, tax_nexus, tax_exemptions

### Current Implementation
```typescript
// Drizzle Schema
id: uuid('id').primaryKey().defaultRandom()

// PostgreSQL Migration
"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
```

### Dependencies
- **Drizzle ORM**: v0.45.1 ✅ (supports custom defaults)
- **PostgreSQL**: 14+ required for `gen_random_uuid()` ✅
- **Foreign Key Relationships**: ~120+ FK references
- **API Validation**: Zod UUID validation in all endpoints

---

## Migration Strategy

### Chosen Approach: **Hybrid Migration (Recommended)**

New records get UUID v7, existing records keep UUID v4. Both formats are valid UUIDs, so no breaking changes.

#### Why Hybrid?
1. ✅ **Zero Downtime**: No data migration needed
2. ✅ **No Breaking Changes**: Both formats are valid UUIDs
3. ✅ **Immediate Performance Benefits**: New records benefit immediately
4. ✅ **Low Risk**: Existing data untouched
5. ✅ **Gradual Transition**: Can be phased over time

#### Alternative Approaches Considered

| Approach | Pros | Cons | Risk |
|----------|------|------|------|
| **Big Bang Migration** | All records consistent | High downtime, risky | 🔴 High |
| **Dual-Write Strategy** | Can compare both | Complex, double storage | 🟡 Medium |
| **Background Migration** | No downtime | Long transition period | 🟡 Medium |
| **Hybrid (Selected)** | Simple, low risk, immediate benefits | Mixed ID formats | 🟢 Low |

---

## Technical Implementation

### Phase 1: Setup UUID v7 Support (Week 1)

#### 1.1 Install UUID v7 Library
```bash
cd anant-enterprises-backend
npm install uuidv7
npm install --save-dev @types/uuid
```

#### 1.2 Create UUID v7 Generator Utility
**File**: `src/utils/uuid/uuid-generator.ts`
```typescript
import { uuidv7 } from 'uuidv7';

/**
 * Generate UUID v7 (time-ordered)
 * Format: 8-4-4-4-12 (same as UUID v4)
 * First 48 bits: Unix timestamp (millisecond precision)
 * Remaining 74 bits: Random data
 */
export function generateUuidV7(): string {
  return uuidv7();
}

/**
 * Extract timestamp from UUID v7
 * @param uuid UUID v7 string
 * @returns Date object or null if invalid
 */
export function extractTimestampFromUuidV7(uuid: string): Date | null {
  try {
    // UUID v7 format: timestamp (48 bits) + version (4) + random (12) + variant (2) + random (62)
    const hex = uuid.replace(/-/g, '');
    const timestampHex = hex.substring(0, 12); // First 48 bits
    const timestamp = parseInt(timestampHex, 16);
    return new Date(timestamp);
  } catch {
    return null;
  }
}

/**
 * Check if UUID is v7
 */
export function isUuidV7(uuid: string): boolean {
  const version = uuid.charAt(14);
  return version === '7';
}

/**
 * Check if UUID is v4
 */
export function isUuidV4(uuid: string): boolean {
  const version = uuid.charAt(14);
  return version === '4';
}
```

#### 1.3 Add PostgreSQL UUID v7 Function
**File**: `src/database/migrations/0012_add_uuid_v7_support.sql`
```sql
-- Create UUID v7 generation function for PostgreSQL
-- Based on: https://gist.github.com/kjmph/5bd772b2c2df145aa645b837da7eca74

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  -- Get current unix timestamp in milliseconds
  unix_ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  
  -- Generate UUID v7
  uuid_bytes := 
    -- 48 bits of timestamp
    substring(int8send(unix_ts_ms) from 3) ||
    -- Version (4 bits) = 7, Random (12 bits)
    set_byte(gen_random_bytes(2), 0, (get_byte(gen_random_bytes(1), 0) & 15) | 112) ||
    -- Variant (2 bits) = 10, Random (62 bits)
    set_byte(gen_random_bytes(8), 0, (get_byte(gen_random_bytes(1), 0) & 63) | 128);
    
  RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Add comment
COMMENT ON FUNCTION uuid_generate_v7() IS 'Generate UUID v7 (time-ordered UUID with millisecond precision timestamp)';
```

#### 1.4 Update Drizzle Schema Files (58 files)

**Example for users table**:
```typescript
// Before
id: uuid('id').primaryKey().defaultRandom()

// After
id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`)
```

**Script to update all schemas**:
```bash
# Create a script to update all schema files
find src/features -name "*.schema.ts" -exec sed -i '' 's/\.defaultRandom()/\.default(sql`uuid_generate_v7()`)/g' {} \;
```

**Import sql from drizzle-orm** (add to each affected schema file):
```typescript
import { sql } from 'drizzle-orm';
```

#### 1.5 Generate New Migration
```bash
npm run db:generate
```

This will create a new migration file with all `DEFAULT gen_random_uuid()` changed to `DEFAULT uuid_generate_v7()`.

---

### Phase 2: Update Application Code (Week 1-2)

#### 2.1 Update API Validation
**File**: `src/utils/validation/common-schemas.ts`

```typescript
import { z } from 'zod';

/**
 * UUID validation schema (supports both v4 and v7)
 * Both are valid RFC 4122 UUIDs
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

// No changes needed! UUID v7 follows same format as v4
```

#### 2.2 Update Service Layer (if needed)

Most services don't manually generate UUIDs (database does it), but check for:
```typescript
// Search for manual UUID generation
// grep -r "randomUUID" src/
// grep -r "uuid()" src/
```

If found, replace with:
```typescript
import { generateUuidV7 } from '@/utils/uuid/uuid-generator';

// Before
const id = crypto.randomUUID();

// After
const id = generateUuidV7();
```

#### 2.3 Update Tests

Add tests for UUID v7:
```typescript
// src/utils/uuid/uuid-generator.test.ts
import { generateUuidV7, extractTimestampFromUuidV7, isUuidV7 } from './uuid-generator';

describe('UUID v7 Generator', () => {
  it('should generate valid UUID v7', () => {
    const id = generateUuidV7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(isUuidV7(id)).toBe(true);
  });

  it('should be time-ordered', async () => {
    const id1 = generateUuidV7();
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait 10ms
    const id2 = generateUuidV7();
    
    expect(id1.localeCompare(id2)).toBeLessThan(0);
  });

  it('should extract timestamp', () => {
    const now = new Date();
    const id = generateUuidV7();
    const extracted = extractTimestampFromUuidV7(id);
    
    expect(extracted).toBeInstanceOf(Date);
    expect(Math.abs(now.getTime() - extracted!.getTime())).toBeLessThan(1000);
  });
});
```

---

### Phase 3: Database Migration (Week 2)

#### 3.1 Pre-Migration Checklist
- [ ] Full database backup
- [ ] Test migration on staging environment
- [ ] Verify all foreign key constraints
- [ ] Check application performance metrics baseline
- [ ] Notify team of maintenance window (if needed)

#### 3.2 Run Migration

**Development**:
```bash
npm run db:migrate:dev
```

**Staging**:
```bash
npm run db:migrate:test
```

**Production**:
```bash
# Create backup first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
npm run db:migrate:prod
```

#### 3.3 Post-Migration Verification
```sql
-- Verify uuid_generate_v7 function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'uuid_generate_v7';

-- Test UUID v7 generation
SELECT uuid_generate_v7() as new_uuid;

-- Check table defaults
SELECT 
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE column_default LIKE '%uuid_generate_v7%'
ORDER BY table_name;

-- Insert test record (will use UUID v7)
INSERT INTO tags (name, type) VALUES ('test-uuid-v7', 'product') RETURNING id;

-- Verify it's UUID v7 (version byte should be '7')
SELECT 
  id,
  substring(id::text, 15, 1) as version,
  created_at
FROM tags 
WHERE name = 'test-uuid-v7';
-- Should show version = '7'
```

---

### Phase 4: Testing & Validation (Week 2-3)

#### 4.1 Unit Tests
```bash
npm run test:unit
```

#### 4.2 Integration Tests
```bash
npm run test:integration
```

#### 4.3 Manual Testing Checklist
- [ ] Create new user (verify UUID v7 generated)
- [ ] Create new product (verify UUID v7)
- [ ] Create new order (verify UUID v7)
- [ ] Test all CRUD operations
- [ ] Test foreign key relationships (mixing v4 and v7)
- [ ] Test API endpoints with UUID parameters
- [ ] Test search/filter by ID
- [ ] Test sorting by created_at
- [ ] Verify audit logs still work

#### 4.4 Performance Testing
```sql
-- Compare query performance
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY id DESC
LIMIT 100;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;
```

#### 4.5 Monitor Metrics
- Insert performance (should be faster)
- Query performance on indexed columns
- Index size (should grow slower)
- Page splits (should be minimal)

---

## Risk Assessment & Mitigation

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Mixed UUID formats cause confusion** | Low | Low | Document that both are valid; add detection utilities |
| **Application code breaks with UUID v7** | Low | Medium | Zod still validates; both are RFC 4122 compliant |
| **Foreign key issues** | Very Low | High | FK constraints don't care about version; both are UUIDs |
| **Performance regression** | Very Low | Medium | UUID v7 should improve performance; benchmark first |
| **PostgreSQL function fails** | Low | High | Test thoroughly on staging; have rollback ready |
| **Data corruption during migration** | Very Low | Critical | No data modification; only changing defaults |
| **Third-party integrations break** | Low | Medium | UUIDs are still UUIDs; external APIs won't know difference |

### Mitigation Strategies

1. **Staging Environment Testing**: Complete migration on staging 1 week before production
2. **Backup Strategy**: Full database backup before production migration
3. **Monitoring**: Set up alerts for error rates, response times
4. **Gradual Rollout**: Start with non-critical tables if needed
5. **Feature Flag**: Could gate UUID v7 generation behind flag initially
6. **Documentation**: Update all docs with UUID v7 details

---

## Testing Strategy

### 1. Pre-Migration Testing (Staging)
```bash
# 1. Clone production database to staging
pg_dump $PROD_DATABASE_URL | psql $STAGING_DATABASE_URL

# 2. Run migration on staging
npm run db:migrate:test

# 3. Run full test suite
npm run test
npm run test:integration

# 4. Load testing
# Use artillery or k6 to simulate production load
artillery run load-test.yml
```

### 2. Post-Migration Testing (Production)
```bash
# 1. Smoke tests
curl -X POST /api/v1/products -d '{"name": "Test"}'
curl -X GET /api/v1/products

# 2. Monitor logs
tail -f logs/app.log | grep -i error

# 3. Check database health
npm run db:test:prod
```

### 3. Validation Queries
```sql
-- Check for any issues
SELECT 
  tablename,
  COUNT(*) as rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify new records use UUID v7
SELECT 
  id,
  substring(id::text, 15, 1) as version,
  created_at
FROM users
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Rollback Plan

### If Issues Detected Within First Hour

#### Option 1: Revert Migration (Recommended)
```bash
# 1. Stop application
pm2 stop anant-enterprises-backend

# 2. Restore database from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Revert code changes
git revert <migration-commit-sha>

# 4. Restart application
pm2 start anant-enterprises-backend
```

#### Option 2: Keep Data, Revert Defaults Only
```sql
-- Drop uuid_generate_v7 function
DROP FUNCTION IF EXISTS uuid_generate_v7();

-- Revert all table defaults to gen_random_uuid()
-- (Create script to update all 58 tables)
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE products ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- ... (repeat for all tables)
```

### If Issues Detected After Production Use
- **Keep UUID v7 records**: They're valid UUIDs
- **Revert defaults only**: New records go back to v4
- **Document mixed format**: Note that database has both formats

---

## Timeline & Milestones

### Week 1: Setup & Development
| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Install uuidv7 package<br>Create utility functions | Backend Team | ⬜ Not Started |
| **Tue** | Create PostgreSQL function<br>Write unit tests | Backend Team | ⬜ Not Started |
| **Wed** | Update all 58 schema files<br>Generate migration | Backend Team | ⬜ Not Started |
| **Thu** | Test migration on local | Backend Team | ⬜ Not Started |
| **Fri** | Code review & cleanup | Team Lead | ⬜ Not Started |

### Week 2: Testing & Staging
| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Deploy to staging<br>Run migration on staging | DevOps | ⬜ Not Started |
| **Tue** | Integration testing | QA Team | ⬜ Not Started |
| **Wed** | Performance testing<br>Load testing | Backend Team | ⬜ Not Started |
| **Thu** | Fix any issues found | Backend Team | ⬜ Not Started |
| **Fri** | Final staging validation | Team Lead | ⬜ Not Started |

### Week 3: Production Deployment
| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Pre-production checklist<br>Backup database | DevOps | ⬜ Not Started |
| **Tue** | **PRODUCTION MIGRATION**<br>During low-traffic window | DevOps + Backend | ⬜ Not Started |
| **Wed** | Monitor production<br>Validate metrics | All Teams | ⬜ Not Started |
| **Thu** | Performance analysis<br>Optimization if needed | Backend Team | ⬜ Not Started |
| **Fri** | Documentation update<br>Retrospective | All Teams | ⬜ Not Started |

---

## Success Criteria

### Technical Metrics
- ✅ All 58 tables successfully migrated
- ✅ Zero data loss or corruption
- ✅ All existing foreign keys intact
- ✅ New records generate UUID v7
- ✅ All API endpoints work correctly
- ✅ Test suite passes 100%

### Performance Metrics
- ✅ Insert performance improved by 20%+
- ✅ Query performance maintained or improved
- ✅ Index size growth reduced
- ✅ No increase in error rates

### Business Metrics
- ✅ Zero downtime (or <5 minutes if planned)
- ✅ No customer-facing issues
- ✅ No support tickets related to IDs

---

## Communication Plan

### Stakeholder Updates
- **Week 1**: Inform team of upcoming migration
- **Week 2**: Daily updates during staging testing
- **Week 3, Day 1**: Detailed production plan shared
- **Week 3, Day 2**: Real-time updates during migration
- **Week 3, Day 5**: Migration summary and results

### Documentation Updates
- [ ] Update API documentation
- [ ] Update database schema docs
- [ ] Add UUID v7 section to developer guide
- [ ] Update README with UUID v7 info
- [ ] Add migration notes to CHANGELOG

---

## Appendix

### A. Affected Files Checklist

#### Schema Files (58 files)
```
✅ src/features/user/shared/user.schema.ts
✅ src/features/product/shared/product.schema.ts
✅ src/features/orders/shared/orders.schema.ts
✅ src/features/orders/shared/order-items.schema.ts
✅ src/features/cart/shared/carts.schema.ts
✅ src/features/cart/shared/cart-items.schema.ts
... (53 more files)
```

#### Utility Files
```
✅ src/utils/uuid/uuid-generator.ts (NEW)
✅ src/utils/uuid/uuid-generator.test.ts (NEW)
✅ src/utils/validation/common-schemas.ts (NO CHANGE)
```

#### Migration Files
```
✅ src/database/migrations/0012_add_uuid_v7_support.sql (NEW)
✅ src/database/migrations/0013_update_table_defaults.sql (GENERATED)
```

### B. PostgreSQL UUID v7 Resources
- [UUID v7 Draft Specification](https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format)
- [PostgreSQL UUID Functions](https://www.postgresql.org/docs/current/functions-uuid.html)
- [UUID v7 Performance Analysis](https://www.percona.com/blog/store-uuid-optimized-way/)

### C. Useful Commands

#### Check Current UUID Version
```sql
SELECT 
  id,
  substring(id::text, 15, 1) as version,
  CASE substring(id::text, 15, 1)
    WHEN '4' THEN 'UUID v4 (random)'
    WHEN '7' THEN 'UUID v7 (time-ordered)'
    ELSE 'Other'
  END as uuid_type
FROM users
LIMIT 10;
```

#### Performance Comparison
```sql
-- Before UUID v7
EXPLAIN ANALYZE
INSERT INTO test_table (name) 
SELECT 'test-' || generate_series(1, 10000);

-- After UUID v7 (should be faster)
```

#### Monitor Index Health
```sql
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename IN ('users', 'products', 'orders')
  AND attname = 'id';
```

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Technical Lead** | | | |
| **DevOps Lead** | | | |
| **QA Lead** | | | |
| **Product Manager** | | | |

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Next Review**: After Week 1 completion
