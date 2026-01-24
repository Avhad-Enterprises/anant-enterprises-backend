# Customer Import/Export Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding bulk import and export functionality for customers in the Anant Enterprises system. This feature will enable administrators to:
- Import customers in bulk from CSV/JSON files
- Export customer data to CSV/XLSX formats with customizable filters
- Manage customer data at scale with proper validation and error handling

## 1. Schema Analysis

### 1.1 Backend Customer Schema

The customer data is spread across multiple related tables:

#### **users** table (Core user information)
- `id` (UUID) - Primary key
- `auth_id` (UUID) - Supabase Auth reference
- `customer_id` (VARCHAR) - Human-readable ID (CUST-XXXXXX)
- `user_type` (ENUM) - 'individual' | 'business'
- `name` (VARCHAR) - First name (required)
- `last_name` (VARCHAR) - Last name (required)
- `display_name` (VARCHAR) - Display name
- `email` (VARCHAR) - Primary email (required, unique)
- `password` (VARCHAR) - Optional (managed by Supabase)
- `email_verified` (BOOLEAN) - Verification status
- `email_verified_at` (TIMESTAMP)
- `phone_number` (VARCHAR)
- `phone_country_code` (VARCHAR) - +91, +1, etc.
- `phone_verified` (BOOLEAN)
- `phone_verified_at` (TIMESTAMP)
- `secondary_email` (VARCHAR)
- `secondary_email_verified` (BOOLEAN)
- `secondary_phone_number` (VARCHAR)
- `profile_image_url` (VARCHAR)
- `date_of_birth` (DATE)
- `gender` (ENUM) - 'male' | 'female' | 'other' | 'prefer_not_to_say'
- `tags` (TEXT[]) - Array of tags
- `metadata` (JSONB) - Additional metadata
- `preferred_language` (VARCHAR) - Default: 'en'
- `languages` (TEXT[]) - All spoken languages
- `preferred_currency` (VARCHAR) - Default: 'INR'
- `timezone` (VARCHAR) - Default: 'Asia/Kolkata'
- `created_at`, `updated_at`, `is_deleted` - Audit fields

#### **customer_profiles** table (B2C customer data)
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `segment` (ENUM) - 'new' | 'regular' | 'vip' | 'at_risk'
- `store_credit_balance` (DECIMAL)
- `referral_code` (VARCHAR) - Unique referral code
- `referred_by_user_id` (UUID)
- `referral_bonus_credited` (BOOLEAN)
- `marketing_opt_in` (BOOLEAN)
- `sms_opt_in` (BOOLEAN)
- `email_opt_in` (BOOLEAN)
- `whatsapp_opt_in` (BOOLEAN)
- `push_notifications_opt_in` (BOOLEAN)
- `account_status` (ENUM) - 'active' | 'suspended' | 'closed'
- `suspended_reason` (TEXT)
- `suspended_until` (TIMESTAMP)
- `risk_profile` (VARCHAR) - 'low' | 'medium' | 'high'
- `loyalty_enrolled` (BOOLEAN)
- `loyalty_tier` (VARCHAR)
- `loyalty_points` (DECIMAL)
- `loyalty_enrollment_date` (TIMESTAMP)
- `subscription_plan` (VARCHAR)
- `subscription_status` (VARCHAR) - 'active' | 'paused' | 'cancelled'
- `billing_cycle` (VARCHAR) - 'monthly' | 'yearly'
- `subscription_start_date` (TIMESTAMP)
- `auto_renew` (BOOLEAN)

#### **business_customer_profiles** table (B2B customer data)
Similar structure to customer_profiles but for business customers with additional fields like:
- `business_name`
- `business_type`
- `tax_id` (GST/PAN)
- `industry`
- `annual_revenue`

#### **user_addresses** table (Customer addresses)
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key
- `address_type` (ENUM) - 'billing' | 'shipping' | 'both' | 'company' | 'other'
- `is_default` (BOOLEAN)
- `recipient_name` (VARCHAR)
- `company_name` (VARCHAR)
- `phone_number` (VARCHAR)
- `phone_country_code` (VARCHAR)
- `address_line1` (VARCHAR)
- `address_line2` (VARCHAR)
- `city` (VARCHAR)
- `state_province` (VARCHAR)
- `postal_code` (VARCHAR)
- `country` (VARCHAR)
- `country_code` (VARCHAR) - ISO 3166-1 alpha-2
- `latitude`, `longitude` (DECIMAL)
- `delivery_instructions` (TEXT)

