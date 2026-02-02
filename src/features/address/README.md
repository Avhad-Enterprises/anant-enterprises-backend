# Address Feature

## Overview
Address management feature that handles user addresses and payment methods. Can be used by both users and customers.

## Structure
```
address/
├── index.ts              # Route class & exports
├── apis/                 # HTTP endpoints
│   ├── get-user-addresses.ts
│   ├── create-user-address.ts
│   ├── update-user-address.ts
│   ├── delete-user-address.ts
│   └── set-default-address.ts
└── shared/               # Schemas & types
    ├── addresses.schema.ts
    └── payment-methods.schema.ts
```

## API Routes
All routes are nested under user resources: `/api/users/:userId/addresses`

- `GET /users/:userId/addresses` - Get all addresses for a user
- `POST /users/:userId/addresses` - Create new address
- `PUT /users/:userId/addresses/:id` - Update address
- `PUT /users/:userId/addresses/:id/default` - Set default address
- `DELETE /users/:userId/addresses/:id` - Delete address

## Features
- Multiple addresses per user
- Address types: Home, Office, Other (mapped from billing/shipping/both/company)
- Default address management
- Supports both users and customers
- Payment method association

## Address Types
- **Billing**: Invoice/payment address
- **Shipping**: Delivery address
- **Both**: Can be used for billing and shipping
- **Company**: Business address

## Dependencies
- **User Feature**: Links to user accounts
- **Customer Feature**: Used by customer profiles
- **Orders Feature**: Used for order shipping/billing
