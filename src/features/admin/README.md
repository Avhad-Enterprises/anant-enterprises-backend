# Admin Feature

## Overview
Manages admin/staff user profiles and organizational structure.

## Key Responsibilities
- Admin profile management
- Employee/staff data
- Department organization
- Admin user operations

## Architecture Notes
- **Permissions**: All handled via RBAC system
- **Authentication**: Managed by Supabase Auth
- **Profile Type**: One admin profile per user (polymorphic design)

## Schema
- **admin_profiles**: Staff/employee profiles with department and job title

## APIs
Coming in Phase 3:
- GET `/admins` - List all admins
- POST `/admins` - Create new admin
- PATCH `/admins/:id` - Update admin
- DELETE `/admins/:id` - Delete admin

## Dependencies
- `user` feature: Core user data
- `rbac` feature: Permission management
- `auth` feature: Authentication

## Future Enhancements
- Admin activity logs
- Departmental metrics
- Staff performance tracking
