# API Testing Guide

## ✅ What We've Created

All the following user APIs have been implemented and are ready to test:

### 📋 Orders API (1 endpoint)
- `GET /api/users/:userId/orders` - Get user orders with pagination

### 🏠 Addresses API (5 endpoints)
- `GET /api/users/:userId/addresses` - Get all addresses
- `POST /api/users/:userId/addresses` - Create new address
- `PUT /api/users/:userId/addresses/:id` - Update address
- `DELETE /api/users/:userId/addresses/:id` - Delete address
- `PATCH /api/users/:userId/addresses/:id/default` - Set as default

### ❤️ Wishlist API (4 endpoints)
- `GET /api/users/:userId/wishlist` - Get wishlist items
- `POST /api/users/:userId/wishlist/:productId` - Add to wishlist
- `DELETE /api/users/:userId/wishlist/:productId` - Remove from wishlist
- `POST /api/users/:userId/wishlist/:productId/move-to-cart` - Move to cart

---

## 🧪 Testing Scripts Created

### 1. **Seed Test Data** (RECOMMENDED FIRST STEP)
```bash
npx tsx scripts/seed-test-data.ts
```
Creates:
- Test user (email: `test@example.com`)
- Test product (SKU: `TEST-PRODUCT-001`)

### 2. **Manual Testing** 
Use Postman, Insomnia, or curl with the provided examples below.

---

## 📝 Manual Testing Guide

### Step 1: Get Auth Token

**Important**: You need a valid authentication token first.

**Option A - If you have existing user credentials:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

**Option B - Check your auth system:**
- Look in your database for existing users
- Check if there's a seed/admin user
- Or create a user through your registration endpoint

### Step 2: Get Test IDs

After running `seed-test-data.ts`, you'll see:
```
User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Product ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

### Step 3: Test The APIs

Replace `{TOKEN}`, `{USER_ID}`, and `{PRODUCT_ID}` with actual values:

#### Test Orders
```bash
curl -X GET "http://localhost:3000/api/users/{USER_ID}/orders" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Test Addresses - Create
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

#### Test Addresses - Get All
```bash
curl -X GET "http://localhost:3000/api/users/{USER_ID}/addresses" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Test Wishlist - Add Product
```bash
curl -X POST "http://localhost:3000/api/users/{USER_ID}/wishlist/{PRODUCT_ID}" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Test Wishlist - Get All
```bash
curl -X GET "http://localhost:3000/api/users/{USER_ID}/wishlist" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Test Wishlist - Move to Cart
```bash
curl -X POST "http://localhost:3000/api/users/{USER_ID}/wishlist/{PRODUCT_ID}/move-to-cart" \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 🔍 Using Postman/Insomnia

1. Import these environment variables:
   - `BASE_URL`: `http://localhost:3000`
   - `AUTH_TOKEN`: Your authentication token
   - `USER_ID`: Your user UUID
   - `PRODUCT_ID`: Your product UUID

2. Create requests for each endpoint
3. Set Authorization header: `Bearer {{AUTH_TOKEN}}`

---

## ✨ Implementation Highlights

### Optimization: Inventory Stock Calculation
- Uses **optimized subqueries** to fetch stock status
- Avoids N+1 query problems
- Single database round trip for wishlist items

### Option B: Move to Cart Behavior  
- Items **stay in wishlist** when moved to cart
- Tracks `added_to_cart_at` timestamp
- Allows users to see what they've already added

### Error Handling
- Proper validation with Zod
- Meaningful error messages
- 404/409/400 status codes as appropriate

### Authorization
- User can only access own data
- Admins with permissions can access any user's data
- Using `requireOwnerOrPermission` middleware

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check if your token is expired
- Verify token format: `Bearer {token}`
- Try logging in again

### "User not found" / "Product not found"
- Run: `npx tsx scripts/seed-test-data.ts`
- Check database for existing users/products
- Verify UUIDs are correct

### "Server not responding"
- Ensure `npm run dev` is running
- Check port 3000 is not in use
- Verify database connection

---

## 📚 Next Steps

1. Run `npm run dev` (if not already running)
2. Run `npx tsx scripts/seed-test-data.ts` to create test data
3. Use the manual curl commands above to test
4. Or use Postman/Insomnia for easier testing
5. Check the console logs for detailed error messages

For automated testing once you have valid credentials, update `scripts/test-all-user-apis.ts` with your auth token and run it.
