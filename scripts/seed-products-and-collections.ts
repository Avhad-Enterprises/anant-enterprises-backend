/**
 * Seed Script: Products and Collections
 *
 * Creates comprehensive test data for:
 * - 6 Tiers (Categories)
 * - 15 Products (various statuses, brands, prices)
 * - 5 Collections (various types and statuses)
 * - Collection-Product relationships
 *
 * Usage: npx tsx scripts/seed-products-and-collections.ts
 */

import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { collections } from '../src/features/collection/shared/collection.schema';
import { collectionProducts } from '../src/features/collection/shared/collection-products.schema';
import { tiers } from '../src/features/tiers/shared/tiers.schema';
import { like, inArray } from 'drizzle-orm';

// ============================================
// SEED DATA DEFINITIONS
// ============================================

// 1. TIERS (Categories)
const tierData = [
    // Level 1 (Root categories)
    { name: 'Residential Purifiers', code: 'residential-purifiers', level: 1, parent_id: null, priority: 1 },
    { name: 'Commercial Purifiers', code: 'commercial-purifiers', level: 1, parent_id: null, priority: 2 },
    { name: 'Accessories', code: 'accessories', level: 1, parent_id: null, priority: 3 },
    // Level 2 (Sub-categories) - Will be linked after insertion
    { name: 'RO Systems', code: 'ro-systems', level: 2, parent_id: null, priority: 1 }, // Parent: Residential
    { name: 'UV Systems', code: 'uv-systems', level: 2, parent_id: null, priority: 2 }, // Parent: Residential
    { name: 'Spare Parts', code: 'spare-parts', level: 2, parent_id: null, priority: 1 }, // Parent: Accessories
];

// Product SKU prefixes for cleanup
const TEST_SKU_PREFIXES = ['AP-', 'PF-', 'COMM-', 'ACC-', 'SP-', 'LE-', 'DRAFT-', 'ARCH-', 'SCHED-'];
const TEST_COLLECTION_SLUGS = ['best-sellers', 'new-arrivals', 'budget-friendly', 'premium-collection', 'draft-collection'];

