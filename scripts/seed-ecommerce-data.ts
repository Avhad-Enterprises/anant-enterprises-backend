/**
 * Seed Script: Complete E-commerce Data
 *
 * Seeds comprehensive test data for all features:
 * - Countries & Tax Rules (Foundation)
 * - User addresses
 * - Carts with cart items
 * - Wishlists with wishlist items
 * - Orders with order items and Tax calculations
 * - Reviews with various statuses
 *
 * Prerequisites:
 * - Run npm run db:seed first (creates users)
 * - Run scripts/seed-products-and-collections.ts (creates products)
 *
 * Usage: npx ts-node scripts/seed-ecommerce-data.ts
 */

import dotenv from 'dotenv';
dotenv.config();

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db, closeDatabase } from '../src/database';
import { users } from '../src/features/user/shared/user.schema';
import { userAddresses } from '../src/features/user/shared/addresses.schema';
import { products } from '../src/features/product/shared/product.schema';
import { carts } from '../src/features/cart/shared/carts.schema';
import { cartItems } from '../src/features/cart/shared/cart-items.schema';
import { wishlists } from '../src/features/wishlist/shared/wishlist.schema';
import { wishlistItems } from '../src/features/wishlist/shared/wishlist-items.schema';
import { orders } from '../src/features/orders/shared/orders.schema';
import { orderItems } from '../src/features/orders/shared/order-items.schema';
import { reviews } from '../src/features/reviews/shared/reviews.schema';
import { countries, taxRules, type TaxRule } from '../src/features/settings/shared/tax-rules.schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

