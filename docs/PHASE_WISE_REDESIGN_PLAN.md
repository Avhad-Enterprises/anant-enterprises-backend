# Phase-Wise Database Redesign Implementation Plan

> **Goal:** Transform from rigid single-role users to flexible polymorphic user design
> 
> **Duration:** 5-7 days
> 
> **Risk Level:** Medium (requires careful migration)

---

## 📋 Pre-Implementation Checklist

- [ ] Create full database backup
- [ ] Document current API contracts
- [ ] Set up rollback procedure
- [ ] Create feature branch: `feature/user-schema-redesign`
- [ ] Notify team of upcoming changes

---

## 🎯 Phase 1: Database Schema Changes (Day 1-2)

### **Objectives:**
- Remove `user_type` enum dependency
- Add `display_id` for human-readable IDs
- Make all profile tables truly optional (polymorphic)
- Preserve all existing data

### **1.1 Create Migration: Remove user_type, Add display_id**

**File:** `src/database/migrations/YYYY_MM_DD_HHMMSS_redesign_user_schema.sql`

```sql
-- ============================================
-- MIGRATION: Redesign User Schema
-- Purpose: Support polymorphic user profiles
-- ============================================

BEGIN;

-- Step 1: Add display_id column (will replace customer_id)
ALTER TABLE users 
ADD COLUMN display_id VARCHAR(20) UNIQUE;

-- Step 2: Create sequence for auto-generation
CREATE SEQUENCE IF NOT EXISTS display_id_seq START 1;

-- Step 3: Migrate existing customer_id → display_id
UPDATE users 
SET display_id = customer_id 
WHERE customer_id IS NOT NULL;

-- Step 4: Generate display_id for users without one
-- Customer display IDs: CUST-000001, CUST-000002, etc.
UPDATE users 
SET display_id = 'CUST-' || LPAD(nextval('display_id_seq')::text, 6, '0')
WHERE display_id IS NULL 
AND id IN (SELECT user_id FROM customer_profiles);

-- Step 5: Reset sequence
SELECT setval('display_id_seq', 
  COALESCE((SELECT MAX(SUBSTRING(display_id FROM 6)::integer) FROM users WHERE display_id LIKE 'CUST-%'), 0)
);

-- Step 6: Generate employee IDs for admins (EMP-000001, etc.)
CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

UPDATE users 
SET display_id = 'EMP-' || LPAD(nextval('employee_id_seq')::text, 6, '0')
WHERE display_id IS NULL 
AND id IN (SELECT user_id FROM admin_profiles);

-- Step 7: Make user_type nullable (transition step)
ALTER TABLE users 
ALTER COLUMN user_type DROP NOT NULL;

-- Step 8: Add comment for clarity
COMMENT ON COLUMN users.display_id IS 'Human-readable ID: CUST-XXXXXX for customers, EMP-XXXXXX for employees';
COMMENT ON COLUMN users.user_type IS 'DEPRECATED: Use profile tables instead. Will be removed in future migration.';

-- Step 9: Create function for auto-generating display_id
CREATE OR REPLACE FUNCTION generate_display_id(profile_type TEXT)
RETURNS VARCHAR(20) AS $$
DECLARE
  new_id VARCHAR(20);
  prefix TEXT;
  seq_name TEXT;
BEGIN
  IF profile_type = 'customer' THEN
    prefix := 'CUST-';
    seq_name := 'display_id_seq';
  ELSIF profile_type = 'employee' THEN
    prefix := 'EMP-';
    seq_name := 'employee_id_seq';
  ELSE
    prefix := 'USER-';
    seq_name := 'display_id_seq';
  END IF;
  
  EXECUTE format('SELECT %I.nextval', seq_name) INTO new_id;
  RETURN prefix || LPAD(new_id::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Step 10: Verify migration
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM users WHERE display_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % users without display_id', null_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: All users have display_id';
END $$;

COMMIT;
```

### **1.2 Create Rollback Migration**

