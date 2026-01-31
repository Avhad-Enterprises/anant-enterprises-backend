/**
 * Tier Sync Service
 * 
 * Automatically updates tier usage counts when products reference them.
 * Maintains denormalized count for each tier showing how many products use it.
 */

import { sql } from 'drizzle-orm';
import { db } from '../../../database';
import { tiers } from '../shared/tiers.schema';

/**
 * Increment usage count for tiers
 * 
 * @param tierIds - Array of tier IDs to increment (can include nulls, which are ignored)
 */
export async function incrementTierUsage(tierIds: (string | null)[]): Promise<void> {
  // Filter out null/undefined values
  const validTierIds = tierIds.filter((id): id is string => id !== null && id !== undefined);

  if (validTierIds.length === 0) return;

  // Increment usage count for each tier
  for (const tierId of validTierIds) {
    await db
      .update(tiers)
      .set({
        usage_count: sql`${tiers.usage_count} + 1`,
        updated_at: new Date(),
      })
      .where(sql`${tiers.id} = ${tierId}`);
  }
}

/**
 * Decrement usage count for tiers
 * 
 * @param tierIds - Array of tier IDs to decrement (can include nulls, which are ignored)
 */
export async function decrementTierUsage(tierIds: (string | null)[]): Promise<void> {
  // Filter out null/undefined values
  const validTierIds = tierIds.filter((id): id is string => id !== null && id !== undefined);

  if (validTierIds.length === 0) return;

  // Decrement usage count for each tier, but don't go below 0
  for (const tierId of validTierIds) {
    await db
      .update(tiers)
      .set({
        usage_count: sql`GREATEST(0, ${tiers.usage_count} - 1)`,
        updated_at: new Date(),
      })
      .where(sql`${tiers.id} = ${tierId}`);
  }
}

/**
 * Update tier usage when product categories change
 * Handles both additions and removals across all four tier levels
 * 
 * @param oldTiers - Previous tier assignments [tier1, tier2, tier3, tier4]
 * @param newTiers - New tier assignments [tier1, tier2, tier3, tier4]
 */
export async function updateTierUsage(
  oldTiers: (string | null)[] = [null, null, null, null],
  newTiers: (string | null)[] = [null, null, null, null]
): Promise<void> {
  // Ensure both arrays have 4 elements
  const oldTierIds = [...oldTiers];
  const newTierIds = [...newTiers];

  while (oldTierIds.length < 4) oldTierIds.push(null);
  while (newTierIds.length < 4) newTierIds.push(null);

  // Find tiers that were added (were null, now have value)
  const addedTiers: (string | null)[] = [];
  const removedTiers: (string | null)[] = [];

  for (let i = 0; i < 4; i++) {
    const oldTier = oldTierIds[i];
    const newTier = newTierIds[i];

    // Tier was added
    if (!oldTier && newTier) {
      addedTiers.push(newTier);
    }
    // Tier was removed
    else if (oldTier && !newTier) {
      removedTiers.push(oldTier);
    }
    // Tier was changed
    else if (oldTier && newTier && oldTier !== newTier) {
      removedTiers.push(oldTier);
      addedTiers.push(newTier);
    }
    // else: both null or same tier - no change needed
  }

  // Increment counts for added tiers
  if (addedTiers.length > 0) {
    await incrementTierUsage(addedTiers);
  }

  // Decrement counts for removed tiers
  if (removedTiers.length > 0) {
    await decrementTierUsage(removedTiers);
  }
}