function generateAccessToken(): string {
    return randomBytes(32).toString('hex');
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedEcommerceData() {
    console.log('🛒 Starting e-commerce data seeding...\n');

    try {
        // 0. Seed Foundation Data (Countries, Tax Rules)
        console.log('🌍 Checking foundation data...');

        // Seed Countries
        let indiaCountry = await db.query.countries.findFirst({ where: eq(countries.code, 'IN') });
        if (!indiaCountry) {
            [indiaCountry] = await db.insert(countries).values({
                code: 'IN',
                code_alpha3: 'IND',
                name: 'India',
                phone_code: '+91',
                currency_code: 'INR',
                is_shipping_enabled: true,
                is_billing_enabled: true,
                requires_state: true,
            }).returning();
            console.log('   ✅ Created country: India');
        }

        // Seed Tax Rules (GST 18%)
        let gstTaxRule = await db.query.taxRules.findFirst({ where: eq(taxRules.tax_code, 'GST_18') });
        if (!gstTaxRule) {
            [gstTaxRule] = await db.insert(taxRules).values({
                country_code: 'IN',
                tax_name: 'GST 18%',
                tax_code: 'GST_18',
                tax_rate: '18.000',
                tax_type: 'exclusive',
                effective_from: new Date().toISOString().split('T')[0], // Today
                is_active: true,
            }).returning();
            console.log('   ✅ Created tax rule: GST 18%');
        } else {
            console.log('   ℹ️  Tax rule (GST 18%) already exists');
        }

        // 1. Get existing users
        console.log('\n📋 Fetching existing users...');
        const allUsers = await db.select().from(users).where(eq(users.is_deleted, false));

        if (allUsers.length === 0) {
            console.log('\n⚠️  No users found in database.');
            console.log('   Please run: npm run db:seed first to create users.\n');
            return;
        }

        const testUser = allUsers.find(u => u.email === 'user@gmail.com') || allUsers[0];
        console.log(`   Found ${allUsers.length} users`);
        console.log(`   Test user: ${testUser.email}`);

        // 2. Get existing products
        console.log('\n📦 Fetching existing products...');
        const allProducts = await db.select().from(products).where(
            and(eq(products.status, 'active'), eq(products.is_deleted, false))
        ).limit(10);

        if (allProducts.length === 0) {
            console.log('\n⚠️  No active products found in database.');
            console.log('   Please run: npx tsx scripts/seed-products-and-collections.ts first.\n');
            return;
        }
        console.log(`   Found ${allProducts.length} products`);

        // 3. Seed User Addresses
        console.log('\n🏠 Seeding user addresses...');
        let shippingAddress: any = null;
        let billingAddress: any = null;

        try {
            const existingAddresses = await db.select().from(userAddresses).where(eq(userAddresses.user_id, testUser.id));

            if (existingAddresses.length === 0) {
                const [addr1, addr2] = await db.insert(userAddresses).values([
                    {
                        user_id: testUser.id,
                        is_default: true,
                        address_type: 'shipping',
                        recipient_name: 'Test User',
                        phone_number: '9876543210',
                        phone_country_code: '+91',
                        address_line1: '123 Main Street, Apt 4B',
                        address_line2: 'Near City Mall',
                        city: 'Mumbai',
                        state_province: 'Maharashtra',
                        postal_code: '400001',
                        country: 'India',
                        country_code: 'IN',
                    },
                    {
                        user_id: testUser.id,
                        is_default: true,
                        address_type: 'billing',
                        recipient_name: 'Test User (Office)',
                        company_name: 'Anant Enterprises',
                        phone_number: '9876543211',
                        phone_country_code: '+91',
                        address_line1: '456 Business Park, Tower A',
                        address_line2: 'Floor 5, Wing B',
                        city: 'Bangalore',
                        state_province: 'Karnataka',
                        postal_code: '560001',
                        country: 'India',
                        country_code: 'IN',
                    },
                ]).returning();
                shippingAddress = addr1;
                billingAddress = addr2;
                console.log('   ✅ Created 2 addresses');
            } else {
                shippingAddress = existingAddresses.find(a => a.address_type === 'shipping') || existingAddresses[0];
                billingAddress = existingAddresses.find(a => a.address_type === 'billing') || existingAddresses[0];
                console.log('   ℹ️  Addresses already exist, using existing');
            }
        } catch (error: any) {
            console.log('   ⚠️  Address creation failed (may need migration):', error.message?.slice(0, 50));
            console.log('   ℹ️  Continuing without addresses - orders will use null address IDs');
        }

        // 5. Seed Cart for test user
        console.log('\n🛒 Seeding cart...');
        const [existingCart] = await db.select().from(carts).where(
            and(eq(carts.user_id, testUser.id), eq(carts.cart_status, 'active'))
        ).limit(1);

        let cart;
        if (!existingCart) {
            [cart] = await db.insert(carts).values({
                user_id: testUser.id,
                cart_status: 'active',
                source: 'web',
                currency: 'INR',
                subtotal: '0.00',
                discount_total: '0.00',
                grand_total: '0.00',
                created_by: testUser.id,
            }).returning();

            // Add items to cart
            const cartProducts = allProducts.slice(0, 3);
            let subtotal = 0;
            let grandTotal = 0;

            for (const prod of cartProducts) {
                const quantity = Math.floor(Math.random() * 3) + 1;
                const price = Number(prod.selling_price);
                const lineTotal = price * quantity;
                subtotal += lineTotal;
                grandTotal += lineTotal;

                await db.insert(cartItems).values({
                    cart_id: cart.id,
                    product_id: prod.id,
                    quantity,
                    cost_price: prod.compare_at_price || prod.selling_price,
                    final_price: prod.selling_price,
                    discount_amount: '0.00',
                    line_subtotal: lineTotal.toFixed(2),
                    line_total: lineTotal.toFixed(2),
                    product_name: prod.product_title,
                    product_image_url: prod.primary_image_url,
                    product_sku: prod.sku,
                });
            }

            await db.update(carts).set({
                subtotal: subtotal.toFixed(2),
                grand_total: grandTotal.toFixed(2),
            }).where(eq(carts.id, cart.id));

            console.log(`   ✅ Added ${cartProducts.length} items to cart`);
        } else {
            console.log('   ℹ️  Cart already exists');
        }

        // 6. Seed Wishlist
        console.log('\n❤️ Seeding wishlist...');
        const [existingWishlist] = await db.select().from(wishlists).where(
            eq(wishlists.user_id, testUser.id)
        ).limit(1);

        let wishlist;
        if (!existingWishlist) {
            [wishlist] = await db.insert(wishlists).values({
                user_id: testUser.id,
                access_token: generateAccessToken(),
                status: true,
            }).returning();

            const wishlistProducts = allProducts.slice(3, 7);
            for (const prod of wishlistProducts) {
                await db.insert(wishlistItems).values({
                    wishlist_id: wishlist.id,
                    product_id: prod.id,
                    notes: `Added ${prod.product_title} to wishlist`,
                });
            }
            console.log(`   ✅ Added ${wishlistProducts.length} items to wishlist`);
        } else {
            wishlist = existingWishlist;
            console.log('   ℹ️  Wishlist already exists');
        }

        // 7. Seed Orders
        console.log('\n📦 Seeding orders...');
        const existingOrders = await db.select().from(orders).where(eq(orders.user_id, testUser.id));

        if (existingOrders.length === 0) {
            const orderStatuses = [
                { status: 'delivered', payment: 'paid', fulfillment: 'fulfilled' },
                { status: 'shipped', payment: 'paid', fulfillment: 'partial' },
                { status: 'pending', payment: 'pending', fulfillment: 'unfulfilled' },
            ] as const;

            for (let i = 0; i < 3; i++) {
                const orderProducts = allProducts.slice(i * 2, (i + 1) * 2);
                if (orderProducts.length === 0) continue;

                let subtotal = 0;
                let totalQty = 0;

                // Calculate product totals
                for (const prod of orderProducts) {
                    const qty = Math.floor(Math.random() * 2) + 1;
                    subtotal += Number(prod.selling_price) * qty;
                    totalQty += qty;
                }

                // Tax Calculation (18% GST)
                const taxRate = 0.18;
                const taxAmount = subtotal * taxRate;
                const totalAmount = subtotal + taxAmount;

                // GST Breakdown
                // Alternating between Intra-state (CGST+SGST) and Inter-state (IGST)
                const isIntraState = i % 2 === 0;
                const cgst = isIntraState ? taxAmount / 2 : 0;
                const sgst = isIntraState ? taxAmount / 2 : 0;
                const igst = isIntraState ? 0 : taxAmount;

                // Create order
                const [order] = await db.insert(orders).values({
                    order_number: generateOrderNumber(),
                    user_id: testUser.id,
                    shipping_address_id: shippingAddress?.id,
                    billing_address_id: billingAddress?.id,
                    channel: 'web',
                    order_status: orderStatuses[i].status as any,
                    payment_status: orderStatuses[i].payment as any,
                    payment_method: i === 2 ? 'cod' : 'card',
                    fulfillment_status: orderStatuses[i].fulfillment as any,
                    currency: 'INR',
                    subtotal: subtotal.toFixed(2),
                    discount_amount: '0.00',
                    shipping_amount: '0.00',

                    // Tax fields
                    tax_rule_id: gstTaxRule?.id,
                    tax_amount: taxAmount.toFixed(2),
                    cgst: cgst.toFixed(2),
                    sgst: sgst.toFixed(2),
                    igst: igst.toFixed(2),

                    total_amount: totalAmount.toFixed(2),
                    total_quantity: totalQty,
                    created_by: testUser.id,
                    updated_by: testUser.id,
                }).returning();

                // Create order items
                for (const prod of orderProducts) {
                    const qty = Math.floor(Math.random() * 2) + 1;
                    const lineTotal = Number(prod.selling_price) * qty;

                    await db.insert(orderItems).values({
                        order_id: order.id,
                        product_id: prod.id,
                        sku: prod.sku,
                        product_name: prod.product_title,
                        product_image: prod.primary_image_url,
                        cost_price: prod.selling_price,
                        quantity: qty,
                        line_total: lineTotal.toFixed(2),
                        quantity_fulfilled: orderStatuses[i].fulfillment === 'fulfilled' ? qty : 0,
                    });
                }
            }
            console.log('   ✅ Created 3 orders with different statuses and tax calculations');
        } else {
            console.log(`   ℹ️  ${existingOrders.length} orders already exist`);
        }

        // 8. Seed Reviews
        console.log('\n⭐ Seeding reviews...');
        const existingReviews = await db.select().from(reviews).where(eq(reviews.user_id, testUser.id));

        if (existingReviews.length === 0) {
            const reviewStatuses = ['approved', 'approved', 'pending', 'rejected'] as const;

            // ... (keep review content logic)
            const reviewContent = [
                { title: 'Great!', comment: 'Loved it', rating: 5 },
                { title: 'Good', comment: 'Nice product', rating: 4 },
                { title: 'Okay', comment: 'Average', rating: 3 },
                { title: 'Bad', comment: 'Not good', rating: 2 },
            ];

            for (let i = 0; i < Math.min(4, allProducts.length); i++) {
                await db.insert(reviews).values({
                    product_id: allProducts[i].id,
                    user_id: testUser.id,
                    rating: reviewContent[i].rating,
                    title: reviewContent[i].title,
                    comment: reviewContent[i].comment,
                    is_verified_purchase: i < 2,
                    status: reviewStatuses[i],
                    helpful_votes: Math.floor(Math.random() * 20),
                });
            }
            console.log('   ✅ Created reviews');
        } else {
            console.log('   ℹ️  Reviews already exist');
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 E-commerce data seeding completed successfully!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error seeding e-commerce data:', error);
        throw error;
    } finally {
        await closeDatabase();
        process.exit(0);
    }
}

// Run the seed
seedEcommerceData().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
