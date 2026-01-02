/**
 * Test PUT /api/users/:id - Update User Profile
 * Shows you exactly what to send and what you'll receive
 */

import { db } from '../src/database/index.js';
import { users } from '../src/features/user/shared/user.schema.js';
import { eq } from 'drizzle-orm';

const BASE_URL = 'http://localhost:3000';

async function testUpdateUser() {
    console.log('🧪 Testing PUT /api/users/:id\n');
    console.log('='.repeat(70));

    // Get test user
    const [user] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.is_deleted, false))
        .limit(1);

    if (!user) {
        console.log('❌ No users found!\n');
        process.exit(1);
    }

    console.log('\n📋 Current User Data:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);

    // Sample update data
    const updateData = {
        name: 'Updated Test User',
        phone_number: '9999888877',
        phone_country_code: '+91',
        preferred_language: 'en',
        timezone: 'Asia/Kolkata',
    };

    console.log('\n' + '='.repeat(70));
    console.log('📥 REQUEST (What we send):\n');
    console.log(`Method: PUT`);
    console.log(`URL: ${BASE_URL}/api/users/${user.id}`);
    console.log(`\nHeaders:`);
    console.log(`{`);
    console.log(`  "Authorization": "Bearer YOUR_TOKEN_HERE",`);
    console.log(`  "Content-Type": "application/json"`);
    console.log(`}`);
    console.log(`\nBody:`);
    console.log(JSON.stringify(updateData, null, 2));

    const authToken = process.env.TEST_AUTH_TOKEN;

    if (!authToken) {
        console.log('\n' + '='.repeat(70));
        console.log('⚠️  No auth token provided!\n');
        console.log('💡 To test the endpoint:');
        console.log('   1. Login to get token:');
        console.log('      POST http://localhost:3000/api/auth/login');
        console.log('      Body: {"email":"test@example.com","password":"password123"}');
        console.log('\n   2. Set token and run:');
        console.log('      $env:TEST_AUTH_TOKEN="your_token"');
        console.log('      npx tsx scripts/test-update-user.ts\n');

        console.log('📤 EXPECTED RESPONSE:\n');
        console.log('Status Code: 200 OK');
        console.log(JSON.stringify({
            success: true,
            message: 'User updated successfully',
            data: {
                id: user.id,
                name: 'Updated Test User',
                email: user.email,
                phone_number: '9999888877',
                phone_country_code: '+91',
                preferred_language: 'en',
                timezone: 'Asia/Kolkata',
                // ... other user fields
            }
        }, null, 2));
        console.log('\n');
        process.exit(0);
    }

    // Make the actual request
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🚀 Sending Request...\n');

        const response = await fetch(`${BASE_URL}/api/users/${user.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        const data = await response.json();

        console.log('='.repeat(70));
        console.log('📤 RESPONSE (What we receive):\n');
        console.log(`Status Code: ${response.status} ${response.statusText}`);
        console.log(`\nResponse Body:`);
        console.log(JSON.stringify(data, null, 2));
        console.log('\n' + '='.repeat(70));

        if (response.ok) {
            console.log('\n✅ SUCCESS! User updated successfully.');
            console.log('\n📝 What changed:');
            console.log(`   Name: "${user.name}" → "${data.data.name}"`);
            console.log(`   Phone: null → "${data.data.phone_country_code} ${data.data.phone_number}"`);
        } else {
            console.log(`\n❌ ERROR: ${data.error?.message || data.message}`);
        }

    } catch (error: any) {
        console.log(`\n❌ Request Failed: ${error.message}`);
    }

    console.log('');
}

testUpdateUser();
