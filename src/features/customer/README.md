# Customer Feature

## Overview
Customer relationship management feature that handles all customer-specific operations independently from core user management.

## Structure
```
customer/
├── index.ts              # Route class & exports
├── apis/                 # HTTP endpoints
│   ├── get-all-customers.ts
│   ├── get-customer-by-id.ts
│   ├── create-customer.ts
│   ├── update-customer.ts
│   ├── delete-customer.ts
│   ├── bulk-delete-customers.ts
│   ├── get-customer-metrics.ts
│   ├── import-customers.ts
│   ├── export-customers.ts
│   └── get-user-tags.ts
└── shared/               # Schemas & types
    ├── customer-profiles.schema.ts
    └── customer-statistics.schema.ts
```

## API Routes
All routes are prefixed with `/api/customers`

- `GET /customers` - List all customers with pagination
- `GET /customers/:id` - Get customer by ID
- `POST /customers` - Create new customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer
- `POST /customers/bulk-delete` - Bulk delete customers
- `GET /customers/metrics` - Get customer metrics
- `GET /customers/tags` - Get customer tags
- `POST /customers/import` - Import customers from CSV
- `POST /customers/export` - Export customers to CSV

## Features
- Full CRUD operations for customers
- Customer segmentation (VIP, Regular, New)
- Business vs Individual customer profiles
- Import/Export functionality
- Customer metrics and analytics
- Tag management

## Dependencies
- **User Feature**: Uses core user schema
- **Address Feature**: Links to customer addresses
- **RBAC Feature**: Permission-based access control
