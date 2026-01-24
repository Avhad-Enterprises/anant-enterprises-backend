/**
 * POST /api/customers/import
 * Import customers from CSV/JSON data
 * Admin only
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../shared/business-profiles.schema';
import { userAddresses } from '../shared/addresses.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';

// Validation schema for a single customer import
const customerImportSchema = z.object({
    // Required fields
    first_name: z.string().min(1).max(255).trim(),
    last_name: z.string().min(1).max(255).trim(),
    email: z.string().email().max(255).toLowerCase().trim(),
    
    // Optional core fields
    display_name: z.string().max(100).optional(),
    phone_number: z.string().max(20).optional(),
    secondary_email: z.string().email().max(255).toLowerCase().optional(),
    secondary_phone_number: z.string().max(20).optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    user_type: z.enum(['individual', 'business']).default('individual'),
    tags: z.union([
        z.array(z.string()),
        z.string().transform(val => val.split(',').map(t => t.trim()).filter(t => t.length > 0))
    ]).optional(),
    
    // Profile fields
    segment: z.enum(['new', 'regular', 'vip', 'at_risk']).optional(),
    account_status: z.enum(['active', 'suspended', 'closed']).default('active'),
    notes: z.string().optional(),
    
    // Business fields (for user_type: 'business')
    company_name: z.string().max(255).optional(),
    tax_id: z.string().max(50).optional(),
    credit_limit: z.coerce.number().min(0).optional(),
    payment_terms: z.enum(['immediate', 'net_15', 'net_30', 'net_60', 'net_90']).optional(),
    
    // Address (optional, one address per import)
    address_name: z.string().max(255).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state_province: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
});

// Validation schema for the import request
const importCustomersSchema = z.object({
    data: z.array(customerImportSchema).min(1).max(1000), // Limit to 1000 customers per import
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

type ImportMode = 'create' | 'update' | 'upsert';
type ImportResult = {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; email: string; error: string }>;
};

/**
 * Generate unique customer_id (CUST-XXXXXX format)
 */