**File:** `src/database/migrations/YYYY_MM_DD_HHMMSS_rollback_redesign_user_schema.sql`

```sql
BEGIN;

-- Rollback: Restore original state
ALTER TABLE users DROP COLUMN IF EXISTS display_id;
ALTER TABLE users ALTER COLUMN user_type SET NOT NULL;
DROP SEQUENCE IF EXISTS display_id_seq;
DROP SEQUENCE IF EXISTS employee_id_seq;
DROP FUNCTION IF EXISTS generate_display_id(TEXT);

COMMIT;
```

### **1.3 Update Drizzle Schema**

**File:** `src/features/user/shared/user.schema.ts`

**Changes:**
```typescript
// REMOVE:
customer_id: varchar('customer_id', { length: 15 }).unique(),
user_type: userTypeEnum('user_type').default('individual').notNull(),

// ADD:
display_id: varchar('display_id', { length: 20 }).unique().notNull(), // Auto-generated: CUST-XXXXXX or EMP-XXXXXX
user_type: userTypeEnum('user_type'), // DEPRECATED - nullable, will be removed
```

---

## 🔧 Phase 2: Move Schemas to Correct Features (Day 2)

### **2.1 Move business-profiles to customer feature**

```bash
# Move file
mv src/features/user/shared/business-profiles.schema.ts \
   src/features/customer/shared/business-profiles.schema.ts

# Update imports across codebase
find src/features -name "*.ts" -exec sed -i '' \
  "s|from '../../user/shared/business-profiles.schema'|from '../shared/business-profiles.schema'|g" {} +
```

### **2.2 Create admin feature**

```bash
# Create folder structure
mkdir -p src/features/admin/{apis,shared,services}

# Move admin-profiles schema
mv src/features/user/shared/admin-profiles.schema.ts \
   src/features/admin/shared/admin-profiles.schema.ts
```

### **2.3 Update customer feature exports**

**File:** `src/features/customer/index.ts`

```typescript
// ADD export
export * from './shared/business-profiles.schema';
```

---

## 🏗️ Phase 3: Create Admin Feature (Day 3)

### **3.1 Create Admin APIs**

#### **File:** `src/features/admin/apis/get-all-admins.ts`
```typescript
/**
 * GET /api/admin/admins
 * Get all admin users with their profiles
 */
import { Router, Response } from 'express';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { eq } from 'drizzle-orm';

const handler = async (req: RequestWithUser, res: Response) => {
  const admins = await db
    .select({
      user: users,
      adminProfile: adminProfiles,
    })
    .from(users)
    .innerJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
    .where(eq(adminProfiles.is_active, true));

  return ResponseFormatter.success(res, admins, 'Admins retrieved successfully');
};

const router = Router();
router.get('/admins', requireAuth, requirePermission('admins:read'), handler);
export default router;
```

#### **File:** `src/features/admin/apis/create-admin.ts`
```typescript
/**
 * POST /api/admin/admins
 * Create admin user with profile
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { sql } from 'drizzle-orm';

const createAdminSchema = z.object({
  name: z.string().min(1).max(255),
  last_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone_number: z.string().optional(),
  employee_id: z.string().optional(),
  department: z.string().optional(),
  job_title: z.string().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const data = createAdminSchema.parse(req.body);

  // Create user and admin profile in transaction
  const result = await db.transaction(async (tx) => {
    // Create user with auto-generated display_id
    const [user] = await tx
      .insert(users)
      .values({
        ...data,
        display_id: sql`generate_display_id('employee')`,
        email_verified: false,
        created_by: req.user.id,
      })
      .returning();

    // Create admin profile
    const [adminProfile] = await tx
      .insert(adminProfiles)
      .values({
        user_id: user.id,
        employee_id: data.employee_id,
        department: data.department,
        job_title: data.job_title,
        is_active: true,
      })
      .returning();

    return { user, adminProfile };
  });

  return ResponseFormatter.success(res, result, 'Admin created successfully', 201);
};

const router = Router();
router.post('/admins', requireAuth, requirePermission('admins:create'), handler);
export default router;
```

