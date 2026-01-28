# Customer Import/Export - Actual Implemented Fields Analysis

## Overview
This document analyzes the customer fields that are **actually implemented** in the admin panel's Add/Edit Customer pages, compared to the full database schema.

## Fields Analysis

### ✅ Implemented in Admin Panel

Based on the AddCustomerPage, CustomerDetailPage, and CustomerForm components, the following fields are **actually being used**:

#### Core User Fields (users table)
1. ✅ **first_name** (name in DB) - Required, Text input
2. ✅ **last_name** - Required, Text input
3. ✅ **display_name** - Optional, Text input
4. ✅ **email** - Required, Email input (primary)
5. ✅ **phone_number** - Optional, Text input (primary)
6. ✅ **secondary_email** - Optional, Email input
7. ✅ **secondary_phone_number** - Optional, Text input
8. ✅ **date_of_birth** - Optional, Date picker
9. ✅ **gender** - Optional, Select (male, female, other, prefer_not_to_say)
10. ✅ **user_type** - Derived from customerType (individual/business)
11. ✅ **profile_image_url** - Optional, File upload
12. ✅ **preferred_language** - Optional, from language array (first item)
13. ✅ **languages** - Optional, Multi-select array
14. ✅ **tags** - Optional, Array (stored as internalTags)

#### Profile Fields (customer_profiles / business_customer_profiles)
15. ✅ **segment** - Optional, Array (new, regular, vip, at_risk) - mapped from customerSegment
16. ✅ **account_status** - Derived from status toggle (active/suspended)
17. ✅ **notes** - Optional, Text (stored as internalNotes)

#### Business-Specific Fields (business_customer_profiles)
18. ✅ **company_legal_name** - Optional, Text (companyName)
19. ✅ **tax_id** - Optional, Text (gstNumber for GST/PAN)
20. ✅ **credit_limit** - Optional, Number
21. ✅ **payment_terms** - Optional, Select (immediate, net_15, net_30, net_60, net_90)

#### Loyalty Fields (customer_profiles)
22. ✅ **loyalty_enrolled** - Optional, Boolean
23. ✅ **loyalty_tier** - Optional, Text
24. ✅ **loyalty_points** - Optional, Number
25. ✅ **loyalty_enrollment_date** - Optional, Date

#### Subscription Fields (customer_profiles)
26. ✅ **subscription_plan** - Optional, Text
27. ✅ **subscription_status** - Optional, Select (active, paused, cancelled, expired)
28. ✅ **billing_cycle** - Optional, Select (monthly, quarterly, yearly)
29. ✅ **subscription_start_date** - Optional, Date
30. ✅ **auto_renew** - Optional, Boolean

#### Address Fields (user_addresses)
31. ✅ **addresses** - Array of addresses with:
    - name (recipient_name)
    - country
    - state (state_province)
    - city
    - pincode (postal_code)
    - streetAddress1 (address_line1)
    - streetAddress2 (address_line2)
    - landmark (delivery_instructions)
    - addressType (address_type: home/office/other → billing/shipping/both)
    - isDefaultBilling
    - isDefaultShipping

#### Verification Fields (Read-only in UI, but received from backend)
32. ✅ **email_verified** - Boolean (displayed, not editable)
33. ✅ **phone_verified** - Boolean (displayed, not editable)
34. ✅ **secondary_email_verified** - Boolean (displayed, not editable)

#### Metadata Fields (stored in metadata JSONB)
35. ✅ **gdprStatus** - Optional, Text
36. ✅ **privacyPolicyVersion** - Optional, Text
37. ✅ **marketingConsentDate** - Optional, Date
38. ✅ **lastLoginDate** - Read-only
39. ✅ **lastLoginIP** - Read-only
40. ✅ **lastLogoutDate** - Read-only
41. ✅ **failedLoginAttempts** - Read-only
42. ✅ **accountLockedUntil** - Read-only

### ❌ NOT Implemented in Admin Panel (Available in Schema but Not in UI)

These fields exist in the database schema but are **NOT** exposed in the current Add/Edit Customer forms:

#### Marketing Preferences (customer_profiles)
- ❌ marketing_opt_in
- ❌ email_opt_in
- ❌ sms_opt_in
- ❌ whatsapp_opt_in
- ❌ push_notifications_opt_in

#### Store Credit & Referral (customer_profiles)
- ❌ store_credit_balance
- ❌ referral_code
- ❌ referred_by_user_id
- ❌ referral_bonus_credited

#### Risk & Suspension (customer_profiles)
- ❌ risk_profile (low/medium/high) - Commented out in UI
- ❌ suspended_reason
- ❌ suspended_until