async function seedData() {
    console.log('🌱 Starting comprehensive seed for Products and Collections...\n');

    // ============================================
    // STEP 1: CLEANUP OLD TEST DATA
    // ============================================
    console.log('🧹 Step 1: Cleaning up old test data...');

    // Delete collection products first (due to FK constraints)
    const oldCollections = await db
        .select({ id: collections.id })
        .from(collections)
        .where(inArray(collections.slug, TEST_COLLECTION_SLUGS));

    if (oldCollections.length > 0) {
        const oldCollectionIds = oldCollections.map(c => c.id);
        await db.delete(collectionProducts).where(inArray(collectionProducts.collection_id, oldCollectionIds));
        await db.delete(collections).where(inArray(collections.id, oldCollectionIds));
        console.log(`   ✅ Deleted ${oldCollections.length} old collections`);
    }

    // Delete products with test SKU prefixes
    for (const prefix of TEST_SKU_PREFIXES) {
        await db.delete(products).where(like(products.sku, `${prefix}%`));
    }
    console.log('   ✅ Deleted old test products');

    // Delete test tiers
    const testTierCodes = tierData.map(t => t.code);
    await db.delete(tiers).where(inArray(tiers.code, testTierCodes));
    console.log('   ✅ Deleted old test tiers\n');

    // ============================================
    // STEP 2: INSERT TIERS (Categories)
    // ============================================
    console.log('📁 Step 2: Inserting 6 Tiers (Categories)...');

    // Insert root categories first
    const [residential] = await db.insert(tiers).values({
        name: 'Residential Purifiers',
        code: 'residential-purifiers',
        level: 1,
        priority: 1,
        status: 'active',
    }).returning();

    const [commercial] = await db.insert(tiers).values({
        name: 'Commercial Purifiers',
        code: 'commercial-purifiers',
        level: 1,
        priority: 2,
        status: 'active',
    }).returning();

    const [accessories] = await db.insert(tiers).values({
        name: 'Accessories',
        code: 'accessories',
        level: 1,
        priority: 3,
        status: 'active',
    }).returning();

    // Insert sub-categories with parent references
    const [roSystems] = await db.insert(tiers).values({
        name: 'RO Systems',
        code: 'ro-systems',
        level: 2,
        parent_id: residential.id,
        priority: 1,
        status: 'active',
    }).returning();

    const [uvSystems] = await db.insert(tiers).values({
        name: 'UV Systems',
        code: 'uv-systems',
        level: 2,
        parent_id: residential.id,
        priority: 2,
        status: 'active',
    }).returning();

    const [spareParts] = await db.insert(tiers).values({
        name: 'Spare Parts',
        code: 'spare-parts',
        level: 2,
        parent_id: accessories.id,
        priority: 1,
        status: 'active',
    }).returning();

    console.log('   ✅ Inserted 6 tiers:');
    console.log(`      - ${residential.name} (ID: ${residential.id})`);
    console.log(`      - ${commercial.name} (ID: ${commercial.id})`);
    console.log(`      - ${accessories.name} (ID: ${accessories.id})`);
    console.log(`      - ${roSystems.name} (Parent: Residential)`);
    console.log(`      - ${uvSystems.name} (Parent: Residential)`);
    console.log(`      - ${spareParts.name} (Parent: Accessories)\n`);

    // ============================================
    // STEP 3: INSERT 15 PRODUCTS
    // ============================================
    console.log('📦 Step 3: Inserting 15 Products...');

    const productData = [
        // Active RO Products (AquaPure Brand)
        {
            slug: 'aquapure-ro-500',
            product_title: 'AquaPure RO 500',
            secondary_title: 'Advanced RO Purifier',
            short_description: '7-stage RO+UV purification with 12L storage',
            sku: 'AP-RO-500',
            status: 'active' as const,
            cost_price: '7000.00',
            selling_price: '12999.00',
            compare_at_price: '15999.00',
            brand_name: 'AquaPure',
            brand_slug: 'aquapure',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['RO', 'UV', 'Premium', '12L'],
            highlights: ['7-stage purification', '12L storage tank', '5-year warranty'],
            primary_image_url: 'https://placehold.co/600x400/0066cc/white?text=AquaPure+RO+500',
            is_gift_wrap_available: true,
        },
        {
            slug: 'aquapure-ro-300',
            product_title: 'AquaPure RO 300',
            secondary_title: 'Budget RO Purifier',
            short_description: '5-stage RO purification with 8L storage',
            sku: 'AP-RO-300',
            status: 'active' as const,
            cost_price: '5000.00',
            selling_price: '8999.00',
            compare_at_price: '10999.00',
            brand_name: 'AquaPure',
            brand_slug: 'aquapure',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['RO', 'Budget', '8L'],
            highlights: ['5-stage purification', '8L storage tank', '3-year warranty'],
            primary_image_url: 'https://placehold.co/600x400/0066cc/white?text=AquaPure+RO+300',
        },
        // Active UV Products (PureFlow Brand)
        {
            slug: 'pureflow-uv-pro',
            product_title: 'PureFlow UV Pro',
            secondary_title: 'Professional UV Purifier',
            short_description: 'High-intensity UV purification for municipal water',
            sku: 'PF-UV-PRO',
            status: 'active' as const,
            cost_price: '3500.00',
            selling_price: '6499.00',
            compare_at_price: '7999.00',
            brand_name: 'PureFlow',
            brand_slug: 'pureflow',
            category_tier_1: residential.id,
            category_tier_2: uvSystems.id,
            tags: ['UV', 'Professional', 'Municipal'],
            highlights: ['High-intensity UV lamp', 'Stainless steel chamber', '2-year warranty'],
            primary_image_url: 'https://placehold.co/600x400/00cc66/white?text=PureFlow+UV+Pro',
        },
        {
            slug: 'pureflow-uv-lite',
            product_title: 'PureFlow UV Lite',
            secondary_title: 'Entry Level UV Purifier',
            short_description: 'Affordable UV purification for clean water sources',
            sku: 'PF-UV-LITE',
            status: 'active' as const,
            cost_price: '2000.00',
            selling_price: '3999.00',
            brand_name: 'PureFlow',
            brand_slug: 'pureflow',
            category_tier_1: residential.id,
            category_tier_2: uvSystems.id,
            tags: ['UV', 'Budget', 'Entry'],
            highlights: ['Compact design', 'Low power consumption', '1-year warranty'],
            primary_image_url: 'https://placehold.co/600x400/00cc66/white?text=PureFlow+UV+Lite',
        },
        // Commercial Products (HydroTech Brand)
        {
            slug: 'commercial-ro-1000',
            product_title: 'Commercial RO 1000',
            secondary_title: 'Industrial RO System',
            short_description: '1000 LPH commercial RO plant for offices and restaurants',
            sku: 'COMM-RO-1000',
            status: 'active' as const,
            cost_price: '25000.00',
            selling_price: '45000.00',
            compare_at_price: '55000.00',
            brand_name: 'HydroTech',
            brand_slug: 'hydrotech',
            category_tier_1: commercial.id,
            tags: ['RO', 'Industrial', 'Commercial', '1000LPH'],
            highlights: ['1000 LPH capacity', 'Auto-flush system', 'Industrial grade components'],
            primary_image_url: 'https://placehold.co/600x400/cc6600/white?text=Commercial+RO+1000',
        },
        {
            slug: 'commercial-ro-2000',
            product_title: 'Commercial RO 2000',
            secondary_title: 'Enterprise RO System',
            short_description: '2000 LPH commercial RO plant for large establishments',
            sku: 'COMM-RO-2000',
            status: 'active' as const,
            cost_price: '45000.00',
            selling_price: '75000.00',
            compare_at_price: '90000.00',
            brand_name: 'HydroTech',
            brand_slug: 'hydrotech',
            category_tier_1: commercial.id,
            tags: ['RO', 'Industrial', 'Commercial', '2000LPH', 'Enterprise'],
            highlights: ['2000 LPH capacity', 'Remote monitoring', 'Premium components'],
            primary_image_url: 'https://placehold.co/600x400/cc6600/white?text=Commercial+RO+2000',
        },
        // Accessories (Generic Brand)
        {
            slug: 'filter-cartridge-10',
            product_title: 'Filter Cartridge 10"',
            secondary_title: 'Standard Sediment Filter',
            short_description: 'Universal 10-inch sediment filter cartridge',
            sku: 'ACC-FC-10',
            status: 'active' as const,
            cost_price: '100.00',
            selling_price: '299.00',
            brand_name: 'Generic',
            brand_slug: 'generic',
            category_tier_1: accessories.id,
            tags: ['Filter', 'Cartridge', '10inch', 'Sediment'],
            highlights: ['Universal fit', '6-month lifespan', 'Easy replacement'],
            primary_image_url: 'https://placehold.co/600x400/999999/white?text=Filter+10',
        },
        {
            slug: 'filter-cartridge-20',
            product_title: 'Filter Cartridge 20"',
            secondary_title: 'Large Sediment Filter',
            short_description: 'Commercial grade 20-inch sediment filter cartridge',
            sku: 'ACC-FC-20',
            status: 'active' as const,
            cost_price: '180.00',
            selling_price: '449.00',
            brand_name: 'Generic',
            brand_slug: 'generic',
            category_tier_1: accessories.id,
            tags: ['Filter', 'Cartridge', '20inch', 'Sediment', 'Commercial'],
            highlights: ['Commercial grade', '12-month lifespan', 'High flow rate'],
            primary_image_url: 'https://placehold.co/600x400/999999/white?text=Filter+20',
        },
        // Spare Parts
        {
            slug: 'ro-membrane-100gpd',
            product_title: 'RO Membrane 100GPD',
            secondary_title: 'High Capacity RO Membrane',
            short_description: '100 GPD RO membrane for residential purifiers',
            sku: 'SP-RO-100',
            status: 'active' as const,
            cost_price: '800.00',
            selling_price: '1499.00',
            compare_at_price: '1999.00',
            brand_name: 'Generic',
            brand_slug: 'generic',
            category_tier_1: accessories.id,
            category_tier_2: spareParts.id,
            tags: ['Membrane', 'RO', '100GPD', 'Replacement'],
            highlights: ['96% TDS rejection', '2-year lifespan', 'Universal compatibility'],
            primary_image_url: 'https://placehold.co/600x400/666666/white?text=RO+Membrane+100',
        },
        {
            slug: 'ro-membrane-50gpd',
            product_title: 'RO Membrane 50GPD',
            secondary_title: 'Standard RO Membrane',
            short_description: '50 GPD RO membrane for compact purifiers',
            sku: 'SP-RO-50',
            status: 'active' as const,
            cost_price: '500.00',
            selling_price: '999.00',
            brand_name: 'Generic',
            brand_slug: 'generic',
            category_tier_1: accessories.id,
            category_tier_2: spareParts.id,
            tags: ['Membrane', 'RO', '50GPD', 'Replacement'],
            highlights: ['94% TDS rejection', '18-month lifespan', 'Compact size'],
            primary_image_url: 'https://placehold.co/600x400/666666/white?text=RO+Membrane+50',
        },
        // SPECIAL CASES: Draft, Archived, Scheduled
        {
            slug: 'draft-product-test',
            product_title: 'Draft Product (Testing)',
            secondary_title: 'Do Not Display',
            short_description: 'This product is in draft status and should not be visible publicly',
            sku: 'DRAFT-001',
            status: 'draft' as const,
            cost_price: '2500.00',
            selling_price: '5000.00',
            brand_name: 'TestBrand',
            brand_slug: 'testbrand',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['Test', 'Draft'],
            primary_image_url: 'https://placehold.co/600x400/ff0000/white?text=DRAFT',
        },
        {
            slug: 'archived-product-test',
            product_title: 'Archived Product (Discontinued)',
            secondary_title: 'No Longer Available',
            short_description: 'This product has been archived and is no longer sold',
            sku: 'ARCH-001',
            status: 'archived' as const,
            cost_price: '1500.00',
            selling_price: '2500.00',
            brand_name: 'TestBrand',
            brand_slug: 'testbrand',
            category_tier_1: residential.id,
            category_tier_2: uvSystems.id,
            tags: ['Test', 'Archived'],
            primary_image_url: 'https://placehold.co/600x400/ff0000/white?text=ARCHIVED',
        },
        {
            slug: 'scheduled-product-launch',
            product_title: 'Scheduled Product (Upcoming)',
            secondary_title: 'Coming Soon',
            short_description: 'This product is scheduled for future launch',
            sku: 'SCHED-001',
            status: 'schedule' as const,
            cost_price: '8000.00',
            selling_price: '15000.00',
            scheduled_publish_at: new Date('2026-02-01T00:00:00Z'),
            brand_name: 'AquaPure',
            brand_slug: 'aquapure',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['New', 'Launch', 'Scheduled'],
            primary_image_url: 'https://placehold.co/600x400/ffcc00/black?text=COMING+SOON',
        },
        // Premium Products
        {
            slug: 'premium-ro-uv-combo',
            product_title: 'Premium RO+UV Combo',
            secondary_title: 'Ultimate Water Purifier',
            short_description: '9-stage RO+UV+UF with mineral enhancement',
            sku: 'AP-COMBO-01',
            status: 'active' as const,
            cost_price: '10000.00',
            selling_price: '18999.00',
            compare_at_price: '24999.00',
            brand_name: 'AquaPure',
            brand_slug: 'aquapure',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['RO', 'UV', 'UF', 'Premium', 'Mineral', 'Combo'],
            highlights: ['9-stage purification', 'Mineral enhancement', 'Smart display', '7-year warranty'],
            primary_image_url: 'https://placehold.co/600x400/gold/black?text=Premium+Combo',
            is_gift_wrap_available: true,
        },
        {
            slug: 'limited-edition-gold',
            product_title: 'Limited Edition Gold',
            secondary_title: 'Exclusive Designer Edition',
            short_description: 'Gold-plated limited edition RO+UV purifier',
            sku: 'LE-GOLD-01',
            status: 'active' as const,
            cost_price: '15000.00',
            selling_price: '25999.00',
            compare_at_price: '35000.00',
            brand_name: 'AquaPure',
            brand_slug: 'aquapure',
            category_tier_1: residential.id,
            category_tier_2: roSystems.id,
            tags: ['RO', 'UV', 'Limited', 'Gold', 'Premium', 'Exclusive'],
            highlights: ['Gold-plated body', 'Limited to 500 units', 'Certificate of authenticity', 'Lifetime warranty'],
            primary_image_url: 'https://placehold.co/600x400/ffd700/black?text=Limited+Edition',
            is_limited_edition: true,
            is_gift_wrap_available: true,
        },
    ];

    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log(`   ✅ Inserted ${insertedProducts.length} products\n`);

    // Create product lookup map by SKU
    const productMap = new Map(insertedProducts.map(p => [p.sku, p]));

    // ============================================
    // STEP 4: INSERT 5 COLLECTIONS
    // ============================================
    console.log('🗂️  Step 4: Inserting 5 Collections...');

    const collectionData = [
        {
            title: 'Best Sellers',
            slug: 'best-sellers',
            description: 'Our most popular products loved by thousands of customers',
            type: 'manual' as const,
            status: 'active' as const,
            sort_order: 'best-selling' as const,
            banner_image_url: 'https://placehold.co/1200x400/0066cc/white?text=Best+Sellers',
            meta_title: 'Best Selling Water Purifiers | Anant Enterprises',
            meta_description: 'Shop our best selling water purifiers. Trusted by thousands of customers.',
            tags: ['featured', 'homepage'],
        },
        {
            title: 'New Arrivals',
            slug: 'new-arrivals',
            description: 'Check out our latest products and innovations',
            type: 'manual' as const,
            status: 'active' as const,
            sort_order: 'created-desc' as const,
            banner_image_url: 'https://placehold.co/1200x400/00cc66/white?text=New+Arrivals',
            meta_title: 'New Water Purifiers | Anant Enterprises',
            meta_description: 'Discover the latest water purification technology.',
            tags: ['new', 'featured'],
        },
        {
            title: 'Budget Friendly',
            slug: 'budget-friendly',
            description: 'Quality water purification at affordable prices',
            type: 'manual' as const,
            status: 'active' as const,
            sort_order: 'price-asc' as const,
            banner_image_url: 'https://placehold.co/1200x400/ff6600/white?text=Budget+Friendly',
            meta_title: 'Affordable Water Purifiers | Under ₹10,000',
            meta_description: 'Get quality water purification without breaking the bank.',
            tags: ['budget', 'value'],
        },
        {
            title: 'Premium Collection',
            slug: 'premium-collection',
            description: 'Experience the best in water purification technology',
            type: 'manual' as const,
            status: 'active' as const,
            sort_order: 'price-desc' as const,
            banner_image_url: 'https://placehold.co/1200x400/gold/black?text=Premium+Collection',
            meta_title: 'Premium Water Purifiers | Luxury Range',
            meta_description: 'The finest water purifiers with cutting-edge technology.',
            tags: ['premium', 'luxury', 'featured'],
        },
        {
            title: 'Draft Collection',
            slug: 'draft-collection',
            description: 'This collection is in draft mode for testing',
            type: 'manual' as const,
            status: 'draft' as const,
            sort_order: 'manual' as const,
            banner_image_url: 'https://placehold.co/1200x400/ff0000/white?text=DRAFT',
            tags: ['test', 'draft'],
        },
    ];

    const insertedCollections = await db.insert(collections).values(collectionData).returning();
    console.log(`   ✅ Inserted ${insertedCollections.length} collections\n`);

    // Create collection lookup map by slug
    const collectionMap = new Map(insertedCollections.map(c => [c.slug, c]));

    // ============================================
    // STEP 5: LINK PRODUCTS TO COLLECTIONS
    // ============================================
    console.log('🔗 Step 5: Linking Products to Collections...');

    const collectionProductLinks = [
        // Best Sellers (5 products)
        { collection_slug: 'best-sellers', product_sku: 'AP-RO-500', position: 1 },
        { collection_slug: 'best-sellers', product_sku: 'PF-UV-PRO', position: 2 },
        { collection_slug: 'best-sellers', product_sku: 'COMM-RO-1000', position: 3 },
        { collection_slug: 'best-sellers', product_sku: 'ACC-FC-10', position: 4 },
        { collection_slug: 'best-sellers', product_sku: 'SP-RO-100', position: 5 },

        // New Arrivals (4 products)
        { collection_slug: 'new-arrivals', product_sku: 'AP-COMBO-01', position: 1 },
        { collection_slug: 'new-arrivals', product_sku: 'LE-GOLD-01', position: 2 },
        { collection_slug: 'new-arrivals', product_sku: 'PF-UV-LITE', position: 3 },
        { collection_slug: 'new-arrivals', product_sku: 'COMM-RO-2000', position: 4 },

        // Budget Friendly (5 products - sorted by price)
        { collection_slug: 'budget-friendly', product_sku: 'ACC-FC-10', position: 1 },   // ₹299
        { collection_slug: 'budget-friendly', product_sku: 'ACC-FC-20', position: 2 },   // ₹449
        { collection_slug: 'budget-friendly', product_sku: 'SP-RO-50', position: 3 },    // ₹999
        { collection_slug: 'budget-friendly', product_sku: 'PF-UV-LITE', position: 4 },  // ₹3,999
        { collection_slug: 'budget-friendly', product_sku: 'PF-UV-PRO', position: 5 },   // ₹6,499

        // Premium Collection (3 products)
        { collection_slug: 'premium-collection', product_sku: 'COMM-RO-2000', position: 1 }, // ₹75,000
        { collection_slug: 'premium-collection', product_sku: 'LE-GOLD-01', position: 2 },   // ₹25,999
        { collection_slug: 'premium-collection', product_sku: 'AP-COMBO-01', position: 3 },  // ₹18,999

        // Draft Collection (2 products - special cases)
        { collection_slug: 'draft-collection', product_sku: 'DRAFT-001', position: 1 },
        { collection_slug: 'draft-collection', product_sku: 'ARCH-001', position: 2 },
    ];

    // Convert to database format
    const collectionProductData = collectionProductLinks.map(link => ({
        collection_id: collectionMap.get(link.collection_slug)!.id,
        product_id: productMap.get(link.product_sku)!.id,
        position: link.position,
    }));

    await db.insert(collectionProducts).values(collectionProductData);
    console.log(`   ✅ Created ${collectionProductData.length} product-collection links\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('═'.repeat(50));
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   • Tiers (Categories): 6`);
    console.log(`   • Products: 15 (12 active, 1 draft, 1 archived, 1 scheduled)`);
    console.log(`   • Collections: 5 (4 active, 1 draft)`);
    console.log(`   • Collection-Product Links: ${collectionProductData.length}`);
    console.log('\n🔑 Product Statuses:');
    console.log('   • Active: AP-RO-500, AP-RO-300, PF-UV-PRO, PF-UV-LITE, COMM-RO-1000, COMM-RO-2000');
    console.log('   • Active: ACC-FC-10, ACC-FC-20, SP-RO-100, SP-RO-50, AP-COMBO-01, LE-GOLD-01');
    console.log('   • Draft: DRAFT-001');
    console.log('   • Archived: ARCH-001');
    console.log('   • Scheduled: SCHED-001');
    console.log('\n📁 Collections:');
    insertedCollections.forEach(c => {
        console.log(`   • ${c.title} (${c.slug}) - ${c.status}`);
    });
    console.log('\n✨ Test the APIs:');
    console.log('   curl http://localhost:8000/api/products');
    console.log('   curl http://localhost:8000/api/collections');
    console.log('   curl http://localhost:8000/api/collections/best-sellers/products');

    process.exit(0);
}

// Run the seed
seedData().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
