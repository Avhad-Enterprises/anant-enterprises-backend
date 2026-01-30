/**
 * Debug script to check admin role assignments
 */

import { db } from '../src/database';
import { roles, userRoles } from '../src/features/rbac/shared/rbac.schema';
import { users } from '../src/features/user/shared/user.schema';
import { eq, inArray } from 'drizzle-orm';

async function check() {
    console.log('\n========================================');
    console.log('CHECKING ADMIN ROLES AND ASSIGNMENTS');
    console.log('========================================\n');

    // Check roles
    const allRoles = await db.select().from(roles);
    console.log('=== ALL ROLES ===');
    allRoles.forEach(r => console.log(`  - ${r.name} (id: ${r.id}, active: ${r.is_active}, deleted: ${r.is_deleted})`));

    // Find admin/superadmin role IDs
    const adminRoles = allRoles.filter(r => r.name === 'admin' || r.name === 'superadmin');
    const adminRoleIds = adminRoles.map(r => r.id);
    console.log('\n=== ADMIN/SUPERADMIN ROLE IDS ===');
    console.log('  Found:', adminRoleIds.length > 0 ? adminRoleIds : 'NONE!');

    if (adminRoleIds.length === 0) {
        console.log('\n❌ No admin/superadmin roles found in database!');
        process.exit(0);
    }

    // Check user_roles for these role IDs
    const assignments = await db.select().from(userRoles).where(inArray(userRoles.role_id, adminRoleIds));
    console.log('\n=== USER ROLE ASSIGNMENTS ===');
    console.log('  Total admin assignments:', assignments.length);

    if (assignments.length === 0) {
        console.log('\n❌ No users have been assigned admin/superadmin roles!');
        console.log('  You need to assign a role to users in the user_roles table.');
        process.exit(0);
    }

    assignments.forEach(a => {
        const roleName = adminRoles.find(r => r.id === a.role_id)?.name;
        console.log(`  - User ID: ${a.user_id} has role: ${roleName} (expires: ${a.expires_at || 'never'})`);
    });

    // Get user details
    const userIds = assignments.map(a => a.user_id);
    const userDetails = await db
        .select({ id: users.id, name: users.name, email: users.email, auth_id: users.auth_id })
        .from(users)
        .where(inArray(users.id, userIds));

    console.log('\n=== ADMIN USER DETAILS ===');
    userDetails.forEach(u => {
        console.log(`  - ${u.name} (${u.email})`);
        console.log(`    DB ID: ${u.id}`);
        console.log(`    Auth ID: ${u.auth_id}`);
    });

    console.log('\n✅ Admin role check complete.\n');
    process.exit(0);
}

check().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
