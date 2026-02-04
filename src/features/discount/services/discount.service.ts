/**
 * Discount Service
 *
 * Core CRUD operations for discount management.
 * Used by admin APIs for creating, updating, and managing discounts.
 */

import { eq, and, or, desc, asc, sql, isNull } from 'drizzle-orm';
import { db } from '../../../database';
import {
    discounts,
    type Discount,
    type NewDiscount,
} from '../shared/discount.schema';
import { discountCodes } from '../shared/discount-codes.schema';
import {
    discountProducts,
    discountCollections,
} from '../shared/discount-items.schema';
import {
    discountCustomers,
    // discountSegments, // REMOVED - Unused table (31 Jan 2026)
    discountRegions,
    // discountExclusions, // REMOVED - Unused table (31 Jan 2026)
    discountBuyXProducts,
    discountBuyXCollections,
    discountGetYProducts,
    discountGetYCollections,
    discountShippingMethods,
    discountShippingZones,
} from '../shared/discount-advanced.schema';
import type {
    IDiscount,
    IDiscountListParams,
    IDiscountListResponse,
    IDiscountWithRelations,
    IDiscountStats,
    DiscountStatus,
} from '../shared/interface';
import { discountUsage } from '../shared/discount-usage.schema';
import { logger } from '../../../utils';
import { buildDiscountSearchConditions } from '../shared/search-utils';

// ============================================
// TYPES
// ============================================

export interface CreateDiscountInput {
    title: string;
    description?: string;
    type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';
    value?: string;
    max_discount_amount?: string;
    applies_to?: 'entire_order' | 'specific_products' | 'specific_collections';
    min_requirement_type?: 'none' | 'min_amount' | 'min_quantity';
    min_requirement_value?: string;

    // Buy X Get Y
    buy_x_trigger_type?: 'quantity' | 'amount';
    buy_x_value?: string;
    buy_x_applies_to?: 'entire_order' | 'specific_products' | 'specific_collections';
    buy_x_same_product?: boolean;
    buy_x_repeat?: boolean;
    get_y_type?: 'free' | 'percentage' | 'amount' | 'fixed_price';
    get_y_applies_to?: 'same' | 'specific_products' | 'specific_collections' | 'cheapest';
    get_y_quantity?: number;
    get_y_value?: string;
    get_y_max_rewards?: number;

    // Free Shipping
    shipping_scope?: 'all' | 'specific_methods' | 'specific_zones';
    shipping_min_amount?: string;
    shipping_min_items?: number;
    shipping_cap?: string;

    // Targeting
    target_audience?: 'all' | 'specific_customers' | 'segments';
    geo_restriction?: 'none' | 'specific_regions';

    // Usage Limits
    usage_limit?: number;
    usage_per_customer?: number;
    usage_per_day?: number;
    usage_per_order?: number;
    once_per_customer?: boolean;
    limit_new_customers?: boolean;
    limit_returning_customers?: boolean;

    // Schedule
    starts_at: Date;
    ends_at?: Date;
    status?: DiscountStatus;

    // Metadata
    tags?: string[];
    admin_comment?: string;

    // Relations
    codes?: { code: string; usage_limit?: number; max_uses_per_customer?: number }[];
    product_ids?: string[];
    collection_ids?: string[];
    customer_ids?: string[];
    segment_ids?: string[];
    region_codes?: { country_code: string; region_code?: string | null }[];
    exclusions?: { type: string; value: string }[];
    buy_x_product_ids?: string[];
    buy_x_collection_ids?: string[];
    get_y_product_ids?: string[];
    get_y_collection_ids?: string[];
    shipping_method_ids?: string[];
    shipping_zone_ids?: string[];

    // Audit
    created_by?: string;
}

export type UpdateDiscountInput = Partial<CreateDiscountInput>;

// ============================================
// SERVICE CLASS
// ============================================

