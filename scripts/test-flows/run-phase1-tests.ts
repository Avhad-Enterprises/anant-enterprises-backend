/**
 * Run All Phase 1 Inventory Tests
 * 
 * Executes all critical Phase 1 inventory tests in sequence
 * and provides a comprehensive summary
 */

import { testStockCalculation } from './test-stock-calculation';
import { testInventoryAdjustment } from './test-inventory-adjustment';
import { testOrderReservationFlow } from './test-order-reservation';
import { testConcurrentOperations } from './test-concurrent-operations';
import { testInventoryEdgeCases } from './test-inventory-edge-cases';

interface TestResult {
    name: string;
    success: boolean;
    error?: string;
    duration: number;
}

async function runAllPhase1Tests() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           PHASE 1 INVENTORY TESTS - FULL SUITE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');
    console.log('Running 5 critical test suites with 39 total test cases...\n');
    console.log('This will test against your REAL database and API.\n');
    console.log('───────────────────────────────────────────────────────────────\n');

    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Stock Calculation
    console.log('🔬 TEST SUITE 1/5: Stock Calculation Logic\n');
    const test1Start = Date.now();
    const result1 = await testStockCalculation();
    const test1Duration = Date.now() - test1Start;
    results.push({
        name: 'Stock Calculation Logic',
        success: result1.success,
        error: result1.error,
        duration: test1Duration,
    });
    console.log(`⏱️  Duration: ${(test1Duration / 1000).toFixed(2)}s\n`);

    // Test 2: Inventory Adjustment
    console.log('\n🔬 TEST SUITE 2/5: Inventory Adjustment Operations\n');
    const test2Start = Date.now();
    const result2 = await testInventoryAdjustment();
    const test2Duration = Date.now() - test2Start;
    results.push({
        name: 'Inventory Adjustment',
        success: result2.success,
        error: result2.error,
        duration: test2Duration,
    });
    console.log(`⏱️  Duration: ${(test2Duration / 1000).toFixed(2)}s\n`);

    // Test 3: Order Reservation Flow
    console.log('\n🔬 TEST SUITE 3/5: Order Reservation Flow\n');
    const test3Start = Date.now();
    const result3 = await testOrderReservationFlow();
    const test3Duration = Date.now() - test3Start;
    results.push({
        name: 'Order Reservation Flow',
        success: result3.success,
        error: result3.error,
        duration: test3Duration,
    });
    console.log(`⏱️  Duration: ${(test3Duration / 1000).toFixed(2)}s\n`);

    // Test 4: Concurrent Operations
    console.log('\n🔬 TEST SUITE 4/5: Concurrent Operations & Race Conditions\n');
    const test4Start = Date.now();
    const result4 = await testConcurrentOperations();
    const test4Duration = Date.now() - test4Start;
    results.push({
        name: 'Concurrent Operations',
        success: result4.success,
        error: result4.error,
        duration: test4Duration,
    });
    console.log(`⏱️  Duration: ${(test4Duration / 1000).toFixed(2)}s\n`);

    // Test 5: Edge Cases
    console.log('\n🔬 TEST SUITE 5/5: Edge Cases & Boundary Conditions\n');
    const test5Start = Date.now();
    const result5 = await testInventoryEdgeCases();
    const test5Duration = Date.now() - test5Start;
    results.push({
        name: 'Edge Cases',
        success: result5.success,
        error: result5.error,
        duration: test5Duration,
    });
    console.log(`⏱️  Duration: ${(test5Duration / 1000).toFixed(2)}s\n`);

    // Summary
    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    PHASE 1 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n');

    // Individual Results
    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = (result.duration / 1000).toFixed(2);
        console.log(`${status}  Suite ${index + 1}: ${result.name} (${duration}s)`);
        if (result.error) {
            console.log(`     Error: ${result.error}`);
        }
    });

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log(`Total Suites: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('───────────────────────────────────────────────────────────────\n');

    if (failedCount === 0) {
        console.log('🎉 ALL PHASE 1 TESTS PASSED! 🎉\n');
        console.log('Key Achievements:');
        console.log('  ✅ Stock calculation bug fixed (available + reserved)');
        console.log('  ✅ Inventory adjustments working correctly');
        console.log('  ✅ Order reservation logic validated');
        console.log('  ✅ Concurrent operations handled safely');
        console.log('  ✅ Edge cases covered\n');
        console.log('Your inventory management system is now ROBUST! 💪\n');
        console.log('═══════════════════════════════════════════════════════════════\n');
        return 0;
    } else {
        console.log('⚠️  SOME TESTS FAILED\n');
        console.log('Please review the errors above and fix the issues.\n');
        console.log('Failed Suites:');
        results.filter(r => !r.success).forEach(result => {
            console.log(`  ❌ ${result.name}`);
            if (result.error) {
                console.log(`     ${result.error}`);
            }
        });
        console.log('\n═══════════════════════════════════════════════════════════════\n');
        return 1;
    }
}

// Run all tests
runAllPhase1Tests().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error('\n❌ Fatal error running test suite:');
    console.error(error);
    process.exit(1);
});
