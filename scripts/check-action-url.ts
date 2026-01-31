import { db } from '../src/database';
import { notifications } from '../src/features/notifications/shared/notifications.schema';
import { desc } from 'drizzle-orm';

async function check() {
  const results = await db.select({
    id: notifications.id,
    type: notifications.type,
    title: notifications.title,
    action_url: notifications.action_url,
    action_text: notifications.action_text,
    created_at: notifications.created_at
  }).from(notifications).orderBy(desc(notifications.created_at)).limit(15);
  
  console.log('========================================');
  console.log('CHECKING action_url IN NOTIFICATIONS');
  console.log('========================================\n');
  
  let hasActionUrl = 0;
  let noActionUrl = 0;
  
  results.forEach((n, i) => {
    console.log(`--- Notification ${i + 1} ---`);
    console.log('Title:', n.title);
    console.log('Created:', n.created_at);
    console.log('action_url:', n.action_url ?? '(null)');
    console.log('action_text:', n.action_text ?? '(null)');
    console.log('');
    
    if (n.action_url) hasActionUrl++;
    else noActionUrl++;
  });
  
  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log('With action_url:', hasActionUrl);
  console.log('Without action_url:', noActionUrl);
  
  process.exit(0);
}

check();
