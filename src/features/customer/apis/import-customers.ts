import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter, logger } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { userAddresses } from '../../address/shared/addresses.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
    createImportResult,
    recordSuccess,
    recordFailure,
    recordSkipped,
    formatImportSummary,
    caseInsensitiveEnum,
    arrayParser,
    type ImportMode
} from '../../../utils/import-export';

// Customer-specific validation helpers
const parseDateLoose = (val: unknown): string | undefined => {
    if (typeof val !== 'string') return undefined;
    const cleanVal = val.trim();
    if (!cleanVal) return undefined;

    // Try ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanVal)) return cleanVal;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const match = cleanVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try Date.parse as fallback
    const timestamp = Date.parse(cleanVal);
    if (!isNaN(timestamp)) {
        return new Date(timestamp).toISOString().split('T')[0];
    }
    return undefined;
};

const looseNumber = z.preprocess((val) => {
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '') return undefined;
        return parseFloat(trimmed.replace(/,/g, ''));
    }
    return val;
}, z.coerce.number().min(0).optional());

const emptyStringToUndefined = (val: unknown) => {
    if (typeof val === 'string' && val.trim() === '') return undefined;
    return val;
};


// ============================================
// VALIDATION SCHEMA
// ============================================

const customerImportSchema = z.object({
    // Identity
    first_name: z.string().min(1).max(255).trim(),
    last_name: z.string().min(1).max(255).trim(),
    email: z.string().email().max(255).toLowerCase().trim(),

    // Core Details
    display_name: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
    phone_number: z.preprocess(emptyStringToUndefined, z.string().max(20).optional()),
    secondary_email: z.preprocess(emptyStringToUndefined, z.string().email().max(255).toLowerCase().optional()),
    secondary_phone_number: z.preprocess(emptyStringToUndefined, z.string().max(20).optional()),

    // Flexible Date
    date_of_birth: z.preprocess(
        parseDateLoose,
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (use YYYY-MM-DD or DD/MM/YYYY)").optional()
    ),

    gender: z.preprocess(emptyStringToUndefined, caseInsensitiveEnum(['male', 'female', 'other', 'prefer_not_to_say']).optional()),
    user_type: caseInsensitiveEnum(['individual', 'business']).default('individual'),

    tags: arrayParser().optional(),

    // Profile / Status
    segments: z.preprocess((val) => {
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed === '') return undefined;
            return trimmed.split(',').map(s => s.trim().toLowerCase()).filter(s => ['new', 'regular', 'vip', 'at_risk'].includes(s));
        }
        return val;
    }, z.array(z.enum(['new', 'regular', 'vip', 'at_risk'])).optional()),
    account_status: caseInsensitiveEnum(['active', 'inactive', 'banned']).default('active'),
    notes: z.preprocess(emptyStringToUndefined, z.string().optional()),

    // Business Only (Mapped to generic or ignored if unused)
    company_name: z.preprocess(emptyStringToUndefined, z.string().max(255).optional()),
    tax_id: z.preprocess(emptyStringToUndefined, z.string().max(50).optional()),
    credit_limit: looseNumber,
    payment_terms: z.preprocess(emptyStringToUndefined, caseInsensitiveEnum(['immediate', 'net_15', 'net_30', 'net_60', 'net_90']).optional()),

    // Address (Optional)
    address_name: z.preprocess(emptyStringToUndefined, z.string().max(255).optional()),
    address_line1: z.preprocess(emptyStringToUndefined, z.string().max(255).optional()),
    address_line2: z.preprocess(emptyStringToUndefined, z.string().max(255).optional()),
    city: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
    state_province: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
    postal_code: z.preprocess(emptyStringToUndefined, z.string().max(20).optional()),
    country: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
});

const importRequestSchema = z.object({
    data: z.array(customerImportSchema),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});

/**
 * Process a single customer import record
 */
