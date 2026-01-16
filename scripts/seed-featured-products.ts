/**
 * Seed Script: Featured Products
 *
 * Seeds 4 specific featured products matching the frontend mock data.
 * Usage: npx tsx scripts/seed-featured-products.ts
 */

import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { tiers } from '../src/features/tiers/shared/tiers.schema';
import { inventoryLocations } from '../src/features/inventory/shared/inventory-locations.schema';
import { inventory } from '../src/features/inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../src/features/inventory/shared/inventory-adjustments.schema';
import { users } from '../src/features/user/shared/user.schema';
import { eq } from 'drizzle-orm';

async function seedFeaturedProducts() {
    console.log('🌱 Seeding Featured Products...\n');

    try {
        // Fetch Admin User for audit
        const [adminUser] = await db.select().from(users).limit(1);
        const adminId = adminUser?.id;

        // Fetch Categories (Tiers) - Fallback to creating if not exist (unlikely if full seed ran)
        // We need: "Residential Purifiers" (L1), "Accessories" (L1), "Commercial Purifiers" (L1)
        const allTiers = await db.select().from(tiers);

        let residential = allTiers.find(t => t.code === 'residential-purifiers');
        let accessories = allTiers.find(t => t.code === 'accessories');
        let commercial = allTiers.find(t => t.code === 'commercial-purifiers');

        // If missing, create basic L1s
        if (!residential) {
            [residential] = await db.insert(tiers).values({ name: 'Residential Purifiers', code: 'residential-purifiers', level: 1 }).returning();
        }
        if (!accessories) {
            [accessories] = await db.insert(tiers).values({ name: 'Accessories', code: 'accessories', level: 1 }).returning();
        }
        if (!commercial) {
            [commercial] = await db.insert(tiers).values({ name: 'Commercial', code: 'commercial-purifiers', level: 1 }).returning();
        }

        // Fetch Main Location
        let [mainLocation] = await db.select().from(inventoryLocations).where(eq(inventoryLocations.location_code, 'WH-MAIN-01'));
        if (!mainLocation) {
            // Create if missing
            [mainLocation] = await db.insert(inventoryLocations).values({
                location_code: 'WH-MAIN-01',
                name: 'Main Warehouse',
                type: 'warehouse',
                city: 'Mumbai',
                is_active: true
            }).returning();
        }

        const featuredData = [
            {
                slug: 'anant-pure-x1',
                product_title: 'Anant Pure X1',
                sku: 'ANANT-X1',
                secondary_title: 'Advanced Purification',
                short_description: '7-stage RO+UV+UF purification widely used for municipal water.',
                selling_price: '12999.00',
                cost_price: '8000.00',
                compare_at_price: '18999.00',
                category_tier_1: residential?.id,
                tags: ["RO", "UV", "UF"],
                primary_image_url: '/assets/d0ecf442a41eba8025e1c4e406416a4fc5cccc81.png',
                featured: true,
                status: 'active' as const,
                weight: '8.5'
            },
            {
                slug: 'copper-ionic-pro',
                product_title: 'Copper Ionic Pro',
                sku: 'COPP-ION-PRO',
                secondary_title: 'Health + Taste',
                short_description: 'Advanced alkaline technology with copper infusion for healthy water.',
                selling_price: '16499.00',
                cost_price: '11000.00',
                compare_at_price: '21999.00',
                category_tier_1: residential?.id,
                tags: ["Alkaline", "Copper"],
                primary_image_url: 'https://images.unsplash.com/photo-1613688270362-8b26189c0782?auto=format&fit=crop&q=80&w=600',
                featured: true,
                status: 'active' as const,
                weight: '9.0'
            },
            {
                slug: 'slimfit-under-sink',
                product_title: 'SlimFit Under Sink',
                sku: 'SLIM-US-01',
                secondary_title: 'Space Saver Design',
                short_description: 'Compact under-sink model perfect for modern modular kitchens.',
                selling_price: '14999.00',
                cost_price: '9500.00',
                compare_at_price: '19999.00',
                category_tier_1: residential?.id,
                tags: ["Space Saver"],
                primary_image_url: '/assets/d0ecf442a41eba8025e1c4e406416a4fc5cccc81.png',
                featured: true,
                status: 'active' as const,
                weight: '7.5'
            },
            {
                slug: 'industrial-50l',
                product_title: 'Industrial 50L',
                sku: 'IND-50L',
                secondary_title: 'High Capacity',
                short_description: 'Heavy duty 50L/hour purification for offices and factories.',
                selling_price: '28999.00',
                cost_price: '20000.00',
                compare_at_price: '35000.00',
                category_tier_1: commercial?.id,
                tags: ["Commercial"],
                primary_image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
                featured: true,
                status: 'active' as const,
                weight: '25.0'
            }
        ];

        console.log(`📦 Upserting ${featuredData.length} featured products...`);

        for (const pData of featuredData) {
            // Check if exists by SKU
            const existing = await db.query.products.findFirst({
                where: eq(products.sku, pData.sku)
            });

            let productId: string;

            if (existing) {
                // Update
                console.log(`   Updating: ${pData.product_title}`);
                const [updated] = await db.update(products)
                    .set({
                        ...pData,
                        updated_at: new Date()
                    })
                    .where(eq(products.id, existing.id))
                    .returning();
                productId = updated.id;
            } else {
                // Insert
                console.log(`   Creating: ${pData.product_title}`);
                const [inserted] = await db.insert(products).values(pData).returning();
                productId = inserted.id;
            }

            // Ensure Inventory
            const invExists = await db.query.inventory.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.product_id, productId),
                    eq(inv.location_id, mainLocation.id)
                )
            });

            if (!invExists) {
                const [newInv] = await db.insert(inventory).values({
                    product_id: productId,
                    location_id: mainLocation.id,
                    product_name: pData.product_title,
                    sku: pData.sku,
                    available_quantity: 50,
                    required_quantity: 10,
                    status: 'Enough Stock',
                    location: mainLocation.name
                }).returning();

                if (adminId) {
                    await db.insert(inventoryAdjustments).values({
                        inventory_id: newInv.id,
                        adjustment_type: 'increase',
                        quantity_change: 50,
                        reason: 'Initial Stock Import',
                        quantity_before: 0,
                        quantity_after: 50,
                        adjusted_by: adminId,
                        notes: 'Seeded via featured products script',
                    });
                }
            }
        }

        console.log('\n🎉 Featured Products Seeded Successfully!');

    } catch (error) {
        console.error('❌ Error seeding featured products:', error);
    } finally {
        process.exit(0);
    }
}

seedFeaturedProducts();
