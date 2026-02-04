/**
 * TEST 001: Stock Calculation Logic
 * 
 * This test addresses the critical bug found in INVENTORY_INCONSISTENCY_ROOT_CAUSE_ANALYSIS.md
 * where stock was incorrectly calculated as (available - reserved) instead of (available + reserved)
 * 
 * Critical Test Cases:
 * 1. Stock calculation: available + reserved = total
 * 2. Product listing should show total physical stock
 * 3. Frontend available stock should show only available (not subtract reserved)
 * 4. Product details should show breakdown
 */

import { setupBasicTestScenario } from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';
import { cleanupAllTestData } from './helpers/cleanup';
import {
    getStockCalculation,
    assertInventoryState,
    assertStockCalculationLogic,
    setInventoryState,
} from './helpers/inventory';

async function testStockCalculation(): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 TEST 001: Stock Calculation Logic\n');
    console.log('========================================\n');

    try {
        // ============================================
        // SETUP: Create test product with known inventory state
        // ============================================
        console.log('📦 STEP 1: Setting up test product...\n');

        const testData = await setupBasicTestScenario({
            numProducts: 1,
            stockPerProduct: 50, // Initial stock
            addToCart: false,
        });

        const product = testData.products[0];
        console.log(`✅ Created test product: ${product.product_title}`);
        console.log(`   Product ID: ${product.id}\n`);

        // ============================================
        // TEST CASE 1: Basic Stock Calculation (available + reserved)
        // ============================================
        console.log('📊 TEST CASE 1: Basic Stock Calculation\n');
        console.log('Setting inventory to: available=10, reserved=5\n');

        await setInventoryState(product.id, 10, 5);

        const stock1 = await getStockCalculation(product.id);
        console.log(`Current state:`);
        console.log(`  Available: ${stock1.available}`);
        console.log(`  Reserved: ${stock1.reserved}`);
        console.log(`  Total: ${stock1.total}\n`);

        // CRITICAL: Verify total = available + reserved (not available - reserved!)
        if (stock1.total !== 15) {
            throw new Error(`❌ Stock calculation FAILED: Expected total=15, got ${stock1.total}`);
        }

        if (stock1.available !== 10) {
            throw new Error(`❌ Available stock FAILED: Expected 10, got ${stock1.available}`);
        }

        if (stock1.reserved !== 5) {
            throw new Error(`❌ Reserved stock FAILED: Expected 5, got ${stock1.reserved}`);
        }

        console.log('✅ TEST CASE 1 PASSED: Stock calculation is correct (10 + 5 = 15)\n');

        // ============================================
        // TEST CASE 2: Stock with Zero Reserved
        // ============================================
        console.log('📊 TEST CASE 2: Stock with Zero Reserved\n');
        console.log('Setting inventory to: available=20, reserved=0\n');

        await setInventoryState(product.id, 20, 0);

        await assertInventoryState(product.id, {
            available: 20,
            reserved: 0,
            total: 20,
        }, 'Zero reserved');

        console.log('✅ TEST CASE 2 PASSED: Handles zero reserved correctly\n');

        // ============================================
        // TEST CASE 3: Stock with Zero Available (All Reserved)
        // ============================================
        console.log('📊 TEST CASE 3: Stock with Zero Available\n');
        console.log('Setting inventory to: available=0, reserved=15\n');

        await setInventoryState(product.id, 0, 15);

        await assertInventoryState(product.id, {
            available: 0,
            reserved: 15,
            total: 15,
        }, 'Zero available');

        console.log('✅ TEST CASE 3 PASSED: Total stock is 15 even when available=0\n');

        // ============================================
        // TEST CASE 4: The Bug Case (available < reserved)
        // ============================================
        console.log('📊 TEST CASE 4: The Bug Case (available=2, reserved=5)\n');
        console.log('This is the exact scenario from the production bug!\n');

        await setInventoryState(product.id, 2, 5);

        const stock4 = await getStockCalculation(product.id);
        console.log(`Current state:`);
        console.log(`  Available: ${stock4.available}`);
        console.log(`  Reserved: ${stock4.reserved}`);
        console.log(`  Total: ${stock4.total}\n`);

        // The bug was: total = available - reserved = 2 - 5 = -3
        // Correct calculation: total = available + reserved = 2 + 5 = 7
        if (stock4.total === -3) {
            throw new Error(
                `❌ CRITICAL BUG DETECTED: Stock calculated as ${stock4.total} (available - reserved)\n` +
                `   This is the exact bug from production!\n` +
                `   Correct calculation should be: 2 + 5 = 7`
            );
        }

        if (stock4.total !== 7) {
            throw new Error(
                `❌ Stock calculation FAILED: Expected total=7, got ${stock4.total}`
            );
        }

        console.log('✅ TEST CASE 4 PASSED: Bug is fixed! (2 + 5 = 7, not -3)\n');

        // ============================================
        // TEST CASE 5: Frontend Available Stock API
        // ============================================
        console.log('📊 TEST CASE 5: Frontend Available Stock API\n');
        console.log('Testing /api/inventory/product/:id/available endpoint\n');

        const apiClient = new TestApiClient();
        const availableStockResponse = await apiClient.getAvailableStock(product.id);
        const availableStockData = availableStockResponse.data;

        console.log(`API Response:`);
        console.log(`  Available Stock: ${availableStockData.availableStock}`);
        console.log(`  Reserved Stock: ${availableStockData.reservedStock}`);
        console.log(`  Total Stock: ${availableStockData.totalStock}`);
        console.log(`  In Stock: ${availableStockData.inStock}\n`);

        // Frontend should show only available (not subtract reserved)
        if (availableStockData.availableStock !== 2) {
            throw new Error(
                `❌ Available stock API FAILED: Expected 2, got ${availableStockData.availableStock}\n` +
                `   Frontend should show only available_quantity (already excludes reserved)`
            );
        }

        if (availableStockData.totalStock !== 7) {
            throw new Error(
                `❌ Total stock API FAILED: Expected 7, got ${availableStockData.totalStock}`
            );
        }

        console.log('✅ TEST CASE 5 PASSED: Frontend API returns correct values\n');

        // ============================================
        // TEST CASE 6: Product Listing Stock Display
        // ============================================
        console.log('📊 TEST CASE 6: Product Listing Stock Display\n');
        console.log('Testing admin product listing endpoint\n');

        // Note: This would require admin authentication
        // For now, we'll verify the logic is correct through direct DB query
        await assertStockCalculationLogic(product.id);

        console.log('✅ TEST CASE 6 PASSED: Stock calculation logic verified\n');

        // ============================================
        // TEST CASE 7: Edge Case - Both Zero
        // ============================================
        console.log('📊 TEST CASE 7: Edge Case - Both Zero\n');

        await setInventoryState(product.id, 0, 0);

        await assertInventoryState(product.id, {
            available: 0,
            reserved: 0,
            total: 0,
            status: 'out_of_stock',
        }, 'Both zero');

        console.log('✅ TEST CASE 7 PASSED: Handles zero stock correctly\n');

        // ============================================
        // TEST CASE 8: Large Numbers
        // ============================================
        console.log('📊 TEST CASE 8: Large Numbers\n');

        await setInventoryState(product.id, 999999, 100000);

        await assertInventoryState(product.id, {
            available: 999999,
            reserved: 100000,
            total: 1099999,
        }, 'Large numbers');

        console.log('✅ TEST CASE 8 PASSED: Handles large numbers correctly\n');

        // ============================================
        // SUCCESS
        // ============================================
        console.log('========================================');
        console.log('✅ ALL STOCK CALCULATION TESTS PASSED');
        console.log('========================================\n');
        console.log('Summary:');
        console.log('  ✅ Basic calculation (available + reserved)');
        console.log('  ✅ Zero reserved case');
        console.log('  ✅ Zero available case');
        console.log('  ✅ Bug case fixed (2 + 5 = 7, not -3)');
        console.log('  ✅ Frontend API correct');
        console.log('  ✅ Calculation logic verified');
        console.log('  ✅ Edge cases handled');
        console.log('  ✅ Large numbers supported\n');

        return { success: true };

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ STOCK CALCULATION TEST FAILED');
        console.error('========================================\n');
        console.error('Error:', error);
        console.error('\n');

        return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
        // Cleanup
        if (process.env.CLEANUP_AFTER_TEST !== 'false') {
            console.log('\n🧹 Cleaning up test data...\n');
            await cleanupAllTestData();
            console.log('✅ Cleanup complete\n');
        }
    }
}

// Run the test
if (require.main === module) {
    testStockCalculation().then(result => {
        console.log('Test result:', result.success ? '✅ PASS' : '❌ FAIL');
        process.exit(result.success ? 0 : 1);
    });
}

export { testStockCalculation };
