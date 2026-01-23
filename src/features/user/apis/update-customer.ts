/**
 * PUT /api/users/customer/:id
 * Update customer details (Combines User + CustomerProfile)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, shortTextSchema, emailSchema, uuidSchema, HttpException, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../shared/user.schema';
import { customerProfiles, customerSegmentEnum, customerAccountStatusEnum } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles, businessAccountStatusEnum, paymentTermsEnum } from '../shared/business-profiles.schema';
import { updateTagUsage } from '../../tags/services/tag-sync.service';

// Validation Schema
const updateCustomerSchema = z.object({
    // User Fields
    name: shortTextSchema.optional(),
    last_name: shortTextSchema.optional(),
    email: emailSchema.optional(),
    phone_number: z.string().optional(),
    secondary_email: z.string().email().optional().nullable(),
    secondary_phone_number: z.string().optional().nullable(),
    // Verification status fields for primary/secondary swap
    email_verified: z.boolean().optional(),
    secondary_email_verified: z.boolean().optional(),
    user_type: z.enum(['individual', 'business']).optional(),
    tags: z.array(z.string()).optional(),
    display_name: z.string().max(100).optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    preferred_language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    profile_image_url: z.string().optional().nullable(),

    // Customer (Individual) Profile Fields
    segment: z.enum(customerSegmentEnum.enumValues).optional(),
    notes: z.string().optional(), // Shared with Business profile conceptually, but stored in respective table
    account_status: z.enum(customerAccountStatusEnum.enumValues).optional(),
    store_credit_balance: z.number().or(z.string()).optional(),

    // Business (B2B) Profile Fields
    company_legal_name: z.string().optional(),
    tax_id: z.string().optional(), // GSTIN
    credit_limit: z.number().or(z.string()).optional(),
    payment_terms: z.enum(paymentTermsEnum.enumValues).optional(),
    business_account_status: z.enum(businessAccountStatusEnum.enumValues).optional(),

    // Marketing Preferences
    marketing_opt_in: z.boolean().optional(),
    sms_opt_in: z.boolean().optional(),
    email_opt_in: z.boolean().optional(),
    whatsapp_opt_in: z.boolean().optional(),

    // Risk & Loyalty & Subscription (New Fields)
    risk_profile: z.string().optional(),
    loyalty_enrolled: z.boolean().optional(),
    loyalty_tier: z.string().optional(),
    loyalty_points: z.number().or(z.string()).optional(),
    loyalty_enrollment_date: z.string().optional(),
    subscription_plan: z.string().optional(),
    subscription_status: z.string().optional(),
    billing_cycle: z.string().optional(),
    subscription_start_date: z.string().optional(),
    auto_renew: z.boolean().optional(),
});

type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

const handler = async (req: RequestWithUser, res: Response) => {
    const { id } = req.params as { id: string };
    const data: UpdateCustomerDto = req.body;

    logger.info(`Updating customer ${id}`, data);

    try {
        // Store oldTags outside transaction for tag sync
        let oldTags: string[] = [];

        await db.transaction(async (tx) => {
            // 1. Update User Table (Basic Info)
            const userUpdates: any = {};
            if (data.name) userUpdates.name = data.name;
            if (data.last_name) userUpdates.last_name = data.last_name;
            if (data.email) userUpdates.email = data.email;
            if (data.phone_number !== undefined) userUpdates.phone_number = data.phone_number;
            if (data.user_type) userUpdates.user_type = data.user_type;
            if (data.tags) userUpdates.tags = data.tags;
            if (data.display_name !== undefined) userUpdates.display_name = data.display_name || null;
            if (data.date_of_birth !== undefined) userUpdates.date_of_birth = data.date_of_birth || null;
            if (data.gender !== undefined) userUpdates.gender = data.gender || null;
            if (data.profile_image_url !== undefined) userUpdates.profile_image_url = data.profile_image_url;
            if (data.preferred_language !== undefined) userUpdates.preferred_language = data.preferred_language;
            if (data.languages !== undefined) userUpdates.languages = data.languages;
            if (data.secondary_email !== undefined) userUpdates.secondary_email = data.secondary_email;
            if (data.secondary_phone_number !== undefined) userUpdates.secondary_phone_number = data.secondary_phone_number;

            // Handle verification status for primary/secondary swap
            // If frontend explicitly provides verified status, use it (for swap scenarios)
            if (data.email_verified !== undefined) {
                userUpdates.email_verified = data.email_verified;
            }
            if (data.secondary_email_verified !== undefined) {
                userUpdates.secondary_email_verified = data.secondary_email_verified;
            } else if (data.secondary_email) {
                // Fallback: Check if secondary email was verified via OTP
                const { emailOtps } = await import('../shared/email-otp.schema');
                const [secondaryVerifiedOtp] = await tx
                    .select()
                    .from(emailOtps)
                    .where(
                        and(
                            eq(emailOtps.email, data.secondary_email.toLowerCase()),
                            eq(emailOtps.purpose, 'email_verification'),
                        )
                    )
                    .limit(1);
                if (secondaryVerifiedOtp?.verified_at !== null) {
                    userUpdates.secondary_email_verified = true;
                }
            }

            // Fetch current user type if not provided, to know which profile to update
            // However, for efficiency, if user_type IS provided, we use it.
            // If not provided, we might assume the existng type.
            // But simplify: We try to update the profile that matches the user_type.

            let targetUserType = data.user_type;

            // Fetch current user to get user_type and old tags
            const currentUser = await tx.query.users.findFirst({
                where: eq(users.id, id),
                columns: { user_type: true, tags: true }
            });

            if (currentUser) {
                targetUserType = data.user_type || (currentUser.user_type as 'individual' | 'business') || 'individual';
                oldTags = (currentUser.tags as string[]) || []; // This updates the outer scope variable
            }

            if (Object.keys(userUpdates).length > 0) {
                await tx.update(users)
                    .set({ ...userUpdates, updated_at: new Date() })
                    .where(eq(users.id, id));
            }

            // 2. Update Profile Based on Type
            if (targetUserType === 'business') {
                // UPDATE BUSINESS PROFILE
                const businessUpdates: any = {};
                if (data.company_legal_name) businessUpdates.company_legal_name = data.company_legal_name;
                if (data.tax_id) businessUpdates.tax_id = data.tax_id;
                if (data.notes) businessUpdates.notes = data.notes; // Map generic notes to business notes
                if (data.payment_terms) businessUpdates.payment_terms = data.payment_terms;

                // Map generic status to business status if needed, or use specific field
                if (data.business_account_status) {
                    businessUpdates.account_status = data.business_account_status;
                } else if (data.account_status) {
                    // Map individual status to business status if reasonable, or ignore
                    // Simple mapping: 'active' -> 'active', 'suspended'->'suspended', 'closed'->'closed'
                    businessUpdates.account_status = data.account_status;
                }

                if (data.credit_limit !== undefined) businessUpdates.credit_limit = String(data.credit_limit);

                logger.info('Business Profile updates:', businessUpdates);

                if (Object.keys(businessUpdates).length > 0) {
                    await tx.insert(businessCustomerProfiles)
                        .values({
                            user_id: id,
                            business_type: 'sole_proprietor', // Default if missing
                            company_legal_name: businessUpdates.company_legal_name || 'N/A', // Required field
                            business_email: userUpdates.email || data.email || 'pending@update.com', // fallback
                            ...businessUpdates
                        })
                        .onConflictDoUpdate({
                            target: businessCustomerProfiles.user_id,
                            set: { ...businessUpdates, updated_at: new Date() }
                        });
                }

            } else {
                // UPDATE INDIVIDUAL CUSTOMER PROFILE
                const profileUpdates: any = {};
                if (data.segment !== undefined) profileUpdates.segment = data.segment;
                if (data.notes !== undefined) profileUpdates.notes = data.notes;
                if (data.account_status !== undefined) profileUpdates.account_status = data.account_status;
                if (data.store_credit_balance !== undefined) profileUpdates.store_credit_balance = String(data.store_credit_balance);

                // Marketing
                if (data.marketing_opt_in !== undefined) profileUpdates.marketing_opt_in = data.marketing_opt_in;
                if (data.sms_opt_in !== undefined) profileUpdates.sms_opt_in = data.sms_opt_in;
                if (data.email_opt_in !== undefined) profileUpdates.email_opt_in = data.email_opt_in;
                if (data.whatsapp_opt_in !== undefined) profileUpdates.whatsapp_opt_in = data.whatsapp_opt_in;

                // Risk & Loyalty & Subscription
                if (data.risk_profile !== undefined) profileUpdates.risk_profile = data.risk_profile;
                if (data.loyalty_enrolled !== undefined) profileUpdates.loyalty_enrolled = data.loyalty_enrolled;
                if (data.loyalty_tier !== undefined) profileUpdates.loyalty_tier = data.loyalty_tier;
                if (data.loyalty_points !== undefined) profileUpdates.loyalty_points = String(data.loyalty_points);
                if (data.loyalty_enrollment_date !== undefined) profileUpdates.loyalty_enrollment_date = data.loyalty_enrollment_date ? new Date(data.loyalty_enrollment_date) : null;

                if (data.subscription_plan !== undefined) profileUpdates.subscription_plan = data.subscription_plan;
                if (data.subscription_status !== undefined) profileUpdates.subscription_status = data.subscription_status;
                if (data.billing_cycle !== undefined) profileUpdates.billing_cycle = data.billing_cycle;
                if (data.subscription_start_date !== undefined) profileUpdates.subscription_start_date = data.subscription_start_date ? new Date(data.subscription_start_date) : null;
                if (data.auto_renew !== undefined) profileUpdates.auto_renew = data.auto_renew;

                logger.info('Individual Profile updates:', profileUpdates);

                if (Object.keys(profileUpdates).length > 0) {
                    await tx.insert(customerProfiles)
                        .values({
                            user_id: id,
                            ...profileUpdates
                        })
                        .onConflictDoUpdate({
                            target: customerProfiles.user_id,
                            set: { ...profileUpdates, updated_at: new Date() }
                        });
                }
            }
        });

        // Update tag usage counts if tags were changed
        if (data.tags !== undefined) {
            const newTags = data.tags || [];
            await updateTagUsage(oldTags, newTags, 'customer');
        }

        ResponseFormatter.success(res, { id, ...data }, 'Customer updated successfully');

    } catch (error: any) {
        logger.error('Error updating customer:', error);

        // Drizzle ORM wraps PostgreSQL errors - the actual error is in error.cause
        const pgError = error?.cause || error;
        const errorCode = pgError?.code || error?.code || '';
        const errorMessage = pgError?.message || error?.message || '';
        const errorDetail = pgError?.detail || error?.detail || '';
        const errorConstraint = pgError?.constraint || error?.constraint || '';

        logger.info('PostgreSQL Error details:', {
            code: errorCode,
            constraint: errorConstraint,
            detail: errorDetail,
            message: errorMessage
        });

        // Check for duplicate email constraint violation
        // PostgreSQL unique violation code is '23505'
        const isDuplicateEmail =
            errorCode === '23505' ||
            errorConstraint.includes('email') ||
            errorConstraint.includes('users_email_key') ||
            errorDetail.toLowerCase().includes('email') ||
            errorMessage.toLowerCase().includes('duplicate key');

        if (isDuplicateEmail) {
            throw new HttpException(409, 'Email already exists');
        }

        throw new HttpException(500, 'Failed to update customer details');
    }
};

const router = Router();
const paramsSchema = z.object({ id: uuidSchema });

router.put(
    '/customer/:id',
    requireAuth,
    requirePermission('users:update'),
    validationMiddleware(paramsSchema, 'params'),
    validationMiddleware(updateCustomerSchema),
    handler
);

export default router;
