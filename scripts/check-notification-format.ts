/**
 * Debug script to check notification data format
 */

import { db } from '../src/database';
import { notifications } from '../src/features/notifications/shared/notifications.schema';
import { desc } from 'drizzle-orm';

async function test() {
    console.log('\n========================================');
    console.log('CHECKING NOTIFICATION DATA FORMAT');
    console.log('========================================\n');
    
    const result = await db.select().from(notifications).orderBy(desc(notifications.created_at)).limit(3);
    console.log('Recent notifications count:', result.length);
    
    if (result.length > 0) {
        console.log('\nSample notification:');
        console.log(JSON.stringify(result[0], null, 2));
        console.log('\nField names:', Object.keys(result[0]));
    } else {
        console.log('No notifications found in database');
    }
    
    process.exit(0);
}

test().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