### 1.2 Frontend Customer Types

```typescript
interface Customer {
  id: string;
  customerId?: string; // CUST-XXX
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  phone: string;
  gstin?: string;
  type: 'Distributor' | 'Retail' | 'Wholesale';
  segment?: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  // ... 50+ additional fields
}
```

## 2. Comparison with Blog Import/Export

| Aspect | Blog | Customer | Complexity Difference |
|--------|------|----------|---------------------|
| **Tables** | 1 (blogs) | 4+ (users, customer_profiles, business_profiles, addresses) | 4x more complex |
| **Required Fields** | 1 (title) | 3+ (name, last_name, email) | More validation |
| **Unique Fields** | slug | email, customer_id | Email validation critical |
| **JSONB Fields** | tags | metadata, tags | Similar |
| **Relationships** | None | Multiple (1:1 with profiles, 1:many with addresses) | Complex relational data |
| **Data Types** | Mostly TEXT | Mixed (TEXT, DATE, BOOLEAN, DECIMAL, ENUM) | More type handling |
| **Validation** | Simple | Complex (email format, phone validation, enum values) | Extensive validation |
| **Business Logic** | Status normalization | Customer ID generation, profile creation, address handling | Significant logic |

**Key Differences:**
1. **Multi-table operations**: Customers require coordinated inserts/updates across 3-4 tables
2. **Customer ID generation**: Must generate unique CUST-XXXXXX identifiers
3. **Profile selection**: Individual vs Business profiles based on user_type
4. **Address handling**: Optional multiple addresses with default selection
5. **Email uniqueness**: Critical constraint that must be validated before import
6. **Enum validations**: Multiple enum fields (gender, user_type, account_status, segment, etc.)

## 3. Implementation Plan

### 3.1 Backend Implementation

#### Phase 1: Import Endpoint (Priority: HIGH)

**File**: `/src/features/user/apis/import-customers.ts`

**Key Features:**
1. **Validation Schema** (Zod)
   ```typescript
   const customerImportSchema = z.object({
     // Required fields
     first_name: z.string().min(1).max(255).trim(),
     last_name: z.string().min(1).max(255).trim(),
     email: z.string().email().max(255).toLowerCase(),
     
     // Optional core fields
     display_name: z.string().max(100).optional(),
     user_type: z.enum(['individual', 'business']).default('individual'),
     phone_number: z.string().max(20).optional(),
     phone_country_code: z.string().max(5).optional(),
     date_of_birth: z.string().date().optional(), // YYYY-MM-DD
     gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
     
     // Profile fields
     segment: z.enum(['new', 'regular', 'vip', 'at_risk']).optional(),
     account_status: z.enum(['active', 'suspended', 'closed']).default('active'),
     tags: z.union([
       z.array(z.string()),
       z.string().transform(val => val.split(',').map(t => t.trim()).filter(t => t.length > 0))
     ]).optional(),
     
     // Marketing preferences
     marketing_opt_in: z.boolean().optional(),
     email_opt_in: z.boolean().optional(),
     sms_opt_in: z.boolean().optional(),
     
     // Business fields (for user_type: 'business')
     company_name: z.string().max(255).optional(),
     tax_id: z.string().max(50).optional(), // GST/PAN
     
     // Address (optional, one address per import)
     address_line1: z.string().max(255).optional(),
     address_line2: z.string().max(255).optional(),
     city: z.string().max(100).optional(),
     state_province: z.string().max(100).optional(),
     postal_code: z.string().max(20).optional(),
     country: z.string().max(100).optional(),
     country_code: z.string().length(2).optional(), // IN, US, etc.
   });
   ```

2. **Import Modes**
   - `create`: Create new customers only (skip if email exists)
   - `update`: Update existing customers only (skip if email not found)
   - `upsert`: Create or update based on email match

