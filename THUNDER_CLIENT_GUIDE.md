# Thunder Client Guide - GET /api/users/:id

## 📋 Endpoint Details

**Method:** `GET`  
**URL:** `http://localhost:3000/api/users/:id`  
**Description:** Get user profile by ID  
**Authentication:** Required (Bearer Token)

---

## ⚙️ Thunder Client Setup

### Step 1: Create New Request

1. Open Thunder Client in VS Code
2. Click **"New Request"**
3. Name it: `Get User By ID`

### Step 2: Configure Request

**Method:** Select `GET` from dropdown

**URL:** 
```
http://localhost:3000/api/users/PASTE_USER_ID_HERE
```

Replace `PASTE_USER_ID_HERE` with an actual user UUID from your database.

---

## 🔑 Get a User ID

### Option 1: From Database
Run this command to see available users:
```bash
npx tsx scripts/get-user-ids.ts
```

This will show you:
```
1. User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Name:  John Doe
   Email: john@example.com

2. User ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
   Name:  Jane Smith
   Email: jane@example.com
```

### Option 2: From Drizzle Studio
You have Drizzle Studio running! 
1. Open: http://localhost:4983 (or the port shown)
2. Click on `users` table
3. Copy any `id` value

### Option 3: Use Test User
If you ran the seed script:
- The test user ID was displayed in the output
- Email: `test@example.com`

---

## 🔐 Headers Configuration

### Tab: "Headers"

Add these headers:

| Key | Value |
|-----|-------|
| `Authorization` | `Bearer YOUR_AUTH_TOKEN_HERE` |
| `Content-Type` | `application/json` |

**To get an auth token:**

1. Create a new request in Thunder Client
2. **Method:** `POST`
3. **URL:** `http://localhost:3000/api/auth/login`
4. **Body (JSON):**
   ```json
   {
     "email": "your_email@example.com",
     "password": "your_password"
   }
   ```
5. Click **Send**
6. Copy the `accessToken` or `token` from response
7. Paste it in the Authorization header (after "Bearer ")

---

## 📤 Complete Thunder Client Configuration

### Request Tab
```
Method: GET
URL: http://localhost:3000/api/users/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Headers Tab
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Body Tab
Leave empty (GET requests don't need a body)

---

## ✅ Expected Response

### Success (200  OK)
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "user_type": "individual",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "9876543210",
    "phone_country_code": "+91",
    "phone_verified": false,
    "email_verified": true,
    "profile_picture": null,
    "preferred_language": "en",
    "preferred_currency": "INR",
    "timezone": "Asia/Kolkata",
    "dob": null,
    "created_at": "2026-01-02T...",
    "updated_at": "2026-01-02T...",
    "last_login_at": "2026-01-02T...",
    "is_deleted": false
  }
}
```

**Note:** The `password` field is automatically removed (sanitized) for security.

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "message": "Unauthorized"
  }
}
```
**Fix:** Add valid Authorization header

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "User not found"
  }
}
```
**Fix:** Check the user ID exists in database

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "statusCode": 403,
    "message": "Forbidden"
  }
}
```
**Fix:** You can only view your own profile or need `users:read` permission

---

## 🧪 Testing Scenarios

### Test Case 1: Get Your Own Profile
```
URL: http://localhost:3000/api/users/{YOUR_USER_ID}
Headers: Authorization: Bearer {YOUR_TOKEN}
Expected: 200 OK with your profile data
```

### Test Case 2: Get Another User's Profile (Admin)
```
URL: http://localhost:3000/api/users/{ANOTHER_USER_ID}
Headers: Authorization: Bearer {ADMIN_TOKEN_WITH_users:read}
Expected: 200 OK with that user's profile
```

### Test Case 3: Invalid UUID
```
URL: http://localhost:3000/api/users/invalid-id
Expected: 400 Bad Request (UUID validation error)
```

### Test Case 4: Non-existent User
```
URL: http://localhost:3000/api/users/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
(Use a random valid UUID that doesn't exist)
Expected: 404 Not Found
```

---

## 🎯 Quick Start Checklist

- [ ] Get a user ID (run `npx tsx scripts/get-user-ids.ts`)
- [ ] Get an auth token (login via Thunder Client)
- [ ] Create new GET request in Thunder Client
- [ ] Set URL: `http://localhost:3000/api/users/{USER_ID}`
- [ ] Add Authorization header: `Bearer {TOKEN}`
- [ ] Click **Send**
- [ ] Verify 200 OK response with user data

---

## 💡 Tips

1. **Save Request**: Click the save icon to reuse this request
2. **Environment Variables**: Create Thunder Client env for:
   - `BASE_URL` = `http://localhost:3000`
   - `AUTH_TOKEN` = Your token
   - `USER_ID` = A user ID
   
   Then use: `{{BASE_URL}}/api/users/{{USER_ID}}`

3. **Collections**: Organize related requests in collections

4. **Variables:** Use `{{variable_name}}` syntax for dynamic values

---

## 🔍 Related Endpoints

Once you have this working, try these other user endpoints:

- `GET /api/users/:userId/orders` - Get user orders
- `GET /api/users/:userId/addresses` - Get user addresses
- `GET /api/users/:userId/wishlist` - Get user wishlist
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (soft delete)

All follow the same authentication pattern!
