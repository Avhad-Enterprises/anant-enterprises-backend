# Inventory & Order Management API Reference

**Version**: 1.0.0  
**Base URL**: `/api`  
**Last Updated**: January 2026

This document provides a comprehensive API reference for integrating inventory management, cart operations, and order fulfillment in your frontend application.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Inventory APIs](#inventory-apis)
3. [Multi-Location Inventory](#multi-location-inventory)
4. [Cart Integration](#cart-integration)
5. [Order Integration](#order-integration)
6. [Frontend Integration Examples](#frontend-integration-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Authentication

Most endpoints require authentication via JWT token in the Authorization header.

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Admin Endpoints**: Require additional admin role verification.

---

## Inventory APIs

### 1. Get All Inventory

**Endpoint**: `GET /api/inventory`  
**Auth**: Required  
**Use Case**: Admin dashboard, stock overview

**Query Parameters**:
```typescript
{
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  search?: string;      // Search by product name or SKU
  condition?: 'sellable' | 'damaged' | 'quarantined' | 'expired';
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  location?: string;    // Filter by location (deprecated - use location_id)
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    inventory: [
      {
        id: string;
        product_id: string;
        location_id: string;  // Phase 3: Now FK to inventory_locations
        product_name: string;
        sku: string;
        available_quantity: number;
        reserved_quantity: number;  // Phase 1 & 2: Cart + Order reservations
        incoming_quantity: number;
        condition: 'sellable' | 'damaged' | 'quarantined' | 'expired';
        status: 'in_stock' | 'low_stock' | 'out_of_stock';
        created_at: string;
        updated_at: string;
      }
    ],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
}
```

**Frontend Example**:
```typescript
// React Query example
const useInventory = (filters) => {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/inventory?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.json();
    }
  });
};
```

---

### 2. Get Inventory by ID

**Endpoint**: `GET /api/inventory/:id`  
**Auth**: Required  
**Use Case**: Detailed stock view, admin edit form

**Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    product_id: string;
    location_id: string;
    product_name: string;
    sku: string;
    available_quantity: number;
    reserved_quantity: number;
    incoming_quantity: number;
    incoming_po_reference?: string;
    incoming_eta?: string;
    condition: string;
    status: string;
    created_at: string;
    updated_at: string;
  }
}
```

---

### 3. Update Inventory (Admin Only)

**Endpoint**: `PUT /api/inventory/:id`  
**Auth**: Required (Admin)  
**Use Case**: Update condition, status, or incoming stock

**Request Body**:
```typescript
{
  condition?: 'sellable' | 'damaged' | 'quarantined' | 'expired';
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  incoming_quantity?: number;
  incoming_po_reference?: string;
  incoming_eta?: string;  // ISO date string
}
```

**Note**: `available_quantity` and `reserved_quantity` CANNOT be updated directly. Use adjust endpoint instead.

**Response**:
```typescript
{
  success: true,
  data: { /* updated inventory record */ },
  message: "Inventory updated successfully"
}
```

---

### 4. Adjust Inventory Quantity (Admin Only)

**Endpoint**: `POST /api/inventory/:id/adjust`  
**Auth**: Required (Admin)  
**Use Case**: Manual stock adjustments, corrections, damaged goods

**Request Body**:
```typescript
{
  quantity_change: number;  // Can be negative
  reason: string;          // Required: explain the adjustment
  reference_type?: 'purchase_order' | 'sales_return' | 'damage' | 'theft' | 'count_correction' | 'other';
  reference_id?: string;   // Optional: related document ID
}
```

**Example Requests**:
```typescript
// Add stock from purchase
{
  quantity_change: 100,
  reason: "Received shipment from supplier",
  reference_type: "purchase_order",
  reference_id: "PO-2026-001"
}

// Remove damaged stock
{
  quantity_change: -5,
  reason: "Damaged during warehouse move",
  reference_type: "damage"
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    adjustment_id: string;
    inventory_id: string;
    before_quantity: number;
    after_quantity: number;
    quantity_change: number;
  },
  message: "Inventory adjusted successfully"
}
```

---

### 5. Get Inventory History

**Endpoint**: `GET /api/inventory/:id/history`  
**Auth**: Required  
**Use Case**: Audit trail, stock movement tracking

**Query Parameters**:
```typescript
{
  page?: number;
  limit?: number;
  adjustment_type?: 'manual' | 'order_fulfillment' | 'order_cancellation' | 'transfer_in' | 'transfer_out';
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    history: [
      {
        id: string;
        adjustment_type: string;
        quantity_change: number;
        before_quantity: number;
        after_quantity: number;
        reason: string;
        reference_type?: string;
        reference_id?: string;
        created_at: string;
        created_by: string;
      }
    ],
    pagination: { /* ... */ }
  }
}
```

---

## Multi-Location Inventory

**Phase 3**: Inventory now tracked per physical location (warehouse, store, factory).

### 6. Get Product Stock Across All Locations

**Endpoint**: `GET /api/inventory/products/:productId/locations`  
**Auth**: Required  
**Use Case**: Show stock availability across warehouses to customers/admins

**Response**:
```typescript
{
  success: true,
  data: {
    product_id: string;
    total_available: number;      // Sum across all locations
    total_reserved: number;       // Total reserved (cart + orders)
    location_count: number;
    locations: [
      {
        location_id: string;
        location_name: string;
        location_code: string;      // e.g., "WH-MUM-01"
        available_quantity: number;
        reserved_quantity: number;
        status: 'in_stock' | 'low_stock' | 'out_of_stock';
        is_active: boolean;
      }
    ]
  }
}
```

**Frontend Example**:
```tsx
// Show stock availability widget
function StockAvailability({ productId }) {
  const { data } = useQuery(['product-locations', productId], 
    () => fetch(`/api/inventory/products/${productId}/locations`).then(r => r.json())
  );

  return (
    <div>
      <p>Total Available: {data.total_available} units</p>
      <details>
        <summary>View by Location</summary>
        {data.locations.map(loc => (
          <div key={loc.location_id}>
            {loc.location_name}: {loc.available_quantity} units
          </div>
        ))}
      </details>
    </div>
  );
}
```

---

### 7. Create Inventory Transfer (Admin Only)

**Endpoint**: `POST /api/inventory/transfers`  
**Auth**: Required (Admin)  
**Use Case**: Move stock between warehouses

**Request Body**:
```typescript
{
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  reason?: 'rebalancing' | 'customer_order' | 'return' | 'manual' | 'damaged';
  notes?: string;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    transfer_id: string;
  },
  message: "Transfer created successfully"
}
```

---

### 8. Execute Transfer (Admin Only)

**Endpoint**: `PUT /api/inventory/transfers/:id/execute`  
**Auth**: Required (Admin)  
**Use Case**: Actually move stock (atomic operation)

**Response**:
```typescript
{
  success: true,
  data: null,
  message: "Transfer executed successfully"
}
```

**Note**: This operation:
- Decreases stock at source location
- Increases stock at destination location
- Creates audit records for both
- Updates transfer status to 'completed'

---

### 9. List Transfers (Admin Only)

**Endpoint**: `GET /api/inventory/transfers`  
**Auth**: Required (Admin)  
**Use Case**: Transfer history, pending transfers dashboard

**Query Parameters**:
```typescript
{
  status?: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  from_location_id?: string;
  to_location_id?: string;
  product_id?: string;
  limit?: number;
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    transfers: [
      {
        id: string;
        transfer_number: string;  // e.g., "TR-1705426789-ABC123"
        status: string;
        from_location_id: string;
        to_location_id: string;
        product_id: string;
        quantity: number;
        reason: string;
        notes?: string;
        created_at: string;
        completed_at?: string;
      }
    ],
    count: number;
  }
}
```

---

## Cart Integration

**Phase 2**: Cart items now automatically reserve stock with 30-minute timeout.

### 10. Add to Cart (With Auto-Reservation)

**Endpoint**: `POST /api/cart/items`  
**Auth**: Optional (requires session-id header for guests)  
**Use Case**: Add product to cart

**Headers**:
```typescript
{
  'Authorization': `Bearer ${token}`,  // For logged-in users
  'x-session-id': string                // For guest users
}
```

**Request Body**:
```typescript
{
  product_id: string;
  quantity: number;
  customization_data?: Array<{
    option_id: string;
    option_name: string;
    selected_value: string;
    price_adjustment: string;
  }>;
}
```

**What Happens Behind the Scenes**:
1. ✅ Validates stock availability
2. ✅ Creates cart item
3. ✅ **Reserves stock** for 30 minutes (Phase 2)
4. ✅ Sets `reservation_expires_at` timestamp

**Response**:
```typescript
{
  success: true,
  data: {
    cart: {
      id: string;
      cart_status: 'active';
      total_items: number;
      subtotal: string;
      total: string;
    },
    items: [ /* cart items */ ],
    itemCount: number;
  },
  message: "Item added to cart successfully"
}
```

**Frontend Integration**:
```typescript
async function addToCart(productId: string, quantity: number) {
  const sessionId = localStorage.getItem('sessionId');
  
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      // Add 'Authorization' if user is logged in
    },
    body: JSON.stringify({ product_id: productId, quantity })
  });

  const data = await response.json();
  
  if (!data.success) {
    // Handle error - likely "Insufficient stock"
    throw new Error(data.message);
  }

  return data;
}
```

---

### 11. Update Cart Item Quantity

**Endpoint**: `PUT /api/cart/items/:id`  
**Auth**: Optional (requires session-id)  
**Use Case**: Change quantity in cart

**Request Body**:
```typescript
{
  quantity: number;  // New quantity (1-100)
}
```

**What Happens Behind the Scenes** (Phase 2):
1. ✅ Releases old reservation
2. ✅ Validates stock for new quantity
3. ✅ Creates new reservation with updated quantity

**Response**:
```typescript
{
  success: true,
  data: { /* updated cart item */ },
  message: "Cart item updated successfully"
}
```

---

### 12. Remove from Cart

**Endpoint**: `DELETE /api/cart/items/:id`  
**Auth**: Optional (requires session-id)  
**Use Case**: Remove item from cart

**What Happens Behind the Scenes** (Phase 2):
1. ✅ **Releases stock reservation** immediately
2. ✅ Soft-deletes cart item

**Response**:
```typescript
{
  success: true,
  data: null,
  message: "Item removed from cart"
}
```

---

### 13. Get Cart

**Endpoint**: `GET /api/cart`  
**Auth**: Optional (requires session-id)  
**Use Case**: Display cart page, checkout summary

**Response**:
```typescript
{
  success: true,
  data: {
    cart: {
      id: string;
      cart_status: 'active' | 'converted' | 'abandoned';
      subtotal: string;
      discount_amount: string;
      total: string;
      applied_discount?: {
        code: string;
        discount_amount: string;
      };
    },
    items: [
      {
        id: string;
        product_id: string;
        product_name: string;
        product_image_url: string;
        product_sku: string;
        quantity: number;
        cost_price: string;
        final_price: string;
        discount_amount: string;
        line_total: string;
        // Phase 2 fields:
        reservation_id?: string;
        reservation_expires_at?: string;  // ISO timestamp
      }
    ],
    itemCount: number;
  }
}
```

**Frontend Integration**:
```tsx
function CartPage() {
  const { data, isLoading } = useQuery(['cart'], fetchCart);
  
  // Show reservation timer
  const expiresAt = data?.items[0]?.reservation_expires_at;
  
  return (
    <div>
      {expiresAt && <ReservationTimer expiresAt={expiresAt} />}
      {/* Cart items */}
    </div>
  );
}

function ReservationTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  if (timeLeft <= 0) return <p>Reservation expired!</p>;
  
  return <p>Reserved for: {formatTime(timeLeft)}</p>;
}
```

---

## Order Integration

**Phase 1**: Orders automatically reserve and fulfill inventory.

### 14. Create Order

**Endpoint**: `POST /api/orders`  
**Auth**: Required  
**Use Case**: Checkout process

**Request Body**:
```typescript
{
  shipping_address_id: string;
  payment_method: 'razorpay' | 'cod';
  discount_code?: string;
  razorpay_payment_id?: string;  // For prepaid orders
  razorpay_order_id?: string;
  razorpay_signature?: string;
}
```

**What Happens Behind the Scenes**:
1. ✅ Gets active cart
2. ✅ **Extends cart reservation** to 60 minutes (Phase 2 - prevents timeout during checkout)
3. ✅ **Validates stock availability** (Phase 1)
4. ✅ Creates order and order items
5. ✅ **Reserves stock for order** (Phase 1 - separate from cart reservation)
6. ✅ Converts cart status to 'converted'
7. ✅ Processes payment
8. ✅ All operations in database transaction (atomic)

**Response**:
```typescript
{
  success: true,
  data: {
    order_id: string;
    order_number: string;
    total_amount: string;
    payment_status: 'pending' | 'paid' | 'failed';
    order_status: 'pending';
  },
  message: "Order created successfully"
}
```

**Error Handling**:
```typescript
// Insufficient stock error
{
  success: false,
  message: "Insufficient stock: Product 'Widget' only has 5 units available",
  statusCode: 400
}
```

**Frontend Integration**:
```typescript
async function createOrder(orderData) {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();

    if (!data.success) {
      // Handle specific errors
      if (data.message.includes('Insufficient stock')) {
        // Show stock error, redirect to cart
        alert(data.message);
        router.push('/cart');
      }
      throw new Error(data.message);
    }

    // Success - redirect to order confirmation
    router.push(`/orders/${data.data.order_id}`);
  } catch (error) {
    console.error('Order creation failed:', error);
  }
}
```

---

### 15. Get Order Details

**Endpoint**: `GET /api/orders/:id`  
**Auth**: Required  
**Use Case**: Order confirmation page, order history

**Response**:
```typescript
{
  success: true,
  data: {
    id: string;
    order_number: string;
    user_id: string;
    order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    subtotal: string;
    discount_amount: string;
    shipping_charges: string;
    total_amount: string;
    shipping_address: {
      name: string;
      phone: string;
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
    },
    items: [
      {
        id: string;
        product_id: string;
        product_name: string;
        product_image: string;
        quantity: number;
        unit_price: string;
        line_total: string;
      }
    ],
    created_at: string;
    updated_at: string;
  }
}
```

---

### 16. Cancel Order

**Endpoint**: `DELETE /api/orders/:id`  
**Auth**: Required  
**Use Case**: Customer cancels order before shipment

**What Happens Behind the Scenes** (Phase 1):
1. ✅ Validates order can be cancelled (not shipped/delivered)
2. ✅ **Releases stock reservation** back to available
3. ✅ Updates order status to 'cancelled'
4. ✅ Initiates refund if payment was made

**Response**:
```typescript
{
  success: true,
  data: null,
  message: "Order cancelled successfully"
}
```

---

## Frontend Integration Examples

### Complete Add to Cart Flow

```typescript
// 1. Check stock before adding to cart
async function checkStock(productId: string, quantity: number) {
  // Get stock across locations
  const response = await fetch(`/api/inventory/products/${productId}/locations`);
  const data = await response.json();
  
  if (data.data.total_available < quantity) {
    return {
      available: false,
      message: `Only ${data.data.total_available} units available`
    };
  }
  
  return { available: true };
}