3. **Business Logic**
   - Generate unique `customer_id` (CUST-XXXXXX format)
   - Auto-generate `display_name` if not provided (first_name + last_name)
   - Create appropriate profile (customer_profiles vs business_customer_profiles) based on user_type
   - Create address record if address fields provided
   - Handle email uniqueness validation
   - Default values: email_opt_in=true, marketing_opt_in=false, account_status='active'

4. **Transaction Handling**
   - Use database transactions for multi-table inserts
   - Rollback on any failure to maintain data consistency
   - Track errors per row with descriptive messages

5. **Response Format**
   ```typescript
   {
     success: number,
     failed: number,
     skipped: number,
     errors: Array<{
       row: number,
       email: string,
       error: string
     }>
   }
   ```

6. **Error Scenarios**
   - Duplicate email (create mode)
   - Email not found (update mode)
   - Invalid email format
   - Invalid enum values (gender, user_type, segment)
   - Missing required fields
   - Database constraint violations
   - Transaction failures

#### Phase 2: Export Endpoint (Priority: HIGH)

**File**: `/src/features/user/apis/export-customers.ts`

**Key Features:**
1. **Export Options**
   ```typescript
   {
     scope: 'all' | 'selected',
     format: 'csv' | 'xlsx',
     selectedIds?: string[],
     selectedColumns: string[],
     filters?: {
       user_type?: 'individual' | 'business' | 'all',
       account_status?: 'active' | 'suspended' | 'closed',
       segment?: 'new' | 'regular' | 'vip' | 'at_risk',
       search?: string, // name, email search
     },
     dateRange?: {
       from?: string,
       to?: string,
       field?: 'created_at' | 'last_login'
     }
   }
   ```

2. **Export Columns** (30+ available)
   - Core: customer_id, first_name, last_name, email, phone_number
   - Profile: user_type, segment, account_status, tags
   - Dates: date_of_birth, created_at, email_verified_at
   - Marketing: marketing_opt_in, email_opt_in, sms_opt_in
   - Loyalty: loyalty_enrolled, loyalty_tier, loyalty_points
   - Address: city, state, country (from default address)
   - Business: company_name, tax_id
   - Metrics: total_orders, total_spent (from aggregations)

3. **Data Formatting**
   - Convert boolean to "Yes"/"No"
   - Format dates as YYYY-MM-DD
   - Convert tags array to comma-separated string
   - Format currency with 2 decimals
   - Handle NULL/undefined as empty strings

4. **Performance Optimization**
   - Join tables efficiently (LEFT JOIN on profiles and addresses)
   - Use subqueries for aggregated metrics (total_orders, total_spent)
   - Pagination for large datasets (if > 10,000 records)
   - Index-optimized queries

5. **CSV Generation**
   - Proper escaping of special characters (quotes, commas, newlines)
   - UTF-8 encoding with BOM for Excel compatibility
   - Header row with column names

6. **XLSX Generation**
   - Use `xlsx` library
   - Auto-size columns
   - Format headers (bold)
   - Freeze header row

#### Phase 3: Route Registration

**File**: `/src/features/user/index.ts`

```typescript
// Import routes
router.post('/customers/import', 
  requireAuth,
  requirePermission('customers:write'),
  importCustomersHandler
);

router.post('/customers/export',
  requireAuth,
  requirePermission('customers:read'),
  exportCustomersHandler
);
```

**Position**: Before parametrized routes like `/:id`

### 3.2 Frontend Implementation

#### Phase 1: Configuration (Priority: HIGH)

**File**: `/src/features/customers/config/import-export.config.ts`

