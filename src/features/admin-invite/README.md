# Admin Invite Feature - API Documentation

## Overview

The Admin Invite feature allows administrators to invite users by sending them an email with an accept invitation link. Users create their own password during registration - **NO temporary passwords are sent via email** for security.

## Base URL

```
/api/admin/invitations
```

## Authentication Requirements

| Endpoint       | Authentication    | Authorization |
| -------------- | ----------------- | ------------- |
| `POST /`       | ✅ Required (JWT) | Admin only    |
| `GET /`        | ✅ Required (JWT) | Admin only    |
| `GET /details` | ❌ Public         | None          |
| `POST /accept` | ❌ Public         | None          |

---

## Endpoints

### 1. Create Invitation

Creates a new invitation and sends an email with an accept invitation link.

**Endpoint:** `POST /api/admin/invitations`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin role only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "assigned_role_id": 2
}
```

#### Request Schema

| Field              | Type   | Required | Description                                              |
| ------------------ | ------ | -------- | -------------------------------------------------------- |
| `first_name`       | string | ✅       | Invitee's first name (1-100 chars)                       |
| `last_name`        | string | ✅       | Invitee's last name (1-100 chars)                        |
| `email`            | string | ✅       | Valid email address                                      |
| `assigned_role_id` | number | ✅       | Role ID from RBAC system (1=superadmin, 2=admin, 3=user) |

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "status": "pending",
    "assigned_role_id": 2,
    "invited_by": 1,
    "expires_at": "2024-01-16T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

> **Note:** `invite_token` is NOT returned for security - it's only sent via email.

#### Error Responses

| Status | Error            | Description                                      |
| ------ | ---------------- | ------------------------------------------------ |
| `400`  | Validation Error | Invalid request body                             |
| `401`  | Unauthorized     | Missing or invalid JWT token                     |
| `403`  | Forbidden        | User is not an admin                             |
| `409`  | Conflict         | User with this email already exists              |
| `409`  | Conflict         | Pending invitation already exists for this email |

---

### 2. List Invitations

Retrieves a paginated list of all invitations with optional filtering.

**Endpoint:** `GET /api/admin/invitations`

**Authentication:** Required (Bearer Token)

**Authorization:** Admin role only

#### Request Headers

```http
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type   | Default | Description                                                   |
| --------- | ------ | ------- | ------------------------------------------------------------- |
| `status`  | string | -       | Filter by status: `pending`, `accepted`, `revoked`, `expired` |
| `page`    | number | `1`     | Page number (min: 1)                                          |
| `limit`   | number | `10`    | Items per page (min: 1, max: 100)                             |

#### Example Request

```
GET /api/admin/invitations?status=pending&page=1&limit=10
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invitations retrieved successfully",
  "data": {
    "invitations": [
      {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "status": "pending",
        "assigned_role_id": 2,
        "invited_by": 1,
        "expires_at": "2024-01-16T10:30:00.000Z",
        "accepted_at": null,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### 3. Get Invitation Details

Retrieves invitation details for pre-filling the registration form. **Public endpoint** - no authentication required.

**Endpoint:** `GET /api/admin/invitations/details`

**Authentication:** Not required (Public endpoint)

**Security:** Brute force protection (max 5 attempts per token)

#### Query Parameters

| Parameter | Type   | Required | Description                                       |
| --------- | ------ | -------- | ------------------------------------------------- |
| `token`   | string | ✅       | 64-character hex invitation token from email link |

#### Example Request

```
GET /api/admin/invitations/details?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invitation details retrieved. Please create your password to continue.",
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com"
  }
}
```

> **Security Note:** Only non-sensitive data is returned. Role, password, and token are NOT included.

#### Error Responses

| Status | Error             | Description                                                 |
| ------ | ----------------- | ----------------------------------------------------------- |
| `400`  | Validation Error  | Invalid token format (must be 64 hex chars)                 |
| `400`  | Bad Request       | Invitation already accepted/expired/revoked                 |
| `404`  | Not Found         | Invalid or expired invitation token                         |
| `429`  | Too Many Requests | Max verification attempts exceeded (brute force protection) |

---

### 4. Accept Invitation

Accepts an invitation and creates the user account with the password provided by the user. Returns auth tokens for immediate login.

**Endpoint:** `POST /api/admin/invitations/accept`

**Authentication:** Not required (Public endpoint)

#### Request Body

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "email": "john.doe@example.com",
  "password": "MySecurePassword123!"
}
```

#### Request Schema

| Field      | Type   | Required | Description                                                                     |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------- |
| `token`    | string | ✅       | 64-character hex invitation token from URL                                      |
| `email`    | string | ✅       | Email address (must match invitation)                                           |
| `password` | string | ✅       | User's chosen password (min 8 chars, must contain uppercase, lowercase, number) |

> **Important:** User creates their OWN password - no temp password needed!

#### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Account created successfully. Welcome!",
  "data": {
    "user": {
      "id": 5,
      "auth_id": "uuid-here",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone_number": null,
      "created_at": "2024-01-15T11:00:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 3600,
      "token_type": "Bearer"
    }
  }
}
```

> **Frontend Note:** Store the returned tokens for authenticated API calls. The user is immediately logged in.

#### Error Responses

| Status | Error            | Description                                           |
| ------ | ---------------- | ----------------------------------------------------- |
| `400`  | Validation Error | Invalid request body or password requirements not met |
| `400`  | Bad Request      | Invalid or expired invitation                         |
| `400`  | Bad Request      | Email does not match invitation                       |
| `400`  | Bad Request      | Invitation already accepted                           |
| `404`  | Not Found        | Invalid invitation token                              |

---

## Invitation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN INVITATION FLOW (NEW)                     │
└─────────────────────────────────────────────────────────────────────┘

1. ADMIN CREATES INVITATION
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Admin     │ ──POST──▶│   Backend   │ ──────▶│   Email     │
   │  Dashboard  │    /     │   Creates   │  Sends │   Service   │
   │             │          │  Invitation │  Email │             │
   └─────────────┘          └─────────────┘        └──────┬──────┘
                                                          │
                                                          ▼
2. INVITEE RECEIVES EMAIL WITH ACCEPT LINK         ┌─────────────┐
                                                  │   Invitee   │
   Email contains:                                │   Inbox     │
   - "Accept Invitation" button/link              └──────┬──────┘
   - Link: /accept-invitation?invite_token=xxx           │
   - NO PASSWORD (security!)                             │
                                                         │
3. INVITEE CLICKS LINK                                   ▼
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │◀──Link──│   Email     │◀───────│   Invitee   │
   │  Register   │         │   Link      │        │   Clicks    │
   │  Page       │         │             │        │   Button    │
   └──────┬──────┘         └─────────────┘        └─────────────┘
          │
          │ GET /details?token=xxx (pre-fill form)
          ▼
   ┌─────────────┐
   │  Backend    │
   │  Returns:   │
   │  - first_name
   │  - last_name
   │  - email
   └──────┬──────┘
          │
          ▼
4. USER CREATES PASSWORD
   ┌─────────────┐
   │  Frontend   │
   │  Form shows:│
   │  - First Name (pre-filled)
   │  - Last Name (pre-filled)
   │  - Email (pre-filled)
   │  - Password (user enters)
   │  - Confirm Password (user enters)
   └──────┬──────┘
          │
          │ POST /accept (token + email + password)
          ▼
5. BACKEND CREATES ACCOUNT
   ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
   │  Frontend   │ ──POST──▶│   Backend   │ ─────▶│   User      │
   │  Register   │    /     │   Creates   │ Auth  │   Logged    │
   │   Form      │  accept  │   User +    │ Tokens│   In!       │
   │             │          │   Returns   │       │             │
   └─────────────┘          │   Tokens    │       └─────────────┘
                            └─────────────┘
```

---

## Frontend Implementation Example

### React Example: Complete Accept Invitation Flow

```typescript
// AcceptInvitationPage.tsx
import { useState, useEffect } from 'react';

const AcceptInvitationPage = () => {
  const [token, setToken] = useState('');
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Extract token from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite_token');
    if (inviteToken) {
      setToken(inviteToken);
      fetchInvitationDetails(inviteToken);
    }
  }, []);

  // 2. Fetch invitation details to pre-fill form
  const fetchInvitationDetails = async (token: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/details?token=${token}`);
      if (!response.ok) throw new Error('Invalid invitation');

      const { data } = await response.json();
      setInvitationDetails(data);
    } catch (err) {
      setError('Invalid or expired invitation link');
    }
  };

  // 3. Accept invitation with user's chosen password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: invitationDetails.email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      const { data } = await response.json();

      // Store auth tokens
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!invitationDetails) {
    return <div>Loading invitation details...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Accept Invitation</h2>
      <p>Create your account password</p>

      {/* Pre-filled fields (read-only) */}
      <input
        type="text"
        value={invitationDetails.first_name}
        readOnly
        disabled
      />

      <input
        type="text"
        value={invitationDetails.last_name}
        readOnly
        disabled
      />

      <input
        type="email"
        value={invitationDetails.email}
        readOnly
        disabled
      />

      {/* User creates password */}
      <input
        type="password"
        placeholder="Create your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>

      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

---

## Data Types

### Invitation Status

| Status     | Description                             |
| ---------- | --------------------------------------- |
| `pending`  | Invitation sent, waiting for acceptance |
| `accepted` | User accepted and account created       |
| `revoked`  | Admin revoked the invitation            |
| `expired`  | Invitation expired (24 hours)           |

### RBAC Roles

| Role ID | Role Name    | Description           |
| ------- | ------------ | --------------------- |
| 1       | `superadmin` | Full system access    |
| 2       | `admin`      | Administrative access |
| 3       | `user`       | Standard user access  |

> **Note:** Role IDs come from the RBAC system. Use the appropriate ID when creating invitations.

---

## Security Features

1. **No Temp Passwords**: Users create their own passwords - nothing sensitive in email ✅
2. **Token Expiration**: Invitations expire after 24 hours
3. **Brute Force Protection**: Maximum 5 verification attempts per token
4. **Password Requirements**: Min 8 chars, must contain uppercase, lowercase, and number
5. **Email Verification**: Users created via invitation are automatically email-verified
6. **One-Time Use**: Tokens can only be used once

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional context if available"
  }
}
```

---

## Related Endpoints

- **Auth Feature**: `/api/auth/login` - For users to login after registration
- **Auth Feature**: `/api/auth/refresh` - To refresh access tokens
- **User Feature**: `/api/users/me` - Get current user profile
