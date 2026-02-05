/**
 * POST /api/users/customers/export
 * Export customers with various filters and formats
 */

import { Router, Response } from 'express';

import { and, between, inArray, eq, notInArray, or, SQL, ilike } from 'drizzle-orm';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { customerProfiles } from '../shared/customer-profiles.schema';
import { userAddresses } from '../../address/shared/addresses.schema';
import { userRoles } from '../../rbac/shared/user-roles.schema';
import { roles } from '../../rbac/shared/roles.schema';
import { requireAuth, requirePermission } from '../../../middlewares';
import { RequestWithUser } from '../../../interfaces';
import {
  generateCSV,
  generateExcelBuffer
} from '../../../utils/import-export';
import { customerExportSchema } from '../shared/validation';

const handler = async (req: RequestWithUser, res: Response) => {
  const validation = customerExportSchema.safeParse(req.body);
  if (!validation.success) {
    throw new HttpException(400, 'Invalid request data', {
      details: validation.error.issues,
    });
  }

  const options = validation.data;

  // Build query conditions
  const conditions = [eq(users.is_deleted, false)];

  // Exclude admin/superadmin users
  const adminUserIdsSubquery = db
    .select({ userId: userRoles.user_id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.role_id, roles.id))
    .where(inArray(roles.name, ['admin', 'superadmin']));

  conditions.push(
    notInArray(users.id, adminUserIdsSubquery)
  );

  if (options.scope === 'selected' && options.selectedIds?.length) {
    conditions.push(inArray(users.id, options.selectedIds));
  }

  // Apply filters
  if (options.filters?.gender) {
    conditions.push(eq(users.gender, options.filters.gender));
  }

  if (options.filters?.status) {
    // Status filter applies to customer_profiles table
    conditions.push(eq(customerProfiles.account_status, options.filters.status));
  }

  if (options.filters?.tags) {
    const tagList = options.filters.tags.split(',').map(t => t.trim());
    if (tagList.length > 0) {
      conditions.push(
        or(
          ...tagList.map(tag => ilike(users.tags as any, `%${tag}%`))
        ) as SQL<unknown>
      );
    }
  }

  if (options.dateRange?.from && options.dateRange?.to) {
    const dateField = options.dateRange.field === 'updated_at' ? users.updated_at : users.created_at;
    const toDate = new Date(options.dateRange.to);
    toDate.setHours(23, 59, 59, 999);

    conditions.push(
      between(
        dateField,
        new Date(options.dateRange.from),
        toDate
      )
    );
  }

  // Query data with joins
  const rawData = await db
    .select({
      user: users,
      profile: customerProfiles,
    })
    .from(users)
    .leftJoin(customerProfiles, eq(users.id, customerProfiles.user_id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  if (options.selectedColumns.length === 0) {
    throw new HttpException(400, 'Please select at least one column to export.');
  }

  // Get addresses for all users
  const userIds = rawData.map(row => row.user.id);
  let addressesMap: Record<string, any> = {};

  if (userIds.length > 0) {
    const addressesList = await db
      .select()
      .from(userAddresses)
      .where(
        and(
          inArray(userAddresses.user_id, userIds),
          eq(userAddresses.is_default_shipping, true)
        )
      );

    addressesList.forEach(addr => {
      addressesMap[addr.user_id] = addr;
    });
  }

  // Format data - map profile fields and addresses to top level
  const formattedData = rawData.map(({ user, profile }) => {
    const row: any = {
      customer_id: user.display_id || user.id, // Use display_id (CUST-XXXXXX) or fallback to UUID
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      display_name: user.display_name,
      phone_number: user.phone_number,
      secondary_email: user.secondary_email,
      secondary_phone_number: user.secondary_phone_number,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      user_type: 'individual', // All customers are individual type now
      tags: Array.isArray(user.tags) ? user.tags.join(', ') : '',
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      secondary_email_verified: user.secondary_email_verified,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at,
      updated_at: user.updated_at,

      // Profile fields
      account_status: profile?.account_status || '',
      segments: Array.isArray(profile?.segments) ? profile.segments.join(', ') : '',
      notes: profile?.notes || '',

      // Address fields from default address
      city: '',
      state: '',
      postal_code: '',
      country: '',
    };

    // Add address fields if available
    const address = addressesMap[user.id];
    if (address) {
      row.city = address.city || '';
      row.state = address.state_province || '';
      row.postal_code = address.postal_code || '';
      row.country = address.country || '';
    }

    return row;
  });

  // Filter to only selected columns
  const exportData = formattedData.map(row => {
    const filtered: any = {};
    options.selectedColumns.forEach(col => {
      if (col in row) {
        const value = row[col];
        // Format dates
        if (value instanceof Date) {
          filtered[col] = value.toISOString().split('T')[0];
        } else {
          filtered[col] = value ?? '';
        }
      }
    });
    return filtered;
  });

  // Generate file
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `customers-export-${timestamp}`;

  if (options.format === 'csv') {
    const csvString = generateCSV(exportData, options.selectedColumns);
    const fileBuffer = Buffer.from(csvString, 'utf-8');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.send(fileBuffer);
  }

  if (options.format === 'xlsx') {
    const fileBuffer = await generateExcelBuffer(exportData, options.selectedColumns, {
      sheetName: 'Customers'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.setHeader('Content-Length', String(fileBuffer.length));
    return res.send(fileBuffer);
  }

  return ResponseFormatter.error(res, 'UNSUPPORTED_FORMAT', 'Unsupported export format', 400);
};

const router = Router();
router.post('/', requireAuth, requirePermission('customers:read'), handler);

export default router;

