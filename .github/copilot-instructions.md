# Anant Enterprises Backend - AI Coding Agent Instructions

## Architecture Overview

This is an **Express.js + TypeScript REST API** for an e-commerce platform using **PostgreSQL + Drizzle ORM**. The codebase follows a **feature-based modular architecture** where each business domain (user, auth, rbac, orders, products, etc.) is isolated in `src/features/<feature-name>/`.

### Core Design Principles

1. **Dynamic RBAC System** - Authorization is permission-based, NOT role-based. Users have roles via `user_roles` junction table; roles have permissions via `role_permissions`. Never check `user.role` directly - use `requirePermission('resource:action')` middleware.

2. **8-Table User Architecture** - User data is normalized across specialized tables:
   - `users` - Authentication/security only (email, password_hash, account_status, verification, OTP, login tracking)
   - `user_profiles` - Customer data (first_name, middle_name, last_name, personal info, preferences, loyalty)
   - `admin_profiles` - Admin employment data (employee_id, department, level, manager hierarchy)
   - `user_statistics` - Pre-computed metrics (cached order stats, spending, reviews)
   - `user_payment_methods` - Tokenized payment gateways
   - `user_sessions` - Multi-device session tracking
   - `user_activity_log` - High-volume behavioral events
   - `user_addresses` - Shipping addresses

3. **Feature Module Structure** - Each feature follows this pattern:
   ```
   src/features/<feature>/
   ├── index.ts              # Route registration & exports
   ├── shared/
   │   ├── schema.ts         # Drizzle table definitions
   │   ├── queries.ts        # Database operations
   │   ├── interface.ts      # TypeScript types
   │   └── validation.ts     # Zod schemas (optional)
   ├── apis/                 # Individual route handlers
   │   ├── get-<resource>.ts
   │   ├── create-<resource>.ts
   │   └── update-<resource>.ts
   └── tests/
       ├── unit/
       └── integration/
   ```

## Critical Workflows

### Database Operations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations (auto-detects NODE_ENV)
npm run db:migrate           # Uses .env.dev/test/prod based on NODE_ENV
npm run db:migrate:prod      # Force production

# Interactive schema viewer
npm run db:studio

# Seed initial data (RBAC roles/permissions + test users)
npm run db:seed
```

**Important**: Drizzle reads `drizzle.config.ts` which loads the correct DB URL from `.env.dev`/`.env.test`/`.env.prod` based on `NODE_ENV`.

### Running Tests

```bash
npm test                  # All tests
npm run test:unit         # Unit tests only (mocked DB)
npm run test:integration  # Integration tests (real test DB)
npm run test:coverage     # With coverage report
```

**Test Database**: Integration tests use a separate test database (configured in `docker/compose.test.yaml`). Always run `npm run db:migrate:test` before integration tests.

### Development Server

```bash
npm run dev              # Nodemon with hot reload
npm run docker:dev       # Full stack (API + Postgres + Redis)
```

## Authentication & Authorization

### Never Do This ❌
```typescript
// WRONG - Don't check roles directly
if (user.role === 'admin') { ... }

// WRONG - users table has no 'role' field (uses RBAC)
const user = await db.select().from(users).where(eq(users.role, 'admin'));
```

### Always Do This ✅
```typescript
// Protect routes with permission middleware
router.delete('/:id', requirePermission('users:delete'), handler);

// Multiple permissions required (AND logic)
router.post('/', requirePermission(['orders:create', 'orders:read']), handler);

// User can access their own resource OR have permission
router.put('/:userId', requireOwnerOrPermission('userId', 'users:update'), handler);

// Check permissions in business logic
const hasPermission = await rbacCacheService.hasPermission(userId, 'orders:refund');
```

### Permission Naming Convention
Format: `<resource>:<action>` (e.g., `users:read`, `products:update`, `orders:refund`)

### Getting User's Name
User names are NOT in the `users` table. Join with profiles:
```typescript
// For customers
const profile = await db.select().from(userProfiles).where(eq(userProfiles.user_id, userId));
const fullName = `${profile.first_name} ${profile.last_name}`;

