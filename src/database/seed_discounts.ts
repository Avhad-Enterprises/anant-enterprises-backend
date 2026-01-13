import dotenv from 'dotenv';
dotenv.config();

import { closeDatabase, db } from './drizzle';
import { discountService } from '../features/discount/services';
import { products } from '../features/product/shared/product.schema';
import { logger } from '../utils';
import { DiscountStatus } from '../features/discount/shared/interface';

/**
 * Seed database with test discounts
 * 
 * Usage:
 * ts-node src/database/seed_discounts.ts
 */
async function seedDiscounts() {
    try {
        logger.info('🏷️  Starting discount seeding...');

        // Helper to ignore unique constraint errors
        const createSafe = async (fn: () => Promise<any>, name: string) => {
            try {
                await fn();
                logger.info(`✅ Created ${name}`);
            } catch (error: any) {
                // Check for unique constraint violation (Postgres code 23505)
                if (error?.code === '23505' || error?.cause?.code === '23505') {
                    logger.warn(`⚠️  ${name} already exists. Skipping...`);
                } else if (error?.message?.includes('already exists')) {
                    logger.warn(`⚠️  ${name} already exists. Skipping...`);
                } else {
                    logger.error(`❌ Failed to create ${name}:`, error);
                    // Don't throw, just log so we can continue with others
                }
            }
        };

        // 1. Percentage Discount (10% OFF)
        await createSafe(async () => {
            await discountService.createDiscount({
                title: 'Welcome Offer 10% Off',
                type: 'percentage',
                value: '10.00',
                status: 'active' as DiscountStatus,
                starts_at: new Date(),
                codes: [{ code: 'SAVE10', usage_limit: 100 }],
                applies_to: 'entire_order',
            });
        }, 'SAVE10 (10% Off)');

        // 2. Fixed Amount Discount (FLAT 500 OFF)
        await createSafe(async () => {
            await discountService.createDiscount({
                title: 'Flat ₹500 Off',
                type: 'fixed_amount',
                value: '500.00',
                status: 'active' as DiscountStatus,
                starts_at: new Date(),
                codes: [{ code: 'FLAT500', usage_limit: 100 }],
                min_requirement_type: 'min_amount',
                min_requirement_value: '1000.00', // Min order 1000
            });
        }, 'FLAT500 (₹500 Off)');

        // 3. Free Shipping
        await createSafe(async () => {
            await discountService.createDiscount({
                title: 'Free Shipping',
                type: 'free_shipping',
                status: 'active' as DiscountStatus,
                starts_at: new Date(),
                codes: [{ code: 'FREESHIP' }],
                shipping_scope: 'all',
                min_requirement_type: 'min_amount',
                min_requirement_value: '500.00',
            });
        }, 'FREESHIP');

        // 4. BOGO (Buy 1 Get 1) - Requires a product
        logger.info('Fetching a product for BOGO...');

        // Check if products table has entries
        const [product] = await db.select({ id: products.id }).from(products).limit(1);

        if (product && product.id) {
            await createSafe(async () => {
                await discountService.createDiscount({
                    title: 'Buy 1 Get 1 Free',
                    type: 'buy_x_get_y',
                    status: 'active' as DiscountStatus,
                    starts_at: new Date(),
                    codes: [{ code: 'BOGO' }],
                    buy_x_trigger_type: 'quantity',
                    buy_x_value: '1.00',
                    buy_x_product_ids: [product.id as string],
                    get_y_type: 'free',
                    get_y_quantity: 1,
                    get_y_product_ids: [product.id as string],
                    get_y_applies_to: 'specific_products',
                });
            }, 'BOGO (Buy 1 Get 1)');
        } else {
            logger.warn('⚠️ No products found. Skipping BOGO discount.');
        }

        // 5. Seasonal Sale (Scheduled)
        await createSafe(async () => {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            await discountService.createDiscount({
                title: 'Summer Sale 2026',
                type: 'percentage',
                value: '20.00',
                status: 'scheduled' as DiscountStatus,
                starts_at: nextMonth,
                codes: [{ code: 'SUMMER26' }],
                applies_to: 'entire_order',
            });
        }, 'SUMMER26 (Scheduled)');

        logger.info('✅ Discount seeding completed!');
    } catch (error) {
        logger.error('❌ Error seeding discounts:', error);
        throw error;
    } finally {
        await closeDatabase();
        process.exit(0);
    }
}

seedDiscounts();
