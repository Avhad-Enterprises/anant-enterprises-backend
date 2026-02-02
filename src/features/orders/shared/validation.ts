/**
 * Orders Validation Schemas
 * 
 * Shared Zod schemas for order validation across multiple endpoints
 */

import { z } from 'zod';

/**
 * Schema for order item (used in create and update operations)
 */
export const orderItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1),
    cost_price: z.union([z.string(), z.number()]),
    line_total: z.union([z.string(), z.number()]),
    product_name: z.string().optional(),
    sku: z.string().optional(),
    product_image: z.string().optional(),
});

/**
 * Schema for creating a new order
 * Supports both cart-based orders (user checkout) and direct orders (admin)
 */
export const createOrderSchema = z.object({
    // Common fields
    shipping_address_id: z.string().optional().or(z.literal('')), // Admin sends empty string if not selected
    billing_address_id: z.string().optional().or(z.literal('')),
    payment_method: z.string().max(60).default('cod'),
    customer_note: z.string().max(500).optional(),

    // Admin / Direct Order fields
    items: z.array(orderItemSchema).optional(),
    user_id: z.string().optional().or(z.literal('')), // Target customer ID
    channel: z.enum(['web', 'app', 'pos', 'marketplace', 'other']).optional(),
    is_draft: z.boolean().optional(),
    currency: z.string().optional(),

    // Pricing (Admin provided)
    subtotal: z.string().optional(),
    discount_total: z.string().optional(),
    tax_type: z.enum(['cgst_sgst', 'igst', 'none']).optional(),
    cgst_amount: z.string().optional(),
    sgst_amount: z.string().optional(),
    igst_amount: z.string().optional(),
    shipping_total: z.string().optional(),
    cod_charges: z.string().optional(),
    giftcard_total: z.string().optional(),
    total_amount: z.string().optional(),
    advance_paid_amount: z.string().optional(), // For partial payment

    // Metadata
    admin_comment: z.string().optional(),
    tags: z.array(z.string()).optional(),
    amz_order_id: z.string().optional(),
});

/**
 * Type inference for create order data
 */
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Type inference for order item data
 */
export type OrderItemInput = z.infer<typeof orderItemSchema>;
