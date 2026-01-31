
import { supabase } from '../src/utils/supabase';

async function checkSessions() {
  console.log('Checking Supabase Admin API...');

  // Check if we can list users or get specific user details including sessions
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error listing users:', error);
      return;
    }

    console.log(`Found ${users.users.length} users.`);
    if (users.users.length > 0) {
      const userId = users.users[0].id;
      console.log(`Checking sessions for user ${userId}...`);

      // Try to find a way to get sessions. 
      // Note: older supabase-js might not have specific listFactors or listSessions easily accessible or documented clearly in types sometimes if mismatched.
      // But let's inspect the user object itself, sometimes it has last_sign_in_at etc.

      // Also check if mfa.listFactors works as used in the codebase
      const { data: factors } = await supabase.auth.admin.mfa.listFactors({ userId });
      console.log('Factors:', factors);
    }

    // Check if there is a session listing method
    // @ts-ignore
    if (typeof supabase.auth.admin.listUserSessions === 'function') {
      console.log('supabase.auth.admin.listUserSessions EXISTS');
    } else {
      console.log('supabase.auth.admin.listUserSessions DOES NOT EXIST');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSessions();
