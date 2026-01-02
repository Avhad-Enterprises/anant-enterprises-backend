# Visual API Testing Guide

## 🎯 Purpose

This script shows you EXACTLY what we send to each API and what we get back.

## 🚀 How to Run

### Step 1: Get Auth Token

**Option A - Use Thunder Client:**
1. POST to `http://localhost:3000/api/auth/login`
2. Body: `{"email":"test@example.com","password":"password123"}`
3. Copy the token from response

**Option B - Use curl:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Step 2: Run Visual Tests

**PowerShell:**
```powershell
$env:TEST_AUTH_TOKEN="paste_your_token_here"
npx tsx scripts/visual-test.ts
```

**Command Prompt:**
```cmd
set TEST_AUTH_TOKEN=paste_your_token_here
npx tsx scripts/visual-test.ts
```

## 📋 What You'll See

For each API endpoint, you'll see:

### Input Section
```
📥 INPUT (What we send):
────────────────────────────────────────
{
  "type": "Home",
  "name": "John Doe",
  "phone": "+91 9876543210",
  ...
}
```

### Output Section
```
📤 OUTPUT (What we receive):
────────────────────────────────────────
✅ Status Code: 201
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "id": 1,
    "type": "Home",
    ...
  }
}
```

## 🧪 Tests Included

### Orders API (2 tests)
1. Get all orders
2. Get paginated orders

### Addresses API (5 tests)
1. Get all addresses
2. Create new address
3. Update address
4. Set address as default
5. Delete address

### Wishlist API (5 tests)
1. Get empty wishlist
2. Add product to wishlist
3. Get wishlist with product
4. Move product to cart
5. Remove from wishlist

**Total: 12 comprehensive tests**

## ✨ Features

- ✅ Shows exact request body for each API call
- ✅ Shows complete response with status codes
- ✅ Color-coded success/failure indicators
- ✅ Automatic cleanup (deletes test data)
- ✅ Detailed summary at the end

## 💡 Tips

- The script uses the test user created by `seed-test-data.ts`
- Each test is numbered and clearly labeled
- Failed tests show error messages
- All test data is cleaned up automatically
