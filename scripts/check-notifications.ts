/**
 * Debug script to check recent notifications
 */

import { db } from '../src/database';
import { notifications } from '../src/features/notifications/shared/notifications.schema';
import { users } from '../src/features/user/shared/user.schema';
import { eq, desc } from 'drizzle-orm';

async function check() {
    console.log('\n========================================');
    console.log('CHECKING RECENT NOTIFICATIONS');
    console.log('========================================\n');

    // Get last 20 notifications
    const recentNotifications = await db
        .select({
            id: notifications.id,
            user_id: notifications.user_id,
            type: notifications.type,
            title: notifications.title,
            created_at: notifications.created_at,
            is_read: notifications.is_read,
        })
        .from(notifications)
        .orderBy(desc(notifications.created_at))
        .limit(20);

    console.log(`Found ${recentNotifications.length} recent notifications:\n`);

    for (const n of recentNotifications) {
        // Get user details
        const [user] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, n.user_id))
            .limit(1);

        console.log(`[${n.created_at?.toISOString()}]`);
        console.log(`  Type: ${n.type}`);
        console.log(`  Title: ${n.title}`);
        console.log(`  User: ${user?.name || 'Unknown'} (${user?.email || 'N/A'})`);
        console.log(`  User ID: ${n.user_id}`);
        console.log(`  Read: ${n.is_read}`);
        console.log('');
    }

    // Count by type
    console.log('=== NOTIFICATION COUNTS BY TYPE ===');
    const allNotifications = await db.select({ type: notifications.type }).from(notifications);
    const typeCounts: Record<string, number> = {};
    allNotifications.forEach(n => {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });

    console.log('\n✅ Notification check complete.\n');
    process.exit(0);
}

check().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
