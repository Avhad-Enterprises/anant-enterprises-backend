import { db } from '../src/database';
import { products } from '../src/features/product/shared/product.schema';
import { sql } from 'drizzle-orm';

async function checkProductTagStructure() {
  console.log('🔍 Checking actual product tag data structure...\n');

  // Get ALL products and their tags
  const allProducts = await db
    .select({
      id: products.id,
      title: products.product_title,
      tags: products.tags,
    })
    .from(products)
    .where(sql`${products.is_deleted} = false`);

  console.log(`Total products: ${allProducts.length}\n`);

  let productsWithTags = 0;
  const tagCounts: Record<string, number> = {};

  allProducts.forEach((product, index) => {
    const tagData = product.tags;

    if (tagData && Array.isArray(tagData) && tagData.length > 0) {
      productsWithTags++;
      console.log(`\n${index + 1}. ${product.title}`);
      console.log(`   Tags: ${JSON.stringify(tagData)}`);

      // Count each tag
      tagData.forEach((tag: string) => {
        if (typeof tag === 'string') {
          const tagLower = tag.toLowerCase().trim();
          tagCounts[tagLower] = (tagCounts[tagLower] || 0) + 1;
        }
      });
    }
  });

  console.log(`\n\n📊 Summary:`);
  console.log(`Products with tags: ${productsWithTags}/${allProducts.length}`);
  console.log(`\nTag usage counts:`);

  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count}`);
    });

  process.exit(0);
}

checkProductTagStructure();