class DiscountService {
    /**
     * Get paginated list of discounts with filters
     */
    async getDiscounts(params: IDiscountListParams): Promise<IDiscountListResponse> {
        const { page = 1, limit = 20, search, status, type, sort = 'newest' } = params;
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [eq(discounts.is_deleted, false)];

        if (search && search.trim().length > 0) {
            const searchConditions = buildDiscountSearchConditions(search);
            if (searchConditions) {
                conditions.push(searchConditions);
            }
        }

        if (status) {
            conditions.push(eq(discounts.status, status));
        }

        if (type) {
            conditions.push(eq(discounts.type, type));
        }

        // Determine sort order
        let orderBy;
        switch (sort) {
            case 'oldest':
                orderBy = asc(discounts.created_at);
                break;
            case 'usage_desc':
                orderBy = desc(discounts.total_usage_count);
                break;
            case 'usage_asc':
                orderBy = asc(discounts.total_usage_count);
                break;
            case 'title_asc':
                orderBy = asc(discounts.title);
                break;
            case 'title_desc':
                orderBy = desc(discounts.title);
                break;
            case 'newest':
            default:
                orderBy = desc(discounts.created_at);
        }

        // Get total count
        const countResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(discounts)
            .where(and(...conditions));
        const total = countResult[0]?.count ?? 0;

        // Get discounts
        const results = await db
            .select()
            .from(discounts)
            .where(and(...conditions))
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return {
            data: results as unknown as IDiscount[],
            meta: {
                total,
                page,
                limit,
                last_page: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get single discount by ID with all relations
     */
    async getDiscountById(id: string): Promise<IDiscountWithRelations | null> {
        const [discount] = await db
            .select()
            .from(discounts)
            .where(and(eq(discounts.id, id), eq(discounts.is_deleted, false)));

        if (!discount) {
            return null;
        }

        // Fetch all relations in parallel
        const [
            codes,
            products,
            collections,
            customers,
            regions,
            buyXProducts,
            buyXCollections,
            getYProducts,
            getYCollections,
            shippingMethods,
            shippingZones,
        ] = await Promise.all([
            db.select().from(discountCodes).where(eq(discountCodes.discount_id, id)),
            db.select().from(discountProducts).where(eq(discountProducts.discount_id, id)),
            db.select().from(discountCollections).where(eq(discountCollections.discount_id, id)),
            db.select().from(discountCustomers).where(eq(discountCustomers.discount_id, id)),
            db.select().from(discountRegions).where(eq(discountRegions.discount_id, id)),
            db.select().from(discountBuyXProducts).where(eq(discountBuyXProducts.discount_id, id)),
            db.select().from(discountBuyXCollections).where(eq(discountBuyXCollections.discount_id, id)),
            db.select().from(discountGetYProducts).where(eq(discountGetYProducts.discount_id, id)),
            db.select().from(discountGetYCollections).where(eq(discountGetYCollections.discount_id, id)),
            db.select().from(discountShippingMethods).where(eq(discountShippingMethods.discount_id, id)),
            db.select().from(discountShippingZones).where(eq(discountShippingZones.discount_id, id)),
        ]);

        return {
            ...(discount as unknown as IDiscount),
            codes: codes as any[],
            products,
            collections,
            customers,
            // segments, // REMOVED (31 Jan 2026)
            regions,
            // exclusions: exclusions.map(e => ({ exclusion_type: e.exclusion_type, exclusion_value: e.exclusion_value })), // REMOVED (31 Jan 2026)
            buy_x_products: buyXProducts,
            buy_x_collections: buyXCollections,
            get_y_products: getYProducts,
            get_y_collections: getYCollections,
            shipping_methods: shippingMethods,
            shipping_zones: shippingZones,
        };
    }

    /**
     * Create a new discount with all relations
     */
    async createDiscount(input: CreateDiscountInput): Promise<IDiscountWithRelations> {
        return db.transaction(async (tx) => {
            // 1. Create the main discount
            const [discount] = await tx
                .insert(discounts)
                .values({
                    title: input.title,
                    description: input.description,
                    type: input.type,
                    value: input.value,
                    max_discount_amount: input.max_discount_amount,
                    applies_to: input.applies_to || 'entire_order',
                    min_requirement_type: input.min_requirement_type || 'none',
                    min_requirement_value: input.min_requirement_value,
                    buy_x_trigger_type: input.buy_x_trigger_type,
                    buy_x_value: input.buy_x_value,
                    buy_x_applies_to: input.buy_x_applies_to,
                    buy_x_same_product: input.buy_x_same_product,
                    buy_x_repeat: input.buy_x_repeat,
                    get_y_type: input.get_y_type,
                    get_y_applies_to: input.get_y_applies_to,
                    get_y_quantity: input.get_y_quantity,
                    get_y_value: input.get_y_value,
                    get_y_max_rewards: input.get_y_max_rewards,
                    shipping_scope: input.shipping_scope,
                    shipping_min_amount: input.shipping_min_amount,
                    shipping_min_items: input.shipping_min_items,
                    shipping_cap: input.shipping_cap,
                    target_audience: input.target_audience || 'all',
                    geo_restriction: input.geo_restriction || 'none',
                    usage_limit: input.usage_limit,
                    usage_per_customer: input.usage_per_customer,
                    usage_per_day: input.usage_per_day,
                    usage_per_order: input.usage_per_order,
                    once_per_customer: input.once_per_customer || false,
                    limit_new_customers: input.limit_new_customers || false,
                    limit_returning_customers: input.limit_returning_customers || false,
                    starts_at: input.starts_at,
                    ends_at: input.ends_at,
                    status: input.status || 'draft',
                    tags: input.tags || [],
                    admin_comment: input.admin_comment,
                    created_by: input.created_by,
                })
                .returning();

            const discountId = discount.id;

            // 2. Create discount codes
            if (input.codes?.length) {
                await tx.insert(discountCodes).values(
                    input.codes.map((c) => ({
                        code: c.code.toUpperCase().trim(),
                        discount_id: discountId,
                        usage_limit: c.usage_limit,
                        max_uses_per_customer: c.max_uses_per_customer,
                    }))
                );
            }

            // 3. Create product/collection links
            if (input.product_ids?.length) {
                await tx.insert(discountProducts).values(
                    input.product_ids.map((pid) => ({ discount_id: discountId, product_id: pid }))
                );
            }

            if (input.collection_ids?.length) {
                await tx.insert(discountCollections).values(
                    input.collection_ids.map((cid) => ({ discount_id: discountId, collection_id: cid }))
                );
            }

            // 4. Create customer/segment targeting
            if (input.customer_ids?.length) {
                await tx.insert(discountCustomers).values(
                    input.customer_ids.map((uid) => ({ discount_id: discountId, user_id: uid }))
                );
            }

            // 4. Create customer restrictions - REMOVED segment restrictions (31 Jan 2026)
            // if (input.segment_ids?.length) {
            //     await tx.insert(discountSegments).values(
            //         input.segment_ids.map((sid) => ({ discount_id: discountId, segment_id: sid }))
            //     );
            // }

            // 5. Create geographic restrictions
            if (input.region_codes?.length) {
                await tx.insert(discountRegions).values(
                    input.region_codes.map((r) => ({
                        discount_id: discountId,
                        country_code: r.country_code,
                        region_code: r.region_code,
                    }))
                );
            }

            // 6. Create exclusions - REMOVED (31 Jan 2026)
            // if (input.exclusions?.length) {
            //     await tx.insert(discountExclusions).values(
            //         input.exclusions.map((e) => ({
            //             discount_id: discountId,
            //             exclusion_type: e.type,
            //             exclusion_value: e.value,
            //         }))
            //     );
            // }

            // 7. Create Buy X products/collections
            if (input.buy_x_product_ids?.length) {
                await tx.insert(discountBuyXProducts).values(
                    input.buy_x_product_ids.map((pid) => ({ discount_id: discountId, product_id: pid }))
                );
            }

            if (input.buy_x_collection_ids?.length) {
                await tx.insert(discountBuyXCollections).values(
                    input.buy_x_collection_ids.map((cid) => ({ discount_id: discountId, collection_id: cid }))
                );
            }

            // 8. Create Get Y products/collections
            if (input.get_y_product_ids?.length) {
                await tx.insert(discountGetYProducts).values(
                    input.get_y_product_ids.map((pid) => ({ discount_id: discountId, product_id: pid }))
                );
            }

            if (input.get_y_collection_ids?.length) {
                await tx.insert(discountGetYCollections).values(
                    input.get_y_collection_ids.map((cid) => ({ discount_id: discountId, collection_id: cid }))
                );
            }

            // 9. Create shipping method/zone restrictions
            if (input.shipping_method_ids?.length) {
                await tx.insert(discountShippingMethods).values(
                    input.shipping_method_ids.map((mid) => ({ discount_id: discountId, shipping_method_id: mid }))
                );
            }

            if (input.shipping_zone_ids?.length) {
                await tx.insert(discountShippingZones).values(
                    input.shipping_zone_ids.map((zid) => ({ discount_id: discountId, shipping_zone_id: zid }))
                );
            }

            logger.info(`Created discount ${discountId}: ${discount.title}`);

            // Return full discount with relations
            return this.getDiscountById(discountId) as Promise<IDiscountWithRelations>;
        });
    }

    /**
     * Update an existing discount
     */
    async updateDiscount(id: string, input: UpdateDiscountInput): Promise<IDiscountWithRelations | null> {
        const existing = await this.getDiscountById(id);
        if (!existing) {
            return null;
        }

        return db.transaction(async (tx) => {
            // 1. Update main discount fields
            const updateData: Partial<NewDiscount> = {};

            // Map input to update data (only include provided fields)
            const fieldMappings: Array<[keyof UpdateDiscountInput, keyof NewDiscount]> = [
                ['title', 'title'],
                ['description', 'description'],
                ['type', 'type'],
                ['value', 'value'],
                ['max_discount_amount', 'max_discount_amount'],
                ['applies_to', 'applies_to'],
                ['min_requirement_type', 'min_requirement_type'],
                ['min_requirement_value', 'min_requirement_value'],
                ['buy_x_trigger_type', 'buy_x_trigger_type'],
                ['buy_x_value', 'buy_x_value'],
                ['buy_x_applies_to', 'buy_x_applies_to'],
                ['buy_x_same_product', 'buy_x_same_product'],
                ['buy_x_repeat', 'buy_x_repeat'],
                ['get_y_type', 'get_y_type'],
                ['get_y_applies_to', 'get_y_applies_to'],
                ['get_y_quantity', 'get_y_quantity'],
                ['get_y_value', 'get_y_value'],
                ['get_y_max_rewards', 'get_y_max_rewards'],
                ['shipping_scope', 'shipping_scope'],
                ['shipping_min_amount', 'shipping_min_amount'],
                ['shipping_min_items', 'shipping_min_items'],
                ['shipping_cap', 'shipping_cap'],
                ['target_audience', 'target_audience'],
                ['geo_restriction', 'geo_restriction'],
                ['usage_limit', 'usage_limit'],
                ['usage_per_customer', 'usage_per_customer'],
                ['usage_per_day', 'usage_per_day'],
                ['usage_per_order', 'usage_per_order'],
                ['once_per_customer', 'once_per_customer'],
                ['limit_new_customers', 'limit_new_customers'],
                ['limit_returning_customers', 'limit_returning_customers'],
                ['starts_at', 'starts_at'],
                ['ends_at', 'ends_at'],
                ['status', 'status'],
                ['tags', 'tags'],
                ['admin_comment', 'admin_comment'],
            ];

            for (const [inputKey, dbKey] of fieldMappings) {
                if (input[inputKey] !== undefined) {
                    (updateData as any)[dbKey] = input[inputKey];
                }
            }

            updateData.updated_at = new Date();

            await tx.update(discounts).set(updateData).where(eq(discounts.id, id));

            // 2. Update relations (replace strategy - delete and re-insert)
            if (input.product_ids !== undefined) {
                await tx.delete(discountProducts).where(eq(discountProducts.discount_id, id));
                if (input.product_ids.length) {
                    await tx.insert(discountProducts).values(
                        input.product_ids.map((pid) => ({ discount_id: id, product_id: pid }))
                    );
                }
            }

            if (input.collection_ids !== undefined) {
                await tx.delete(discountCollections).where(eq(discountCollections.discount_id, id));
                if (input.collection_ids.length) {
                    await tx.insert(discountCollections).values(
                        input.collection_ids.map((cid) => ({ discount_id: id, collection_id: cid }))
                    );
                }
            }

            if (input.customer_ids !== undefined) {
                await tx.delete(discountCustomers).where(eq(discountCustomers.discount_id, id));
                if (input.customer_ids.length) {
                    await tx.insert(discountCustomers).values(
                        input.customer_ids.map((uid) => ({ discount_id: id, user_id: uid }))
                    );
                }
            }

            // REMOVED - segment restrictions update (31 Jan 2026)
            // if (input.segment_ids !== undefined) {
            //     await tx.delete(discountSegments).where(eq(discountSegments.discount_id, id));
            //     if (input.segment_ids.length) {
            //         await tx.insert(discountSegments).values(
            //             input.segment_ids.map((sid) => ({ discount_id: id, segment_id: sid }))
            //         );
            //     }
            // }

            if (input.region_codes !== undefined) {
                await tx.delete(discountRegions).where(eq(discountRegions.discount_id, id));
                if (input.region_codes.length) {
                    await tx.insert(discountRegions).values(
                        input.region_codes.map((r) => ({
                            discount_id: id,
                            country_code: r.country_code,
                            region_code: r.region_code,
                        }))
                    );
                }
            }

            // REMOVED - exclusions update (31 Jan 2026)
            // if (input.exclusions !== undefined) {
            //     await tx.delete(discountExclusions).where(eq(discountExclusions.discount_id, id));
            //     if (input.exclusions.length) {
            //         await tx.insert(discountExclusions).values(
            //             input.exclusions.map((e) => ({
            //                 discount_id: id,
            //                 exclusion_type: e.type,
            //                 exclusion_value: e.value,
            //             }))
            //         );
            //     }
            // }

            // Buy X / Get Y products/collections
            if (input.buy_x_product_ids !== undefined) {
                await tx.delete(discountBuyXProducts).where(eq(discountBuyXProducts.discount_id, id));
                if (input.buy_x_product_ids.length) {
                    await tx.insert(discountBuyXProducts).values(
                        input.buy_x_product_ids.map((pid) => ({ discount_id: id, product_id: pid }))
                    );
                }
            }

            if (input.buy_x_collection_ids !== undefined) {
                await tx.delete(discountBuyXCollections).where(eq(discountBuyXCollections.discount_id, id));
                if (input.buy_x_collection_ids.length) {
                    await tx.insert(discountBuyXCollections).values(
                        input.buy_x_collection_ids.map((cid) => ({ discount_id: id, collection_id: cid }))
                    );
                }
            }

            if (input.get_y_product_ids !== undefined) {
                await tx.delete(discountGetYProducts).where(eq(discountGetYProducts.discount_id, id));
                if (input.get_y_product_ids.length) {
                    await tx.insert(discountGetYProducts).values(
                        input.get_y_product_ids.map((pid) => ({ discount_id: id, product_id: pid }))
                    );
                }
            }

            if (input.get_y_collection_ids !== undefined) {
                await tx.delete(discountGetYCollections).where(eq(discountGetYCollections.discount_id, id));
                if (input.get_y_collection_ids.length) {
                    await tx.insert(discountGetYCollections).values(
                        input.get_y_collection_ids.map((cid) => ({ discount_id: id, collection_id: cid }))
                    );
                }
            }

            if (input.shipping_method_ids !== undefined) {
                await tx.delete(discountShippingMethods).where(eq(discountShippingMethods.discount_id, id));
                if (input.shipping_method_ids.length) {
                    await tx.insert(discountShippingMethods).values(
                        input.shipping_method_ids.map((mid) => ({ discount_id: id, shipping_method_id: mid }))
                    );
                }
            }

            if (input.shipping_zone_ids !== undefined) {
                await tx.delete(discountShippingZones).where(eq(discountShippingZones.discount_id, id));
                if (input.shipping_zone_ids.length) {
                    await tx.insert(discountShippingZones).values(
                        input.shipping_zone_ids.map((zid) => ({ discount_id: id, shipping_zone_id: zid }))
                    );
                }
            }

            logger.info(`Updated discount ${id}`);

            return this.getDiscountById(id);
        });
    }

    /**
     * Soft delete a discount
     */
    async deleteDiscount(id: string, deletedBy?: string): Promise<boolean> {
        await db
            .update(discounts)
            .set({
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
                status: 'inactive',
            })
            .where(and(eq(discounts.id, id), eq(discounts.is_deleted, false)));

        logger.info(`Deleted discount ${id}`);
        return true;
    }

    /**
     * Toggle discount status (active <-> inactive)
     */
    async toggleStatus(id: string): Promise<Discount | null> {
        const [discount] = await db
            .select()
            .from(discounts)
            .where(and(eq(discounts.id, id), eq(discounts.is_deleted, false)));

        if (!discount) {
            return null;
        }

        const newStatus: DiscountStatus = discount.status === 'active' ? 'inactive' : 'active';

        const [updated] = await db
            .update(discounts)
            .set({ status: newStatus, updated_at: new Date() })
            .where(eq(discounts.id, id))
            .returning();

        logger.info(`Toggled discount ${id} status to ${newStatus}`);
        return updated;
    }

    /**
     * Duplicate a discount
     */
    async duplicateDiscount(id: string, createdBy?: string): Promise<IDiscountWithRelations | null> {
        const original = await this.getDiscountById(id);
        if (!original) {
            return null;
        }

        // Create input from original
        const input: CreateDiscountInput = {
            title: `${original.title} (Copy)`,
            description: original.description || undefined,
            type: original.type,
            value: original.value || undefined,
            max_discount_amount: original.max_discount_amount || undefined,
            applies_to: original.applies_to,
            min_requirement_type: original.min_requirement_type,
            min_requirement_value: original.min_requirement_value || undefined,
            buy_x_trigger_type: original.buy_x_trigger_type || undefined,
            buy_x_value: original.buy_x_value || undefined,
            buy_x_applies_to: original.buy_x_applies_to || undefined,
            buy_x_same_product: original.buy_x_same_product,
            buy_x_repeat: original.buy_x_repeat,
            get_y_type: original.get_y_type || undefined,
            get_y_applies_to: original.get_y_applies_to || undefined,
            get_y_quantity: original.get_y_quantity || undefined,
            get_y_value: original.get_y_value || undefined,
            get_y_max_rewards: original.get_y_max_rewards || undefined,
            shipping_scope: original.shipping_scope || undefined,
            shipping_min_amount: original.shipping_min_amount || undefined,
            shipping_min_items: original.shipping_min_items || undefined,
            shipping_cap: original.shipping_cap || undefined,
            target_audience: original.target_audience,
            geo_restriction: original.geo_restriction,
            usage_limit: original.usage_limit || undefined,
            usage_per_customer: original.usage_per_customer || undefined,
            usage_per_day: original.usage_per_day || undefined,
            usage_per_order: original.usage_per_order || undefined,
            once_per_customer: original.once_per_customer,
            limit_new_customers: original.limit_new_customers,
            limit_returning_customers: original.limit_returning_customers,
            starts_at: new Date(), // Start now
            ends_at: original.ends_at || undefined,
            status: 'draft', // Always create as draft
            tags: original.tags,
            admin_comment: original.admin_comment || undefined,
            // Don't copy codes - they must be unique
            product_ids: original.products?.map((p) => p.product_id),
            collection_ids: original.collections?.map((c) => c.collection_id),
            customer_ids: original.customers?.map((c) => c.user_id),
            segment_ids: original.segments?.map((s) => s.segment_id),
            region_codes: original.regions?.map((r) => ({
                country_code: r.country_code,
                region_code: r.region_code,
            })),
            exclusions: original.exclusions?.map((e) => ({ type: e.exclusion_type, value: e.exclusion_value })),
            buy_x_product_ids: original.buy_x_products?.map((p) => p.product_id),
            buy_x_collection_ids: original.buy_x_collections?.map((c) => c.collection_id),
            get_y_product_ids: original.get_y_products?.map((p) => p.product_id),
            get_y_collection_ids: original.get_y_collections?.map((c) => c.collection_id),
            shipping_method_ids: original.shipping_methods?.map((m) => m.shipping_method_id),
            shipping_zone_ids: original.shipping_zones?.map((z) => z.shipping_zone_id),
            created_by: createdBy,
        };

        return this.createDiscount(input);
    }

    /**
     * Get discount statistics
     */
    async getDiscountStats(id: string): Promise<IDiscountStats | null> {
        const [discount] = await db
            .select()
            .from(discounts)
            .where(eq(discounts.id, id));

        if (!discount) {
            return null;
        }

        // Get usage stats from discount_usage table
        const usageStats = await db
            .select({
                total_amount: sql<string>`COALESCE(SUM(discount_amount), 0)::text`,
                orders_count: sql<number>`COUNT(DISTINCT order_id)::int`,
                redemptions: sql<number>`COUNT(*)::int`,
            })
            .from(discountUsage)
            .where(eq(discountUsage.discount_id, id));

        const stats = usageStats[0];
        const avgDiscount = stats.redemptions > 0
            ? (parseFloat(stats.total_amount) / stats.redemptions).toFixed(2)
            : '0';

        // Get usage by date (last 30 days)
        const usageByDate = await db
            .select({
                date: sql<string>`DATE(used_at)::text`,
                count: sql<number>`COUNT(*)::int`,
                amount: sql<string>`SUM(discount_amount)::text`,
            })
            .from(discountUsage)
            .where(and(
                eq(discountUsage.discount_id, id),
                sql`used_at >= NOW() - INTERVAL '30 days'`
            ))
            .groupBy(sql`DATE(used_at)`)
            .orderBy(sql`DATE(used_at)`);

        return {
            redemptions: stats.redemptions,
            total_amount: stats.total_amount,
            orders_count: stats.orders_count,
            average_discount: avgDiscount,
            usage_by_date: usageByDate.map((u) => ({
                date: u.date,
                count: u.count,
                amount: u.amount,
            })),
        };
    }

    /**
     * Update discount status based on dates (for cron job)
     */
    async updateDiscountStatuses(): Promise<{ activated: number; expired: number }> {
        const now = new Date();

        // Activate scheduled discounts
        await db
            .update(discounts)
            .set({ status: 'active', updated_at: now })
            .where(
                and(
                    eq(discounts.status, 'scheduled'),
                    eq(discounts.is_deleted, false),
                    sql`starts_at <= ${now}`,
                    or(isNull(discounts.ends_at), sql`ends_at > ${now}`)
                )
            );

        // Expire active discounts
        await db
            .update(discounts)
            .set({ status: 'expired', updated_at: now })
            .where(
                and(
                    eq(discounts.status, 'active'),
                    eq(discounts.is_deleted, false),
                    sql`ends_at IS NOT NULL AND ends_at <= ${now}`
                )
            );

        // Note: Drizzle doesn't return affected rows count easily, so we return estimates
        return { activated: 0, expired: 0 };
    }
}

export const discountService = new DiscountService();
