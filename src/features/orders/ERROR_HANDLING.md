# Orders Feature - Error Handling Guidelines

## Overview

This document establishes error handling standards for the orders feature based on analysis of 25 API files.

---

## Current State Analysis

### Error Pattern Distribution

**HttpException Users** (7 files):
- `create-order.ts`
- `get-orders.ts`
- `get-order-by-id.ts`
- `get-admin-order-by-id.ts`
- `cancel-order.ts`
- `update-order.ts`
- `update-order-status.ts`

**ResponseFormatter.error() Users** (9 files):
- `duplicate-order.ts`
- `confirm-draft-order.ts`
- `update-tracking.ts`
- `update-fulfillment-status.ts`
- `update-payment-status.ts`
- `send-abandoned-cart-emails.ts`
- `delete-orders.ts`
- `create-order-tag.ts`
- `get-abandoned-cart-details.ts`

**Observation:** ~44% HttpException, ~56% ResponseFormatter.error()

---

## Recommended Standard: **HttpException** ✅

### Rationale

#### 1. **Consistency with Other Features**
```typescript
// Most features in the codebase use HttpException
// Example from user feature, product feature, etc.
throw new HttpException(404, 'Resource not found');
```

#### 2. **Middleware Integration**
- Global error middleware catches `HttpException`
- Automatic status code handling
- Centralized error logging
- Consistent error response format

#### 3. **Type Safety**
```typescript
// HttpException is typed
throw new HttpException(404, 'Order not found');

// ResponseFormatter.error() requires manual status setting
return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
```

#### 4. **Cleaner Code**
```typescript
// HttpException - throw and forget
if (!order) {
    throw new HttpException(404, 'Order not found');
}

// ResponseFormatter.error() - must return
if (!order) {
    return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
}
// Easy to forget 'return' keyword
```

---

## Standard Patterns

### Pattern 1: Not Found Errors (404)

**✅ RECOMMENDED:**
```typescript
const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId));

if (!order) {
    throw new HttpException(404, 'Order not found');
}
```

**❌ AVOID:**
```typescript
if (!order) {
    return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
}
```

---

### Pattern 2: Validation Errors (400)

**✅ RECOMMENDED:**
```typescript
if (body.items.length === 0) {
    throw new HttpException(400, 'Order must contain at least one item');
}

if (order.order_status === 'cancelled') {
    throw new HttpException(400, 'Cannot update cancelled order');
}
```

---

### Pattern 3: Authorization Errors (403)

**✅ RECOMMENDED:**
```typescript
if (order.user_id !== userId && !hasPermission('orders:write')) {
    throw new HttpException(403, 'Not authorized to modify this order');
}
```

---

### Pattern 4: Business Logic Errors (422)

**✅ RECOMMENDED:**
```typescript
if (stockValidation.failures.length > 0) {
    const errorMessages = stockValidation.failures.map(f => f.message).join('; ');
    throw new HttpException(422, `Insufficient stock: ${errorMessages}`);
}
```

---

### Pattern 5: Server Errors (500)

**✅ RECOMMENDED:**
```typescript
try {
    await db.transaction(async (tx) => {
        // ... operations
    });
} catch (error) {
    logger.error('Order creation failed', { 
        error: error instanceof Error ? error.message : String(error) 
    });
    throw new HttpException(500, 'Failed to create order');
}
```

---

## When to use ResponseFormatter.error()

### ✅ ACCEPTABLE Use Cases

#### 1. **Informational Errors (Not Exception-worthy)**
```typescript
// When validation passes but data doesn't meet criteria
const orders = await db.select().from(orders).where(/* ... */);

if (orders.length === 0) {
    // Not an error - just no results
    return ResponseFormatter.success(res, { orders: [], total: 0 });
    // OR if you want to signal it differently:
    return ResponseFormatter.error(res, 'NO_ORDERS', 'No orders found', 404);
}
```

#### 2. **Custom Error Codes for Frontend**
```typescript
// When frontend needs specific error codes
if (duplicateOrderNumber) {
    return ResponseFormatter.error(
        res, 
        'DUPLICATE_ORDER_NUMBER',  // Frontend can check this code
        'Order number already exists', 
        409
    );
}
```

#### 3. **Legacy Code Compatibility**
```typescript
// If refactoring would break existing API contracts
// Keep using ResponseFormatter.error() in that endpoint
```

---

## Status Code Guidelines

