/**
 * Seed Script: Complete E-commerce Data
 *
 * Seeds comprehensive test data for all features:
 * - User addresses
 * - Carts with cart items
 * - Wishlists with wishlist items
 * - Orders with order items
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
import { inventory } from '../src/features/inventory/shared/inventory.schema';
import { carts } from '../src/features/cart/shared/carts.schema';
import { cartItems } from '../src/features/cart/shared/cart-items.schema';
import { wishlists } from '../src/features/wishlist/shared/wishlist.schema';
import { wishlistItems } from '../src/features/wishlist/shared/wishlist-items.schema';
import { orders } from '../src/features/orders/shared/orders.schema';
import { orderItems } from '../src/features/orders/shared/order-items.schema';
import { reviews } from '../src/features/reviews/shared/reviews.schema';
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
        // 1. Get existing users
        console.log('📋 Fetching existing users...');
        const allUsers = await db.select().from(users).where(eq(users.is_deleted, false));

        if (allUsers.length === 0) {
            console.log('\n⚠️  No users found in database.');
            console.log('   Please run: npm run db:seed first to create users.\n');
            console.log('   Alternatively, you can use the create-admin script:');
            console.log('   npm run create-admin\n');
            return;
        }

        const testUser = allUsers.find(u => u.email === 'user@gmail.com') || allUsers[0];
        const adminUser = allUsers.find(u => u.email === 'admin@example.com') || allUsers[0];
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
            console.log('   This will create test products to use.\n');
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
                        is_default: false,
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
                shippingAddress = existingAddresses[0];
                billingAddress = existingAddresses[1] || existingAddresses[0];
                console.log('   ℹ️  Addresses already exist, using existing');
            }
        } catch (error: any) {
            console.log('   ⚠️  Address creation failed (may need migration):', error.message?.slice(0, 50));
            console.log('   ℹ️  Continuing without addresses - orders will use null address IDs');
        }

        // 4. Seed Inventory - SKIPPED (handled by products seed script)
        console.log('\n📊 Inventory handled by products seed - skipping...');

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
            console.log('   ✅ Created cart');

            // Add 3 items to cart
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

            // Update cart totals
            await db.update(carts).set({
                subtotal: subtotal.toFixed(2),
                grand_total: grandTotal.toFixed(2),
            }).where(eq(carts.id, cart.id));

            console.log(`   ✅ Added ${cartProducts.length} items to cart`);
        } else {
            cart = existingCart;
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
            console.log('   ✅ Created wishlist');

            // Add 4 products to wishlist
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

        // 7. Seed Orders (3 orders with different statuses)
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

                let totalAmount = 0;
                let totalQty = 0;

                // Calculate totals
                for (const prod of orderProducts) {
                    const qty = Math.floor(Math.random() * 2) + 1;
                    totalAmount += Number(prod.selling_price) * qty;
                    totalQty += qty;
                }

                // Create order
                const [order] = await db.insert(orders).values({
                    order_number: generateOrderNumber(),
                    user_id: testUser.id,
                    shipping_address_id: shippingAddress.id,
                    billing_address_id: billingAddress.id,
                    channel: 'web',
                    order_status: orderStatuses[i].status,
                    payment_status: orderStatuses[i].payment,
                    payment_method: i === 2 ? 'cod' : 'card',
                    fulfillment_status: orderStatuses[i].fulfillment,
                    currency: 'INR',
                    subtotal: totalAmount.toFixed(2),
                    discount_amount: '0.00',
                    shipping_amount: '0.00',
                    tax_amount: '0.00',
                    total_amount: totalAmount.toFixed(2),
                    total_quantity: totalQty,
                    created_by: testUser.id,
                    updated_by: testUser.id,
                }).returning();

                // Create order items
                for (const prod of orderProducts) {
                    const qty = Math.floor(Math.random() * 2) + 1;
                    await db.insert(orderItems).values({
                        order_id: order.id,
                        product_id: prod.id,
                        sku: prod.sku,
                        product_name: prod.product_title,
                        product_image: prod.primary_image_url,
                        cost_price: prod.selling_price,
                        quantity: qty,
                        line_total: (Number(prod.selling_price) * qty).toFixed(2),
                        quantity_fulfilled: orderStatuses[i].fulfillment === 'fulfilled' ? qty : 0,
                    });
                }

                // Update wishlist items if order is delivered
                if (orderStatuses[i].status === 'delivered') {
                    for (const prod of orderProducts) {
                        await db.update(wishlistItems).set({
                            purchased_at: new Date(),
                            order_id: order.id,
                        }).where(
                            and(
                                eq(wishlistItems.wishlist_id, wishlist.id),
                                eq(wishlistItems.product_id, prod.id)
                            )
                        );
                    }
                }
            }
            console.log('   ✅ Created 3 orders with different statuses');
        } else {
            console.log(`   ℹ️  ${existingOrders.length} orders already exist`);
        }

        // 8. Seed Reviews
        console.log('\n⭐ Seeding reviews...');
        const existingReviews = await db.select().from(reviews).where(eq(reviews.user_id, testUser.id));

        if (existingReviews.length === 0) {
            const reviewStatuses = ['approved', 'approved', 'pending', 'rejected'] as const;
            const ratings = [5, 4, 3, 2];
            const reviewTexts = [
                { title: 'Excellent product!', comment: 'This water purifier has changed our lives. Crystal clear water every day. Highly recommended for families!' },
                { title: 'Good value for money', comment: 'Solid build quality and easy installation. Works as expected. Worth the price.' },
                { title: 'Decent quality', comment: 'Average performance, nothing extraordinary. Gets the job done.' },
                { title: 'Could be better', comment: 'Had some issues with the filter. Customer service was helpful though.' },
            ];

            for (let i = 0; i < Math.min(4, allProducts.length); i++) {
                await db.insert(reviews).values({
                    product_id: allProducts[i].id,
                    user_id: testUser.id,
                    rating: ratings[i],
                    title: reviewTexts[i].title,
                    comment: reviewTexts[i].comment,
                    is_verified_purchase: i < 2, // First 2 are verified
                    status: reviewStatuses[i],
                    helpful_votes: Math.floor(Math.random() * 20),
                    admin_reply: reviewStatuses[i] === 'approved' && i === 0
                        ? 'Thank you for your kind words! We appreciate your feedback.'
                        : null,
                });
            }
            console.log('   ✅ Created 4 reviews with different statuses');
        } else {
            console.log(`   ℹ️  ${existingReviews.length} reviews already exist`);
        }

        // 9. Final summary
        console.log('\n' + '='.repeat(50));
        console.log('🎉 E-commerce data seeding completed successfully!');
        console.log('='.repeat(50));
        console.log('\n📋 Summary:');
        console.log(`   👤 User: ${testUser.email}`);
        console.log('   🏠 Addresses: Home (Mumbai), Office (Bangalore)');
        console.log('   🛒 Cart: Active with items');
        console.log('   ❤️ Wishlist: Created with items');
        console.log('   📦 Orders: 3 (delivered, shipped, pending)');
        console.log('   ⭐ Reviews: 4 (2 approved, 1 pending, 1 rejected)');
        console.log('\n💡 All data is linked with proper FK relationships!');

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
