/**
 * Test Data Creation Helpers
 * Functions to create users, products, orders, etc. for testing
 */

import { db } from '../../../src/database';
import { users } from '../../../src/features/user/shared/user.schema';
import { products } from '../../../src/features/product/shared/products.schema';
import { inventory } from '../../../src/features/inventory/shared/inventory.schema';
import { userAddresses } from '../../../src/features/address/shared/addresses.schema';
import { carts } from '../../../src/features/cart/shared/carts.schema';
import { cartItems } from '../../../src/features/cart/shared/cart-items.schema';
import { tiers } from '../../../src/features/tiers/shared/tiers.schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getDefaultLocation } from './database';
import { productVariants } from '../../../src/features/product/shared/product-variants.schema';


// ============================================
// TEST USER CREATION
// ============================================

export interface CreateTestUserOptions {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    role?: 'customer' | 'admin';
}

export async function createTestCustomer(options: CreateTestUserOptions = {}) {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);

    const email = options.email || `test-customer-${timestamp}-${randomId}@example.com`;
    const phone = options.phone || `91${9000000000 + randomId}`;
    const hashedPassword = await bcrypt.hash('Test@123', 10);

    const [user] = await db.insert(users).values({
        email,
        phone_number: phone,
        password: hashedPassword,
        first_name: options.first_name || 'Test',
        last_name: options.last_name || 'Customer',
    }).returning();

    console.log(`✅ Created test customer: ${email} (ID: ${user.id})`);
    return user;
}

// ============================================
// TEST PRODUCT CREATION
// ============================================

export interface CreateTestVariantOptions {
    option_name: string;
    option_value: string;
    sku?: string;
    inventory_quantity?: number;
    sellable_quantity?: number; // alias for inventory_quantity
    cost_price?: string;
    selling_price?: string;
}

export interface CreateTestProductOptions {
    product_title?: string;
    sku?: string;
    selling_price?: string;
    cost_price?: string;
    stock?: number;
    status?: 'active' | 'draft' | 'archived';
    category_tier_1?: string;
    variants?: CreateTestVariantOptions[];
    has_variants?: boolean;
}

export async function createTestProduct(options: CreateTestProductOptions = {}) {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);

    const productTitle = options.product_title || `Test Product ${randomId}`;
    const sku = options.sku || `TEST-SKU-${randomId}`;
    const slug = productTitle.toLowerCase().replace(/\s+/g, '-') + `-${randomId}`;

    // Get or create default category tier
    let categoryId = options.category_tier_1;
    if (!categoryId) {
        const [tier] = await db
            .select()
            .from(tiers)
            .where(eq(tiers.level, 1))
            .limit(1);

        if (!tier) {
            const [newTier] = await db.insert(tiers).values({
                name: 'Test Category',
                code: 'test-category',
                level: 1,
                status: 'active',
            }).returning();
            categoryId = newTier.id;
        } else {
            categoryId = tier.id;
        }
    }

    // Create product
    const [product] = await db.insert(products).values({
        product_title: productTitle,
        slug,
        sku,
        selling_price: options.selling_price || '999.00',
        cost_price: options.cost_price || '500.00',
        status: options.status || 'active',
        category_tier_1: categoryId,
        short_description: `Test product for automated testing`,
        has_variants: options.has_variants ?? (options.variants && options.variants.length > 0) ?? false,
    }).returning();

    // Create inventory record (Base Inventory)
    // Only create base inventory if validation doesn't prevent it, or if we want to simulate the buggy state.
    // For now, we follow standard logic: if stock is provided, we add it. 
    // If variants are provided, we add their stock.

    // Note: The schema check constraint enforces mutual exclusion between product_id and variant_id.
    // So we can have an inventory row for the product (base) AND inventory rows for variants.

    const defaultLocation = await getDefaultLocation();
    if (!defaultLocation) {
        throw new Error('No default inventory location found. Please create one first.');
    }

    // Add base stock if provided (even if variants exist, to simulate the issue)
    if (options.stock !== undefined) {
        await db.insert(inventory).values({
            product_id: product.id,
            location_id: defaultLocation.id,
            available_quantity: options.stock,
            reserved_quantity: 0,
            incoming_quantity: 0,
            status: options.stock > 0 ? 'in_stock' : 'out_of_stock',
            condition: 'sellable',
        });
    }

    // Create Variants if provided
    if (options.variants && options.variants.length > 0) {
        for (const variantOpt of options.variants) {
            const variantSku = variantOpt.sku || `${sku}-${variantOpt.option_value.toUpperCase()}`;

            const [variant] = await db.insert(productVariants).values({
                product_id: product.id,
                option_name: variantOpt.option_name,
                option_value: variantOpt.option_value,
                sku: variantSku,
                selling_price: variantOpt.selling_price || options.selling_price || '999.00',
                cost_price: variantOpt.cost_price || options.cost_price || '500.00',
                is_active: true,
                is_default: false,
            }).returning();

            const variantStock = variantOpt.inventory_quantity ?? variantOpt.sellable_quantity ?? 0;

            // Add variant inventory
            await db.insert(inventory).values({
                variant_id: variant.id,
                location_id: defaultLocation.id,
                available_quantity: variantStock,
                reserved_quantity: 0,
                incoming_quantity: 0,
                status: variantStock > 0 ? 'in_stock' : 'out_of_stock',
                condition: 'sellable',
            });
            console.log(`  Reference Variant created: ${variantOpt.option_name}:${variantOpt.option_value} (Stock: ${variantStock})`);
        }
    }

    console.log(`✅ Created test product: ${productTitle} (SKU: ${sku}, Stock: ${options.stock ?? 0})`);
    return product;
}