#### Phone Details
- ❌ phone_country_code
- ❌ phone_verified_at
- ❌ email_verified_at

#### Advanced Address Fields
- ❌ company_name (in address)
- ❌ phone_number (in address)
- ❌ phone_country_code (in address)
- ❌ latitude
- ❌ longitude
- ❌ country_code (ISO)
- ❌ is_international

#### Regional Preferences
- ❌ preferred_currency
- ❌ timezone

#### Business Fields (business_customer_profiles)
- ❌ business_type
- ❌ industry
- ❌ annual_revenue
- ❌ employee_count

## Import/Export Field Recommendations

### Recommended Fields for Import (20 fields)

Based on actual implementation:

```typescript
export const customerImportFields: ImportField[] = [
  // Required (3)
  { id: 'first_name', label: 'First Name', required: true, type: 'text' },
  { id: 'last_name', label: 'Last Name', required: true, type: 'text' },
  { id: 'email', label: 'Email', required: true, type: 'email' },
  
  // Optional Core (8)
  { id: 'display_name', label: 'Display Name', required: false, type: 'text' },
  { id: 'phone_number', label: 'Phone Number', required: false, type: 'tel' },
  { id: 'secondary_email', label: 'Secondary Email', required: false, type: 'email' },
  { id: 'secondary_phone_number', label: 'Secondary Phone', required: false, type: 'tel' },
  { id: 'date_of_birth', label: 'Date of Birth (YYYY-MM-DD)', required: false, type: 'date' },
  { id: 'gender', label: 'Gender', required: false, type: 'select',
    options: ['male', 'female', 'other', 'prefer_not_to_say'] },
  { id: 'user_type', label: 'Customer Type', required: false, type: 'select',
    options: ['individual', 'business'], description: 'Determines profile type' },
  { id: 'tags', label: 'Tags', required: false, type: 'text',
    description: 'Comma-separated internal tags' },
  
  // Profile (3)
  { id: 'segment', label: 'Segment', required: false, type: 'select',
    options: ['new', 'regular', 'vip', 'at_risk'] },
  { id: 'account_status', label: 'Account Status', required: false, type: 'select',
    options: ['active', 'suspended', 'closed'], description: 'Default: active' },
  { id: 'notes', label: 'Internal Notes', required: false, type: 'text' },
  
  // Business (4) - Only used when user_type = 'business'
  { id: 'company_name', label: 'Company Name', required: false, type: 'text',
    description: 'For business customers only' },
  { id: 'tax_id', label: 'Tax ID (GST/PAN)', required: false, type: 'text' },
  { id: 'credit_limit', label: 'Credit Limit', required: false, type: 'number' },
  { id: 'payment_terms', label: 'Payment Terms', required: false, type: 'select',
    options: ['immediate', 'net_15', 'net_30', 'net_60', 'net_90'] },
  
  // Address (Optional - 1 address per import) (7)
  { id: 'address_name', label: 'Address Name', required: false, type: 'text' },
  { id: 'address_line1', label: 'Address Line 1', required: false, type: 'text' },
  { id: 'address_line2', label: 'Address Line 2', required: false, type: 'text' },
  { id: 'city', label: 'City', required: false, type: 'text' },
  { id: 'state_province', label: 'State/Province', required: false, type: 'text' },
  { id: 'postal_code', label: 'Postal Code', required: false, type: 'text' },
  { id: 'country', label: 'Country', required: false, type: 'text', description: 'Default: India' },
];
```

**Total: 27 import fields** (3 required + 24 optional)

### Recommended Fields for Export (30 columns)

