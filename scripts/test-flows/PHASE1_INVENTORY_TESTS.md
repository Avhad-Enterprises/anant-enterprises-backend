# Phase 1 Inventory Tests - README

## 🎯 Overview

Phase 1 implements **critical inventory management tests** to prevent the production bugs documented in `INVENTORY_INCONSISTENCY_ROOT_CAUSE_ANALYSIS.md`.

These tests use **real database** connections and test the actual API endpoints, providing true integration testing.

## 📋 Test Files Created

| Test File | Purpose | Test Cases | Priority |
|-----------|---------|------------|----------|
| **test-stock-calculation.ts** | Stock calculation logic (available + reserved) | 8 | 🔴 P0 |
| **test-inventory-adjustment.ts** | Inventory adjustment operations | 9 | 🔴 P0 |
| **test-order-reservation.ts** | Order reservation flow | 7 | 🔴 P0 |
| **test-concurrent-operations.ts** | Race conditions & concurrent ops | 5 | 🔴 P0 |
| **test-inventory-edge-cases.ts** | Edge cases & boundaries | 10 | 🟠 High |
| **helpers/inventory.ts** | Test helper functions | N/A | - |

**Total: 39 test cases covering critical inventory scenarios**

## 🚀 Running the Tests

### Prerequisites

1. **Database Running**
   ```bash
   # Ensure your PostgreSQL database is running
   # Tests use your .env.dev configuration
   ```

2. **Backend Server Running**
   ```bash
   cd anant-enterprises-backend
   npm run dev
   ```

3. **Environment Variables**
   ```bash
   # Tests use .env.dev by default
   # Ensure DATABASE_URL and API_BASE_URL are set
   ```

### Run Individual Tests

```bash
# Navigate to backend folder
cd anant-enterprises-backend

# Test 001: Stock Calculation (CRITICAL - addresses production bug)
npx tsx scripts/test-flows/test-stock-calculation.ts

# Test 002: Inventory Adjustment
npx tsx scripts/test-flows/test-inventory-adjustment.ts

# Test 003: Order Reservation Flow
npx tsx scripts/test-flows/test-order-reservation.ts

# Test 004: Concurrent Operations
npx tsx scripts/test-flows/test-concurrent-operations.ts

# Test 005: Edge Cases
npx tsx scripts/test-flows/test-inventory-edge-cases.ts
```

### Run All Phase 1 Tests

```bash
# Create a test runner script
npx tsx scripts/test-flows/run-phase1-tests.ts
```

### Skip Cleanup (for debugging)

```bash
# Keep test data after test runs
CLEANUP_AFTER_TEST=false npx tsx scripts/test-flows/test-stock-calculation.ts
```

## 📊 Test Coverage

### TEST 001: Stock Calculation Logic ✅

**Critical Bug Fix Test** - Addresses production issue where stock was calculated as `available - reserved` instead of `available + reserved`.

Test Cases:
1. ✅ Basic calculation (10 + 5 = 15)
2. ✅ Zero reserved (20 + 0 = 20)
3. ✅ Zero available (0 + 15 = 15)
4. ✅ **THE BUG CASE** (2 + 5 = 7, NOT -3) ⚠️ CRITICAL
5. ✅ Frontend API returns correct values
6. ✅ Product listing logic verified
7. ✅ Edge case: both zero
8. ✅ Large numbers

**Key Assertions:**
- Total stock = available + reserved (NOT available - reserved)
- Frontend shows only available (already excludes reserved)
- Admin shows breakdown: total, available, reserved

### TEST 002: Inventory Adjustment Operations ✅

Tests all inventory adjustment scenarios.

Test Cases:
1. ✅ Positive adjustment (+50)
2. ✅ Negative adjustment (-30)
3. ✅ Zero adjustment (correction only)
4. ✅ Reject negative stock (default behavior)
5. ✅ Large adjustment (+10,000)
6. ✅ Multiple sequential adjustments
7. ✅ Adjustment to zero
8. ✅ Adjustment from zero (restock)
9. ✅ Reason validation

**Key Assertions:**
- Audit trail created for every adjustment
- Negative stock rejected by default
- Status updates correctly (out_of_stock, low_stock, in_stock)
- Sequential adjustments maintain consistency

### TEST 003: Order Reservation Flow ✅

Tests the complete order lifecycle.

Test Cases:
1. ✅ Cart creates temporary reservation
2. ✅ Order placement reserves stock (available unchanged)
3. ✅ Insufficient stock validation
4. ✅ Fulfillment logic verified
5. ✅ Cancellation logic verified
6. ✅ Multiple orders accumulate reservations
7. ✅ Cannot order when only reserved stock remains

**Key Assertions:**
- Reservation does NOT reduce available_quantity ⚠️ CRITICAL
- Only fulfillment reduces available_quantity
- Reserved stock cannot be sold to other customers
- available=10, reserved=5 → can still sell 10 units (not 5)

### TEST 004: Concurrent Operations ✅

Tests race conditions and simultaneous operations.

Test Cases:
1. ✅ Two users racing for last item
2. ✅ Multiple simultaneous adjustments
3. ✅ 10 users racing for 5 items
4. ✅ Concurrent add to cart operations
5. ✅ Mixed operations (orders + adjustments)

**Key Assertions:**
- No overselling occurs
- Data integrity maintained under concurrent load
- Proper locking/transaction handling
- All operations complete successfully or fail gracefully

### TEST 005: Edge Cases & Boundaries ✅

Tests unusual scenarios and boundary conditions.

