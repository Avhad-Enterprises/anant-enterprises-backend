
import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { eq, and } from 'drizzle-orm';

const SAMPLE_TAGS = ['RO', 'UV', 'UF', 'Copper', 'Alkaline', 'Smart', 'IoT', 'Touch', 'Hot & Cold'];

async function seedTags() {
    console.log('🌱 Starting Tag Seeder...');

    // Get active products
    const activeProducts = await db
        .select({ id: products.id, title: products.product_title })
        .from(products)
        .where(and(eq(products.status, 'active'), eq(products.is_deleted, false)));

    console.log(`Found ${activeProducts.length} active products.`);

    if (activeProducts.length === 0) {
        console.log('No active products to update.');
        return;
    }

    for (const product of activeProducts) {
        // Pick 2-4 random tags
        const numTags = Math.floor(Math.random() * 3) + 2;
        const shuffled = [...SAMPLE_TAGS].sort(() => 0.5 - Math.random());
        const selectedTags = shuffled.slice(0, numTags);

        console.log(`Updating "${product.title}" with tags: [${selectedTags.join(', ')}]`);

        await db
            .update(products)
            .set({
                tags: selectedTags,
                updated_at: new Date()
            })
            .where(eq(products.id, product.id));
    }

    console.log('\n✅ Tags seeded successfully. Please check /products/filters API now.');
    process.exit(0);
}

seedTags().catch(err => {
    console.error('❌ Error seeding tags:', err);
    process.exit(1);
});
