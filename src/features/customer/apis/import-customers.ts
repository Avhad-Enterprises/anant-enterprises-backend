import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ResponseFormatter } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { userAddresses } from '../../address/shared/addresses.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import { logger } from '../../../utils/logging/logger';

// ============================================
// HELPERS
// ============================================

// Helper for loose date parsing
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
        // Basic check for validity could be added, but this handles format
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try Date.parse as fallback
    const timestamp = Date.parse(cleanVal);
    if (!isNaN(timestamp)) {
        return new Date(timestamp).toISOString().split('T')[0];
    }
    return undefined; // Invalid format
};

// Helper for case-insensitive enum mapping
const caseInsensitiveEnum = <T extends string>(values: readonly T[]) => {
    return z.preprocess((val) => {
        if (typeof val === 'string') {
            const lower = val.toLowerCase().trim();
            const match = values.find(v => v.toLowerCase() === lower);
            return match || val;
        }
        return val;
    }, z.enum(values as [T, ...T[]]));
};

// Start number parser
const looseNumber = z.preprocess((val) => {
    if (typeof val === 'string') return parseFloat(val.replace(/,/g, ''));
    return val;
}, z.coerce.number().min(0).optional());


// ============================================
// VALIDATION SCHEMA
// ============================================

const customerImportSchema = z.object({
    // Identity
    first_name: z.string().min(1).max(255).trim(),
    last_name: z.string().min(1).max(255).trim(),
    email: z.string().email().max(255).toLowerCase().trim(),

    // Core Details
    display_name: z.string().max(100).optional(),
    phone_number: z.string().max(20).optional(),
    secondary_email: z.string().email().max(255).toLowerCase().optional().or(z.literal('')),
    secondary_phone_number: z.string().max(20).optional(),

    // Flexible Date
    date_of_birth: z.preprocess(
        parseDateLoose,
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (use YYYY-MM-DD or DD/MM/YYYY)").optional()
    ),

    gender: caseInsensitiveEnum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    user_type: caseInsensitiveEnum(['individual', 'business']).default('individual'),

    tags: z.union([
        z.array(z.string()),
        z.string().transform(val => val.split(',').map(t => t.trim()).filter(t => t.length > 0))
    ]).optional(),

    // Profile / Status
    segment: caseInsensitiveEnum(['new', 'regular', 'vip', 'at_risk']).optional(),
    account_status: caseInsensitiveEnum(['active', 'inactive', 'banned']).default('active'),
    notes: z.string().optional(),

    // Business Only (Mapped to generic or ignored if unused)
    company_name: z.string().max(255).optional(),
    tax_id: z.string().max(50).optional(),
    credit_limit: looseNumber,
    payment_terms: caseInsensitiveEnum(['immediate', 'net_15', 'net_30', 'net_60', 'net_90']).optional(),

    // Address (Optional)
    address_name: z.string().max(255).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state_province: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
});

const importRequestSchema = z.object({
    data: z.array(z.any()),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});


// ============================================
// LOGIC
// ============================================