// For admins
const adminProfile = await db.select().from(adminProfiles).where(eq(adminProfiles.user_id, userId));
```

## Schema Patterns

### Field Naming
- Use `snake_case` for database columns (matches Drizzle convention)
- Split names: `first_name`, `middle_name` (nullable), `last_name` - never single `name` field
- Security fields: `password_hash` (never `password`), `reset_token_hash`, `otp_code`
- Audit fields: `created_by`, `updated_by`, `deleted_by` (all reference `users.id`)

### Common Schema Structure
```typescript
export const tableName = pgTable('table_name', {
  id: serial('id').primaryKey(),
  
  // Foreign keys
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Audit fields (standard on all tables)
  created_by: integer('created_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_by: integer('updated_by').references(() => users.id),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_by: integer('deleted_by').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
}, (table) => ({
  // Always index foreign keys and frequently queried fields
  userIdIdx: index('table_name_user_id_idx').on(table.user_id),
  createdAtIdx: index('table_name_created_at_idx').on(table.created_at),
}));
```

### Do NOT use `.comment()` method
Drizzle ORM doesn't support `.comment()` - use TypeScript comments above fields instead.

## Middleware Stack Order

Middlewares are applied in this order (see `src/app.ts`):
1. `securityMiddleware` - Helmet security headers
2. `corsMiddleware` - CORS configuration
3. `requestIdMiddleware` - Generate unique request ID
4. `requestLoggerMiddleware` - Log incoming requests
5. Route handlers (with `requireAuth` + `requirePermission` as needed)
6. `auditMiddleware` - Log DB mutations (POST/PUT/PATCH/DELETE)
7. `errorMiddleware` - Global error handler (MUST be last)

### Request Augmentation
- After `requireAuth`: `req.userId` is guaranteed to exist
- After `requestIdMiddleware`: `req.requestId` is available
- Use `RequestWithUser` type for authenticated handlers

## Error Handling

Always use `HttpException` for API errors:
```typescript
import { HttpException } from '../utils';

// In async handlers, errors are caught by errorMiddleware
throw new HttpException(404, 'User not found');
throw new HttpException(403, 'Insufficient permissions');

// No need to wrap in try-catch - errorMiddleware handles it
```

## Response Formatting

Use `ResponseFormatter` for consistent API responses:
```typescript
import { ResponseFormatter } from '../utils';

// Success response
ResponseFormatter.success(res, data, 'Operation successful');
// Returns: { success: true, data: {...}, message: '...' }

// Error responses are handled by errorMiddleware automatically
```

## Redis Caching

RBAC permissions are cached in Redis (5-minute TTL). Cache is invalidated on role/permission changes.

```typescript
import { rbacCacheService } from '../features/rbac';

// Cache is transparent - always returns fresh data
const permissions = await rbacCacheService.getUserPermissions(userId);

// Manually invalidate after role changes
await rbacCacheService.invalidateUser(userId);
await rbacCacheService.invalidateAll(); // Wipe entire cache
```

## Common Gotchas

1. **Circular Imports**: Features should NOT import from each other directly. Use shared `utils/` or `interfaces/` for cross-cutting concerns.

2. **Test Database**: Integration tests need `NODE_ENV=test`. The test DB is automatically used when running `npm run test:integration`.

3. **Schema Exports**: Always export both the table and types:
   ```typescript
   export const users = pgTable(...);
   export type User = typeof users.$inferSelect;
   export type NewUser = typeof users.$inferInsert;
   ```

4. **Drizzle Studio**: Opens on `https://local.drizzle.studio` - may need to accept self-signed cert.

5. **File Uploads**: Use `uploadSingleFileMiddleware` or `uploadCsvMiddleware` from `src/middlewares/upload.middleware.ts`. Files go to S3 (configured in `.env`).

## Key Files to Reference

- **RBAC Implementation**: `src/features/rbac/README.md` - Complete permission system docs
- **Database Examples**: `src/database/examples.ts` - Query patterns and best practices  
- **Middleware Chain**: `src/app.ts` - Application initialization and middleware order
- **User Schema**: `src/features/user/shared/schema.ts` - Auth-only user table
- **Profile Schemas**: `src/features/{user-profiles,admin-profiles}/shared/schema.ts` - Name and profile data
- **Environment Config**: `src/utils/validateEnv.ts` - Required environment variables

## Creating New Features

1. Create folder: `src/features/<feature-name>/`
2. Add `index.ts` route registration (extend `Route` interface)
3. Define schema in `shared/schema.ts` (include audit fields + indexes)
4. Write queries in `shared/queries.ts` (use parameterized queries)
5. Create API handlers in `apis/` (use Zod for validation)
6. Register routes in `src/server.ts` by importing the feature's `Route` class
7. Write tests in `tests/{unit,integration}/`

## Docker Development

```bash
npm run docker:dev         # Start Postgres + Redis + API
npm run docker:dev:clean   # Remove volumes (fresh start)
npm run docker:test        # Spin up test database
```

Container services:
- API: `localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Drizzle Studio: `localhost:4983`
