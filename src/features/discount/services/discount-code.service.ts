/**
 * Discount Code Service
 *
 * Manages discount codes:
 * - Code generation (single and bulk)
 * - Code CRUD operations
 * - Usage tracking and increment/decrement
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../database';
import { discountUsage } from '../shared/discount-usage.schema';
import { discounts } from '../shared/discount.schema';
import { discountCodes } from '../shared/discount-codes.schema';
import { logger } from '../../../utils';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface CreateCodeInput {
    code: string;
    discount_id: string;
    usage_limit?: number;
    max_uses_per_customer?: number;
    allowed_user_ids?: string[];
    allowed_email_domains?: string[];
    required_customer_tags?: string[];
}

export interface BulkCodeOptions {
    count: number;
    prefix?: string;
    length?: number;
    usage_limit?: number;
    max_uses_per_customer?: number;
}

export interface RecordUsageInput {
    discount_id: string;
    discount_code: string;
    user_id?: string;
    guest_email?: string;
    order_id: string;
    order_number: string;
    discount_type: string;
    discount_value?: string;
    discount_amount: number;
    order_subtotal?: number;
    order_total?: number;
    items_count?: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class DiscountCodeService {
    private readonly DEFAULT_CODE_LENGTH = 8;
    private readonly MAX_BULK_CODES = 10000;
    private readonly CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars

    /**
     * Create a new discount code
     */
    async createCode(input: CreateCodeInput): Promise<typeof discountCodes.$inferSelect> {
        const normalizedCode = input.code.toUpperCase().trim();

        // Check if code already exists
        const existing = await db
            .select()
            .from(discountCodes)
            .where(eq(discountCodes.code, normalizedCode));

        if (existing.length > 0) {
            throw new Error(`Discount code "${normalizedCode}" already exists`);
        }

        const [code] = await db
            .insert(discountCodes)
            .values({
                code: normalizedCode,
                discount_id: input.discount_id,
                usage_limit: input.usage_limit,
                max_uses_per_customer: input.max_uses_per_customer,
                allowed_user_ids: input.allowed_user_ids || [],
                allowed_email_domains: input.allowed_email_domains || [],
                required_customer_tags: input.required_customer_tags || [],
            })
            .returning();

        logger.info(`Created discount code ${normalizedCode} for discount ${input.discount_id}`);
        return code;
    }

    /**
     * Generate bulk codes for a discount
     */
    async generateBulkCodes(
        discountId: string,
        options: BulkCodeOptions
    ): Promise<string[]> {
        const {
            count,
            prefix = '',
            length = this.DEFAULT_CODE_LENGTH,
            usage_limit,
            max_uses_per_customer,
        } = options;

        if (count > this.MAX_BULK_CODES) {
            throw new Error(`Cannot generate more than ${this.MAX_BULK_CODES} codes at once`);
        }

        // Verify discount exists
        const [discount] = await db
            .select()
            .from(discounts)
            .where(and(eq(discounts.id, discountId), eq(discounts.is_deleted, false)));

        if (!discount) {
            throw new Error('Discount not found');
        }

        // Generate unique codes
        const generatedCodes: string[] = [];
        const existingCodes = new Set(
            (await db.select({ code: discountCodes.code }).from(discountCodes)).map((c) => c.code)
        );

        let attempts = 0;
        const maxAttempts = count * 10; // Allow for some collisions

        while (generatedCodes.length < count && attempts < maxAttempts) {
            const code = this.generateRandomCode(prefix, length);
            if (!existingCodes.has(code) && !generatedCodes.includes(code)) {
                generatedCodes.push(code);
            }
            attempts++;
        }

        if (generatedCodes.length < count) {
            throw new Error('Could not generate enough unique codes. Try a longer code length.');
        }

        // Insert all codes
        await db.insert(discountCodes).values(
            generatedCodes.map((code) => ({
                code,
                discount_id: discountId,
                usage_limit,
                max_uses_per_customer,
                allowed_user_ids: [],
                allowed_email_domains: [],
                required_customer_tags: [],
            }))
        );

        logger.info(`Generated ${generatedCodes.length} bulk codes for discount ${discountId}`);
        return generatedCodes;
    }

    /**
     * Get all codes for a discount
     */
    async getCodesByDiscountId(discountId: string): Promise<Array<typeof discountCodes.$inferSelect>> {
        return db
            .select()
            .from(discountCodes)
            .where(eq(discountCodes.discount_id, discountId));
    }

    /**
     * Get a single code by its value
     */
    async getCodeByValue(code: string): Promise<typeof discountCodes.$inferSelect | null> {
        const normalizedCode = code.toUpperCase().trim();
        const [result] = await db
            .select()
            .from(discountCodes)
            .where(eq(discountCodes.code, normalizedCode));

        return result || null;
    }

    /**
     * Delete a discount code
     */
    async deleteCode(code: string): Promise<boolean> {
        const normalizedCode = code.toUpperCase().trim();
        await db.delete(discountCodes).where(eq(discountCodes.code, normalizedCode));
        logger.info(`Deleted discount code ${normalizedCode}`);
        return true;
    }

    /**
     * Increment usage count for a code and record usage
     */
    async recordUsage(input: RecordUsageInput): Promise<void> {
        await db.transaction(async (tx) => {
            // 1. Increment code usage count
            await tx
                .update(discountCodes)
                .set({
                    usage_count: sql`usage_count + 1`,
                })
                .where(eq(discountCodes.code, input.discount_code));

            // 2. Increment discount total usage count
            await tx
                .update(discounts)
                .set({
                    total_usage_count: sql`total_usage_count + 1`,
                    total_discount_amount: sql`total_discount_amount + ${input.discount_amount}`,
                    total_orders_count: sql`total_orders_count + 1`,
                })
                .where(eq(discounts.id, input.discount_id));

            // 3. Record usage in discount_usage table
            await tx.insert(discountUsage).values({
                discount_id: input.discount_id,
                discount_code: input.discount_code,
                user_id: input.user_id,
                guest_email: input.guest_email,
                order_id: input.order_id,
                order_number: input.order_number,
                discount_type: input.discount_type,
                discount_value: input.discount_value,
                discount_amount: input.discount_amount.toString(),
                order_subtotal: input.order_subtotal?.toString(),
                order_total: input.order_total?.toString(),
                items_count: input.items_count,
            });

            logger.info(`Recorded usage of code ${input.discount_code} for order ${input.order_number}`);
        });
    }

    /**
     * Rollback usage (for failed/cancelled orders)
     */
    async rollbackUsage(
        discountId: string,
        discountCode: string,
        orderId: string,
        discountAmount: number
    ): Promise<void> {
        await db.transaction(async (tx) => {
            // 1. Decrement code usage count
            await tx
                .update(discountCodes)
                .set({
                    usage_count: sql`GREATEST(usage_count - 1, 0)`,
                })
                .where(eq(discountCodes.code, discountCode));

            // 2. Decrement discount stats
            await tx
                .update(discounts)
                .set({
                    total_usage_count: sql`GREATEST(total_usage_count - 1, 0)`,
                    total_discount_amount: sql`GREATEST(total_discount_amount - ${discountAmount}, 0)`,
                    total_orders_count: sql`GREATEST(total_orders_count - 1, 0)`,
                })
                .where(eq(discounts.id, discountId));

            // 3. Delete usage record
            await tx
                .delete(discountUsage)
                .where(eq(discountUsage.order_id, orderId));

            logger.info(`Rolled back usage of code ${discountCode} for order ${orderId}`);
        });
    }

    /**
     * Get usage count for a user on a specific discount
     */
    async getUserUsageCount(discountId: string, userId: string): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(discountUsage)
            .where(and(
                eq(discountUsage.discount_id, discountId),
                eq(discountUsage.user_id, userId)
            ));

        return result[0]?.count ?? 0;
    }

    /**
     * Get usage count for a user on a specific code
     */
    async getUserCodeUsageCount(code: string, userId: string): Promise<number> {
        const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(discountUsage)
            .where(and(
                eq(discountUsage.discount_code, code),
                eq(discountUsage.user_id, userId)
            ));

        return result[0]?.count ?? 0;
    }

    /**
     * Validate a code format
     */
    isValidCodeFormat(code: string): boolean {
        // Allow alphanumeric, hyphens, and underscores, 3-50 chars
        const regex = /^[A-Z0-9_-]{3,50}$/i;
        return regex.test(code.trim());
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * Generate a random code
     */
    private generateRandomCode(prefix: string, length: number): string {
        let code = prefix.toUpperCase();
        const randomPartLength = Math.max(length - prefix.length, 4);

        const randomBytes = crypto.randomBytes(randomPartLength);
        for (let i = 0; i < randomPartLength; i++) {
            code += this.CODE_CHARS[randomBytes[i] % this.CODE_CHARS.length];
        }

        return code;
    }

    /**
     * Generate a unique code that doesn't exist in DB
     */
    async generateUniqueCode(prefix?: string, length?: number): Promise<string> {
        const codeLength = length || this.DEFAULT_CODE_LENGTH;
        const codePrefix = prefix || '';

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const code = this.generateRandomCode(codePrefix, codeLength);
            const existing = await this.getCodeByValue(code);
            if (!existing) {
                return code;
            }
            attempts++;
        }

        throw new Error('Could not generate a unique code. Try a different prefix or length.');
    }
}

export const discountCodeService = new DiscountCodeService();
