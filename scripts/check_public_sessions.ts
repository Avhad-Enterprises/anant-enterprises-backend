
import { db } from '../src/database';
import { sql } from 'drizzle-orm';

async function checkPublicSessions() {
  console.log('Checking public.sessions...');
  try {
    const result = await db.execute(sql`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions'`);
    // @ts-ignore
    if (result && result.length > 0 && (result[0].count > 0 || result[0].count === '1')) {
      console.log('Table public.sessions EXISTS');
    } else {
      console.log('Table public.sessions DOES NOT EXIST');
      console.log('Result:', result);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkPublicSessions();
