# RBAC Feature Documentation

## Overview

The Role-Based Access Control (RBAC) system provides granular, permission-based authorization for the application. It replaces legacy role-based checks (e.g., `role === 'admin'`) with dynamic permission checks (e.g., `can('users:delete')`).

## Key Concepts

- **Permissions**: Granular capabilities (e.g., `users:read`, `users:update`, `chatbot:use`).
- **Roles**: Collections of permissions (e.g., `admin`, `user`, `superadmin`).
- **User Roles**: Users are assigned roles, which grant them permissions.
- **Dynamic**: Roles and permissions can be managed at runtime without code changes.

## API Documentation

### Permissions

- `GET /api/rbac/permissions` - List all system permissions (grouped by resource).
- `POST /api/rbac/permissions` - Create a new permission.
- `GET /api/rbac/users/:userId/permissions` - Get effective permissions for a user.

### Roles

- `GET /api/rbac/roles` - List all roles.
- `POST /api/rbac/roles` - Create a new role.
- `PUT /api/rbac/roles/:id` - Update a role.
- `DELETE /api/rbac/roles/:id` - Delete a role.
- `POST /api/rbac/roles/:id/permissions` - Assign permission to role.
- `POST /api/rbac/roles/:id/permissions/bulk` - Bulk assign permissions.

### User Assignment

- `GET /api/rbac/users/:userId/roles` - Get roles assigned to a user.
- `POST /api/rbac/users/:userId/roles` - Assign a role to a user.
- `DELETE /api/rbac/users/:userId/roles/:roleId` - Remove role from user.

## Integration Guide

### Backend Middleware

Use the `requirePermission` middleware to protect routes.

```typescript
import { requirePermission } from '../middlewares/permission.middleware';

// Require a single permission
router.delete('/:id', requirePermission('users:delete'), handler);

// Require ALL permissions
router.post('/', requirePermission(['users:create', 'users:read']), handler);
```

For resources where ownership matters (e.g., User Profile), use `requireOwnerOrPermission`:

```typescript
import { requireOwnerOrPermission } from '../middlewares/permission.middleware';

// Allow user to update their OWN profile OR admin with 'users:update'
// The first argument 'userId' is the name of the route parameter
router.put('/:userId', requireOwnerOrPermission('userId', 'users:update'), handler);
```

### Frontend Integration

Do **not** rely on permissions inside the JWT. Instead, fetch them on session start.

**1. Bootstrap Session**
Call the permissions endpoint to get the current user's effective permissions.

```javascript
// GET /api/rbac/users/{currentUserId}/permissions
const response = await api.get(`/api/rbac/users/${user.id}/permissions`);
const myPermissions = response.data.data.permissions; // e.g. ['users:read', 'chatbot:use']
```

**2. State Management**
Store these permissions in your global auth store (Redux, Context, etc.).

**3. Permission Guard**
Create a helper to check permissions in UI components.

```javascript
// Example helper
const can = (permission) => {
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Usage in React
{can('users:create') && (
  <CreateButton />
)}
```

## Testing

Use `AuthTestHelper` to seed RBAC data in tests.

```typescript
beforeEach(async () => {
    // Seeds default roles (admin, user) and permissions
    await AuthTestHelper.seedRBACData();
});
```
