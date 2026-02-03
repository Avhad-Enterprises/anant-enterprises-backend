import { setupBasicTestScenario } from './helpers/test-data';
import { TestApiClient } from './helpers/api-client';
import { cleanupAllTestData } from './helpers/cleanup';

interface CartItem {
    id: string;
    product_id: string;
    bundle_id: string | null;
    quantity: number;
    cost_price: string;
    final_price: string;
    discount_amount: string;
    line_subtotal: string;
    line_total: string;
    product_name: string;
    product_image_url: string | null;
    product_sku: string;
    inStock: boolean;
    availableStock: number;
    priceChanged: boolean;
    currentPrice: string;
}

interface Cart {
    id: string;
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
    applied_discount_codes: unknown[];
    applied_giftcard_codes: unknown[];
    applied_discounts: unknown[];
    items: CartItem[];
    itemCount: number;
    totalQuantity: number;
    hasStockIssues: boolean;
    hasPriceChanges: boolean;
    hasUnmergedGuestCart: boolean;
}

interface Product {
    id: string;
    slug: string;
    product_title: string;
    secondary_title: string | null;
    short_description: string | null;
    full_description: string | null;
    status: string;
    featured: boolean;
    cost_price: string;
    selling_price: string;
    compare_at_price: string | null;
    sku: string;
    hsn_code: string | null;
    barcode: string | null;
    weight: string | null;
    length: string | null;
    breadth: string | null;
    height: string | null;
    category_tier_1: string | null;
    category_tier_2: string | null;
    category_tier_3: string | null;
    category_tier_4: string | null;
    tags: unknown;
    primary_image_url: string | null;
    thumbnail_url: string | null;
    additional_images: unknown;
    additional_thumbnails: unknown;
    has_variants: boolean;
    meta_title: string | null;
    meta_description: string | null;
    product_url: string | null;
    created_at: Date;
    updated_at: Date;
    created_by: string | null;
    updated_by: string | null;
    is_deleted: boolean;
    deleted_at: Date | null;
    deleted_by: string | null;
    search_vector: unknown;
}

async function testCartOperations(): Promise<{ success: boolean; cart?: Cart; products?: Product[]; error?: string }> {
    console.log('🧪 Testing cart operations...\n');

    try {
        // ============================================
        // STEP 1: Setup Test Scenario
        // ============================================
        console.log('📦 Setting up test scenario...\n');

        const testData = await setupBasicTestScenario({
            numProducts: 2,
            stockPerProduct: 10,
            addToCart: false, // We'll add to cart via API
        });

        const { products } = testData;
        console.log(`✅ Created ${products.length} test products\n`);

        // ============================================
        // STEP 2: Test Cart Operations (Anonymous with Session ID)
        // ============================================
        const apiClient = new TestApiClient();
        
        // Generate a session ID for anonymous cart operations
        const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        apiClient.setSessionId(sessionId);
        
        console.log(`🛒 Testing cart operations with session: ${sessionId}\n`);

        // Add first product to cart
        console.log('➕ Adding first product to cart...');
        await apiClient.addToCart(products[0].id, 2);
        console.log('✅ Added 2x first product\n');

        // Add second product to cart
        console.log('➕ Adding second product to cart...');
        await apiClient.addToCart(products[1].id, 1);
        console.log('✅ Added 1x second product\n');

        // Get cart
        console.log('🔍 Getting cart contents...');
        const cartResponse = await apiClient.getCart();
        const cart = cartResponse.data;

        console.log(`📦 Cart ID: ${cart.id}`);
        console.log(`📦 Total Items: ${cart.itemCount || cart.items?.length || 0}`);
        console.log(`📦 Total Quantity: ${cart.totalQuantity || 'N/A'}`);
        console.log(`📦 Cart Total: ₹${cart.grand_total || 'N/A'}\n`);

        // Verify cart contents
        if (!cart.items || cart.items.length !== 2) {
            throw new Error(`Expected 2 cart items, got ${cart.items?.length || 0}`);
        }

        // Verify cart totals
        if (cart.itemCount !== 2) {
            throw new Error(`Expected 2 item types, got ${cart.itemCount}`);
        }

        if (cart.totalQuantity !== 3) {
            throw new Error(`Expected total quantity 3, got ${cart.totalQuantity}`);
        }

        if (cart.grand_total !== '2000.00') {
            throw new Error(`Expected grand total 2000.00, got ${cart.grand_total}`);
        }

        // Check first item
        const firstItem = cart.items.find((item: CartItem) => item.product_id === products[0].id);
        if (!firstItem || firstItem.quantity !== 2) {
            throw new Error(`First item: expected quantity 2, got ${firstItem?.quantity}`);
        }

        // Check second item
        const secondItem = cart.items.find((item: CartItem) => item.product_id === products[1].id);
        if (!secondItem || secondItem.quantity !== 1) {
            throw new Error(`Second item: expected quantity 1, got ${secondItem?.quantity}`);
        }

        console.log('✅ Cart contents verified\n');

        // ============================================
        // SUCCESS
        // ============================================
        console.log('========================================');
        console.log('✅ CART TEST PASSED');
        console.log('========================================\n');

        return { success: true, cart, products };

    } catch (error) {
        console.error('\n========================================');
        console.error('❌ CART TEST FAILED');
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

testCartOperations().then(result => {
    console.log('Test result:', result.success ? 'PASS' : 'FAIL');
    process.exit(result.success ? 0 : 1);
});