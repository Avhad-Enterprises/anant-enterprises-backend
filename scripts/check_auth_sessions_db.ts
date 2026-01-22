
import { db } from '../src/database';
import { sql } from 'drizzle-orm';

async function checkColumns() {
  console.log('Checking columns...');

  try {
    const sessions: any = await db.execute(sql`SELECT * FROM auth.sessions LIMIT 1`);
    if (sessions.rows && sessions.rows.length > 0) {
      console.log('auth.sessions columns:', Object.keys(sessions.rows[0]));
    } else {
      console.log('auth.sessions is empty');
    }

    const tokens: any = await db.execute(sql`SELECT * FROM auth.refresh_tokens LIMIT 1`);
    if (tokens.rows && tokens.rows.length > 0) {
      console.log('auth.refresh_tokens columns:', Object.keys(tokens.rows[0]));
    } else {
      console.log('auth.refresh_tokens is empty');
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkColumns();
