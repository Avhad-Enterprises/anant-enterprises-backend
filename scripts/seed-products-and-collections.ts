/**
 * Seed Script: Products and Collections (Enhanced)
 *
 * Creates comprehensive test data for:
 * - Nested Tiers (Levels 1-4)
 * - Diverse Products (Active, Draft, Archived, Out of Stock, No Image)
 * - Multi-Location Inventory (Warehouse + Retail Stores)
 * - Collections & Relationships
 *
 * Usage: npx tsx scripts/seed-products-and-collections.ts
 */

import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { collections } from '../src/features/collection/shared/collection.schema';
import { collectionProducts } from '../src/features/collection/shared/collection-products.schema';
import { tiers } from '../src/features/tiers/shared/tiers.schema';
import { inventoryLocations } from '../src/features/inventory/shared/inventory-locations.schema';
import { inventory } from '../src/features/inventory/shared/inventory.schema';
import { inventoryAdjustments } from '../src/features/inventory/shared/inventory-adjustments.schema';
import { users } from '../src/features/user/shared/user.schema';
import { like, inArray, eq } from 'drizzle-orm';

// ============================================
// SEED DATA DEFINITIONS
// ============================================

const TEST_SKU_PREFIXES = [
    'AP-', 'PF-', 'COMM-', 'ACC-', 'SP-', 'LE-', 'DRAFT-', 'ARCH-', 'SCHED-', 'BULK-', 'NEST-', 'NOIMG-', 'MEM-'
];

const TEST_COLLECTION_SLUGS = [
    'best-sellers', 'new-arrivals', 'budget-friendly', 'premium-collection', 'draft-collection'
];