**Import Fields** (20 fields):
```typescript
export const customerImportFields: ImportField[] = [
  // Required
  { id: 'first_name', label: 'First Name', required: true, type: 'text' },
  { id: 'last_name', label: 'Last Name', required: true, type: 'text' },
  { id: 'email', label: 'Email', required: true, type: 'email' },
  
  // Optional Core
  { id: 'display_name', label: 'Display Name', required: false, type: 'text' },
  { id: 'user_type', label: 'Customer Type', required: false, type: 'select',
    options: ['individual', 'business'] },
  { id: 'phone_number', label: 'Phone Number', required: false, type: 'tel' },
  { id: 'date_of_birth', label: 'Date of Birth', required: false, type: 'date' },
  { id: 'gender', label: 'Gender', required: false, type: 'select',
    options: ['male', 'female', 'other', 'prefer_not_to_say'] },
  
  // Profile
  { id: 'segment', label: 'Segment', required: false, type: 'select',
    options: ['new', 'regular', 'vip', 'at_risk'] },
  { id: 'account_status', label: 'Account Status', required: false, type: 'select',
    options: ['active', 'suspended', 'closed'] },
  { id: 'tags', label: 'Tags', required: false, type: 'text',
    description: 'Comma-separated tags' },
  
  // Marketing
  { id: 'marketing_opt_in', label: 'Marketing Opt-in', required: false, type: 'boolean' },
  { id: 'email_opt_in', label: 'Email Opt-in', required: false, type: 'boolean' },
  
  // Business
  { id: 'company_name', label: 'Company Name', required: false, type: 'text' },
  { id: 'tax_id', label: 'Tax ID (GST/PAN)', required: false, type: 'text' },
  
  // Address
  { id: 'address_line1', label: 'Address Line 1', required: false, type: 'text' },
  { id: 'city', label: 'City', required: false, type: 'text' },
  { id: 'state_province', label: 'State/Province', required: false, type: 'text' },
  { id: 'postal_code', label: 'Postal Code', required: false, type: 'text' },
  { id: 'country_code', label: 'Country Code', required: false, type: 'text',
    description: '2-letter ISO code (e.g., IN, US)' },
];
```

**Export Columns** (25+ columns):
```typescript
export const customerExportColumns: ExportColumn[] = [
  { id: 'customer_id', label: 'Customer ID', defaultSelected: true },
  { id: 'first_name', label: 'First Name', defaultSelected: true },
  { id: 'last_name', label: 'Last Name', defaultSelected: true },
  { id: 'email', label: 'Email', defaultSelected: true },
  { id: 'phone_number', label: 'Phone Number', defaultSelected: true },
  { id: 'user_type', label: 'Customer Type', defaultSelected: true },
  { id: 'segment', label: 'Segment', defaultSelected: true },
  { id: 'account_status', label: 'Status', defaultSelected: true },
  { id: 'created_at', label: 'Created At', defaultSelected: true },
  
  // Optional columns
  { id: 'display_name', label: 'Display Name', defaultSelected: false },
  { id: 'date_of_birth', label: 'Date of Birth', defaultSelected: false },
  { id: 'gender', label: 'Gender', defaultSelected: false },
  { id: 'tags', label: 'Tags', defaultSelected: false },
  { id: 'email_verified', label: 'Email Verified', defaultSelected: false },
  { id: 'phone_verified', label: 'Phone Verified', defaultSelected: false },
  { id: 'marketing_opt_in', label: 'Marketing Opt-in', defaultSelected: false },
  { id: 'loyalty_tier', label: 'Loyalty Tier', defaultSelected: false },
  { id: 'loyalty_points', label: 'Loyalty Points', defaultSelected: false },
  { id: 'city', label: 'City', defaultSelected: false },
  { id: 'state', label: 'State', defaultSelected: false },
  { id: 'country', label: 'Country', defaultSelected: false },
  { id: 'company_name', label: 'Company Name', defaultSelected: false },
  { id: 'tax_id', label: 'Tax ID', defaultSelected: false },
  { id: 'total_orders', label: 'Total Orders', defaultSelected: false },
  { id: 'total_spent', label: 'Total Spent', defaultSelected: false },
];
```

**Template**:
```typescript
export const customerTemplateUrl = '/templates/customers-template.csv';
export const customerModuleName = 'customers';
```

#### Phase 2: Service Integration (Priority: HIGH)

**File**: `/src/features/customers/services/customerService.ts`

```typescript
/**
 * Import customers from CSV/JSON data
 */
importCustomers: async (
  data: any[],
  mode: 'create' | 'update' | 'upsert'
) => {
  const response = await makePostRequest<{
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; email: string; error: string }>;
  }>(
    '/api/customers/import',
    { data, mode }
  );
  return response.data;
},

/**
 * Export customers to CSV/XLSX
 */
exportCustomers: async (options: {
  scope: 'all' | 'selected';
  format: 'csv' | 'xlsx';
  selectedIds?: string[];
  selectedColumns: string[];
  filters?: {
    user_type?: 'individual' | 'business' | 'all';
    account_status?: 'active' | 'suspended' | 'closed';
    segment?: string;
    search?: string;
  };
  dateRange?: {
    from?: string;
    to?: string;
    field?: 'created_at';
  };
}) => {
  const response = await httpClient.post<Blob>(
    '/api/customers/export',
    options,
    { responseType: 'blob' }
  );
  return response.data;
},
```

