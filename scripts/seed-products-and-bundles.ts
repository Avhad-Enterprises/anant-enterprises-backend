
import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { bundles, bundleStatusEnum, bundleTypeEnum } from '../src/features/bundles/shared/bundles.schema';
import { bundleItems } from '../src/features/bundles/shared/bundle-items.schema';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seedProductsAndBundles() {
    console.log('🌱 Starting seed for Products and Bundles...');

    // 1. Define Test Data
    const testProducts = [
        {
            slug: 'test-pure-water-bottle-1l',
            product_title: 'Pure Water Bottle 1L',
            sku: 'TEST-PROD-001',
            cost_price: '50.00',
            selling_price: '100.00', // Margin for discount
            compare_at_price: '120.00',
            status: 'active' as const,
            short_description: 'High quality 1L water bottle',
            primary_image_url: 'https://placehold.co/400',
            pickup_location: 'MAIN_WAREHOUSE',
            weight: '0.20'
        },
        {
            slug: 'test-pure-water-filter-cartridge',
            product_title: 'Filter Cartridge (Standard)',
            sku: 'TEST-PROD-002',
            cost_price: '150.00',
            selling_price: '300.00',
            status: 'active' as const,
            short_description: 'Standard replacement cartridge',
            primary_image_url: 'https://placehold.co/400',
            pickup_location: 'MAIN_WAREHOUSE',
            weight: '0.50'
        },
        {
            slug: 'test-digital-tds-meter',
            product_title: 'Digital TDS Meter',
            sku: 'TEST-PROD-003',
            cost_price: '200.00',
            selling_price: '500.00',
            status: 'active' as const,
            short_description: 'Accurate water quality tester',
            primary_image_url: 'https://placehold.co/400',
            pickup_location: 'MAIN_WAREHOUSE',
            weight: '0.10'
        },
        {
            slug: 'test-premium-ro-membrane',
            product_title: 'Premium RO Membrane',
            sku: 'TEST-PROD-004',
            cost_price: '800.00',
            selling_price: '1500.00',
            status: 'active' as const,
            short_description: 'High rejection RO membrane',
            primary_image_url: 'https://placehold.co/400',
            pickup_location: 'MAIN_WAREHOUSE',
            weight: '0.80'
        },
        {
            slug: 'test-installation-kit',
            product_title: 'Installation Kit',
            sku: 'TEST-PROD-005',
            cost_price: '100.00',
            selling_price: '250.00',
            status: 'active' as const,
            short_description: 'Complete piping and connector kit',
            primary_image_url: 'https://placehold.co/400',
            pickup_location: 'MAIN_WAREHOUSE',
            weight: '1.00'
        },
    ];

    // 2. Clean up existing test data
    console.log('🧹 Cleaning up old test data...');
    try {
        await db.delete(products).where(inArray(products.sku, testProducts.map(p => p.sku)));
        // Note: Bundles don't have SKUs in schema shown, so we'll delete by title later or assume cascade logic if we linked them, 
        // but bundle_items cascade delete on product delete, so that helps.
        // We will delete bundles by title just in case.
        await db.delete(bundles).where(inArray(bundles.title, [
            'Starter Pack (Bottle + Cartridge)',
            'Maintenance Kit',
            'Mega Setup Bundle'
        ]));
    } catch (e) {
        console.warn('⚠️  Cleanup warning (might be first run):', e);
    }

    // 3. Insert Products
    console.log('📦 Inserting 5 Products...');
    const insertedProducts = await db.insert(products).values(testProducts).returning();
    console.log(`✅  Inserted ${insertedProducts.length} products.`);

    const p1 = insertedProducts.find(p => p.sku === 'TEST-PROD-001')!;
    const p2 = insertedProducts.find(p => p.sku === 'TEST-PROD-002')!;
    const p3 = insertedProducts.find(p => p.sku === 'TEST-PROD-003')!;
    const p4 = insertedProducts.find(p => p.sku === 'TEST-PROD-004')!;
    const p5 = insertedProducts.find(p => p.sku === 'TEST-PROD-005')!;

    // 4. Create Bundles
    console.log('🎁 Creating 3 Bundles...');

    // Bundle 1: Starter Pack (Bottle + filter) - Fixed Price
    const [bundle1] = await db.insert(bundles).values({
        title: 'Starter Pack (Bottle + Cartridge)',
        description: 'Get started with clean water essentials',
        type: 'fixed_price',
        status: 'active',
        price_value: '350.00', // Normal sum 400 (100+300), Saving 50
        image_url: 'https://placehold.co/600x400',
        starts_at: new Date(),
    }).returning();

    // Bundle 2: Maintenance Kit (Filter + Membrane) - Percentage Discount
    const [bundle2] = await db.insert(bundles).values({
        title: 'Maintenance Kit',
        description: 'Annual maintenance essentials',
        type: 'percentage_discount',
        status: 'active',
        price_value: '15.00', // 15% off
        image_url: 'https://placehold.co/600x400',
        starts_at: new Date(),
    }).returning();

    // Bundle 3: Mega Setup Bundle (All items) - Fixed Price
    const [bundle3] = await db.insert(bundles).values({
        title: 'Mega Setup Bundle',
        description: 'Everything you need for a complete setup',
        type: 'fixed_price',
        status: 'active',
        price_value: '2200.00', // Normal sum: 100+300+500+1500+250 = 2650. Saving 450.
        image_url: 'https://placehold.co/600x400',
        starts_at: new Date(),
    }).returning();

    // 5. Link Products to Bundles (Bundle Items)
    console.log('🔗 Linking Products to Bundles...');

    const newBundleItems = [
        // Bundle 1 Items
        { bundle_id: bundle1.id, product_id: p1.id, quantity: 1, sort_order: 1 },
        { bundle_id: bundle1.id, product_id: p2.id, quantity: 1, sort_order: 2 },

        // Bundle 2 Items
        { bundle_id: bundle2.id, product_id: p2.id, quantity: 2, sort_order: 1 }, // 2 Cartridges
        { bundle_id: bundle2.id, product_id: p4.id, quantity: 1, sort_order: 2 }, // 1 Membrane

        // Bundle 3 Items
        { bundle_id: bundle3.id, product_id: p1.id, quantity: 1, sort_order: 1 },
        { bundle_id: bundle3.id, product_id: p2.id, quantity: 1, sort_order: 2 },
        { bundle_id: bundle3.id, product_id: p3.id, quantity: 1, sort_order: 3 },
        { bundle_id: bundle3.id, product_id: p4.id, quantity: 1, sort_order: 4 },
        { bundle_id: bundle3.id, product_id: p5.id, quantity: 1, sort_order: 5 },
    ];

    await db.insert(bundleItems).values(newBundleItems);
    console.log(`✅  Linked ${newBundleItems.length} items to bundles.`);

    console.log('\n🎉 Seeding Complete!');
    console.log('Created Bundles:');
    console.log(`1. ${bundle1.title} (ID: ${bundle1.id}) - Type: ${bundle1.type}`);
    console.log(`2. ${bundle2.title} (ID: ${bundle2.id}) - Type: ${bundle2.type}`);
    console.log(`3. ${bundle3.title} (ID: ${bundle3.id}) - Type: ${bundle3.type}`);

    process.exit(0);
}

seedProductsAndBundles().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