async function processRow(
    rawData: any,
    mode: 'create' | 'update' | 'upsert',
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Validate
        const customer = customerImportSchema.parse(rawData);
        const email = customer.email;

        // 2. Check Existence (Including Deleted!)
        const [existing] = await db
            .select({ id: users.id, is_deleted: users.is_deleted })
            .from(users)
            .where(eq(users.email, email)) // Removed is_deleted = false check to find deleted ones
            .limit(1);

        // Handle Create Mode Conflicts
        if (mode === 'create' && existing) {
            if (existing.is_deleted) {
                // Determine if we should restore. For 'create' mode on a deleted user, 
                // typically we fail or treat as conflict, BUT user asked to "import customers that are deleted again"
                // effectively meaning "restore/recreate".
                // We'll proceed to UPDATE path to restore them.
                mode = 'update'; // Valid strategy: treat as update/restore
            } else {
                return { success: false, error: 'Email already exists' };
            }
        }

        // Handle Update Mode missing
        if (mode === 'update' && !existing) {
            return { success: false, error: 'Customer not found' };
        }

        // 3. Database Ops
        await db.transaction(async (tx) => {
            let targetUserId = existing?.id;

            // --- A) Create New ---
            if (!targetUserId) {
                // console.log('Creating new user with email:', customer.email);
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

                if (!targetUserId) throw new Error("Failed to create user ID");

                // Create Profile (Generic for all users)
                try {
                    await tx.insert(customerProfiles).values({
                        user_id: targetUserId!,
                        segment: customer.segment || 'new',
                        account_status: customer.account_status as 'active' | 'inactive' | 'banned',
                        notes: customer.notes
                    });
                } catch (e: any) {
                    console.error("Profile Insert Error:", e.message);
                    throw e;
                }
            }
            // --- B) Update / Restore Existing ---
            else {
                if (!targetUserId) throw new Error("Invalid Target User ID for update");

                // Update User (and restore if deleted)
                await tx.update(users).set({
                    first_name: customer.first_name,
                    last_name: customer.last_name,
                    display_name: customer.display_name,
                    phone_number: customer.phone_number,
                    secondary_email: customer.secondary_email,
                    secondary_phone_number: customer.secondary_phone_number,
                    date_of_birth: customer.date_of_birth,
                    gender: customer.gender,
                    tags: customer.tags as string[],
                    updated_by: userId,
                    updated_at: new Date(),
                    // RESTORE IF DELETED
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                }).where(eq(users.id, targetUserId));

                // Update Profile
                // Check if profile exists first? Or upsert?
                // For simplicity, we try update first. If row missing (unlikely for valid user), we might need insert.
                // But generally user exists implies profile exists. 
                // If profiles were hard deleted but user soft deleted, this might fail or do nothing.
                // Drizzle's `onConflictDoUpdate` is better for upsert but standard update is safer for simple logic.
                // We'll Stick to update.

                await tx.update(customerProfiles).set({
                    segment: customer.segment,
                    account_status: customer.account_status as 'active' | 'inactive' | 'banned',
                    notes: customer.notes,
                    updated_at: new Date()
                }).where(eq(customerProfiles.user_id, targetUserId));
            }

            // --- C) Address Handling ---
            if (customer.address_line1 && customer.city && targetUserId) {
                await tx.insert(userAddresses).values({
                    user_id: targetUserId!,
                    recipient_name: customer.address_name || `${customer.first_name} ${customer.last_name}`,
                    address_line1: customer.address_line1,
                    address_line2: customer.address_line2,
                    city: customer.city,
                    state_province: customer.state_province || '',
                    postal_code: customer.postal_code || '000000',
                    country: customer.country || 'India',
                    country_code: 'IN',
                    is_default: true,
                    address_type: 'both'
                });
            }
        });

        return { success: true };

    } catch (err: any) {
        if (err instanceof z.ZodError) {
            const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            return { success: false, error: `Validation: ${issues}` };
        }
        return { success: false, error: err.message || 'Database error' };
    }
}


// ============================================
// ROUTE HANDLER
// ============================================

const router = Router();

router.post(
    '/',
    requireAuth,
    requirePermission('customers:write'),
    async (req: RequestWithUser, res: Response) => {
        try {
            const body = importRequestSchema.parse(req.body);
            const { data, mode } = body;
            const userId = req.userId!;

            const results = {
                success: 0,
                failed: 0,
                skipped: 0,
                errors: [] as Array<{ row: number; email: string; error: string }>
            };

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const result = await processRow(row, mode, userId);

                if (result.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        email: (row.email || 'unknown') as string,
                        error: (result.error || 'Unknown error') as string
                    });
                }
            }

            ResponseFormatter.success(res, results);

        } catch (error: any) {
            logger.error('Import failed', error);
            if (error instanceof z.ZodError) {
                // Fixed: Pass error details correctly
                ResponseFormatter.error(res, 'VALIDATION_ERROR', 'Invalid request format', 400, { issues: error.issues });
            } else {
                ResponseFormatter.error(res, 'SERVER_ERROR', error.message, 500);
            }
        }
    }
);

export default router;