async function seedData() {
    console.log('🌱 Starting comprehensive seed for Products, Tiers, and Inventory...\n');

    try {
        // Fetch a user for audit trails
        const [adminUser] = await db.select().from(users).limit(1);
        const adminId = adminUser?.id;

        if (!adminId) {
            console.warn('⚠️  No users found. Inventory adjustments will have null adjusted_by.');
        }

        // ============================================
        // STEP 1: FORCE CLEANUP
        // ============================================
        console.log('🧹 Step 1: Force cleaning relevant tables...');

        await db.delete(inventoryAdjustments);
        await db.delete(inventory);
        await db.delete(collectionProducts);
        await db.delete(products);
        // Tiers have self-referencing FKs, might need to match level or cascade. 
        // Drizzle delete might fail if FK constraints exist and no cascade.
        // But schema says: category_tier_1: references(() => tiers.id, { onDelete: 'set null' }) in products
        // Tiers parent_id: references(() => tiers.id) - default restrict?
        // Let's try deleting tiers. If it fails due to self-ref, we might need multiple passes or simple delete if cascade is on.
        // Assuming cascade or delete all works for self-referencing if done in one transaction or if DB handles it.
        // For self-referencing tiers, we can just delete all.
        await db.delete(tiers); 
        await db.delete(collections);
        await db.delete(inventoryLocations);
        
        console.log('   ✅ Tables cleaned');


        // ============================================
        // STEP 2: INSERT TIERS (Level 1 - 4)
        // ============================================
        console.log('📁 Step 2: Inserting Tiers (Levels 1-4)...');

        // Level 1
        const [residential] = await db.insert(tiers).values({ name: 'Residential Purifiers', code: 'residential-purifiers', level: 1, priority: 1 }).returning();
        const [commercial] = await db.insert(tiers).values({ name: 'Commercial Purifiers', code: 'commercial-purifiers', level: 1, priority: 2 }).returning();
        const [accessories] = await db.insert(tiers).values({ name: 'Accessories', code: 'accessories', level: 1, priority: 3 }).returning();

        // Level 2
        const [roSystems] = await db.insert(tiers).values({ name: 'RO Systems', code: 'ro-systems', level: 2, parent_id: residential.id, priority: 1 }).returning();
        const [uvSystems] = await db.insert(tiers).values({ name: 'UV Systems', code: 'uv-systems', level: 2, parent_id: residential.id, priority: 2 }).returning();
        const [spareParts] = await db.insert(tiers).values({ name: 'Spare Parts', code: 'spare-parts', level: 2, parent_id: accessories.id, priority: 1 }).returning();

        // Level 3
        const [underSink] = await db.insert(tiers).values({ name: 'Under Sink RO', code: 'under-sink', level: 3, parent_id: roSystems.id, priority: 1 }).returning();
        const [counterTop] = await db.insert(tiers).values({ name: 'Counter Top RO', code: 'counter-top', level: 3, parent_id: roSystems.id, priority: 2 }).returning();
        const [membranes] = await db.insert(tiers).values({ name: 'Membranes', code: 'membranes', level: 3, parent_id: spareParts.id, priority: 1 }).returning();
        const [filters] = await db.insert(tiers).values({ name: 'Filters', code: 'filters', level: 3, parent_id: spareParts.id, priority: 2 }).returning();

        // Level 4
        const [membranes100] = await db.insert(tiers).values({ name: '100 GPD Membranes', code: '100-gpd-membranes', level: 4, parent_id: membranes.id, priority: 1 }).returning();
        const [membranes50] = await db.insert(tiers).values({ name: '50 GPD Membranes', code: '50-gpd-membranes', level: 4, parent_id: membranes.id, priority: 2 }).returning();

        console.log('   ✅ Inserted deeply nested tiers');

        // ============================================
        // STEP 3: INSERT PRODUCTS (Diverse Types)
        // ============================================
        console.log('📦 Step 3: Inserting Diverse Products...');

        const productData = [
            // 1. Standard Active Product
            {
                slug: 'aquapure-ro-500',
                product_title: 'AquaPure RO 500',
                secondary_title: 'Advanced RO Purifier',
                short_description: '7-stage RO+UV purification with 12L storage',
                sku: 'AP-RO-500',
                status: 'active' as const,
                cost_price: '7000.00',
                selling_price: '12999.00',
                brand_name: 'AquaPure',
                category_tier_1: residential.id,
                category_tier_2: roSystems.id,
                category_tier_3: counterTop.id,
                primary_image_url: 'https://images.unsplash.com/photo-1628239532623-c035054bff4e?w=800&auto=format&fit=crop&q=80',
            },
            // 2. Deeply Nested Product
            {
                slug: 'ro-membrane-100gpd-pro',
                product_title: 'Pro RO Membrane 100GPD',
                secondary_title: 'High Flow Membrane',
                short_description: 'Professional grade 100 GPD membrane',
                sku: 'NEST-RO-100',
                status: 'active' as const,
                cost_price: '900.00',
                selling_price: '1899.00',
                brand_name: 'Generic',
                category_tier_1: accessories.id,
                category_tier_2: spareParts.id,
                category_tier_3: membranes.id,
                category_tier_4: membranes100.id,
                primary_image_url: 'https://images.unsplash.com/photo-1585834882572-8813f88d74b2?w=800&auto=format&fit=crop&q=80',
            },
            // 3. Out of Stock Product
            {
                slug: 'archived-model-x',
                product_title: 'Model X - Legacy',
                short_description: 'This item is out of stock',
                sku: 'AP-X-OLD',
                status: 'active' as const,
                cost_price: '4000.00',
                selling_price: '7999.00',
                brand_name: 'AquaPure',
                category_tier_1: residential.id,
                primary_image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&auto=format&fit=crop&q=80',
                // Special flag for our script to set 0 inventory
                _stock_config: { main: 0, bandra: 0, andheri: 0 }
            },
            // 4. Low Stock Product
            {
                slug: 'limited-edition-silver',
                product_title: 'Limited Edition Silver',
                secondary_title: 'Only a few left!',
                short_description: 'Premium silver finish',
                sku: 'LE-SILVER-01',
                status: 'active' as const,
                cost_price: '12000.00',
                selling_price: '21999.00',
                brand_name: 'AquaPure',
                category_tier_1: residential.id,
                is_limited_edition: true,
                primary_image_url: 'https://images.unsplash.com/photo-1617196034183-f8a455a2de0d?w=800&auto=format&fit=crop&q=80',
                _stock_config: { main: 2, bandra: 0, andheri: 1 }
            },
            // 5. No Image Product
            {
                slug: 'no-image-filter',
                product_title: 'Generic Filter (No Image)',
                short_description: 'Testing placeholder image fallback',
                sku: 'NOIMG-001',
                status: 'active' as const,
                cost_price: '150.00',
                selling_price: '300.00',
                brand_name: 'Generic',
                category_tier_1: accessories.id,
                primary_image_url: null,
            },
            // 6. Long Text Product
            {
                slug: 'long-description-product',
                product_title: 'Super Ultra Max Pro Plus Advanced Water Purification System 5000',
                secondary_title: 'The most verbose product title in existence to test UI breaking points',
                short_description: 'This is a very long short description that should probably be truncated in the card view but shown fully in the detail view. It goes on and on to test the limits of your layout.',
                full_description: '<p>This is the full description. It contains <strong>HTML</strong> and lots of text.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
                sku: 'AP-LONG-01',
                status: 'active' as const,
                cost_price: '10000.00',
                selling_price: '15000.00',
                brand_name: 'AquaPure',
                category_tier_1: residential.id,
                primary_image_url: 'https://images.unsplash.com/photo-1563854593-6c84c633a697?w=800&auto=format&fit=crop&q=80',
            },

            // 7. Bulk Item
            {
                slug: 'bulk-connectors',
                product_title: 'Pipe Connectors (Pack of 100)',
                short_description: 'Industrial fasteners',
                sku: 'BULK-CON-01',
                status: 'active' as const,
                cost_price: '100.00',
                selling_price: '500.00',
                brand_name: 'Generic',
                category_tier_1: accessories.id,
                primary_image_url: 'https://images.unsplash.com/photo-1589365278144-96e001805ffa?w=800&auto=format&fit=crop&q=80',
                _stock_config: { main: 5000, bandra: 1000, andheri: 1000 }
            },
            // ==========================================
            // NEW SEED DATA FOR TESTING FILTERS
            // ==========================================
            // 8. 50 GPD Membrane (High End)
            {
                slug: 'dow-filmtec-50gpd',
                product_title: 'DOW Filmtec 50 GPD Membrane',
                secondary_title: 'Original USA Made',
                short_description: 'The gold standard in RO purification.',
                sku: 'MEM-50-DOW',
                status: 'active' as const,
                cost_price: '1200.00',
                selling_price: '2450.00',
                brand_name: 'DOW',
                category_tier_1: accessories.id,
                category_tier_2: spareParts.id,
                category_tier_3: membranes.id,
                category_tier_4: membranes50.id, // Linked to 50 GPD
                primary_image_url: 'https://images.unsplash.com/photo-1616400619175-5beda3a17896?w=800&auto=format&fit=crop&q=80',
            },
            // 9. 50 GPD Membrane (Budget)
            {
                slug: 'vontron-50gpd',
                product_title: 'Vontron 50 GPD Membrane',
                secondary_title: 'Reliable Performance',
                short_description: 'Cost-effective membrane for home use.',
                sku: 'MEM-50-VON',
                status: 'active' as const,
                cost_price: '400.00',
                selling_price: '850.00',
                brand_name: 'Vontron',
                category_tier_1: accessories.id,
                category_tier_2: spareParts.id,
                category_tier_3: membranes.id,
                category_tier_4: membranes50.id, // Linked to 50 GPD
                primary_image_url: 'https://images.unsplash.com/photo-1616400619175-5beda3a17896?w=800&auto=format&fit=crop&q=80',
            },
            // 10. 100 GPD Membrane (Economy)
            {
                slug: 'csm-100gpd',
                product_title: 'CSM 100 GPD Membrane',
                secondary_title: 'High Flow Rate',
                short_description: 'Great for commercial applications.',
                sku: 'MEM-100-CSM',
                status: 'active' as const,
                cost_price: '800.00',
                selling_price: '1600.00',
                brand_name: 'CSM',
                category_tier_1: accessories.id,
                category_tier_2: spareParts.id,
                category_tier_3: membranes.id,
                category_tier_4: membranes100.id, // Linked to 100 GPD
                primary_image_url: 'https://images.unsplash.com/photo-1585834882572-8813f88d74b2?w=800&auto=format&fit=crop&q=80',
            },
            // 11. 100 GPD Membrane (Premium)
            {
                slug: 'lg-chem-100gpd',
                product_title: 'LG Chem 100 GPD NanoH2O',
                secondary_title: 'Nano Technology',
                short_description: 'Advanced thin-film nanocomposite membrane.',
                sku: 'MEM-100-LG',
                status: 'active' as const,
                cost_price: '1500.00',
                selling_price: '2800.00',
                brand_name: 'LG',
                category_tier_1: accessories.id,
                category_tier_2: spareParts.id,
                category_tier_3: membranes.id,
                category_tier_4: membranes100.id, // Linked to 100 GPD
                primary_image_url: 'https://images.unsplash.com/photo-1585834882572-8813f88d74b2?w=800&auto=format&fit=crop&q=80',
            }
        ];

        // Additional filler products for collections
        const fillerProducts = [
            {
                slug: 'pureflow-uv-pro',
                product_title: 'PureFlow UV Pro',
                sku: 'PF-UV-PRO',
                status: 'active' as const,
                cost_price: '3500.00',
                selling_price: '6499.00',
                category_tier_1: residential.id,
                primary_image_url: 'https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=800&auto=format&fit=crop&q=80',
            },
            {
                slug: 'commercial-ro-1000',
                product_title: 'Commercial RO 1000',
                sku: 'COMM-RO-1000',
                status: 'active' as const,
                cost_price: '25000.00',
                selling_price: '45000.00',
                category_tier_1: commercial.id,
                primary_image_url: 'https://images.unsplash.com/photo-1563854593-6c84c633a697?w=800&auto=format&fit=crop&q=80',
            }
        ];

        const allProductData = [...productData, ...fillerProducts];

        // Clean _stock_config before insert
        const dbProductData = allProductData.map(({ _stock_config, ...rest }) => rest);

        const insertedProducts = await db.insert(products).values(dbProductData).returning();
        console.log(`   ✅ Inserted ${insertedProducts.length} products`);

        const productMap = new Map(insertedProducts.map(p => [p.sku, p]));

        // ============================================
        // STEP 4: INSERT LOCATIONS
        // ============================================
        console.log('📍 Step 4: Inserting Inventory Locations...');

        const locations = await db.insert(inventoryLocations).values([
            {
                location_code: 'WH-MAIN-01',
                name: 'Main Warehouse',
                type: 'warehouse',
                city: 'Mumbai',
                is_active: true
            },
            {
                location_code: 'RET-BND-01',
                name: 'Bandra Store',
                type: 'store',
                city: 'Mumbai',
                is_active: true
            },
            {
                location_code: 'RET-AND-01',
                name: 'Andheri Store',
                type: 'store',
                city: 'Mumbai',
                is_active: true
            }
        ]).returning();

        const [mainWH, bandraStore, andheriStore] = locations;
        console.log('   ✅ Inserted 3 locations');

        // ============================================
        // STEP 5: SEED INVENTORY & ADJUSTMENTS
        // ============================================
        console.log('📦 Step 5: Seeding Inventory & Adjustments...');

        for (const prodData of allProductData) {
            const product = productMap.get(prodData.sku)!;
            const config = (prodData as any)._stock_config || { main: 50, bandra: 10, andheri: 10 };

            // 1. Main Warehouse
            if (config.main !== undefined) {
                await seedInv(product, mainWH, config.main, adminId);
            }
            // 2. Bandra Store
            if (config.bandra !== undefined) {
                await seedInv(product, bandraStore, config.bandra, adminId);
            }
            // 3. Andheri Store
            if (config.andheri !== undefined) {
                await seedInv(product, andheriStore, config.andheri, adminId);
            }
        }
        console.log('   ✅ Inventory and adjustments created');

        // ============================================
        // STEP 6: COLLECTIONS
        // ============================================
        console.log('🗂️  Step 6: Creating Collections...');

        const [bestSellers] = await db.insert(collections).values({
            title: 'Best Sellers',
            slug: 'best-sellers',
            type: 'manual',
            status: 'active',
            banner_image_url: 'https://placehold.co/1200x400/0066cc/white?text=Best+Sellers',
        }).returning();

        const [newArrivals] = await db.insert(collections).values({
            title: 'New Arrivals',
            slug: 'new-arrivals',
            type: 'manual',
            status: 'active',
            banner_image_url: 'https://placehold.co/1200x400/00cc66/white?text=New+Arrivals',
        }).returning();

        // Link products
        await db.insert(collectionProducts).values([
            { collection_id: bestSellers.id, product_id: productMap.get('AP-RO-500')!.id, position: 1 },
            { collection_id: bestSellers.id, product_id: productMap.get('LE-SILVER-01')!.id, position: 2 },
            { collection_id: newArrivals.id, product_id: productMap.get('NEST-RO-100')!.id, position: 1 },
            { collection_id: newArrivals.id, product_id: productMap.get('BULK-CON-01')!.id, position: 2 },
        ]);
        console.log('   ✅ Collections linked');

        console.log('\n🎉 Seed Complete!');

    } catch (error) {
        console.error('❌ Error seeding:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

async function seedInv(product: any, location: any, qty: number, adminId: string | undefined) {
    // defaults
    const required = 20;
    let status: "Enough Stock" | "Low Stock" | "Shortage" = 'Enough Stock';
    if (qty === 0) status = 'Shortage';
    else if (qty < required) status = 'Low Stock';

    const [inv] = await db.insert(inventory).values({
        product_id: product.id,
        location_id: location.id,
        product_name: product.product_title,
        sku: product.sku,
        required_quantity: required,
        available_quantity: qty,
        reserved_quantity: 0,
        status: status,
        location: location.name,
    }).returning();

    // Create adjustment log
    if (adminId) {
        await db.insert(inventoryAdjustments).values({
            inventory_id: inv.id,
            adjustment_type: 'increase',
            quantity_change: qty,
            reason: 'Initial Stock Import',
            quantity_before: 0,
            quantity_after: qty,
            adjusted_by: adminId,
            notes: 'Seeded via script',
        });
    }
}

function sqlOr(conditions: any[]) {
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    // Simple recursive OR for array of conditions
    return conditions.reduce((acc, curr) => (acc ? require('drizzle-orm').or(acc, curr) : curr), undefined);
}

seedData();
