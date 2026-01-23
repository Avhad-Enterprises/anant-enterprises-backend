/**
 * POST /api/users/customer
 * Create a new customer (B2C or B2B)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, shortTextSchema, emailSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { eq, and } from 'drizzle-orm';
import { users } from '../shared/user.schema';
import { customerProfiles, customerSegmentEnum } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles, paymentTermsEnum } from '../shared/business-profiles.schema';
import { syncTags } from '../../tags/services/tag-sync.service';

// Validation Schema
const createCustomerSchema = z.object({
    // Required User Fields
    name: shortTextSchema, // First name
    last_name: shortTextSchema, // Last name (required)
    email: emailSchema,
    phone_number: z.string().optional(),
    secondary_email: z.string().email().optional(),
    secondary_phone_number: z.string().optional(),
    user_type: z.enum(['individual', 'business']).default('individual'),
    tags: z.array(z.string()).optional(),
    profile_image_url: z.string().optional(),

    // Optional User Fields
    display_name: z.string().max(100).optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    preferred_language: z.string().optional(),
    languages: z.array(z.string()).optional(),

    // Customer (Individual) Profile Fields
    segment: z.enum(customerSegmentEnum.enumValues).optional(),
    notes: z.string().optional(),

    // Business (B2B) Profile Fields
    company_legal_name: z.string().optional(),
    tax_id: z.string().optional(), // GSTIN
    credit_limit: z.number().or(z.string()).optional(),
    payment_terms: z.enum(paymentTermsEnum.enumValues).optional(),
});

type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

const handler = async (req: RequestWithUser, res: Response) => {
    const data: CreateCustomerDto = req.body;

    logger.info('Creating new customer', { email: data.email, type: data.user_type });

    try {
        // Check if user already exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, data.email));

        if (existingUser) {
            throw new HttpException(409, 'A customer with this email already exists');
        }

        // Check if email was verified via OTP
        const { emailOtps } = await import('../shared/email-otp.schema');
        const [verifiedOtp] = await db
            .select()
            .from(emailOtps)
            .where(
                and(
                    eq(emailOtps.email, data.email.toLowerCase()),
                    eq(emailOtps.purpose, 'email_verification'),
                )
            )
            .limit(1);

        const isEmailVerified = verifiedOtp?.verified_at !== null;
        const emailVerifiedAt = verifiedOtp?.verified_at || null;

        // Check if secondary email was verified via OTP
        let isSecondaryEmailVerified = false;
        if (data.secondary_email) {
            const [secondaryVerifiedOtp] = await db
                .select()
                .from(emailOtps)
                .where(
                    and(
                        eq(emailOtps.email, data.secondary_email.toLowerCase()),
                        eq(emailOtps.purpose, 'email_verification'),
                    )
                )
                .limit(1);
            isSecondaryEmailVerified = secondaryVerifiedOtp?.verified_at !== null;
        }

        // Generate unique customer_id (format: CUST-XXXXXX)
        const generateCustomerId = (): string => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = 'CUST-';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        // Ensure unique customer_id
        let customerId = generateCustomerId();
        let attempts = 0;
        while (attempts < 10) {
            const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.customer_id, customerId))
                .limit(1);
            if (!existing) break;
            customerId = generateCustomerId();
            attempts++;
        }

        const result = await db.transaction(async (tx) => {
            // 1. Create User with email_verified status and customer_id
            const [newUser] = await tx.insert(users)
                .values({
                    name: data.name,
                    last_name: data.last_name,
                    email: data.email,
                    customer_id: customerId,
                    display_name: data.display_name,
                    phone_number: data.phone_number,
                    user_type: data.user_type,
                    tags: data.tags || [],
                    date_of_birth: data.date_of_birth || undefined,
                    gender: data.gender,
                    preferred_language: data.preferred_language || 'en',
                    languages: data.languages || [],
                    profile_image_url: data.profile_image_url,
                    email_verified: isEmailVerified,
                    email_verified_at: emailVerifiedAt,
                    secondary_email: data.secondary_email,
                    secondary_email_verified: isSecondaryEmailVerified,
                    secondary_phone_number: data.secondary_phone_number,
                })
                .returning();

            // 2. Create Profile Based on Type
            if (data.user_type === 'business') {
                // Create Business Profile
                await tx.insert(businessCustomerProfiles)
                    .values({
                        user_id: newUser.id,
                        business_type: 'sole_proprietor', // Default
                        company_legal_name: data.company_legal_name || data.name,
                        business_email: data.email,
                        tax_id: data.tax_id,
                        credit_limit: data.credit_limit ? String(data.credit_limit) : '0',
                        payment_terms: data.payment_terms || 'immediate',
                        notes: data.notes,
                    });
            } else {
                // Create Individual Customer Profile
                await tx.insert(customerProfiles)
                    .values({
                        user_id: newUser.id,
                        segment: data.segment || 'new',
                        notes: data.notes,
                    });
            }

            return newUser;
        });

        logger.info(`Customer created successfully: ${result.id}`);

        // Sync customer tags to master tags table
        if (data.tags && data.tags.length > 0) {
            await syncTags(data.tags, 'customer');
        }

        ResponseFormatter.success(res, result, 'Customer created successfully', 201);

    } catch (error: any) {
        logger.error('Error creating customer:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            detail: error.detail
        });

        // Handle unique constraint violation (duplicate email)
        if (error.code === '23505') {
            throw new HttpException(409, 'A customer with this email already exists');
        }

        // If it's already an HttpException, rethrow it
        if (error instanceof HttpException) {
            throw error;
        }

        throw new HttpException(500, `Failed to create customer: ${error.message}`);
    }
};

const router = Router();

router.post(
    '/customer',
    requireAuth,
    requirePermission('users:create'),
    validationMiddleware(createCustomerSchema),
    handler
);

export default router;