| Status | Use Case | Example |
|--------|----------|---------|
| **400** | Bad Request | Invalid input, missing required fields |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Authenticated but not permitted |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate resource, business rule violation |
| **422** | Unprocessable Entity | Valid syntax but business logic fails |
| **500** | Internal Server Error | Unexpected server failures |

---

## Migration Strategy

### ⚠️ **DO NOT** Mass Refactor

**Reasoning:**
- Risk of introducing bugs
- Testing overhead
- No immediate functional benefit
- Working code should not be changed without reason

### ✅ **DO** Apply to New Code

**Going Forward:**
- All NEW endpoints use `HttpException`
- When MODIFYING existing code, consider converting
- When FIXING bugs, convert as part of the fix
- Document any API that must keep `ResponseFormatter.error()`

---

## Error Response Format

### HttpException (via global middleware)
```json
{
  "success": false,
  "error": {
    "message": "Order not found",
    "statusCode": 404
  }
}
```

### ResponseFormatter.error()
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found"
  }
}
```

**Note:** Both are acceptable. HttpException is preferred for internal consistency.

---

## Error Logging Best Practices

### ✅ DO: Log Context
```typescript
logger.error('Order creation failed', {
    userId: req.userId,
    orderId: orderId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
});
```

### ❌ DON'T: Log Sensitive Data
```typescript
// NEVER log:
// - Payment credentials
// - Full credit card numbers
// - User passwords
// - API keys
logger.error('Payment failed', {
    creditCard: body.creditCard  // ❌ BAD!
});
```

---

## Examples by File

### Example 1: create-order.ts (HttpException)

```typescript
// ✅ GOOD - Current implementation
if (!userId) {
    throw new HttpException(401, 'Authentication required');
}

if (stockValidation.failures.length > 0) {
    throw new HttpException(400, `Insufficient stock: ${errorMessages}`);
}
```

### Example 2: duplicate-order.ts (ResponseFormatter)

```typescript
// ⚠️ CURRENT - Works but inconsistent
if (!originalOrder) {
    return ResponseFormatter.error(res, 'ORDER_NOT_FOUND', 'Order not found', 404);
}

// ✅ PREFERRED (for future refactor)
if (!originalOrder) {
    throw new HttpException(404, 'Order not found');
}
```

---

## Testing Error Handling

### Unit Test Example
```typescript
describe('GET /api/orders/:id', () => {
    it('should return 404 when order not found', async () => {
        const response = await request(app)
            .get('/api/orders/non-existent-id')
            .expect(404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('not found');
    });
    
    it('should return 403 when user not authorized', async () => {
        const response = await request(app)
            .get('/api/orders/other-user-order')
            .set('Authorization', 'Bearer user-token')
            .expect(403);
        
        expect(response.body.error.message).toContain('Not authorized');
    });
});
```

---

## Quick Reference Checklist

When writing error handling:

- [ ] Use `HttpException` for new code
- [ ] Use appropriate HTTP status code
- [ ] Provide clear, actionable error messages
- [ ] Log errors with context (not sensitive data)
- [ ] Don't expose internal implementation details
- [ ] Test error cases
- [ ] Document any non-standard patterns

---

## File-by-File Status

| File | Current Pattern | Status | Action |
|------|----------------|--------|--------|
| create-order.ts | HttpException | ✅ Correct | None |
| get-orders.ts | HttpException | ✅ Correct | None |
| get-order-by-id.ts | HttpException | ✅ Correct | None |
| cancel-order.ts | HttpException | ✅ Correct | None |
| update-order.ts | HttpException | ✅ Correct | None |
| update-order-status.ts | HttpException | ✅ Correct | None |
| get-admin-order-by-id.ts | HttpException | ✅ Correct | None |
| duplicate-order.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| confirm-draft-order.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| update-tracking.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| update-fulfillment-status.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| update-payment-status.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| send-abandoned-cart-emails.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| delete-orders.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| create-order-tag.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |
| get-abandoned-cart-details.ts | ResponseFormatter | ⚠️ Legacy | Migrate when touching |

---

## Summary

**Standard:** Use `HttpException` for all new and modified code

**Reason:** Consistency, type safety, cleaner code, better middleware integration

**Migration:** Gradual, opportunistic (when touching code), not mass refactor

**Legacy:** `ResponseFormatter.error()` acceptable in existing untouched code

---

## Related Files

- **Error Middleware:** `src/middlewares/error.middleware.ts`
- **HttpException Class:** `src/utils/HttpException.ts`
- **ResponseFormatter:** `src/utils/ResponseFormatter.ts`

---

**Last Updated:** February 2, 2026  
**Author:** Backend Team  
**Status:** Active Guideline
