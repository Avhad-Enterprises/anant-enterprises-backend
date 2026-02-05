/**
 * PUT /api/users/customer/:id
 * Update customer details (Combines User + CustomerProfile)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth, requirePermission, validationMiddleware } from '../../../middlewares';
import { ResponseFormatter, uuidSchema, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { businessCustomerProfiles } from '../shared/business-profiles.schema';
import { updateTagUsage } from '../../tags/services/tag-sync.service';
import { updateCustomerSchema, UpdateCustomerDto } from '../shared/validation';

// Validation Schema imported from ../shared/validation

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
        // Update customer profile (create if doesn't exist)
        const customerProfileUpdates: Record<string, unknown> = {};
        if (data.segments !== undefined) customerProfileUpdates.segments = data.segments;
        if (data.notes !== undefined) customerProfileUpdates.notes = data.notes;
        if (data.account_status !== undefined) customerProfileUpdates.account_status = data.account_status;
        if (data.store_credit_balance !== undefined) customerProfileUpdates.store_credit_balance = String(data.store_credit_balance);
        if (data.marketing_opt_in !== undefined) customerProfileUpdates.marketing_opt_in = data.marketing_opt_in;
        if (data.sms_opt_in !== undefined) customerProfileUpdates.sms_opt_in = data.sms_opt_in;
        if (data.email_opt_in !== undefined) customerProfileUpdates.email_opt_in = data.email_opt_in;
        if (data.whatsapp_opt_in !== undefined) customerProfileUpdates.whatsapp_opt_in = data.whatsapp_opt_in;

        // Risk & Loyalty & Subscription fields
        if (data.risk_profile !== undefined) customerProfileUpdates.risk_profile = data.risk_profile;
        if (data.loyalty_enrolled !== undefined) customerProfileUpdates.loyalty_enrolled = data.loyalty_enrolled;
        if (data.loyalty_tier !== undefined) customerProfileUpdates.loyalty_tier = data.loyalty_tier;
        if (data.loyalty_points !== undefined) customerProfileUpdates.loyalty_points = String(data.loyalty_points);
        if (data.loyalty_enrollment_date !== undefined) customerProfileUpdates.loyalty_enrollment_date = data.loyalty_enrollment_date;
        if (data.subscription_plan !== undefined) customerProfileUpdates.subscription_plan = data.subscription_plan;
        if (data.subscription_status !== undefined) customerProfileUpdates.subscription_status = data.subscription_status;
        if (data.billing_cycle !== undefined) customerProfileUpdates.billing_cycle = data.billing_cycle;
        if (data.subscription_start_date !== undefined) customerProfileUpdates.subscription_start_date = data.subscription_start_date;
        if (data.auto_renew !== undefined) customerProfileUpdates.auto_renew = data.auto_renew;

        if (Object.keys(customerProfileUpdates).length > 0) {
            // Use upsert to create profile if it doesn't exist
            await tx.insert(customerProfiles)
                .values({
                    user_id: id,
                    ...customerProfileUpdates,
                })
                .onConflictDoUpdate({
                    target: customerProfiles.user_id,
                    set: { ...customerProfileUpdates, updated_at: new Date() }
                });
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
