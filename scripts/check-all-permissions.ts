/**
 * Script to check ALL permissions from seed file vs database
 */
import { db } from '../src/database';
import { permissions } from '../src/features/rbac/shared/rbac.schema';
import { INITIAL_PERMISSIONS } from '../src/features/rbac/seed';
import { logger } from '../src/utils';

async function checkAllPermissions() {
    logger.info('🔍 Checking ALL permissions...\n');

    // Get all permissions from database
    const dbPermissions = await db.select().from(permissions);

    logger.info(`Database has ${dbPermissions.length} permissions`);
    logger.info(`Seed file defines ${INITIAL_PERMISSIONS.length} permissions\n`);

    // Create a map of DB permissions
    const dbPermMap = new Map(dbPermissions.map(p => [p.name, p]));

    // Check which permissions from seed are missing
    const missing: string[] = [];

    for (const seedPerm of INITIAL_PERMISSIONS) {
        if (!dbPermMap.has(seedPerm.name)) {
            missing.push(seedPerm.name);
        }
    }

    if (missing.length > 0) {
        logger.warn(`\n❌ Missing ${missing.length} permissions in database:`);
        missing.forEach(name => logger.warn(`  - ${name}`));
    } else {
        logger.info('✅ All permissions from seed file exist in database');
    }

    // Group by resource
    logger.info('\n📊 Permissions by resource:');
    const byResource = new Map<string, string[]>();

    for (const perm of dbPermissions) {
        if (!byResource.has(perm.resource)) {
            byResource.set(perm.resource, []);
        }
        byResource.get(perm.resource)!.push(perm.name);
    }

    for (const [resource, perms] of Array.from(byResource.entries()).sort()) {
        logger.info(`\n${resource}: (${perms.length})`);
        perms.sort().forEach(p => logger.info(`  - ${p}`));
    }

    process.exit(0);
}

checkAllPermissions().catch(error => {
    logger.error('Error:', error);
    process.exit(1);
});