Test Cases:
1. ✅ Both available and reserved zero
2. ✅ Available=0 but reserved>0
3. ✅ Reserved > available
4. ✅ Very large numbers (999,999+)
5. ✅ Adjustment exactly to zero
6. ✅ Adjustment from zero
7. ✅ Multiple rapid adjustments
8. ✅ Order quantity equals exact available
9. ✅ Status transitions
10. ✅ Long reason text (1000 chars)

**Key Assertions:**
- System handles all edge cases gracefully
- No crashes or data corruption
- Status updates reflect reality

## 🔧 Test Infrastructure

### Helper Functions

**helpers/inventory.ts** provides:
- `getInventoryState()` - Query current inventory
- `getStockCalculation()` - Get available, reserved, total
- `assertInventoryState()` - Assert expected values
- `assertAuditTrailCreated()` - Verify audit logs
- `setInventoryState()` - Set test state
- `simulateRaceCondition()` - Test concurrent operations
- `runConcurrent()` - Run operations in parallel

### API Client Extensions

**helpers/api-client.ts** now includes:
- `getAvailableStock()` - Get stock for frontend
- `adjustInventory()` - Adjust inventory (admin)
- `getInventoryHistory()` - Get audit trail

## 🎓 What These Tests Validate

### Stock Calculation (Production Bug)
```typescript
// ❌ WRONG (caused production bug)
total = available - reserved  // 2 - 5 = -3

// ✅ CORRECT
total = available + reserved  // 2 + 5 = 7
```

### Reservation Semantics
```typescript
// Initial: available=100, reserved=0

// Order placed for 10 units:
// ❌ WRONG: available=90, reserved=10
// ✅ CORRECT: available=100, reserved=10

// Fulfillment (ship order):
// ✅ CORRECT: available=90, reserved=0
```

### Available vs Reserved
- **available_quantity**: Stock available for NEW orders (sellable)
- **reserved_quantity**: Stock allocated to existing orders (not sellable)
- **Total physical stock**: available + reserved

## 📈 Success Criteria

### Phase 1 Complete When:
- ✅ All 39 test cases passing
- ✅ Stock calculation bug verified fixed
- ✅ Reservation logic validated
- ✅ Concurrent operations safe
- ✅ Edge cases handled

### CI/CD Integration

Add to your CI pipeline:
```yaml
# .github/workflows/test.yml
- name: Run Phase 1 Inventory Tests
  run: |
    npm run test:inventory:phase1
```

## 🐛 Known Issues & TODOs

### Pending Implementation
- [ ] Order fulfillment endpoint (for TEST 003 case 4)
- [ ] Order cancellation endpoint (for TEST 003 case 5)
- [ ] Admin authentication (using customer auth temporarily)

### Expected Test Behaviors
Some tests verify logic without full endpoint support:
- Fulfillment logic validated but not executed
- Cancellation logic validated but not executed
- These are marked with ⚠️ in test output

## 🔍 Interpreting Test Results

### Test Output Format
```
🧪 TEST 001: Stock Calculation Logic
========================================

📦 STEP 1: Setting up test product...
✅ Created test product

📊 TEST CASE 1: Basic Stock Calculation
  ✅ Inventory state verified: available=10, reserved=5, total=15
✅ TEST CASE 1 PASSED

========================================
✅ ALL STOCK CALCULATION TESTS PASSED
========================================
```

### Success Indicators
- ✅ Green checkmarks for passing tests
- All assertions pass
- Final summary shows all tests passed
- Exit code 0

### Failure Indicators
- ❌ Red X marks for failing tests
- Error messages with expected vs actual
- Stack traces for debugging
- Exit code 1

## 📚 Related Documentation

- [INVENTORY_TEST_ANALYSIS_AND_PROPOSAL.md](../../INVENTORY_TEST_ANALYSIS_AND_PROPOSAL.md) - Full test plan
- [INVENTORY_EDGE_CASES_CHECKLIST.md](../../INVENTORY_EDGE_CASES_CHECKLIST.md) - 67 edge cases identified
- [INVENTORY_INCONSISTENCY_ROOT_CAUSE_ANALYSIS.md](../../INVENTORY_INCONSISTENCY_ROOT_CAUSE_ANALYSIS.md) - Production bug analysis

## 🎯 Next Steps (Phase 2)

After Phase 1:
1. Cart reservation expiration tests
2. Inventory transfer tests
3. Multi-location tests
4. Product variant inventory tests
5. Performance & load tests

## 💡 Tips

### Debugging Failed Tests
```bash
# Keep test data for inspection
CLEANUP_AFTER_TEST=false npx tsx scripts/test-flows/test-stock-calculation.ts

# Check database state
psql $DATABASE_URL
> SELECT * FROM inventory WHERE product_id = 'xxx';
> SELECT * FROM inventory_adjustments WHERE inventory_id = 'xxx';
```

### Running Tests in Watch Mode
```bash
# Use nodemon for development
nodemon --exec "npx tsx scripts/test-flows/test-stock-calculation.ts" --watch scripts/test-flows
```

### Performance Monitoring
```bash
# Time test execution
time npx tsx scripts/test-flows/test-stock-calculation.ts
```

## 🤝 Contributing

When adding new tests:
1. Follow existing test structure
2. Use helper functions from `helpers/inventory.ts`
3. Add comprehensive console logging
4. Include setup, test cases, and cleanup
5. Update this README

## ✅ Checklist Before Deployment

- [ ] All Phase 1 tests passing
- [ ] No test data left in database (cleanup works)
- [ ] Tests run in CI/CD
- [ ] Production bug cannot be reproduced
- [ ] Team reviewed test results

---

**Phase 1 Status:** ✅ COMPLETE - Ready for Testing

**Created:** February 3, 2026  
**Last Updated:** February 3, 2026  
**Maintained By:** Backend Team
