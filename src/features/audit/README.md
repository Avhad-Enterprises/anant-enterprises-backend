# Audit Feature

## Overview

The Audit feature provides comprehensive audit logging capabilities for tracking all critical operations in the system. This enables compliance, fraud detection, and business analytics by maintaining a complete history of user actions and system changes.

## Architecture

### Core Components

- **Audit Service** - Central service for logging and querying audit events
- **Database Schema** - Optimized table for storing audit records
- **Type System** - Comprehensive TypeScript types for all audit operations

## Folder Structure

```
audit/
├── index.ts               # Feature exports
├── services/              # Business logic
│   └── audit.service.ts   # Core audit logging service
├── shared/                # Shared resources
│   ├── schema.ts          # Database schema (audit_logs table)
│   └── types.ts           # TypeScript types and enums
└── tests/                 # Test files
    └── unit/              # Unit tests
        └── audit.service.test.ts
```

## Database Schema

The `audit_logs` table captures:

- **Who**: `user_id`, `user_email`, `user_role`
- **What**: `action`, `resource_type`, `resource_id`
- **Changes**: `old_values`, `new_values` (JSONB)
- **Context**: `ip_address`, `user_agent`, `session_id`
- **Metadata**: `metadata` (JSONB), `reason`, `timestamp`

### Indexes

- `timestamp` (DESC) - Chronological queries
- `user_id` - User activity lookups
- `resource_type + resource_id` - Resource audit trails
- `action` - Operation type filtering

## Usage

### Basic Audit Logging

```typescript
import { auditService, AuditAction, AuditResourceType } from '@features/audit';

// Log a user creation
await auditService.log({
  action: AuditAction.USER_CREATE,
  resourceType: AuditResourceType.USER,
  resourceId: newUser.id,
  userId: currentUser.id,
  newValues: { name: newUser.name, email: newUser.email },
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
});
```

### With Request Context

```typescript
const context = {
  userId: req.user.id,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  sessionId: req.session.id,
};

await auditService.log({
  action: AuditAction.USER_UPDATE,
  resourceType: AuditResourceType.USER,
  resourceId: userId,
  oldValues: oldUserData,
  newValues: updatedUserData,
  reason: 'Profile update requested by user',
}, context);
```

### Querying Audit Logs

```typescript
// Get audit trail for a specific resource
const auditTrail = await auditService.getAuditTrail(
  AuditResourceType.USER,
  userId
);

// Get all login attempts
const loginAttempts = await auditService.queryLogs({
  userId: userId,
  action: [AuditAction.LOGIN, AuditAction.LOGIN_FAILED],
  startDate: new Date('2024-01-01'),
});

// Get user's recent activity
const recentActivity = await auditService.getUserActivity(userId, 50);
```

## Audit Actions

### Authentication & Authorization
- `LOGIN`, `LOGOUT`, `LOGIN_FAILED`
- `PASSWORD_CHANGE`, `PASSWORD_RESET`, `TOKEN_REFRESH`

### User Management
- `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`
- `USER_ROLE_ASSIGN`, `USER_ROLE_REMOVE`

### RBAC
- `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`
- `PERMISSION_CREATE`, `PERMISSION_DELETE`
- `PERMISSION_ASSIGN`, `PERMISSION_REVOKE`

### System Operations
- `ADMIN_INVITE_CREATE`, `ADMIN_INVITE_ACCEPT`
- `UPLOAD_CREATE`, `UPLOAD_DELETE`, `UPLOAD_DOWNLOAD`
- `CHATBOT_DOCUMENT_CREATE`, `CHATBOT_SESSION_CREATE`
- `SETTINGS_CHANGE`, `SYSTEM_CONFIG`

## Resource Types

- `USER`, `ROLE`, `PERMISSION`, `USER_ROLE`, `ROLE_PERMISSION`
- `INVITATION`, `UPLOAD`
- `CHATBOT_DOCUMENT`, `CHATBOT_SESSION`, `CHATBOT_MESSAGE`
- `SETTINGS`, `SYSTEM`, `AUTH`

## Security Features

### Data Sanitization

The audit service automatically redacts sensitive fields:

- `password`, `password_hash`, `temp_password_encrypted`
- `invite_token`, `session_token`, `refresh_token`, `access_token`

Sanitization is applied recursively to nested objects.

### Error Resilience

Audit logging failures **never break the main application flow**. All errors are logged but not thrown, ensuring audit logs don't impact core functionality.

## API Methods

### `auditService.log(data, context?)`

Create an audit log entry.

**Parameters:**
- `data`: `AuditLogData` - The audit log data
- `context`: `AuditContext` (optional) - Request context for enrichment

**Returns:** `Promise<void>`

### `auditService.getAuditTrail(resourceType, resourceId, limit?)`

Get audit history for a specific resource.

**Parameters:**
- `resourceType`: `AuditResourceType` - Type of resource
- `resourceId`: `number | string` - Resource ID
- `limit`: `number` (optional, default: 50) - Max records

**Returns:** `Promise<AuditLog[]>`

### `auditService.getUserActivity(userId, limit?)`

Get all actions performed by a user.

**Parameters:**
- `userId`: `number` - User ID
- `limit`: `number` (optional, default: 100) - Max records

**Returns:** `Promise<AuditLog[]>`

### `auditService.queryLogs(filters)`

Advanced filtering of audit logs.

**Parameters:**
- `filters`: `AuditLogFilters` - Filter criteria
  - `userId`: Filter by user
  - `action`: Single action or array of actions
  - `resourceType`: Single type or array of types
  - `resourceId`: Filter by resource
  - `startDate`, `endDate`: Date range
  - `ipAddress`: Filter by IP
  - `limit`, `offset`: Pagination

**Returns:** `Promise<AuditLog[]>`

## Testing

Comprehensive unit tests cover all major functionality:

```bash
npm test -- audit.service.test.ts
```

**Test Coverage:**
- ✅ 21/21 tests passing
- Log method (6 tests)
- getAuditTrail (3 tests)
- getUserActivity (3 tests)
- queryLogs (6 tests)
- Data sanitization (2 tests)

## Migration

Apply the audit logs table migration:

```bash
npm run db:migrate:dev   # Development
npm run db:migrate:test  # Test
npm run db:migrate:prod  # Production
```

## Performance Considerations

- **Indexed Queries**: All common query patterns are indexed
- **Background Processing**: Audit logs don't block main operations
- **Data Retention**: Consider implementing archival for old logs
- **Partitioning**: For high-volume systems, partition by date

## Next Steps (Phase 2)

1. **Audit Middleware** - Automatic HTTP request/response auditing
2. **Database Hooks** - Automatic change tracking on DB operations
3. **API Endpoints** - Query endpoints for audit data
4. **Integration** - Add audit logging throughout existing features

## Future Enhancements (Phase 3-4)

- **Audit Analytics** - Statistics and reporting
- **Real-time Monitoring** - WebSocket-based audit viewing
- **Export Capabilities** - CSV/JSON export for compliance
- **Retention Policies** - Automated data archival
- **Advanced Filtering** - Full-text search, complex queries