#### **File:** `src/features/admin/apis/update-admin.ts`
```typescript
/**
 * PUT /api/admin/admins/:id
 * Update admin profile
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { adminProfiles } from '../shared/admin-profiles.schema';
import { eq } from 'drizzle-orm';

const updateAdminSchema = z.object({
  employee_id: z.string().optional(),
  department: z.string().optional(),
  job_title: z.string().optional(),
  is_active: z.boolean().optional(),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const { id } = req.params;
  const data = updateAdminSchema.parse(req.body);

  const [updated] = await db
    .update(adminProfiles)
    .set({ ...data, updated_at: new Date() })
    .where(eq(adminProfiles.user_id, id))
    .returning();

  if (!updated) {
    throw new HttpException(404, 'Admin profile not found');
  }

  return ResponseFormatter.success(res, updated, 'Admin updated successfully');
};

const router = Router();
router.put('/admins/:id', requireAuth, requirePermission('admins:update'), handler);
export default router;
```

### **3.2 Create Admin Feature Index**

**File:** `src/features/admin/index.ts`
```typescript
/**
 * Admin Feature Index
 */
import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AdminRoute implements Route {
  public path = '/admin';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    const { default: getAllAdminsRouter } = await import('./apis/get-all-admins');
    const { default: createAdminRouter } = await import('./apis/create-admin');
    const { default: updateAdminRouter } = await import('./apis/update-admin');

    this.router.use(this.path, getAllAdminsRouter);
    this.router.use(this.path, createAdminRouter);
    this.router.use(this.path, updateAdminRouter);
  }
}

export default AdminRoute;
export * from './shared/admin-profiles.schema';
```

### **3.3 Create Admin README**

**File:** `src/features/admin/README.md`
```markdown
# Admin Feature

## Overview
Admin user management feature for staff/employee accounts.

## Routes
- `GET /api/admin/admins` - List all admins
- `POST /api/admin/admins` - Create new admin
- `PUT /api/admin/admins/:id` - Update admin profile

## Schema
- `admin_profiles` - Stores employee info, department, job title

## Notes
- Admins can ALSO be customers (polymorphic design)
- Permissions managed via RBAC system
- Display IDs: `EMP-000001`, `EMP-000002`, etc.
```

---

## 🔄 Phase 4: Update Application Logic (Day 3-4)

### **4.1 Update User Helper Functions**

**File:** `src/features/user/services/user-helper.service.ts` (NEW)

```typescript
/**
 * User Helper Service
 * Determines user roles based on profile existence
 */
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles } from '../../customer/shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../../customer/shared/business-profiles.schema';
import { adminProfiles } from '../../admin/shared/admin-profiles.schema';
import { eq } from 'drizzle-orm';

export interface UserRoles {
  isCustomer: boolean;
  isBusinessCustomer: boolean;
  isAdmin: boolean;
  displayId: string;
  profiles: {
    customer?: any;
    business?: any;
    admin?: any;
  };
}

export async function getUserRoles(userId: string): Promise<UserRoles> {
  const [result] = await db
    .select({
      user: users,
      customerProfile: customerProfiles,
      businessProfile: businessCustomerProfiles,
      adminProfile: adminProfiles,
    })
    .from(users)
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
    .leftJoin(businessCustomerProfiles, eq(users.id, businessCustomerProfiles.user_id))
    .leftJoin(adminProfiles, eq(users.id, adminProfiles.user_id))
    .where(eq(users.id, userId))
    .limit(1);

  return {
    isCustomer: !!result?.customerProfile,
    isBusinessCustomer: !!result?.businessProfile,
    isAdmin: !!result?.adminProfile,
    displayId: result?.user.display_id || '',
    profiles: {
      customer: result?.customerProfile,
      business: result?.businessProfile,
      admin: result?.adminProfile,
    },
  };
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(adminProfiles)
    .where(eq(adminProfiles.user_id, userId))
    .limit(1);
  
  return !!admin;
}

export async function isUserCustomer(userId: string): Promise<boolean> {
  const [customer] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.user_id, userId))
    .limit(1);
  
  return !!customer;
}
```

