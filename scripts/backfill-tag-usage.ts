/**
 * Backfill Tag Usage Counts
 * 
 * This script recalculates and updates the usage_count for all tags
 * based on how many products currently reference each tag.
 * 
 * Tags are stored as JSONB arrays in the products table.
 * This script will count all occurrences across all non-deleted products.
 * 
 * Usage: npx tsx scripts/backfill-tag-usage.ts
 */

import { db } from '../src/database';
import { tags } from '../src/features/tags/shared/tags.schema';
import { products } from '../src/features/product/shared/product.schema';
import { eq, sql } from 'drizzle-orm';

async function backfillTagUsage() {
  console.log('🔄 Starting tag usage count backfill...\n');

  try {
    // Get all tags
    const allTags = await db.select().from(tags);
    console.log(`📊 Found ${allTags.length} tags to process\n`);

    // Get all non-deleted products with their tags
    const allProducts = await db
      .select({
        id: products.id,
        tags: products.tags,
      })
      .from(products)
      .where(sql`${products.is_deleted} = false`);

    console.log(`📦 Found ${allProducts.length} products to process\n`);

    // Count tag occurrences
    const tagCounts: Record<string, number> = {};

    allProducts.forEach(product => {
      const productTags = product.tags as string[] || [];
      if (Array.isArray(productTags)) {
        productTags.forEach(tagName => {
          if (typeof tagName === 'string') {
            const normalizedTag = tagName.toLowerCase().trim();
            tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
          }
        });
      }
    });

    let updatedCount = 0;

    // Update each tag with its actual count
    for (const tag of allTags) {
      const normalizedTagName = tag.name.toLowerCase().trim();
      const usageCount = tagCounts[normalizedTagName] || 0;

      await db
        .update(tags)
        .set({
          usage_count: usageCount,
          updated_at: new Date(),
        })
        .where(eq(tags.id, tag.id));

      console.log(`  ✅ ${tag.name}: ${tag.usage_count} → ${usageCount}`);
      updatedCount++;
    }

    console.log(`\n✨ Backfill complete! Updated ${updatedCount} tags.`);
    console.log(`\nTag usage summary:`);
    Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tagName, count]) => {
        console.log(`  ${tagName}: ${count}`);
      });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillTagUsage();
