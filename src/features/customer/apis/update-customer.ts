/**
 * PUT /api/users/customer/:id
 * Update customer details (Combines User + CustomerProfile)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, shortTextSchema, emailSchema, uuidSchema, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles, customerAccountStatusEnum } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles, businessAccountStatusEnum, paymentTermsEnum } from '../shared/business-profiles.schema';
import { updateTagUsage } from '../../tags/services/tag-sync.service';

// Validation Schema
const updateCustomerSchema = z.object({
    // User Fields
    first_name: shortTextSchema.optional(),
    middle_name: shortTextSchema.optional().nullable(),
    last_name: shortTextSchema.optional(),
    email: emailSchema.optional(),
    phone_number: z.string().optional(),
    secondary_email: z.string().email().optional().nullable(),
    secondary_phone_number: z.string().optional().nullable(),
    // Verification status fields for primary/secondary swap
    email_verified: z.boolean().optional(),
    secondary_email_verified: z.boolean().optional(),
    // DEPRECATED: user_type removed - use profile tables
    tags: z.array(z.string()).optional(),
    display_name: z.string().max(100).optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    preferred_language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    profile_image_url: z.string().optional().nullable(),

    // Customer (Individual) Profile Fields
    segments: z.array(z.enum(['new', 'regular', 'vip', 'at_risk'])).optional(),
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

    // Store oldTags outside transaction for tag sync
    let oldTags: string[] = [];

    await db.transaction(async (tx) => {
        // 1. Update User Table (Basic Info)
        const userUpdates: Record<string, unknown> = {};
        if (data.first_name) userUpdates.first_name = data.first_name;
        if (data.middle_name !== undefined) userUpdates.middle_name = data.middle_name;
        if (data.last_name) userUpdates.last_name = data.last_name;
        if (data.email) userUpdates.email = data.email;
        if (data.phone_number !== undefined) userUpdates.phone_number = data.phone_number;
        // user_type removed (deprecated)
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
            const { emailOtps } = await import('../../user/shared/email-otp.schema');
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

        // Fetch current user for old tags
        const currentUser = await tx.query.users.findFirst({
            where: eq(users.id, id),
            columns: { tags: true }
        });

        if (currentUser) {
            oldTags = (currentUser.tags as string[]) || [];
        }

        if (Object.keys(userUpdates).length > 0) {
            await tx.update(users)
                .set({ ...userUpdates, updated_at: new Date() })
                .where(eq(users.id, id));
        }

        // 2. Update Profile Tables - polymorphic approach
        // Update customer profile (always exists for customers)
        const customerProfileUpdates: Record<string, unknown> = {};
        if (data.segments !== undefined) customerProfileUpdates.segments = data.segments;
        if (data.notes !== undefined) customerProfileUpdates.notes = data.notes;
        if (data.account_status !== undefined) customerProfileUpdates.account_status = data.account_status;
        if (data.store_credit_balance !== undefined) customerProfileUpdates.store_credit_balance = String(data.store_credit_balance);
        if (data.marketing_opt_in !== undefined) customerProfileUpdates.marketing_opt_in = data.marketing_opt_in;
        if (data.sms_opt_in !== undefined) customerProfileUpdates.sms_opt_in = data.sms_opt_in;
        if (data.email_opt_in !== undefined) customerProfileUpdates.email_opt_in = data.email_opt_in;
        if (data.whatsapp_opt_in !== undefined) customerProfileUpdates.whatsapp_opt_in = data.whatsapp_opt_in;

        if (Object.keys(customerProfileUpdates).length > 0) {
            await tx.update(customerProfiles)
                .set({ ...customerProfileUpdates, updated_at: new Date() })
                .where(eq(customerProfiles.user_id, id));
        }

        // Update business profile if B2B data provided (upsert approach)
        const businessProfileUpdates: Record<string, unknown> = {};
        if (data.company_legal_name) businessProfileUpdates.company_legal_name = data.company_legal_name;
        if (data.tax_id !== undefined) businessProfileUpdates.tax_id = data.tax_id;
        if (data.credit_limit !== undefined) businessProfileUpdates.credit_limit = String(data.credit_limit);
        if (data.payment_terms) businessProfileUpdates.payment_terms = data.payment_terms;
        if (data.business_account_status) businessProfileUpdates.account_status = data.business_account_status;

        if (Object.keys(businessProfileUpdates).length > 0) {
            await tx.update(businessCustomerProfiles)
                .set({ ...businessProfileUpdates, updated_at: new Date() })
                .where(eq(businessCustomerProfiles.user_id, id));
        }
    });

    // Update tag usage counts if tags were changed
    if (data.tags !== undefined) {
        const newTags = data.tags || [];
        await updateTagUsage(oldTags, newTags, 'customer');
    }

    ResponseFormatter.success(res, { id, ...data }, 'Customer updated successfully');
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