### **4.2 Update Customer APIs**

**Files to update:**
- `src/features/customer/apis/get-all-customers.ts`
- `src/features/customer/apis/create-customer.ts`
- `src/features/customer/apis/update-customer.ts`

**Changes:**
```typescript
// BEFORE:
.where(eq(users.user_type, 'individual'))

// AFTER:
.innerJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
```

### **4.3 Update User Interface**

**File:** `src/features/user/shared/interface.ts`

```typescript
export interface IUser {
  id: string;
  auth_id?: string | null;
  display_id: string; // NEW: CUST-XXXXXX or EMP-XXXXXX
  user_type?: 'individual' | 'business' | null; // DEPRECATED
  // ... rest stays same
}

// NEW: Helper interface
export interface IUserWithRoles extends IUser {
  roles: {
    isCustomer: boolean;
    isBusinessCustomer: boolean;
    isAdmin: boolean;
  };
}
```

---

## 🧪 Phase 5: Update Tests (Day 4-5)

### **5.1 Create Helper Test Utilities**

**File:** `tests/utils/user-test-helpers.ts`

```typescript
import { db } from '../../src/database';
import { users } from '../../src/features/user/shared/user.schema';
import { customerProfiles } from '../../src/features/customer/shared/customer-profiles.schema';
import { adminProfiles } from '../../src/features/admin/shared/admin-profiles.schema';

export async function createTestCustomer(overrides = {}) {
  const [user] = await db.insert(users).values({
    name: 'Test',
    last_name: 'Customer',
    email: `test-${Date.now()}@example.com`,
    display_id: `CUST-TEST${Date.now()}`,
    ...overrides,
  }).returning();

  const [profile] = await db.insert(customerProfiles).values({
    user_id: user.id,
  }).returning();

  return { user, profile };
}

export async function createTestAdmin(overrides = {}) {
  const [user] = await db.insert(users).values({
    name: 'Test',
    last_name: 'Admin',
    email: `admin-${Date.now()}@example.com`,
    display_id: `EMP-TEST${Date.now()}`,
    ...overrides,
  }).returning();

  const [profile] = await db.insert(adminProfiles).values({
    user_id: user.id,
    employee_id: `EMP${Date.now()}`,
    department: 'IT',
    ...overrides,
  }).returning();

  return { user, profile };
}

export async function createTestAdminCustomer(overrides = {}) {
  // Create user who is BOTH admin AND customer
  const [user] = await db.insert(users).values({
    name: 'Test',
    last_name: 'AdminCustomer',
    email: `both-${Date.now()}@example.com`,
    display_id: `CUST-BOTH${Date.now()}`,
    ...overrides,
  }).returning();

  const [customerProfile] = await db.insert(customerProfiles).values({
    user_id: user.id,
  }).returning();

  const [adminProfile] = await db.insert(adminProfiles).values({
    user_id: user.id,
    employee_id: `EMP${Date.now()}`,
    department: 'Sales',
  }).returning();

  return { user, customerProfile, adminProfile };
}
```

### **5.2 Update Existing Tests**

**All test files using `user_type`:**
```typescript
// BEFORE:
.where(eq(users.user_type, 'individual'))

// AFTER:
.innerJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
```

---

## 🚀 Phase 6: Update Server Registration (Day 5)

### **6.1 Register Admin Route**

**File:** `src/server.ts`

```typescript
import AdminRoute from './features/admin';

// In bootstrap():
const app = new App([
  new AuthRoute(),
  new UserRoute(),
  new CustomerRoute(),
  new AddressRoute(),
  new AdminRoute(), // NEW
  // ... rest
]);
```

### **6.2 Update drizzle.config.ts**

