/**
 * Backfill Tier Usage Counts
 * 
 * This script recalculates and updates the usage_count for all tiers
 * based on how many products currently reference each tier.
 * 
 * Run this script once to populate initial counts, and it will be
 * automatically maintained going forward by the tier-sync service.
 * 
 * Usage: npx tsx scripts/backfill-tier-usage.ts
 */

import { db } from '../src/database';
import { tiers } from '../src/features/tiers/shared/tiers.schema';
import { products } from '../src/features/product/shared/product.schema';
import { sql, eq, or } from 'drizzle-orm';

async function backfillTierUsage() {
  console.log('🔄 Starting tier usage count backfill...\n');

  try {
    // Get all tiers
    const allTiers = await db.select().from(tiers);
    console.log(`📊 Found ${allTiers.length} tiers to process\n`);

    let updatedCount = 0;

    // For each tier, count how many non-deleted products reference it
    for (const tier of allTiers) {
      console.log(`Processing tier: ${tier.name} (Level ${tier.level})...`);

      // Count products that reference this tier in any of the 4 category fields
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(
          sql`${products.is_deleted} = false AND (
                        ${products.category_tier_1} = ${tier.id} OR
                        ${products.category_tier_2} = ${tier.id} OR
                        ${products.category_tier_3} = ${tier.id} OR
                        ${products.category_tier_4} = ${tier.id}
                    )`
        );

      const usageCount = result?.count || 0;

      // Update tier with actual count
      await db
        .update(tiers)
        .set({
          usage_count: usageCount,
          updated_at: new Date(),
        })
        .where(eq(tiers.id, tier.id));

      console.log(`  ✅ Updated usage count: ${tier.usage_count} → ${usageCount}`);
      updatedCount++;
    }

    console.log(`\n✨ Backfill complete! Updated ${updatedCount} tiers.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillTierUsage();