#### Phase 3: UI Integration (Priority: MEDIUM)

**File**: `/src/features/customers/pages/CustomerListPage.tsx`

**Changes Required:**
1. Import config: `import { customerImportFields, customerExportColumns, customerTemplateUrl, customerModuleName } from '../config/import-export.config';`
2. Add handlers:
   ```typescript
   const handleImport = async (data: any[], mode: ImportMode) => {
     try {
       const backendMode = mode === 'merge' ? 'upsert' : mode;
       const result = await customerService.importCustomers(data, backendMode);
       
       const { success, failed, errors } = result;
       
       if (failed > 0) {
         const errorMsg = errors.slice(0, 3).map(e => 
           `Row ${e.row}: ${e.error}`
         ).join('; ');
         notifyError(`Import completed with errors: ${success} succeeded, ${failed} failed. ${errorMsg}`);
       } else {
         notifySuccess(`Successfully imported ${success} customer(s)`);
       }
       
       refetch();
     } catch (error: any) {
       notifyError(error?.message || 'Failed to import customers');
     }
   };
   
   const handleExport = async (options: ExportOptions) => {
     try {
       const exportScope = options.scope === 'current' ? 'all' : options.scope;
       const exportFormat = options.format === 'pdf' || options.format === 'json' ? 'csv' : options.format;
       
       const blob = await customerService.exportCustomers({
         scope: exportScope,
         format: exportFormat,
         selectedIds: options.selectedIds,
         selectedColumns: options.selectedColumns,
       });
       
       const url = window.URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = `customers-export-${Date.now()}.${exportFormat}`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       window.URL.revokeObjectURL(url);
       
       notifySuccess(`Successfully exported ${exportScope === 'all' ? 'all' : 'selected'} customers`);
     } catch (error: any) {
       notifyError(error?.message || 'Failed to export customers');
     }
   };
   ```
3. Update ActionButtons:
   ```typescript
   <ActionButtons
     primaryLabel="Create Customer"
     primaryTo="/customers/new"
     onImport={handleImport}
     onExport={handleExport}
     importConfig={{
       fields: customerImportFields,
       templateUrl: customerTemplateUrl,
       moduleName: customerModuleName
     }}
     exportConfig={{
       columns: customerExportColumns,
       moduleName: customerModuleName
     }}
   />
   ```

#### Phase 4: CSV Template (Priority: LOW)

**File**: `/public/templates/customers-template.csv`

Create sample template with 5-10 example customers covering:
- Individual customers with various segments
- Business customers with company details
- Different account statuses
- Various marketing preferences
- Address examples
- Tag examples

### 3.3 Testing Strategy

#### Backend Tests
1. **Unit Tests** (`/tests/unit/import-customers.test.ts`)
   - Email validation
   - Customer ID generation
   - Enum value validation
   - Profile creation logic
   - Transaction rollback on errors

2. **Integration Tests** (`/tests/integration/customer-import-export.api.test.ts`)
   - Import in create mode
   - Import in update mode
   - Import in upsert mode
   - Duplicate email handling
   - Export with filters
   - Export column selection

#### Frontend Tests
1. **Component Tests**
   - Import dialog rendering
   - Export dialog rendering
   - Handler invocation
   - Error display

2. **Service Tests**
   - API call formatting
   - Response handling
   - Blob download

#### Manual Testing Checklist
- [ ] Import 100 customers (create mode)
- [ ] Import existing customers (update mode)
- [ ] Import mix of new/existing (upsert mode)
- [ ] Import with validation errors
- [ ] Import with duplicate emails
- [ ] Export all customers to CSV
- [ ] Export all customers to XLSX
- [ ] Export selected customers
- [ ] Export with user_type filter
- [ ] Export with segment filter
- [ ] Export with date range
- [ ] Export with column selection
- [ ] Download and verify CSV format
- [ ] Open XLSX in Excel and verify formatting

