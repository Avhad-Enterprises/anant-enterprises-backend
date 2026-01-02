# 🧪 API Testing - Complete Guide

## ✅ What We Built Today

Successfully implemented **10 user API endpoints** across 3 categories:

### 📋 Orders API (2 endpoints)
- `GET /api/users/:userId/orders` - List orders
- `GET /api/users/:userId/orders?page=1&limit=5` - Paginated orders

### 🏠 Addresses API (5 endpoints)
- `GET /api/users/:userId/addresses` - List addresses
- `POST /api/users/:userId/addresses` - Create address
- `PUT /api/users/:userId/addresses/:id` - Update address
- `PATCH /api/users/:userId/addresses/:id/default` - Set default
- `DELETE /api/users/:userId/addresses/:id` - Delete address

### ❤️ Wishlist API (4 endpoints)
- `GET /api/users/:userId/wishlist` - View wishlist
- `POST /api/users/:userId/wishlist/:productId` - Add to wishlist
- `DELETE /api/users/:userId/wishlist/:productId` - Remove from wishlist
- `POST /api/users/:userId/wishlist/:productId/move-to-cart` - Move to cart

---

## 🚀 Quick Start - Run Tests Now!

### Option 1: Automated Testing (Recommended)

**Step 1: Make sure test data exists**
```bash
npx tsx scripts/seed-test-data.ts
```

**Step 2: Get an auth token**

You have several options:

**A) Use your existing user credentials:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

**B) Use the test user (if created by seed script):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Step 3: Set the token and run tests:**

**PowerShell:**
```powershell
$env:TEST_AUTH_TOKEN="your_token_here"
npx tsx scripts/auto-test-apis.ts
```

**Command Prompt:**
```cmd
set TEST_AUTH_TOKEN=your_token_here
npx tsx scripts/auto-test-apis.ts
```

**One-liner:**
```bash
TEST_AUTH_TOKEN=your_token npx tsx scripts/auto-test-apis.ts
```

### Option 2: Manual Testing with Postman

1. **Import Collection**: Create requests for each endpoint
2. **Set Variables**:
   - `BASE_URL`: `http://localhost:3000`
   - `AUTH_TOKEN`: Your token from login
   - `USER_ID`: Get from database or seed script output
   - `PRODUCT_ID`: Get from database or seed script output

3. **Test Each Endpoint** using the examples below

---

## 📝 Manual Testing Examples

### Get Orders
```bash
curl -X GET "http://localhost:3000/api/users/{USER_ID}/orders" \
  -H "Authorization: Bearer  {TOKEN}"
```

### Create Address
```bash
curl -X POST "http://localhost:3000/api/users/{USER_ID}/addresses" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Home",
    "name": "John Doe",
    "phone": "+91 9876543210",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apartment 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "isDefault": true
  }'
```

### Add to Wishlist
```bash
curl -X POST "http://localhost:3000/api/users/{USER_ID}/wishlist/{PRODUCT_ID}" \
  -H "Authorization: Bearer {TOKEN}"
```

### Get Wishlist
```bash
curl -X GET "http://localhost:3000/api/users/{USER_ID}/wishlist" \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 🛠️ Test Scripts Available

### 1. `auto-test-apis.ts` (Recommended)
**Fully automated testing**
- Gets test data from database automatically
- Runs all 15+ test cases
- Provides detailed summary

```bash
TEST_AUTH_TOKEN=your_token npx tsx scripts/auto-test-apis.ts
```

### 2. `test-all-user-apis.ts`
**Comprehensive manual testing**
- 22 detailed test cases
- Includes edge cases and validation testing
- Requires manual config update

### 3. `test-wishlist-api.ts`
**Wishlist-specific testing**
- 5 focused wishlist tests
- Simple and quick

### 4. `seed-test-data.ts`
**Create test data**
- Creates test user and product
- Safe to run multiple times (checks for existing data)

---

## 📊 Expected Test Results

When you run the automated tests successfully, you should see:

```
🚀 Automated API Test Runner

📋 Step 1: Getting test data from database...
✅ Found test data:
   User: test@example.com (uuid-here)
   Product: Test Product... (uuid-here)

🔐 Step 2: Getting authentication token...
✅ Authentication ready

============================================================
🧪 RUNNING COMPREHENSIVE API TESTS
============================================================

📋 ORDERS API
✅ GET    /api/users/.../orders                              [200]
✅ GET    /api/users/.../orders?page=1&limit=5              [200]

🏠 ADDRESSES API
✅ GET    /api/users/.../addresses                           [200]
✅ POST   /api/users/.../addresses                           [201]
✅ PUT    /api/users/.../addresses/1                         [200]
...

❤️  WISHLIST API
✅ GET    /api/users/.../wishlist                            [200]
✅ POST   /api/users/.../wishlist/...                        [201]
...

============================================================
📊 TEST SUMMARY
============================================================

Orders:
  Total: 2 | ✅ Passed: 2 | ❌ Failed: 0

Addresses:
  Total: 7 | ✅ Passed: 7 | ❌ Failed: 0

Wishlist:
  Total: 6 | ✅ Passed: 6 | ❌ Failed: 0

============================================================
📈 OVERALL RESULTS
============================================================
Total Tests: 15
✅ Passed: 15
❌ Failed: 0
📊 Success Rate: 100.0%
============================================================

🎉 ALL TESTS PASSED!
```

---

## 🐛 Troubleshooting

### "No test data found"
```bash
npx tsx scripts/seed-test-data.ts
```

### "Authentication failed"
- Check if token is expired
- Try logging in again
- Verify Bearer token format

### "Connection refused"
- Ensure `npm run dev` is running
- Check server is on port 3000

### "Endpoint not found (404)"
- Server might need restart
- Check routes are registered in `src/features/user/index.ts`

---

## ✨ Key Features Implemented

1. **Optimized Queries**: Wishlist uses subqueries to avoid N+1 problems
2. **Option B Move-to-Cart**: Items stay in wishlist with timestamp
3. **Proper Validation**: Zod schemas for all inputs
4. **Error Handling**: Meaningful error messages (404, 409, 400, etc.)
5. **Authorization**: Users can only access their own data

---

## 📚 Next Steps

1. ✅ **Run the tests** using the automated script above
2. 📝 Review the test results  
3. 🐛 Fix any failures (check server logs)
4. 🔄 Integrate with frontend
5. 📖 Document any custom workflows

**Questions?** Check `TESTING_GUIDE.md` for more details!
