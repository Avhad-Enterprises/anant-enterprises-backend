import { db } from '../src/database';
import { users } from '../src/features/user/shared/user.schema';
import { generateCustomerId } from '../src/utils/generators';
import { isNull, eq } from 'drizzle-orm';
import { logger } from '../src/utils';

async function backfillCustomerIds() {
  console.log('Starting customer ID backfill...');

  try {
    // 1. Find users with null customer_id
    const usersToUpdate = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(isNull(users.customer_id));

    console.log(`Found ${usersToUpdate.length} users with missing customer ID.`);

    if (usersToUpdate.length === 0) {
      console.log('No users to update.');
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    // 2. Iterate and update
    for (const user of usersToUpdate) {
      try {
        let customerId = generateCustomerId();
        let attempts = 0;

        // Ensure uniqueness check loop
        while (attempts < 10) {
          const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.customer_id, customerId))
            .limit(1);
          if (!existing) break;
          customerId = generateCustomerId();
          attempts++;
        }

        if (attempts >= 10) {
          console.error(`Failed to generate unique ID for user ${user.id} after 10 attempts.`);
          errorCount++;
          continue;
        }

        await db.update(users).set({ customer_id: customerId }).where(eq(users.id, user.id));

        updatedCount++;
        // console.log(`Updated user ${user.email} with ID ${customerId}`);
      } catch (err) {
        console.error(`Error updating user ${user.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Backfill complete.`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
  } catch (error) {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

backfillCustomerIds();
