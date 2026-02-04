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

/**
 * Schema for direct order creation (admin only)
 * Does NOT include pricing fields - pricing is calculated server-side
 */
export const directOrderItemSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    cost_price: z.number().min(0).optional(),
    product_name: z.string().min(1),
    sku: z.string().min(1),
    product_image: z.string().optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    discount_amount: z.number().min(0).optional(),
    tax_percentage: z.number().min(0).max(100).optional(),
});

export const directOrderSchema = z.object({
    // Required fields
    items: z.array(directOrderItemSchema).min(1),
    shipping_state: z.string().length(2), // 2-letter state code (e.g., 'MH', 'DL')
    billing_state: z.string().length(2),

    // Optional fields
    user_id: z.string().uuid().optional(),
    shipping_address_id: z.string().uuid().optional(),
    billing_address_id: z.string().uuid().optional(),
    payment_method: z.string().max(60).default('cod'),
    channel: z.enum(['web', 'app', 'pos', 'marketplace', 'other']).default('web'),
    is_draft: z.boolean().default(false),
    currency: z.string().length(3).default('INR'),
    customer_note: z.string().max(500).optional(),
    admin_comment: z.string().optional(),
    tags: z.array(z.string()).optional(),
    amz_order_id: z.string().optional(),

    // Discount codes (optional)
    discount_code: z.string().optional(),
    giftcard_code: z.string().optional(),

    // Shipping
    shipping_amount: z.number().min(0).optional(),
    delivery_price: z.number().min(0).optional(),
    is_international: z.boolean().optional(),

    // Partial payment
    advance_paid_amount: z.number().min(0).optional(),
});

export type DirectOrderInput = z.infer<typeof directOrderSchema>;

/**
 * Schema for GET /orders query parameters
 */
export const getOrdersQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed']).optional(),
});

export type GetOrdersQuery = z.infer<typeof getOrdersQuerySchema>;

/**
 * Schema for GET /orders/:id path parameters
 */
export const getOrderByIdParamsSchema = z.object({
    id: z.string().uuid('Invalid order ID format'),
});

export type GetOrderByIdParams = z.infer<typeof getOrderByIdParamsSchema>;