// 2. Add to cart (auto-reserves for 30 min)
async function addToCart(productId: string, quantity: number) {
  const stockCheck = await checkStock(productId, quantity);
  
  if (!stockCheck.available) {
    throw new Error(stockCheck.message);
  }
  
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': getSessionId(),
    },
    body: JSON.stringify({ product_id: productId, quantity })
  });
  
  return response.json();
}

// 3. Monitor reservation expiration
function useCartReservation() {
  const { data: cart } = useQuery(['cart'], fetchCart, {
    refetchInterval: 60000 // Check every minute
  });
  
  const hasExpiredReservations = cart?.items.some(item => {
    if (!item.reservation_expires_at) return false;
    return new Date(item.reservation_expires_at) < new Date();
  });
  
  if (hasExpiredReservations) {
    // Refresh cart to remove expired items
    queryClient.invalidateQueries(['cart']);
  }
  
  return { hasExpiredReservations };
}
```

---

### Complete Checkout Flow

```typescript
async function checkoutFlow() {
  // Step 1: Get cart
  const cart = await fetch('/api/cart').then(r => r.json());
  
  // Step 2: Validate stock one more time (in case reservations expired)
  for (const item of cart.data.items) {
    const stockCheck = await fetch(
      `/api/inventory/products/${item.product_id}/locations`
    ).then(r => r.json());
    
    if (stockCheck.data.total_available < item.quantity) {
      // Remove item or reduce quantity
      alert(`${item.product_name} stock reduced. Please update cart.`);
      return;
    }
  }
  
  // Step 3: Create order (extends reservation to 60 min)
  const order = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      shipping_address_id: selectedAddressId,
      payment_method: 'razorpay',
      discount_code: appliedCoupon
    })
  }).then(r => r.json());
  
  if (!order.success) {
    // Handle stock error
    if (order.message.includes('Insufficient stock')) {
      router.push('/cart');
    }
    return;
  }
  
  // Step 4: Process payment
  if (order.data.payment_status === 'pending') {
    await processRazorpayPayment(order.data);
  }
  
  // Step 5: Redirect to confirmation
  router.push(`/orders/${order.data.order_id}`);
}
```

---

### Admin Dashboard Example

```tsx
function InventoryDashboard() {
  const [filters, setFilters] = useState({
    status: 'low_stock',
    page: 1,
    limit: 20
  });
  
  const { data, isLoading } = useQuery(
    ['inventory', filters],
    () => fetch(`/api/inventory?${new URLSearchParams(filters)}`)
      .then(r => r.json())
  );
  
  return (
    <div>
      <h1>Low Stock Alert</h1>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Available</th>
            <th>Reserved</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.inventory.map(item => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>{item.sku}</td>
              <td>{item.available_quantity}</td>
              <td>{item.reserved_quantity}</td>
              <td>
                <span className={`status-${item.status}`}>
                  {item.status}
                </span>
              </td>
              <td>
                <button onClick={() => adjustStock(item.id)}>
                  Adjust
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Error Handling

### Common Error Responses

```typescript
// Insufficient stock (400)
{
  success: false,
  message: "Insufficient stock. Only 5 units available.",
  statusCode: 400
}

// Unauthorized (401)
{
  success: false,
  message: "Authentication required",
  statusCode: 401
}

// Not found (404)
{
  success: false,
  message: "Inventory record not found",
  statusCode: 404
}

// Validation error (400)
{
  success: false,
  message: "Validation failed",
  errors: [
    { field: 'quantity', message: 'Quantity must be positive' }
  ],
  statusCode: 400
}
```

### Error Handling Pattern

```typescript
async function apiCall(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!data.success) {
      // Business logic error (stock, validation, etc.)
      throw new ApiError(data.message, data.statusCode);
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle specific errors
      if (error.statusCode === 401) {
        // Redirect to login
        router.push('/login');
      } else if (error.message.includes('stock')) {
        // Show stock error modal
        showStockErrorModal(error.message);
      }
    }
    
    // Re-throw for caller to handle
    throw error;
  }
}
```

---

## Best Practices

### 1. Stock Validation

**Always validate stock before critical operations:**

```typescript
// ❌ Bad: Add to cart without checking
await addToCart(productId, 999);

// ✅ Good: Check stock first
const stock = await getProductStockByLocation(productId);
if (stock.total_available < quantity) {
  alert('Not enough stock');
  return;
}
await addToCart(productId, quantity);
```

### 2. Handle Reservation Expiration

**Show countdown timer for cart items:**

```tsx
function CartItemReservation({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.max(0, Math.floor(ms / 1000)));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  if (timeLeft === 0) {
    return <span className="expired">Reservation expired</span>;
  }
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <span className="timer">
      Reserved for: {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
```

### 3. Optimistic Updates

**For better UX, update UI immediately:**

```typescript
const addToCartMutation = useMutation({
  mutationFn: addToCart,
  onMutate: async ({ productId, quantity }) => {
    // Cancel queries
    await queryClient.cancelQueries(['cart']);
    
    // Snapshot previous value
    const previousCart = queryClient.getQueryData(['cart']);
    
    // Optimistically update
    queryClient.setQueryData(['cart'], old => ({
      ...old,
      itemCount: (old?.itemCount || 0) + 1
    }));
    
    return { previousCart };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['cart'], context.previousCart);
  },
  onSettled: () => {
    // Refetch to sync
    queryClient.invalidateQueries(['cart']);
  }
});
```

### 4. Loading States

**Show appropriate loading indicators:**

```tsx
function ProductPage({ productId }) {
  const { data: stock, isLoading } = useQuery(
    ['product-stock', productId],
    () => getProductStockByLocation(productId)
  );
  
  if (isLoading) {
    return <Skeleton />;
  }
  
  const inStock = stock.total_available > 0;
  
  return (
    <div>
      <StockBadge 
        available={stock.total_available}
        reserved={stock.total_reserved}
      />
      <AddToCartButton disabled={!inStock} />
    </div>
  );
}
```

### 5. Multi-Location Display

**Show warehouse availability for transparency:**

```tsx
function StockAvailabilityWidget({ productId }) {
  const { data } = useQuery(
    ['product-locations', productId],
    () => fetch(`/api/inventory/products/${productId}/locations`)
      .then(r => r.json())
  );
  
  return (
    <div className="stock-widget">
      <p className="total">
        {data.total_available > 0 ? 'In Stock' : 'Out of Stock'}
      </p>
      <details>
        <summary>View availability by location</summary>
        <ul>
          {data.locations.map(loc => (
            <li key={loc.location_id}>
              <strong>{loc.location_name}:</strong>
              {loc.available_quantity > 0 
                ? `${loc.available_quantity} available`
                : 'Out of stock'}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

---

## Quick Reference

### Inventory System Features

| Feature | Phase | Description |
|---------|-------|-------------|
| Stock Tracking | Base | Track available, reserved, incoming quantities |
| Order Reservations | Phase 1 | Automatic stock reservation on order creation |
| Cart Reservations | Phase 2 | 30-minute auto-reservation when adding to cart |
| Multi-Location | Phase 3 | Track stock per warehouse/store |
| Smart Allocation | Phase 3 | Auto-select best warehouse for fulfillment |
| Stock Transfers | Phase 3 | Move inventory between locations |

### Key Formulas

```typescript
// Actual available stock
const actualAvailable = available_quantity - reserved_quantity;

// Total stock across locations
const totalStock = locations.reduce((sum, loc) => 
  sum + loc.available_quantity, 0
);

// Can fulfill order?
const canFulfill = actualAvailable >= orderQuantity;
```

### Important Notes

1. **Never modify `available_quantity` or `reserved_quantity` directly** - always use the adjust endpoint
2. **Cart reservations expire after 30 minutes** - show countdown timer to users
3. **Order creation extends cart reservations to 60 minutes** - prevents timeout during checkout
4. **All order operations are transactional** - either everything succeeds or nothing changes
5. **Stock is reserved at order level (Phase 1) AND cart level (Phase 2)** - but cart reservations are released when order is created

---

## Support

For questions or issues:
- Backend API: Check `/api/health` endpoint
- Error logs: Check browser console for detailed error messages
- Stock issues: Use `/api/inventory/products/:id/locations` to debug availability

**Last Updated**: January 2026  
**Version**: 1.0.0
