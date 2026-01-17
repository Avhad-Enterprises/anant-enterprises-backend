
/**
 * Seed Script: Inventory and Cart
 *
 * Usage: npx tsx scripts/seed-inventory-cart.ts
 *
 * 1. Ensures a default inventory location exists.
 * 2. Scans all products; if no inventory exists, creates 100 units.
 * 3. Creates a sample cart for a test user with random items.
 */

import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { inventory } from '../src/features/inventory/shared/inventory.schema';
import { inventoryLocations } from '../src/features/inventory/shared/inventory-locations.schema';
import { inventoryAdjustments } from '../src/features/inventory/shared/inventory-adjustments.schema';
import { carts } from '../src/features/cart/shared/carts.schema';
import { cartItems } from '../src/features/cart/shared/cart-items.schema';
import { users } from '../src/features/user/shared/user.schema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seedInventoryAndCart() {
    console.log('🌱 Starting Inventory and Cart Seeding...');

    try {
        // ==========================================
        // 1. INVENTORY SEEDING
        // ==========================================

        // Ensure Main Warehouse Exists
        let [location] = await db.select().from(inventoryLocations).where(eq(inventoryLocations.location_code, 'WH-MAIN-01'));

        if (!location) {
            console.log('📍 Creating Default Main Warehouse...');
            [location] = await db.insert(inventoryLocations).values({
                location_code: 'WH-MAIN-01',
                name: 'Main Warehouse',
                type: 'warehouse',
                city: 'Mumbai',
                is_active: true
            }).returning();
        } else {
            console.log('📍 Using existing Main Warehouse:', location.name);
        }

        // Fetch user for adjustments/cart
        const [adminUser] = await db.select().from(users).limit(1);
        if (!adminUser) {
            console.warn('⚠️ No users found! Cannot attribute adjustments or create user cart.');
            // We can continue without adminId for adjustments, but cart creation might fail key constraints if we try to link to user
        }

        // Fetch all products
        const allProducts = await db.select().from(products);
        console.log(`📦 Found ${allProducts.length} products. Checking inventory...`);

        let newInventoryCount = 0;

        for (const product of allProducts) {
            try {
                // Check if inventory exists for this product at this location
                const existingInv = await db.select().from(inventory).where(
                    require('drizzle-orm').and(
                        eq(inventory.product_id, product.id),
                        eq(inventory.location_id, location.id)
                    )
                );

                if (existingInv.length === 0) {
                    // Create inventory
                    const initialQty = 100;
                    try {
                        const [inv] = await db.insert(inventory).values({
                            product_id: product.id,
                            location_id: location.id,
                            product_name: product.product_title,
                            sku: product.sku,
                            available_quantity: initialQty,
                            reserved_quantity: 0,
                            status: 'in_stock',
                            condition: 'sellable',
                        }).returning();

                        // Create adjustment log
                        if (adminUser) {
                            await db.insert(inventoryAdjustments).values({
                                inventory_id: inv.id,
                                adjustment_type: 'increase',
                                quantity_change: initialQty,
                                reason: 'Seeding Script',
                                quantity_before: 0,
                                quantity_after: initialQty,
                                adjusted_by: adminUser.id,
                                notes: 'Auto-seeded'
                            });
                        }
                        newInventoryCount++;
                    } catch (invError: any) {
                        console.error(`❌ Failed to insert inventory for product ${product.sku}:`, JSON.stringify(invError, null, 2));
                        // throw invError; // Keep going for other products? No, probably all will fail.
                        throw invError;
                    }
                }
            } catch (loopError) {
                throw loopError;
            }
        }
        console.log(`✅ Created inventory records for ${newInventoryCount} products.`);


        // ==========================================
        // 2. CART SEEDING
        // ==========================================
        console.log('\n🛒 Seeding Carts...');

        if (!adminUser) {
            console.log('❌ Skipping Cart Seeding: No user found to attach cart to.');
            return;
        }

        // Clean up existing active carts for this user to avoid clutter
        const existingCarts = await db.select().from(carts).where(
            require('drizzle-orm').and(
                eq(carts.user_id, adminUser.id),
                eq(carts.cart_status, 'active')
            )
        );

        if (existingCarts.length > 0) {
            console.log(`ℹ️  User ${adminUser.email} already has ${existingCarts.length} active cart(s). Skipping new cart creation.`);
        } else {
            console.log(`creating new cart for ${adminUser.email}`);

            // Create a new cart
            const [newCart] = await db.insert(carts).values({
                user_id: adminUser.id,
                currency: 'INR',
                cart_status: 'active',
                source: 'web',
            }).returning();

            // Add 1-3 random products
            const shuffled = allProducts.sort(() => 0.5 - Math.random());
            const selectedProducts = shuffled.slice(0, 3);

            let subtotal = 0;

            for (const prod of selectedProducts) {
                const qty = Math.floor(Math.random() * 3) + 1; // 1 to 3
                const price = Number(prod.selling_price || prod.cost_price || 0);
                const lineTotal = price * qty;

                await db.insert(cartItems).values({
                    cart_id: newCart.id,
                    product_id: prod.id,
                    quantity: qty,
                    cost_price: prod.cost_price || '0',
                    final_price: price.toString(),
                    line_subtotal: lineTotal.toString(),
                    line_total: lineTotal.toString(),
                    product_name: prod.product_title,
                    product_sku: prod.sku,
                    product_image_url: prod.primary_image_url
                });

                subtotal += lineTotal;
            }

            // Update cart totals
            await db.update(carts).set({
                subtotal: subtotal.toString(),
                grand_total: subtotal.toString(), // assuming no tax/shipping for seed
            }).where(eq(carts.id, newCart.id));

            console.log(`✅ Created active cart [${newCart.id}] with ${selectedProducts.length} items for user ${adminUser.email}`);
        }

        console.log('\n🎉 Inventory and Cart Seeding Completed!');

    } catch (error) {
        console.error('❌ Error seeding inventory and cart:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seedInventoryAndCart();