## 4. Timeline & Effort Estimation

| Phase | Task | Estimated Time | Priority |
|-------|------|---------------|----------|
| **Backend** |
| 1 | Import endpoint + validation | 4-6 hours | HIGH |
| 2 | Export endpoint + filters | 3-4 hours | HIGH |
| 3 | Route registration | 0.5 hours | HIGH |
| 4 | Unit tests | 2-3 hours | MEDIUM |
| 5 | Integration tests | 2-3 hours | MEDIUM |
| **Frontend** |
| 6 | Import/Export config | 1-2 hours | HIGH |
| 7 | Service methods | 1 hour | HIGH |
| 8 | UI integration | 1-2 hours | HIGH |
| 9 | CSV template | 0.5 hours | LOW |
| 10 | Component tests | 1-2 hours | LOW |
| **Testing** |
| 11 | Manual testing | 2-3 hours | HIGH |
| 12 | Bug fixes | 2-4 hours | HIGH |
| **TOTAL** | | **20-33 hours** | |

## 5. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Email uniqueness violation during import | HIGH | MEDIUM | Pre-validate emails, provide clear error messages |
| Transaction failures with multi-table inserts | HIGH | LOW | Comprehensive error handling, rollback logic |
| Large import files causing timeouts | MEDIUM | MEDIUM | Implement batch processing, progress tracking |
| Customer ID collision | HIGH | LOW | Use atomic increment or UUID-based generation |
| Data loss during failed imports | HIGH | LOW | Transaction wrapping, detailed error logging |
| Export performance issues (>100k records) | MEDIUM | LOW | Add pagination, streaming for large exports |
| Incorrect profile type creation | MEDIUM | MEDIUM | Strict validation on user_type field |

## 6. Success Criteria

- ✅ Import at least 1000 customers successfully in < 30 seconds
- ✅ Export at least 10,000 customers to CSV in < 60 seconds
- ✅ Handle duplicate email errors gracefully with clear messages
- ✅ Support all 3 import modes (create, update, upsert)
- ✅ Export supports both CSV and XLSX formats
- ✅ Column selection works correctly in export
- ✅ Filters (user_type, segment, status) work in export
- ✅ No data corruption or partial imports on errors
- ✅ All TypeScript type checks pass
- ✅ UI provides clear success/error feedback

## 7. Future Enhancements

1. **Import Validation Preview** - Show validation results before importing
2. **Batch Processing** - Process imports in chunks for better performance
3. **Import History** - Track who imported what and when
4. **Advanced Filtering** - More complex filter combinations in export
5. **Scheduled Exports** - Allow scheduling of recurring exports
6. **Import from External Sources** - Integrate with CRM systems
7. **Bulk Address Import** - Separate CSV for importing multiple addresses per customer
8. **Data Transformation Rules** - Custom mapping rules for imports
9. **Export Templates** - Save commonly used export configurations
10. **Audit Trail** - Detailed logging of all import/export operations

## 8. Dependencies

### Backend
- `zod` - Already installed (validation)
- `xlsx` - Already installed (Excel generation)
- `drizzle-orm` - Already installed (database)

### Frontend
- Existing `ImportDialog` component - ✅ Available
- Existing `ExportDialog` component - ✅ Available
- Existing `ActionButtons` component - ✅ Available
- `httpClient` - ✅ Available

### Infrastructure
- Database: PostgreSQL with existing schema
- Auth: Supabase Auth (already integrated)
- RBAC: Permission checks (customers:read, customers:write)

## 9. Conclusion

The customer import/export feature is significantly more complex than the blog implementation due to:
- Multi-table relationships (4+ tables)
- Complex validation requirements
- Customer ID generation
- Profile type handling
- Address management

However, by following this structured plan and leveraging the existing blog implementation patterns, we can deliver a robust solution that meets all business requirements. The estimated timeline of 20-33 hours accounts for the additional complexity and thorough testing requirements.

**Recommendation**: Proceed with implementation in the defined phases, starting with backend import/export endpoints, followed by frontend integration, and comprehensive testing.
