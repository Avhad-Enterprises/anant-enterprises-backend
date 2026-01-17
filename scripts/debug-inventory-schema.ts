
import { db } from '../src/database';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory';
        `);
        console.log('📊 Inventory Table Columns:');
        result.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkSchema();
