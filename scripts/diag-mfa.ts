import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('--- MFA Diagnostics ---');

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    console.log('Current Env:', process.env);
    return;
  }

  console.log('✅ URL:', url);
  console.log('✅ Secret Key found (length):', secret.length);

  const supabase = createClient(url, secret);

  console.log('Checking supabase.auth.admin.mfa...');

  const admin = supabase.auth.admin as any;
  const mfa = admin.mfa;

  if (mfa) {
    console.log('✅ supabase.auth.admin.mfa exists!');
    console.log('Methods:', Object.keys(mfa));

    // Check methods
    if (mfa.listFactors) console.log('✅ listFactors available');
    else console.error('❌ listFactors MISSING');

    if (mfa.enroll) console.log('✅ enroll available');
    else console.error('❌ enroll MISSING');

  } else {
    console.error('❌ supabase.auth.admin.mfa is UNDEFINED.');
    try {
      // Try to verify installed version
      const pkg = require('@supabase/supabase-js/package.json');
      console.log('Installed @supabase/supabase-js Version:', pkg.version);
      if (pkg.version.startsWith('1')) {
        console.error('❌ Version 1.x does not support MFA. Please upgrade to 2.x');
      }
    } catch (e) {
      console.log('Could not determine installed version');
    }
  }
}

main().catch(console.error);
