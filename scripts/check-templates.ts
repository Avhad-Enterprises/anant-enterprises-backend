/**
 * Debug script to check notification templates
 */

import { db } from '../src/database';
import { notificationTemplates } from '../src/features/notifications/shared/notification-templates.schema';

async function check() {
    console.log('\n========================================');
    console.log('CHECKING NOTIFICATION TEMPLATES');
    console.log('========================================\n');

    const templates = await db.select().from(notificationTemplates);
    console.log(`Found ${templates.length} templates:\n`);
    
    templates.forEach(t => {
        console.log(`  - ${t.code}`);
        console.log(`    Name: ${t.name}`);
        console.log(`    Type: ${t.notification_type}`);
        console.log(`    Active: ${t.is_active}`);
        console.log('');
    });

    // Check specifically for NEW_ORDER_RECEIVED
    const adminTemplate = templates.find(t => t.code === 'NEW_ORDER_RECEIVED');
    if (adminTemplate) {
        console.log('✅ NEW_ORDER_RECEIVED template exists!');
    } else {
        console.log('❌ NEW_ORDER_RECEIVED template NOT FOUND!');
    }

    process.exit(0);
}

check().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