// ============================================
// TEST ADDRESS CREATION
// ============================================

export interface CreateTestAddressOptions {
    userId: string;
    address_label?: 'home' | 'office' | 'warehouse' | 'other';
    is_default_shipping?: boolean;
}

export async function createTestAddress(options: CreateTestAddressOptions) {
    const [address] = await db.insert(userAddresses).values({
        user_id: options.userId,
        address_label: options.address_label || 'home',
        recipient_name: 'Test User',
        phone_number: '9876543210',
        phone_country_code: '+91',
        address_line1: '123 Test Street',
        address_line2: 'Near Test Landmark',
        city: 'Mumbai',
        state_province: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        country_code: 'IN',
        is_default_shipping: options.is_default_shipping ?? true,
    }).returning();

    console.log(`✅ Created test address for user ${options.userId}`);
    return address;
}

// ============================================
// TEST CART CREATION
// ============================================

export interface CreateTestCartOptions {
    userId: string;
    items?: Array<{
        productId: string;
        quantity: number;
    }>;
}

export async function createTestCart(options: CreateTestCartOptions) {
    // Create cart
    const [cart] = await db.insert(carts).values({
        user_id: options.userId,
        cart_status: 'active',
        currency: 'INR',
        subtotal: '0.00',
        discount_total: '0.00',
        tax_total: '0.00',
        shipping_total: '0.00',
        grand_total: '0.00',
    }).returning();

    // Add items if provided
    if (options.items && options.items.length > 0) {
        for (const item of options.items) {
            const [product] = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);

            if (!product) {
                console.warn(`⚠️  Product ${item.productId} not found, skipping cart item`);
                continue;
            }

            const lineSubtotal = (parseFloat(product.selling_price) * item.quantity).toFixed(2);
            const lineTotal = lineSubtotal; // Same as subtotal if no discount

            await db.insert(cartItems).values({
                cart_id: cart.id,
                product_id: item.productId,
                quantity: item.quantity,
                cost_price: product.cost_price,
                final_price: product.selling_price,
                line_subtotal: lineSubtotal,
                line_total: lineTotal,
            });

            console.log(`  ➕ Added ${item.quantity}x ${product.product_title} to cart`);
        }
    }

    console.log(`✅ Created test cart for user ${options.userId}`);
    return cart;
}

// ============================================
// BULK TEST DATA CREATION
// ============================================

export interface SetupTestScenarioResult {
    customer: typeof users.$inferSelect;
    products: Array<typeof products.$inferSelect>;
    address: typeof userAddresses.$inferSelect;
    cart?: typeof carts.$inferSelect;
}

export async function setupBasicTestScenario(options: {
    numProducts?: number;
    stockPerProduct?: number;
    addToCart?: boolean;
} = {}): Promise<SetupTestScenarioResult> {
    const numProducts = options.numProducts ?? 3;
    const stockPerProduct = options.stockPerProduct ?? 50;

    console.log('\n📦 Setting up test scenario...\n');

    // 1. Create customer
    const customer = await createTestCustomer();

    // 2. Create products
    const createdProducts: Array<typeof products.$inferSelect> = [];
    for (let i = 0; i < numProducts; i++) {
        const product = await createTestProduct({
            product_title: `Test Product ${i + 1}`,
            selling_price: `${(i + 1) * 500}.00`,
            stock: stockPerProduct,
        });
        createdProducts.push(product);
    }

    // 3. Create address
    const address = await createTestAddress({
        userId: customer.id,
        is_default_shipping: true,
    });

    // 4. Create cart with items (optional)
    let cart;
    if (options.addToCart) {
        cart = await createTestCart({
            userId: customer.id,
            items: createdProducts.map((p, idx) => ({
                productId: p.id,
                quantity: idx + 1, // 1, 2, 3 units
            })),
        });
    }

    console.log('\n✅ Test scenario setup complete!\n');

    return {
        customer,
        products: createdProducts,
        address,
        cart,
    };
}

// ============================================
// HELPER: Generate Test Data
// ============================================

export function generateTestEmail(prefix: string = 'test') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}@test.com`;
}

export function generateTestPhone() {
    const random = Math.floor(Math.random() * 1000000000);
    return `91${9000000000 + random}`;
}

export function generateTestSKU(prefix: string = 'TEST') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}`;
}
