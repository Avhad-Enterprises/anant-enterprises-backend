import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { eq } from 'drizzle-orm';

async function getUsers() {
    const userList = await db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
        })
        .from(users)
        .where(eq(users.is_deleted, false))
        .limit(5);

    console.log('\n📋 Available Users for Testing:\n');
    console.log('='.repeat(70));

    userList.forEach((u, i) => {
        console.log(`\n${i + 1}. User ID: ${u.id}`);
        console.log(`   Name:  ${u.name}`);
        console.log(`   Email: ${u.email}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 Copy any User ID above to use in Thunder Client\n');

    process.exit(0);
}

getUsers();
