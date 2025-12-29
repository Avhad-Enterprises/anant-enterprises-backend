# Auth Feature - Supabase Authentication

## Overview

The Auth feature integrates with **Supabase Auth** for user authentication. Authentication (sign up, sign in, sign out) is handled by the **frontend** using the Supabase client library. The backend provides token verification, password reset, and user sync functionality.

## Architecture

- **Frontend Responsibility**: All user authentication flows using `@supabase/supabase-js`
- **Backend Responsibility**: Token verification, password reset endpoints, user sync via middleware

## Base URL

```
/api/auth
```

## Authentication Requirements

| Endpoint | Authentication | Description |
|----------|----------------|-------------|
| `POST /request-password-reset` | ❌ Public | Request password reset email |
| `POST /reset-password` | ❌ Public | Reset password with token |
| `POST /refresh-token` | ❌ Public | Refresh access token |

---

## Frontend Authentication Guide

### Installation

```bash
npm install @supabase/supabase-js
```

### Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### User Registration

```typescript
import { supabase } from '@/lib/supabase';

async function handleRegister(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name, // User metadata
      },
    },
  });

  if (error) {
    console.error('Registration error:', error.message);
    return;
  }

  // Store token for backend API calls
  if (data.session) {
    localStorage.setItem('access_token', data.session.access_token);
  }
}
```

### User Login

```typescript
import { supabase } from '@/lib/supabase';

async function handleLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error.message);
    return;
  }

  // Store token for backend API calls
  if (data.session) {
    localStorage.setItem('access_token', data.session.access_token);
  }
}
```

### User Logout

```typescript
import { supabase } from '@/lib/supabase';

async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout error:', error.message);
    return;
  }

  // Clear tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
```

### Making Authenticated API Calls

```typescript
import { supabase } from '@/lib/supabase';

async function callBackendAPI(endpoint: string, method: string = 'GET', body?: any) {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}
```

---

## Backend Endpoints

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | User's full name (min 1 char) |
| `email` | string | ✅ | Valid email address |
| `password` | string | ✅ | Password (min 8 characters) |
| `phone_number` | string | ❌ | Phone number (optional) |

> **Note:** The `role` field is not accepted in registration requests for security. All public registrations receive the `user` role via RBAC.

#### Success Response

**Status Code:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "role": "scientist",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> **Frontend Note:** Store the returned `token` for authenticated API calls. The user is automatically logged in after registration.

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid request body (e.g., short password) |
| `409` | Conflict | Email already registered |

---

### 2. Login

Authenticates a user and returns a JWT token.

**Endpoint:** `POST /api/auth/login`

**Authentication:** Not required (Public endpoint)

#### Request Headers

### 1. Request Password Reset

Request a password reset email from Supabase Auth.

**Endpoint:** `POST /api/auth/request-password-reset`

**Authentication:** Not required (Public endpoint)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "email": "john.doe@example.com"
}
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset email sent",
  "data": null
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid email format |
| `500` | Server Error | Failed to send reset email |

---

### 2. Reset Password

Reset password using the token from the reset email.

**Endpoint:** `POST /api/auth/reset-password`

**Authentication:** Not required (token from email validates the request)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "access_token": "token_from_email",
  "new_password": "NewSecurePass123!"
}
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": null
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid token or weak password |
| `401` | Unauthorized | Invalid or expired token |
| `500` | Server Error | Failed to update password |

---

### 3. Refresh Token

Exchanges a valid refresh token for a new access token.

**Endpoint:** `POST /api/auth/refresh-token`

**Authentication:** Not required (refresh token is validated instead)

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

#### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Refresh token not provided |
| `401` | Unauthorized | Invalid or expired refresh token |

---

## How Backend Syncs Users

When a user signs up via the frontend, their first authenticated API request triggers the auth middleware, which:

1. Verifies the Supabase JWT token
2. Checks if user exists in `public.users` table
3. If not, creates a new record with auth_id
4. Assigns default 'user' role via RBAC
5. Allows the request to proceed

