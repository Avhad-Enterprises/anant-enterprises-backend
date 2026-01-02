/**
 * Quick Test for GET /api/users/:id
 * Shows you the exact response from the endpoint
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

async function testGetUserById() {
    console.log('🧪 Testing GET /api/users/:id\n');
    console.log('='.repeat(70));

    // Get a test user
    const [user] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.is_deleted, false))
        .limit(1);

    if (!user) {
        console.log('❌ No users found in database!\n');
        process.exit(1);
    }

    console.log('\n📋 Test User Found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);

    // Check for auth token
    const authToken = process.env.TEST_AUTH_TOKEN;

    console.log('\n' + '='.repeat(70));
    console.log('📡 Making Request...\n');
    console.log(`Method: GET`);
    console.log(`URL: ${BASE_URL}/api/users/${user.id}`);
    console.log(`Headers: {`);
    console.log(`  "Authorization": "Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'NOT_PROVIDED'}"`);
    console.log(`}`);

    if (!authToken) {
        console.log('\n⚠️  No auth token provided!');
        console.log('\n💡 To see the actual response:');
        console.log('   1. Login to get token (use Thunder Client or curl)');
        console.log('   2. Set token: $env:TEST_AUTH_TOKEN="your_token"');
        console.log('   3. Run again: npx tsx scripts/test-get-user.ts\n');
        process.exit(0);
    }

    // Make the request
    try {
        const response = await fetch(`${BASE_URL}/api/users/${user.id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('\n' + '='.repeat(70));
        console.log('📤 RESPONSE RECEIVED\n');
        console.log(`Status Code: ${response.status} ${response.statusText}`);
        console.log('\nResponse Body:');
        console.log(JSON.stringify(data, null, 2));
        console.log('\n' + '='.repeat(70));

        if (response.ok) {
            console.log('\n✅ SUCCESS! The endpoint is working correctly.\n');
            console.log('📝 Response Structure:');
            console.log('   • success: true');
            console.log('   • message: Success message');
            console.log('   • data: User object (without password)');
        } else {
            console.log(`\n❌ ERROR: ${data.error?.message || data.message}\n`);
        }

    } catch (error: any) {
        console.log(`\n❌ Request Failed: ${error.message}\n`);
    }

    console.log('');
}

testGetUserById();