async function generateCustomerId(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let customerId: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        // Generate random 6-character code
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        customerId = `CUST-${code}`;

        // Check if it exists
        const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.customer_id, customerId))
            .limit(1);

        if (existing.length === 0) {
            return customerId;
        }

        attempts++;
    }

    // Fallback to timestamp-based if random generation fails
    return `CUST-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Import a single customer based on the mode
 */
async function importCustomer(
    customerData: z.infer<typeof customerImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const email = customerData.email.toLowerCase().trim();

        // Check if customer exists by email
        const existingCustomer = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
                eq(users.email, email),
                eq(users.is_deleted, false)
            ))
            .limit(1);

        const exists = existingCustomer.length > 0;

        // Mode validation
        if (mode === 'create' && exists) {
            return { success: false, error: 'Email already exists' };
        }
        if (mode === 'update' && !exists) {
            return { success: false, error: 'Customer not found' };
        }

        // Start transaction for multi-table operations
        return await db.transaction(async (tx) => {
            let customerId: string;

            if (mode === 'create' || (mode === 'upsert' && !exists)) {
                // CREATE NEW CUSTOMER
                
                // Generate unique customer_id
                const generatedCustomerId = await generateCustomerId();

                // Prepare user data
                const userData = {
                    customer_id: generatedCustomerId,
                    name: customerData.first_name,
                    last_name: customerData.last_name,
                    display_name: customerData.display_name || 
                        `${customerData.first_name} ${customerData.last_name}`.trim(),
                    email: email,
                    user_type: customerData.user_type,
                    phone_number: customerData.phone_number,
                    secondary_email: customerData.secondary_email,
                    secondary_phone_number: customerData.secondary_phone_number,
                    date_of_birth: customerData.date_of_birth,
                    gender: customerData.gender,
                    tags: customerData.tags as string[] | undefined,
                    email_verified: false,
                    phone_verified: false,
                    created_by: userId,
                    updated_by: userId,
                };

                // Insert user
                const [newUser] = await tx.insert(users).values(userData).returning({ id: users.id });
                customerId = newUser.id;

                // Create appropriate profile
                if (customerData.user_type === 'business') {
                    // Create business profile
                    await tx.insert(businessCustomerProfiles).values({
                        user_id: customerId,
                        business_type: 'sole_proprietor',
                        company_legal_name: customerData.company_name || 'Not Provided',
                        business_email: customerData.email,
                        tax_id: customerData.tax_id,
                        credit_limit: customerData.credit_limit?.toString(),
                        payment_terms: customerData.payment_terms,
                        account_status: customerData.account_status,
                        notes: customerData.notes,
                    });
                } else {
                    // Create individual customer profile
                    await tx.insert(customerProfiles).values({
                        user_id: customerId,
                        segment: customerData.segment,
                        account_status: customerData.account_status,
                        notes: customerData.notes,
                        email_opt_in: true, // Default
                    });
                }

            } else {
                // UPDATE EXISTING CUSTOMER
                customerId = existingCustomer[0].id;

                // Update user data
                const updateData: any = {
                    name: customerData.first_name,
                    last_name: customerData.last_name,
                    updated_by: userId,
                    updated_at: new Date(),
                };

                // Only update if provided
                if (customerData.display_name) updateData.display_name = customerData.display_name;
                if (customerData.phone_number) updateData.phone_number = customerData.phone_number;
                if (customerData.secondary_email) updateData.secondary_email = customerData.secondary_email;
                if (customerData.secondary_phone_number) updateData.secondary_phone_number = customerData.secondary_phone_number;
                if (customerData.date_of_birth) updateData.date_of_birth = customerData.date_of_birth;
                if (customerData.gender) updateData.gender = customerData.gender;
                if (customerData.tags) updateData.tags = customerData.tags as string[];

                await tx.update(users)
                    .set(updateData)
                    .where(eq(users.id, customerId));

                // Update profile based on user type
                const [userType] = await tx
                    .select({ user_type: users.user_type })
                    .from(users)
                    .where(eq(users.id, customerId));

                const profileUpdateData: any = {
                    updated_by: userId,
                    updated_at: new Date(),
                };

                if (customerData.account_status) profileUpdateData.account_status = customerData.account_status;
                if (customerData.notes) profileUpdateData.notes = customerData.notes;

                if (userType.user_type === 'business') {
                    if (customerData.company_name) profileUpdateData.company_legal_name = customerData.company_name;
                    if (customerData.tax_id) profileUpdateData.tax_id = customerData.tax_id;
                    if (customerData.credit_limit !== undefined) profileUpdateData.credit_limit = customerData.credit_limit.toString();
                    if (customerData.payment_terms) profileUpdateData.payment_terms = customerData.payment_terms;

                    await tx.update(businessCustomerProfiles)
                        .set(profileUpdateData)
                        .where(eq(businessCustomerProfiles.user_id, customerId));
                } else {
                    if (customerData.segment) profileUpdateData.segment = customerData.segment;

                    await tx.update(customerProfiles)
                        .set(profileUpdateData)
                        .where(eq(customerProfiles.user_id, customerId));
                }
            }

            // Create address if address fields provided
            if (customerData.address_line1 && customerData.city && customerData.state_province) {
                const addressData = {
                    user_id: customerId,
                    address_type: 'both' as const,
                    is_default: true,
                    recipient_name: customerData.address_name || 
                        `${customerData.first_name} ${customerData.last_name}`.trim(),
                    address_line1: customerData.address_line1,
                    address_line2: customerData.address_line2,
                    city: customerData.city,
                    state_province: customerData.state_province,
                    postal_code: customerData.postal_code || '000000',
                    country: customerData.country || 'India',
                    country_code: 'IN', // Default
                    is_international: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                };

                // For create mode or if no addresses exist, create new address
                if (mode === 'create' || (mode === 'upsert' && !exists)) {
                    await tx.insert(userAddresses).values(addressData);
                }
            }

            return { success: true };
        });

    } catch (error: any) {
        logger.error('Error importing customer:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
}

/**
 * Handler for customer import
 */
export async function importCustomersHandler(
    req: RequestWithUser,
    res: Response
): Promise<void> {
    try {
        // Validate request body
        const { data, mode } = importCustomersSchema.parse(req.body);
        const userId = req.userId;

        if (!userId) {
            throw new HttpException(401, 'User not authenticated');
        }

        const result: ImportResult = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        // Process each customer
        for (let i = 0; i < data.length; i++) {
            const customerData = data[i];
            const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

            const importResult = await importCustomer(customerData, mode, userId);

            if (importResult.success) {
                result.success++;
            } else {
                result.failed++;
                result.errors.push({
                    row: rowNumber,
                    email: customerData.email,
                    error: importResult.error || 'Unknown error'
                });
            }
        }

        logger.info(`Customer import completed: ${result.success} success, ${result.failed} failed`);

        ResponseFormatter.success(res, result, 'Customer import completed', 200);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            ResponseFormatter.error(
                res,
                'VALIDATION_ERROR',
                'Invalid import data',
                400,
                { errors: error.issues }
            );
        } else if (error instanceof HttpException) {
            ResponseFormatter.error(res, 'HTTP_ERROR', error.message, (error as any).statusCode || 500);
        } else {
            logger.error('Unexpected error in customer import:', error);
            ResponseFormatter.error(res, 'IMPORT_ERROR', 'Failed to import customers', 500);
        }
    }
}

const router = Router();
router.post(
    '/import',
    requireAuth,
    requirePermission('customers:write'),
    importCustomersHandler
);

export default router;
