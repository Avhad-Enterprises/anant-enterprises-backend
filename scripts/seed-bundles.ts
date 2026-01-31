/**
 * Seed Script: Bundles
 *
 * Creates 4 bundles with product links via bundle_items.
 *
 * DEPENDENCY: Run seed-products-and-collections.ts FIRST!
 *
 * Usage: npx tsx scripts/seed-bundles.ts
 */

import { db } from '../src/database';
import { bundles } from '../src/features/bundles/shared/bundles.schema';
import { bundleItems } from '../src/features/bundles/shared/bundle-items.schema';
import { products } from '../src/features/product/shared/product.schema';
import { inArray } from 'drizzle-orm';

// Bundle titles for cleanup
const TEST_BUNDLE_TITLES = [
  'Complete RO Protection Kit',
  'UV Starter Bundle',
  'Home Purifier Essentials',
  'Budget Water Care Kit',
];

async function seedBundles() {
  console.log('🌱 Starting Bundle seed...\n');

  // ============================================
  // STEP 0: VERIFY PRODUCTS EXIST
  // ============================================
  console.log('🔍 Step 0: Verifying products exist...');
  const requiredSKUs = [
    'AP-RO-500',
    'PF-UV-PRO',
    'PF-UV-LITE',
    'ACC-FC-10',
    'ACC-FC-20',
    'SP-RO-100',
    'SP-RO-50',
  ];

  const existingProducts = await db
    .select({ id: products.id, sku: products.sku, title: products.product_title })
    .from(products)
    .where(inArray(products.sku, requiredSKUs));

  if (existingProducts.length < requiredSKUs.length) {
    const foundSKUs = existingProducts.map(p => p.sku);
    const missingSKUs = requiredSKUs.filter(sku => !foundSKUs.includes(sku));
    console.error(`❌ Missing products: ${missingSKUs.join(', ')}`);
    console.error('   Run seed-products-and-collections.ts first!');
    process.exit(1);
  }
  console.log(`   ✅ Found all ${requiredSKUs.length} required products\n`);

  // Create product lookup map
  const productMap = new Map(existingProducts.map(p => [p.sku, p]));

  // ============================================
  // STEP 1: CLEANUP OLD BUNDLES
  // ============================================
  console.log('🧹 Step 1: Cleaning up old test bundles...');

  const oldBundles = await db
    .select({ id: bundles.id })
    .from(bundles)
    .where(inArray(bundles.title, TEST_BUNDLE_TITLES));

  if (oldBundles.length > 0) {
    const oldBundleIds = oldBundles.map(b => b.id);
    await db.delete(bundleItems).where(inArray(bundleItems.bundle_id, oldBundleIds));
    await db.delete(bundles).where(inArray(bundles.id, oldBundleIds));
    console.log(`   ✅ Deleted ${oldBundles.length} old bundles\n`);
  } else {
    console.log('   ✅ No existing test bundles to clean\n');
  }

  // ============================================
  // STEP 2: INSERT 4 BUNDLES
  // ============================================
  console.log('📦 Step 2: Inserting 4 Bundles...');

  const bundleData = [
    {
      title: 'Complete RO Protection Kit',
      description: 'Essential filters and membrane for complete RO maintenance',
      image_url: 'https://placehold.co/600x400/0066cc/white?text=RO+Kit',
      type: 'fixed_price' as const,
      status: 'active' as const,
      price_value: '1999.00', // Fixed bundle price
    },
    {
      title: 'UV Starter Bundle',
      description: 'PureFlow UV Pro with maintenance filter',
      image_url: 'https://placehold.co/600x400/00cc66/white?text=UV+Bundle',
      type: 'percentage_discount' as const,
      status: 'active' as const,
      price_value: '15.00', // 15% discount
    },
    {
      title: 'Home Purifier Essentials',
      description: 'AquaPure RO 500 with complete filter set',
      image_url: 'https://placehold.co/600x400/gold/black?text=Essentials',
      type: 'fixed_price' as const,
      status: 'active' as const,
      price_value: '14999.00', // Fixed bundle price
    },
    {
      title: 'Budget Water Care Kit',
      description: 'Entry-level UV purifier with essential filters',
      image_url: 'https://placehold.co/600x400/ff6600/white?text=Budget+Kit',
      type: 'percentage_discount' as const,
      status: 'active' as const,
      price_value: '20.00', // 20% discount
    },
  ];

  const insertedBundles = await db.insert(bundles).values(bundleData).returning();
  console.log(`   ✅ Inserted ${insertedBundles.length} bundles\n`);

  // Create bundle lookup by title
  const bundleMap = new Map(insertedBundles.map(b => [b.title, b]));

  // ============================================
  // STEP 3: INSERT BUNDLE ITEMS
  // ============================================
  console.log('🔗 Step 3: Linking products to bundles...');

  const bundleItemsData = [
    // Bundle 1: Complete RO Protection Kit (3 items)
    { bundle_title: 'Complete RO Protection Kit', product_sku: 'ACC-FC-10', sort_order: 1 },
    { bundle_title: 'Complete RO Protection Kit', product_sku: 'SP-RO-100', sort_order: 2 },
    { bundle_title: 'Complete RO Protection Kit', product_sku: 'ACC-FC-20', sort_order: 3 },

    // Bundle 2: UV Starter Bundle (2 items)
    { bundle_title: 'UV Starter Bundle', product_sku: 'PF-UV-PRO', sort_order: 1 },
    { bundle_title: 'UV Starter Bundle', product_sku: 'ACC-FC-10', sort_order: 2 },

    // Bundle 3: Home Purifier Essentials (3 items)
    { bundle_title: 'Home Purifier Essentials', product_sku: 'AP-RO-500', sort_order: 1 },
    { bundle_title: 'Home Purifier Essentials', product_sku: 'ACC-FC-10', sort_order: 2 },
    { bundle_title: 'Home Purifier Essentials', product_sku: 'SP-RO-100', sort_order: 3 },

    // Bundle 4: Budget Water Care Kit (3 items)
    { bundle_title: 'Budget Water Care Kit', product_sku: 'PF-UV-LITE', sort_order: 1 },
    { bundle_title: 'Budget Water Care Kit', product_sku: 'ACC-FC-10', sort_order: 2 },
    { bundle_title: 'Budget Water Care Kit', product_sku: 'SP-RO-50', sort_order: 3 },
  ];

  const bundleItemsToInsert = bundleItemsData.map(item => ({
    bundle_id: bundleMap.get(item.bundle_title)!.id,
    product_id: productMap.get(item.product_sku)!.id,
    quantity: 1,
    sort_order: item.sort_order,
    is_optional: false,
  }));

  await db.insert(bundleItems).values(bundleItemsToInsert);
  console.log(`   ✅ Created ${bundleItemsToInsert.length} bundle-product links\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('═'.repeat(50));
  console.log('🎉 BUNDLE SEED COMPLETED SUCCESSFULLY!');
  console.log('═'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   • Bundles: 4`);
  console.log(`   • Bundle Items: ${bundleItemsToInsert.length}`);
  console.log('\n📦 Bundles Created:');
  insertedBundles.forEach(b => {
    const itemCount = bundleItemsData.filter(i => i.bundle_title === b.title).length;
    console.log(`   • ${b.title} (${b.type}, ${itemCount} items)`);
  });
  console.log('\n✨ Test the APIs:');
  console.log('   curl http://localhost:8000/api/bundles');

  // Get a product ID to show in example
  const fcProduct = productMap.get('ACC-FC-10');
  if (fcProduct) {
    console.log(`   curl http://localhost:8000/api/products/${fcProduct.id}/bundles`);
  }

  process.exit(0);
}

// Run the seed
seedBundles().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
