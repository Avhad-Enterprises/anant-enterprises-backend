# Dynamic Role-Based Access Control (RBAC) System

This document details the **Dynamic RBAC** system implemented in the Anant Enterprises Backend, similar to AWS IAM.

## 📋 Table of Contents

- [Overview](#-overview)
- [Database Schema](#-database-schema)
- [Permissions](#-permissions)
- [API Reference](#-api-reference)
- [Middleware Usage](#-middleware-usage)
- [Cache Service](#-cache-service)
- [Audit Logging](#-audit-logging)
- [Security](#-security)

## 🔐 Overview

The backend uses a **dynamic, granular permission system** with:

- **Dynamic Roles**: Create/update/delete roles at runtime
- **Granular Permissions**: `resource:action` format (e.g., `users:read`)
- **Role-Permission Mapping**: Assign any permissions to any role
- **User-Role Mapping**: Assign multiple roles to users (with optional expiration)
- **Superadmin Wildcard**: `*` permission grants full access
- **In-Memory Caching**: 5-minute TTL for performance
- **Audit Logging**: Track all RBAC changes

## 🗄️ Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `roles` | Stores roles (name, description, is_system_role) |
| `permissions` | Stores permissions (name, resource, action) |
| `role_permissions` | Maps roles to permissions (many-to-many) |
| `user_roles` | Maps users to roles (with expiration support) |
| `rbac_audit_logs` | Audit trail for all RBAC operations |

### Entity Relationship

```
users ←──── user_roles ────→ roles ←──── role_permissions ────→ permissions
```

## 🎫 Permissions

### Format

Permissions use `resource:action` naming convention:

```
users:read       - Read user data
users:update     - Update any user
users:update:own - Update own profile only
users:delete     - Delete users
roles:read       - View roles
roles:manage     - Create/update/delete roles
permissions:assign - Assign permissions to roles
*                - Wildcard (full access)
```

### Default Permissions

| Resource | Actions |
|----------|---------|
| `users` | read, create, update, update:own, delete |
| `roles` | read, manage |
| `permissions` | read, assign |
| `uploads` | create, read:own, read:all, delete:own, delete:all |
| `admin` | system, invitations |
| `chatbot` | access, documents |

### Default Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| `user` | 6 permissions | Basic access (own resources) |
| `admin` | 14 permissions | Elevated access (manage users/content) |
| `superadmin` | `*` wildcard | Full system access |

## 🔧 API Reference

### Role Management

```bash
# List all roles with counts
GET /api/rbac/roles
Authorization: Bearer <token>
Permission: roles:read

# Create new role
POST /api/rbac/roles
{
  "name": "moderator",
  "description": "Content moderator"
}
Permission: roles:manage

# Update role
PUT /api/rbac/roles/:roleId
{
  "description": "Updated description",
  "is_active": false
}
Permission: roles:manage

# Delete role (soft delete)
DELETE /api/rbac/roles/:roleId
Permission: roles:manage
```

### Permission Management

```bash
# List all permissions (grouped by resource)
GET /api/rbac/permissions
Permission: permissions:read

# Create new permission
POST /api/rbac/permissions
{
  "name": "reports:generate",
  "resource": "reports",
  "action": "generate",
  "description": "Generate analytics reports"
}
Permission: permissions:assign
```

### Role-Permission Assignments

```bash
# Get role permissions
GET /api/rbac/roles/:roleId/permissions
Permission: roles:read

# Assign single permission to role
POST /api/rbac/roles/:roleId/permissions
{
  "permission_id": 5
}
Permission: permissions:assign

# Bulk assign permissions to role
POST /api/rbac/roles/:roleId/permissions/bulk
{
  "permission_ids": [1, 2, 3, 4, 5]
}
Permission: permissions:assign

# Remove permission from role
DELETE /api/rbac/roles/:roleId/permissions/:permissionId
Permission: permissions:assign
```

### User-Role Assignments

```bash
# Get user's roles
GET /api/rbac/users/:userId/roles
Permission: users:read

# Get user's effective permissions
GET /api/rbac/users/:userId/permissions
Permission: users:read

# Assign role to user (with optional expiration)
POST /api/rbac/users/:userId/roles
{
  "role_id": 2,
  "expires_at": "2025-12-31T23:59:59Z"
}
Permission: roles:manage

# Remove role from user
DELETE /api/rbac/users/:userId/roles/:roleId
Permission: roles:manage
```

## 🛡️ Middleware Usage

### Available Middleware

```typescript
import {
  requirePermission,      // Require ALL specified permissions
  requireAnyPermission,   // Require ANY of specified permissions
  requireOwnerOrPermission // Allow owner OR permission holder
} from '../middlewares/permission.middleware';
```

### Examples

```typescript
// Require single permission
router.get('/users', requireAuth, requirePermission('users:read'), handler);

// Require multiple permissions (ALL required)
router.post('/admin/config', 
  requireAuth, 
  requirePermission(['admin:system', 'users:update']), 
  handler
);

// Require ANY of the permissions
router.get('/dashboard', 
  requireAuth, 
  requireAnyPermission(['admin:system', 'roles:manage']), 
  handler
);

// Allow owner OR permission holder
router.put('/users/:id', 
  requireAuth, 
  requireOwnerOrPermission('id', 'users:update'), 
  handler
);
```

### Inline Permission Checks

```typescript
import { rbacCacheService } from '../features/rbac/services/rbac-cache.service';

// In handler
const canDelete = await rbacCacheService.hasPermission(req.userId, 'users:delete');
if (!canDelete) {
  throw new HttpException(403, 'Insufficient permissions');
}
```

## ⚡ Cache Service

The RBAC cache service optimizes permission lookups:

```typescript
import { rbacCacheService } from '../features/rbac/services/rbac-cache.service';

// Get all user permissions (cached)
const permissions = await rbacCacheService.getUserPermissions(userId);

// Check single permission
const canRead = await rbacCacheService.hasPermission(userId, 'users:read');

// Check ALL permissions
const hasAll = await rbacCacheService.hasAllPermissions(userId, ['users:read', 'users:update']);

// Check ANY permission
const hasAny = await rbacCacheService.hasAnyPermission(userId, ['admin:system', 'users:delete']);

// Invalidate user cache (after role change)
rbacCacheService.invalidateUser(userId);

// Invalidate all cache (after permission/role changes)
rbacCacheService.invalidateAll();
```

**Cache Configuration:**
- TTL: 5 minutes
- Storage: In-memory (per-instance)
- Invalidation: Automatic on RBAC changes

## 📋 Audit Logging

All RBAC operations are logged to `rbac_audit_logs` table:

```typescript
import { rbacAuditService } from '../features/rbac/services/audit.service';

// Logged automatically by RBAC APIs
// Actions tracked:
// - role_created, role_updated, role_deleted
// - permission_created
// - permission_assigned_to_role, permission_removed_from_role
// - role_assigned_to_user, role_removed_from_user
```

**Audit Log Fields:**
- `action`: Type of operation
- `performed_by`: User ID who performed the action
- `target_type`: 'role', 'permission', or 'user_role'
- `target_id`: ID of affected entity
- `old_value` / `new_value`: JSON of changes
- `ip_address`: Client IP
- `user_agent`: Browser info
- `created_at`: Timestamp

## 🔒 Security

### Protections

1. **System Roles**: Cannot be deleted (`user`, `admin`, `superadmin`)
2. **System Role Names**: Cannot be renamed
3. **Role Deletion**: Blocked if users are assigned
4. **Self Role Change**: Users cannot change their own role
5. **Wildcard**: Only `superadmin` has `*` permission
6. **Cache Invalidation**: Automatic on permission changes

### Best Practices

1. Use `requirePermission` instead of `requireRole`
2. Follow principle of least privilege
3. Use granular permissions (`users:read` not `admin`)
4. Set role expiration for temporary access
5. Monitor audit logs for suspicious activity

## 🧪 Testing

```bash
# Test as superadmin
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/rbac/users/3/permissions

# Response
{
  "success": true,
  "data": {
    "user_id": 3,
    "roles": ["superadmin"],
    "permissions": ["*"],
    "has_wildcard": true
  }
}
```

## 📁 File Structure

```
src/features/rbac/
├── apis/
│   ├── get-roles.ts
│   ├── create-role.ts
│   ├── update-role.ts
│   ├── delete-role.ts
│   ├── get-permissions.ts
│   ├── create-permission.ts
│   ├── role-permissions.ts
│   ├── bulk-permissions.ts
│   └── user-roles.ts
├── services/
│   ├── rbac-cache.service.ts
│   └── audit.service.ts
├── shared/
│   ├── schema.ts
│   ├── audit-schema.ts
│   ├── queries.ts
│   └── interface.ts
├── seed.ts
└── index.ts

src/middlewares/
└── permission.middleware.ts
```

---

**Dynamic RBAC - AWS IAM-like Access Control for Anant Enterprises**