This approach eliminates the need for webhooks while ensuring all authenticated users are synced.

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SUPABASE AUTH FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

1. REGISTRATION / LOGIN (Frontend)
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  Frontend   │ ──────▶ │  Supabase   │ ──────▶ │   Frontend  │
   │  signUp()   │         │   Auth      │  JWT    │   Receives  │
   │  signIn()   │         │   Service   │  Token  │   Token     │
   └─────────────┘         └─────────────┘         └──────┬──────┘
                                                           │
2. STORE TOKEN                                             ▼
                                                   ┌─────────────┐
   Store in localStorage                           │  Frontend   │
                                                   │   Stores    │
                                                   │   Token     │
                                                   └──────┬──────┘
                                                          │
3. FIRST API REQUEST                                      ▼
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ───────▶│   Backend   │        │   Backend   │
   │  API Call   │ Bearer  │   Verifies  │ ─────▶ │   Syncs     │
   │  + Token    │ Token   │   Token     │        │   User      │
   └─────────────┘         └──────┬──────┘        └──────┬──────┘
                                  │                      │
                                  ▼                      ▼
                          ┌─────────────┐        ┌─────────────┐
                          │  Supabase   │        │  public.    │
                          │   Verifies  │        │  users      │
                          │   JWT       │        │  Table      │
                          └─────────────┘        └─────────────┘

4. SUBSEQUENT REQUESTS
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ───────▶│   Backend   │        │   API       │
   │  API Call   │ Bearer  │   Verifies  │ ─────▶ │   Response  │
   │  + Token    │ Token   │   Token     │        │             │
   └─────────────┘         └─────────────┘        └─────────────┘

5. LOGOUT (Frontend)
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ───────▶│  Supabase   │        │   Token     │
   │  signOut()  │         │   Auth      │ ─────▶ │   Removed   │
   │             │         │   Service   │        │   Locally   │
   └─────────────┘         └─────────────┘        └─────────────┘
```

---

## File Structure

```
auth/
├── index.ts                 # Main route exports
├── README.md                # This documentation
├── apis/
│   ├── refresh-token.ts     # Token refresh endpoint
│   ├── request-password-reset.ts  # Request password reset
│   └── reset-password.ts    # Reset password with token
├── services/
│   └── supabase-auth.service.ts  # Supabase Auth utilities
├── shared/
│   ├── schema.ts            # Zod validation schemas
│   ├── interface.ts         # TypeScript interfaces
│   └── queries.ts           # Database queries
└── tests/
    ├── integration/
    └── unit/
```

---

## Environment Variables

Required environment variables for Supabase Auth:

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Frontend URL (for password reset redirects)
FRONTEND_URL=http://localhost:3001
```

---

## Security Best Practices

1. **Never expose service_role key** - Keep it server-side only
2. **Use HTTPS in production** - Protects tokens in transit
3. **Implement token refresh** - Reduces risk of token theft
4. **Enable RLS policies** - Row Level Security in Supabase
5. **Validate all inputs** - Use Zod schemas for validation
6. **Rate limit endpoints** - Prevent brute force attacks

---

## Troubleshooting

### Token Verification Fails

**Issue:** Backend returns 401 Unauthorized

**Solutions:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` match frontend
- Ensure token is sent as `Bearer <token>` in Authorization header
- Check token hasn't expired (default: 1 hour)

### User Not Synced

**Issue:** User exists in Supabase Auth but not in public.users

**Solutions:**
- Make any authenticated API request to trigger sync
- Check auth middleware is properly configured
- Verify database migrations have run

### CORS Errors

**Issue:** Frontend can't reach backend API

**Solutions:**
- Add frontend origin to CORS allowlist
- Check CORS middleware configuration
- Ensure OPTIONS requests are handled

---

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [RBAC Feature](../rbac/README.md)
- [User Feature](../user/README.md)