async function processCustomerRecord(
    rawData: z.infer<typeof customerImportSchema>,
    mode: ImportMode,
    userId: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
    try {
        const customer = rawData;
        const email = customer.email;

        // Check existence (including deleted)
        const [existing] = await db
            .select({ id: users.id, is_deleted: users.is_deleted })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        // Handle mode conflicts
        if (mode === 'create' && existing) {
            if (existing.is_deleted) {
                mode = 'update'; // Restore deleted user
            } else {
                return { success: false, error: 'Email already exists' };
            }
        }

        if (mode === 'update' && !existing) {
            return { success: false, error: 'Customer not found' };
        }

        // Database operations
        const result = await db.transaction(async (tx) => {
            let targetUserId = existing?.id;

            if (!targetUserId) {
                // Create new user
                const [newUser] = await tx.insert(users).values({
                    email: customer.email,
                    first_name: customer.first_name,
                    last_name: customer.last_name,
                    display_name: customer.display_name || `${customer.first_name} ${customer.last_name}`,
                    phone_number: customer.phone_number,
                    secondary_email: customer.secondary_email,
                    secondary_phone_number: customer.secondary_phone_number,
                    date_of_birth: customer.date_of_birth,
                    gender: customer.gender,
                    tags: customer.tags as string[],
                    created_by: userId,
                    updated_by: userId,
                }).returning({ id: users.id });

                targetUserId = newUser.id;

                // Create profile
                await tx.insert(customerProfiles).values({
                    user_id: targetUserId,
                    segments: customer.segments || ['new'],
                    account_status: customer.account_status as 'active' | 'inactive' | 'banned',
                    notes: customer.notes
                });
            } else {
                // Update existing user
                await tx.update(users)
                    .set({
                        first_name: customer.first_name,
                        last_name: customer.last_name,
                        display_name: customer.display_name || `${customer.first_name} ${customer.last_name}`,
                        phone_number: customer.phone_number,
                        secondary_email: customer.secondary_email,
                        secondary_phone_number: customer.secondary_phone_number,
                        date_of_birth: customer.date_of_birth,
                        gender: customer.gender,
                        tags: customer.tags as string[],
                        is_deleted: false, // Restore if deleted
                        updated_by: userId,
                        updated_at: new Date(),
                    })
                    .where(eq(users.id, targetUserId));

                // Update or create profile
                const [existingProfile] = await tx
                    .select({ user_id: customerProfiles.user_id })
                    .from(customerProfiles)
                    .where(eq(customerProfiles.user_id, targetUserId))
                    .limit(1);

                if (existingProfile) {
                    await tx.update(customerProfiles)
                        .set({
                            segments: customer.segments || ['new'],
                            account_status: customer.account_status as 'active' | 'inactive' | 'banned',
                            notes: customer.notes
                        })
                        .where(eq(customerProfiles.user_id, targetUserId));
                } else {
                    await tx.insert(customerProfiles).values({
                        user_id: targetUserId,
                        segments: customer.segments || ['new'],
                        account_status: customer.account_status as 'active' | 'inactive' | 'banned',
                        notes: customer.notes
                    });
                }
            }

            // Handle address if provided
            if (customer.address_line1) {
                // Check if address already exists
                const [existingAddress] = await tx
                    .select({ id: userAddresses.id })
                    .from(userAddresses)
                    .where(eq(userAddresses.user_id, targetUserId))
                    .limit(1);

                const addressData = {
                    user_id: targetUserId,
                    recipient_name: customer.address_name || `${customer.first_name} ${customer.last_name}`,
                    address_line1: customer.address_line1!,
                    address_line2: customer.address_line2 || '',
                    city: customer.city || '',
                    state_province: customer.state_province || '',
                    postal_code: customer.postal_code || '000000',
                    country: customer.country || 'India',
                    country_code: 'IN',
                    address_label: 'home' as const,
                    is_default_shipping: true,
                    is_default_billing: true,
                };

                if (!existingAddress) {
                    await tx.insert(userAddresses).values(addressData);
                }
            }

            return targetUserId;
        });

        return { success: true, recordId: result };
    } catch (error: unknown) {
        logger.error('Customer import error', { error, email: rawData.email });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const handler = async (req: RequestWithUser, res: Response) => {
    const validation = importRequestSchema.safeParse(req.body);
    if (!validation.success) {
        return ResponseFormatter.error(res, 'VALIDATION_ERROR', 'Invalid request data', 400, {
            details: validation.error.issues,
        });
    }

    const { data: customersData, mode } = validation.data;
    const userId = req.userId;

    if (!userId) {
        return ResponseFormatter.error(res, 'UNAUTHORIZED', 'User not authenticated', 401);
    }

    const result = createImportResult();
    logger.info(`Importing ${customersData.length} customers in ${mode} mode`, { userId });

    // Process each customer
    for (let i = 0; i < customersData.length; i++) {
        const customerData = customersData[i];
        const rowNumber = i + 1;

        const importResult = await processCustomerRecord(customerData, mode, userId);

        if (importResult.success) {
            recordSuccess(result, mode, importResult.recordId);
        } else {
            if (importResult.error === 'Email already exists') {
                recordSkipped(result, rowNumber, 'Already exists');
            } else {
                recordFailure(result, rowNumber, importResult.error || 'Unknown error');
            }
        }
    }

    const statusCode = result.failed === 0 ? 200 : 207;
    return ResponseFormatter.success(res, result, formatImportSummary(result), statusCode);
};

const router = Router();
router.post('/', requireAuth, requirePermission('customers:create'), handler);

export default router;

