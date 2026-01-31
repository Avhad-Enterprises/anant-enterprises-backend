
import { db } from '../src/database';
import { sql, eq, and } from 'drizzle-orm';
import { products } from '../src/features/product/shared/product.schema';
import { tiers } from '../src/features/tiers/shared/tiers.schema';

async function verifyCategoryCounts() {
    console.log('🔍 Verifying Dynamic Category Counts...\n');

    // 1. Fetch all active tiers (level 1 for simplicity)
    const activeTiers = await db
        .select({ id: tiers.id, name: tiers.name, code: tiers.code })
        .from(tiers)
        .where(eq(tiers.status, 'active'));

    console.log(`Found ${activeTiers.length} active categories.`);

    for (const tier of activeTiers) {
        // 2. Run the EXACT same subquery logic used in get-product-filters.ts
        const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM ${products} p
            WHERE p.status = 'active'
            AND p.is_deleted = false
            AND (
                   p.category_tier_1 = ${tier.id}
                OR p.category_tier_2 = ${tier.id}
                OR p.category_tier_3 = ${tier.id}
                OR p.category_tier_4 = ${tier.id}
            )
        `);

        // 3. For comparison, get actual products to show the user
        const sampleProducts = await db
            .select({ title: products.product_title })
            .from(products)
            .where(and(
                eq(products.status, 'active'),
                sql`(
                   category_tier_1 = ${tier.id}
                OR category_tier_2 = ${tier.id}
                OR category_tier_3 = ${tier.id}
                OR category_tier_4 = ${tier.id}
                )`
            ))
            .limit(3);

        const count = Number(result.rows[0].count);

        if (count > 0) {
            console.log(`✅ [${tier.name}]: ${count} Products`);
            console.log(`   Sample: ${sampleProducts.map(p => p.title).join(', ')}${count > 3 ? '...' : ''}`);
        } else {
            console.log(`⚪ [${tier.name}]: 0 Products`);
        }
    }

    console.log('\nVerification Complete.');
    process.exit(0);
}

verifyCategoryCounts().catch(console.error);
