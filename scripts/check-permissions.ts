/**
 * Script to check permissions state in the database
 */
import { db } from '../src/database';
import { roles, permissions, rolePermissions } from '../src/features/rbac/shared/rbac.schema';
import { eq } from 'drizzle-orm';

async function checkPermissions() {
    console.log('🔍 Checking Tiers Permissions...\n');

    // 1. Check if tiers permissions exist
    console.log('1. Checking if tiers permissions exist in database:');
    const tiersPerms = await db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, 'tiers'));

    console.log(`Found ${tiersPerms.length} tiers permissions:`);
    tiersPerms.forEach(p => console.log(`  - ${p.name} (${p.id})`));
    console.log('');

    // 2. Check the admin role
    console.log('2. Checking admin role:');
    const adminRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, 'admin'))
        .limit(1);

    if (adminRole.length > 0) {
        console.log(`Admin role found: ${adminRole[0].name} (${adminRole[0].id})`);

        // 3. Check role-permission mappings for admin
        console.log('\n3. Checking permissions assigned to admin role:');
        const adminPerms = await db
            .select({
                permission_name: permissions.name,
                permission_id: permissions.id,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
            .where(eq(rolePermissions.role_id, adminRole[0].id));

        console.log(`Admin has ${adminPerms.length} permissions assigned`);

        const tierPermsForAdmin = adminPerms.filter(p => p.permission_name.startsWith('tiers:'));
        if (tierPermsForAdmin.length > 0) {
            console.log(`\nTiers permissions assigned to admin:`);
            tierPermsForAdmin.forEach(p => console.log(`  - ${p.permission_name}`));
        } else {
            console.log('\n❌ NO tiers permissions found for admin role!');
            console.log('This is the problem - we need to insert these mappings.');
        }
    } else {
        console.log('❌ Admin role not found!');
    }

    // 4. Check the specific user's role
    console.log('\n4. Checking user role (ID: 9bf79510-d673-438d-b1a3-ccd1bf64c196):');
    const userRole = await db
        .select()
        .from(roles)
        .where(eq(roles.id, '9bf79510-d673-438d-b1a3-ccd1bf64c196'))
        .limit(1);

    if (userRole.length > 0) {
        console.log(`User's role: ${userRole[0].name} (${userRole[0].id})`);
    } else {
        console.log('❌ Role not found for this ID');
    }

    process.exit(0);
}

checkPermissions().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
