import { z } from 'zod';
import { shortTextSchema, emailSchema, uuidSchema } from '../../../utils';
import { paymentTermsEnum, businessAccountStatusEnum } from '../shared/business-profiles.schema';
import { customerAccountStatusEnum } from '../shared/customer-profiles.schema';

// ============================================
// CREATE CUSTOMER SCHEMA
// ============================================

export const createCustomerSchema = z.object({
    // Required User Fields
    first_name: shortTextSchema,
    middle_name: shortTextSchema.optional(),
    last_name: shortTextSchema,
    email: emailSchema,
    phone_number: z.string().optional(),
    secondary_email: z.string().email().optional(),
    secondary_phone_number: z.string().optional(),
    // DEPRECATED: user_type removed - create appropriate profile instead
    tags: z.array(z.string()).optional(),
    profile_image_url: z.string().optional(),

    // Optional User Fields
    display_name: z.string().max(100).optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    preferred_language: z.string().optional(),
    languages: z.array(z.string()).optional(),

    // Customer (Individual) Profile Fields
    segments: z.array(z.enum(['new', 'regular', 'vip', 'at_risk'])).optional(),
    notes: z.string().optional(),

    // Business (B2B) Profile Fields
    company_legal_name: z.string().optional(),
    tax_id: z.string().optional(), // GSTIN
    credit_limit: z.number().or(z.string()).optional(),
    payment_terms: z.enum(paymentTermsEnum.enumValues).optional(),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

// ============================================
// UPDATE CUSTOMER SCHEMA
// ============================================

export const updateCustomerSchema = z.object({
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

export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;

// ============================================
// BULK DELETE SCHEMA
// ============================================

export const bulkDeleteSchema = z.object({
    ids: z.array(uuidSchema).min(1, 'At least one ID is required')
});

export type BulkDeleteDto = z.infer<typeof bulkDeleteSchema>;

// ============================================
// EXPORT CUSTOMER SCHEMA
// ============================================

import { baseExportSchema } from '../../../utils/import-export';

export const customerExportSchema = baseExportSchema.extend({
    filters: z.object({
        status: z.enum(['active', 'inactive', 'banned']).optional(),
        gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
        tags: z.string().optional(),
    }).optional(),
});

// ============================================
// IMPORT CUSTOMER SCHEMA & HELPERS
// ============================================

import {
    caseInsensitiveEnum,
    arrayParser,
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

export const customerImportSchema = z.object({
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

export const importRequestSchema = z.object({
    data: z.array(customerImportSchema),
    mode: z.enum(['create', 'update', 'upsert']).default('create'),
});