```typescript
schema: [
  // User & Auth
  './src/features/user/shared/user.schema.ts',
  
  // Customer
  './src/features/customer/shared/customer-profiles.schema.ts',
  './src/features/customer/shared/business-profiles.schema.ts', // MOVED
  './src/features/customer/shared/customer-statistics.schema.ts',
  
  // Admin (NEW)
  './src/features/admin/shared/admin-profiles.schema.ts', // MOVED
  
  // ... rest
],
```

---

## ✅ Phase 7: Final Migration & Cleanup (Day 6)

### **7.1 Remove user_type (Final Migration)**

**File:** `src/database/migrations/YYYY_MM_DD_HHMMSS_remove_user_type.sql`

```sql
BEGIN;

-- Verify all users have profiles before dropping user_type
DO $$
DECLARE
  orphaned_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_users
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM customer_profiles WHERE user_id = u.id
    UNION
    SELECT 1 FROM business_customer_profiles WHERE user_id = u.id
    UNION
    SELECT 1 FROM admin_profiles WHERE user_id = u.id
  );
  
  IF orphaned_users > 0 THEN
    RAISE WARNING 'Found % users without any profile!', orphaned_users;
  END IF;
END $$;

-- Drop user_type enum and column
ALTER TABLE users DROP COLUMN IF EXISTS user_type;
DROP TYPE IF EXISTS user_type;

-- Drop customer_id if still exists
ALTER TABLE users DROP COLUMN IF EXISTS customer_id;

COMMIT;
```

### **7.2 Remove deprecated code**

```bash
# Remove all user_type references
grep -r "user_type" src/ --include="*.ts" | cut -d: -f1 | sort -u

# Update each file manually or with sed
```

---

## 📊 Phase 8: Validation & Documentation (Day 7)

### **8.1 Run Test Suite**
```bash
npm test
npm run test:integration
```

### **8.2 Verify Database Integrity**
```sql
-- Check all users have display_id
SELECT COUNT(*) FROM users WHERE display_id IS NULL;

-- Check profile distribution
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT cp.user_id) as customers,
  COUNT(DISTINCT bp.user_id) as business_customers,
  COUNT(DISTINCT ap.user_id) as admins,
  COUNT(DISTINCT CASE WHEN cp.user_id IS NOT NULL AND ap.user_id IS NOT NULL THEN cp.user_id END) as admin_customers
FROM users u
LEFT JOIN customer_profiles cp ON u.id = cp.user_id
LEFT JOIN business_customer_profiles bp ON u.id = bp.user_id
LEFT JOIN admin_profiles ap ON u.id = ap.user_id;
```

### **8.3 Update Documentation**
- [ ] Update API documentation
- [ ] Update README.md
- [ ] Update feature README files
- [ ] Document new polymorphic design

---

## 🔄 Rollback Procedure

If issues arise during production deployment:

```bash
# 1. Stop the application
pm2 stop backend

# 2. Restore database from backup
psql -h localhost -U postgres -d anant_enterprises < backup_before_refactor.sql

# 3. Checkout previous git commit
git checkout main
npm run build

# 4. Restart application
pm2 start backend
```

---

## 📈 Success Metrics

- [ ] All tests passing
- [ ] Zero data loss
- [ ] All users have display_id
- [ ] Admin can be customer (verified in DB)
- [ ] API response times unchanged
- [ ] Frontend integration working

---

## 🎯 Post-Implementation Tasks

1. Monitor production for 48 hours
2. Remove deprecated `user_type` references from frontend
3. Update API documentation
4. Train team on new polymorphic design
5. Archive old migration files

---

## ⚠️ Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup before migration |
| display_id conflicts | Low | High | Use sequences, test thoroughly |
| Foreign key violations | Medium | High | Transaction-based migration |
| Performance degradation | Low | Medium | Add proper indexes |
| Frontend breaks | Medium | High | User handles frontend (confirmed) |

---

## 📞 Support & Questions

For issues during implementation:
1. Check rollback procedure
2. Review migration logs
3. Verify database state with validation queries
4. Consult this document

---

**Total Estimated Time:** 5-7 days
**Confidence Level:** High
**Recommended Start:** After full team review and approval