```typescript
export const customerExportColumns: ExportColumn[] = [
  // Core - Always Selected (9)
  { id: 'customer_id', label: 'Customer ID', defaultSelected: true },
  { id: 'first_name', label: 'First Name', defaultSelected: true },
  { id: 'last_name', label: 'Last Name', defaultSelected: true },
  { id: 'email', label: 'Email', defaultSelected: true },
  { id: 'phone_number', label: 'Phone Number', defaultSelected: true },
  { id: 'user_type', label: 'Customer Type', defaultSelected: true },
  { id: 'segment', label: 'Segment', defaultSelected: true },
  { id: 'account_status', label: 'Status', defaultSelected: true },
  { id: 'created_at', label: 'Created At', defaultSelected: true },
  
  // Optional Core (8)
  { id: 'display_name', label: 'Display Name', defaultSelected: false },
  { id: 'secondary_email', label: 'Secondary Email', defaultSelected: false },
  { id: 'secondary_phone_number', label: 'Secondary Phone', defaultSelected: false },
  { id: 'date_of_birth', label: 'Date of Birth', defaultSelected: false },
  { id: 'gender', label: 'Gender', defaultSelected: false },
  { id: 'tags', label: 'Tags', defaultSelected: false },
  { id: 'notes', label: 'Internal Notes', defaultSelected: false },
  { id: 'profile_image_url', label: 'Profile Image URL', defaultSelected: false },
  
  // Verification (3)
  { id: 'email_verified', label: 'Email Verified', defaultSelected: false },
  { id: 'phone_verified', label: 'Phone Verified', defaultSelected: false },
  { id: 'secondary_email_verified', label: 'Secondary Email Verified', defaultSelected: false },
  
  // Business Fields (4)
  { id: 'company_name', label: 'Company Name', defaultSelected: false },
  { id: 'tax_id', label: 'Tax ID', defaultSelected: false },
  { id: 'credit_limit', label: 'Credit Limit', defaultSelected: false },
  { id: 'payment_terms', label: 'Payment Terms', defaultSelected: false },
  
  // Loyalty (4)
  { id: 'loyalty_enrolled', label: 'Loyalty Enrolled', defaultSelected: false },
  { id: 'loyalty_tier', label: 'Loyalty Tier', defaultSelected: false },
  { id: 'loyalty_points', label: 'Loyalty Points', defaultSelected: false },
  { id: 'loyalty_enrollment_date', label: 'Loyalty Enrollment Date', defaultSelected: false },
  
  // Subscription (5)
  { id: 'subscription_plan', label: 'Subscription Plan', defaultSelected: false },
  { id: 'subscription_status', label: 'Subscription Status', defaultSelected: false },
  { id: 'billing_cycle', label: 'Billing Cycle', defaultSelected: false },
  { id: 'subscription_start_date', label: 'Subscription Start Date', defaultSelected: false },
  { id: 'auto_renew', label: 'Auto Renew', defaultSelected: false },
  
  // Address (from default address) (4)
  { id: 'city', label: 'City', defaultSelected: false },
  { id: 'state', label: 'State', defaultSelected: false },
  { id: 'postal_code', label: 'Postal Code', defaultSelected: false },
  { id: 'country', label: 'Country', defaultSelected: false },
  
  // Aggregated Metrics (2)
  { id: 'total_orders', label: 'Total Orders', defaultSelected: false },
  { id: 'total_spent', label: 'Total Spent', defaultSelected: false },
];
```

**Total: 39 export columns** (9 default selected + 30 optional)

## Key Differences from Original Plan

### Removed/Simplified:
1. ❌ Marketing preferences (not in UI)
2. ❌ Risk profile (commented out in UI)
3. ❌ Store credit & referral (not in UI)
4. ❌ Phone country codes (not exposed)
5. ❌ Geo-coordinates (not in UI)
6. ❌ Advanced business fields (industry, revenue, etc.)

### Added Based on Actual Implementation:
1. ✅ Secondary email/phone (actual field names)
2. ✅ Loyalty complete fields (enrolled, tier, points, enrollment_date)
3. ✅ Subscription complete fields (plan, status, cycle, dates, auto_renew)
4. ✅ Internal tags (not just tags)
5. ✅ Internal notes (separate from customer notes)
6. ✅ Verification status fields (email_verified, phone_verified)

## Implementation Complexity Update

### Simplified Aspects:
- Fewer fields to validate (27 import vs original 35)
- No marketing preferences handling
- No referral system
- Simpler address structure (no geo-coordinates)

### Same Complexity:
- Multi-table operations still required
- Customer ID generation
- Profile type selection (individual/business)
- Email uniqueness validation
- Transaction handling for addresses

## Updated Timeline Estimate

| Phase | Original | Updated | Reason |
|-------|----------|---------|--------|
| Backend Import | 4-6 hours | 3-4 hours | Fewer fields, simpler validation |
| Backend Export | 3-4 hours | 2-3 hours | Fewer columns, no complex joins for marketing prefs |
| Frontend Config | 1-2 hours | 1-1.5 hours | Fewer fields to configure |
| Frontend Integration | 1-2 hours | 1-1.5 hours | Same complexity |
| Testing | 4-7 hours | 3-5 hours | Fewer test cases |
| **Total** | **20-33 hours** | **15-23 hours** | ~25% reduction |

## Conclusion

The actual customer implementation in the admin panel is **simpler** than the full schema suggests, with approximately **40% fewer fields** being actively used. This significantly reduces the scope of the import/export feature while still providing comprehensive customer management capabilities.

The focus should be on the **27 import fields** and **39 export columns** that are actually editable/viewable in the UI, rather than trying to support all 50+ schema fields.
