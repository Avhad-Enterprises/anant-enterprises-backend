/**
 * Seed Script: Product Page Test Data (Simplified)
 * Creates multiple products with brands, tags, highlights, features, and specs
 * Skips inventory to avoid location_id constraints
 */

import { db } from '../src/database/index.js';
import { products } from '../src/features/product/shared/product.schema.js';
import { reviews } from '../src/features/reviews/shared/reviews.schema.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { eq } from 'drizzle-orm';

async function seedProductData() {
    console.log('🌱 Seeding Product Page Test Data...\n');

    try {
        // Create test user for reviews
        let testUser;
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, 'reviewer@example.com'))
            .limit(1);

        if (existingUser) {
            testUser = existingUser;
            console.log('✅ Using existing test user');
        } else {
            [testUser] = await db
                .insert(users)
                .values({
                    name: 'Test Reviewer',
                    email: 'reviewer@example.com',
                    password: 'password123',
                })
                .returning();
            console.log('✅ Created test user');
        }

        // Sample Products Data
        const sampleProducts = [
            {
                slug: 'anant-pure-x1-pro',
                product_title: 'Anant Pure X1 Pro',
                secondary_title: 'Advanced RO + UV + UF Water Purifier',
                short_description: 'Premium 3-stage water purification system',
                full_description: 'The Anant Pure X1 Pro delivers crystal-clear water with advanced RO+UV+UF technology. Perfect for homes and small offices.',
                status: 'active',
                cost_price: '8000.00',
                selling_price: '12999.00',
                compare_at_price: '18999.00',
                sku: 'ANT-PX1-PRO-2024',
                barcode: '1234567890001',
                primary_image_url: '/images/products/x1-pro.jpg',
                additional_images: ['/images/products/x1-pro-2.jpg', '/images/products/x1-pro-3.jpg'],
                category_tier_1: 'Residential Purifiers',
                category_tier_2: 'Under-Sink Systems',
                brand_name: 'Anant',
                brand_slug: 'anant',
                tags: ['RO', 'UV', 'UF', '10L Storage'],
                highlights: [
                    'Multi-stage RO + UV + UF purification',
                    '10 Litre storage capacity',
                    'Smart LED indicators',
                    '5 Year warranty on all parts',
                ],
                features: [
                    { icon: 'Shield', title: '5 Year Warranty', description: 'Comprehensive coverage on all components' },
                    { icon: 'Zap', title: 'Energy Efficient', description: 'Low power consumption design' },
                    { icon: 'Droplet', title: 'TDS Control', description: 'Maintains essential minerals' },
                ],
                specs: {
                    technology: 'RO + UV + UF',
                    storage: '10 Litres',
                    stages: '7-Stage Purification',
                    mineral: true,
                    display: true,
                    power: '60W',
                    warranty: '5 Years',
                    dimensions: '350 x 280 x 460 mm',
                    certification: 'NSF Certified',
                },
            },
            {
                slug: 'anant-pure-x2-max',
                product_title: 'Anant Pure X2 Max',
                secondary_title: 'Premium RO + UV + Copper Purifier',
                short_description: 'Advanced purification with copper enrichment',
                full_description: 'Premium water purifier with copper tank for health benefits and advanced filtration.',
                status: 'active',
                cost_price: '10000.00',
                selling_price: '15999.00',
                compare_at_price: '21999.00',
                sku: 'ANT-PX2-MAX-2024',
                barcode: '1234567890002',
                primary_image_url: '/images/products/x2-max.jpg',
                additional_images: ['/images/products/x2-max-2.jpg'],
                category_tier_1: 'Residential Purifiers',
                category_tier_2: 'Wall-Mounted Systems',
                brand_name: 'Anant',
                brand_slug: 'anant',
                tags: ['RO', 'UV', 'Copper', '12L Storage'],
                highlights: [
                    'Copper enrichment for health benefits',
                    '12 Litre storage with copper tank',
                    'Advanced 9-stage filtration',
                    '7 Year extended warranty',
                ],
                features: [
                    { icon: 'Heart', title: 'Copper Benefits', description: 'Copper-infused water for health' },
                    { icon: 'Shield', title: '7 Year Warranty', description: 'Extended protection plan' },
                    { icon: 'Gauge', title: 'TDS Monitor', description: 'Real-time water quality display' },
                ],
                specs: {
                    technology: 'RO + UV + Copper',
                    storage: '12 Litres',
                    stages: '9-Stage Purification',
                    mineral: true,
                    display: true,
                    power: '75W',
                    warranty: '7 Years',
                    dimensions: '380 x 300 x 480 mm',
                    certification: 'NSF & WQA Certified',
                },
            },
            {
                slug: 'aquatech-elite-500',
                product_title: 'AquaTech Elite 500',
                secondary_title: 'Compact UV Water Purifier',
                short_description: 'Space-saving UV purification system',
                full_description: 'Ideal for apartments with limited space. Efficient UV purification at an affordable price.',
                status: 'active',
                cost_price: '5000.00',
                selling_price: '7999.00',
                compare_at_price: '10999.00',
                sku: 'AQT-E500-2024',
                barcode: '1234567890003',
                primary_image_url: '/images/products/elite-500.jpg',
                additional_images: [],
                category_tier_1: 'Residential Purifiers',
                category_tier_2: 'Countertop Systems',
                brand_name: 'AquaTech',
                brand_slug: 'aquatech',
                tags: ['UV', 'Compact', '6L Storage'],
                highlights: [
                    'Space-saving compact design',
                    '6 Litre storage capacity',
                    'UV LED technology',
                    '3 Year warranty',
                ],
                features: [
                    { icon: 'Maximize2', title: 'Compact Design', description: 'Fits anywhere in your kitchen' },
                    { icon: 'Zap', title: 'UV LED', description: 'Advanced UV purification' },
                ],
                specs: {
                    technology: 'UV LED',
                    storage: '6 Litres',
                    stages: '5-Stage Purification',
                    mineral: false,
                    display: false,
                    power: '40W',
                    warranty: '3 Years',
                    dimensions: '280 x 220 x 380 mm',
                    certification: 'ISI Certified',
                },
            },
            {
                slug: 'aquatech-pro-1000',
                product_title: 'AquaTech Pro 1000',
                secondary_title: 'Industrial Grade Water Purifier',
                short_description: 'Heavy-duty purification for commercial use',
                full_description: 'Professional-grade water purifier designed for offices, restaurants, and commercial spaces.',
                status: 'active',
                cost_price: '15000.00',
                selling_price: '24999.00',
                compare_at_price: '32999.00',
                sku: 'AQT-P1000-2024',
                barcode: '1234567890004',
                primary_image_url: '/images/products/pro-1000.jpg',
                additional_images: ['/images/products/pro-1000-2.jpg', '/images/products/pro-1000-3.jpg'],
                category_tier_1: 'Commercial Purifiers',
                category_tier_2: 'High-Capacity Systems',
                brand_name: 'AquaTech',
                brand_slug: 'aquatech',
                tags: ['RO', 'UV', 'Commercial', '50L Storage'],
                highlights: [
                    'High-capacity 50L storage',
                    'Commercial-grade filtration',
                    'Stainless steel construction',
                    '10 Year commercial warranty',
                ],
                features: [
                    { icon: 'Building', title: 'Commercial Grade', description: 'Built for heavy-duty use' },
                    { icon: 'Shield', title: '10 Year Warranty', description: 'Commercial protection plan' },
                    { icon: 'Users', title: 'High Output', description: 'Serves 50+ people daily' },
                ],
                specs: {
                    technology: 'RO + UV + UF',
                    storage: '50 Litres',
                    stages: '11-Stage Purification',
                    mineral: true,
                    display: true,
                    power: '150W',
                    warranty: '10 Years',
                    dimensions: '600 x 450 x 800 mm',
                    certification: 'NSF & CE Certified',
                },
            },
            {
                slug: 'puregen-basic-100',
                product_title: 'PureGen Basic 100',
                secondary_title: 'Budget-Friendly Water Filter',
                short_description: 'Affordable basic water filtration',
                full_description: 'Entry-level water filter perfect for those on a budget. Basic filtration at an affordable price.',
                status: 'active',
                cost_price: '2000.00',
                selling_price: '3499.00',
                compare_at_price: '4999.00',
                sku: 'PGN-B100-2024',
                barcode: '1234567890005',
                primary_image_url: '/images/products/basic-100.jpg',
                additional_images: [],
                category_tier_1: 'Residential Purifiers',
                category_tier_2: 'Gravity-Based Systems',
                brand_name: 'PureGen',
                brand_slug: 'puregen',
                tags: ['Gravity', 'Budget', 'No Electricity'],
                highlights: [
                    'No electricity required',
                    'Gravity-based filtration',
                    'Easy to maintain',
                    '2 Year warranty',
                ],
                features: [
                    { icon: 'Leaf', title: 'Eco-Friendly', description: 'No power consumption' },
                    { icon: 'DollarSign', title: 'Budget-Friendly', description: 'Affordable solution' },
                ],
                specs: {
                    technology: 'Gravity UF',
                    storage: '20 Litres',
                    stages: '3-Stage Purification',
                    mineral: false,
                    display: false,
                    power: '0W',
                    warranty: '2 Years',
                    dimensions: '350 x 350 x 500 mm',
                    certification: 'ISI Certified',
                },
            },
        ];

        console.log(`\n📦 Creating ${sampleProducts.length} products...\n`);

        const createdProducts = [];
        for (const productData of sampleProducts) {
            const [product] = await db
                .insert(products)
                .values(productData)
                .onConflictDoUpdate({
                    target: products.sku,
                    set: productData,
                })
                .returning();

            createdProducts.push(product);
            console.log(`✅ ${product.product_title}`);

            // Add 3-5 reviews per product
            const reviewCount = Math.floor(Math.random() * 3) + 3;
            for (let i = 0; i < reviewCount; i++) {
                const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
                await db
                    .insert(reviews)
                    .values({
                        product_id: product.id,
                        user_id: testUser.id,
                        rating,
                        title: rating === 5 ? 'Excellent product!' : 'Very good',
                        comment: rating === 5
                            ? 'Amazing quality and performance. Highly recommended!'
                            : 'Good product, works as expected.',
                        status: 'approved',
                        is_verified_purchase: true,
                        helpful_votes: Math.floor(Math.random() * 20),
                    })
                    .onConflictDoNothing();
            }
        }

        console.log('\n✅ Seed completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   - ${createdProducts.length} products created`);
        console.log(`   - ~${createdProducts.length * 4} reviews added`);
        console.log(`\n🏷️  Brands: Anant (2), AquaTech (2), PureGen (1)`);
        console.log(`📁 Categories: Residential (3), Commercial (1)`);

        return createdProducts;
    } catch (error: any) {
        console.error('❌ Seed failed:', error.message);
        throw error;
    }
}

seedProductData()
    .then(() => {
        console.log('\n✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
