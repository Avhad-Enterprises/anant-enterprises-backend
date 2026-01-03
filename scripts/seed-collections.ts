/**
 * Seed Script: Collection Data
 * Creates sample collections for testing
 */

import { db } from '../src/database/index.js';
import { collections } from '../src/features/collection/shared/collection.schema.js';

async function seedCollections() {
    console.log('🌱 Seeding Collection Data...\n');

    try {
        const sampleCollections = [
            {
                title: 'Summer Sale',
                slug: 'summer-sale',
                description: 'Hot deals on water purifiers. Save up to 40% on selected models!',
                status: 'active' as const,
                type: 'manual' as const,
                sort_order: 'manual' as const,
                banner_image_url: '/images/banners/summer-sale-desktop.jpg',
                mobile_banner_image_url: '/images/banners/summer-sale-mobile.jpg',
            },
            {
                title: 'Residential Collection',
                slug: 'residential-collection',
                description: 'Best water purifiers for your home. Pure, safe water for your family.',
                status: 'active' as const,
                type: 'manual' as const,
                sort_order: 'manual' as const,
                banner_image_url: '/images/banners/residential-desktop.jpg',
                mobile_banner_image_url: '/images/banners/residential-mobile.jpg',
            },
            {
                title: 'Commercial Systems',
                slug: 'commercial-systems',
                description: 'Industrial-grade water purification for businesses and institutions.',
                status: 'active' as const,
                type: 'manual' as const,
                sort_order: 'manual' as const,
                banner_image_url: '/images/banners/commercial-desktop.jpg',
                mobile_banner_image_url: '/images/banners/commercial-mobile.jpg',
            },
        ];

        console.log(`📦 Creating ${sampleCollections.length} collections...\n`);

        for (const collectionData of sampleCollections) {
            const [collection] = await db
                .insert(collections)
                .values(collectionData)
                .onConflictDoUpdate({
                    target: collections.slug,
                    set: collectionData,
                })
                .returning();

            console.log(`✅ ${collection.title} (${collection.slug})`);
        }

        console.log('\n✅ Seed completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   - ${sampleCollections.length} collections created`);
        console.log(`   - All collections set to active status`);

    } catch (error: any) {
        console.error('❌ Seed failed:', error.message);
        throw error;
    }
}

seedCollections()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
