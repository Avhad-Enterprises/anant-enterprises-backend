import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { eq } from 'drizzle-orm';
import { findCollectionBySlug, findCollectionById } from '../shared/queries';
import { db } from '../../../database';
import { collections } from '../shared/collection.schema';

describe('Collection Queries', () => {
    let testCollectionId: string;
    const testSlug = 'test-collection-' + Date.now();

    beforeAll(async () => {
        // Create test collection
        const [collection] = await db.insert(collections).values({
            title: 'Test Collection',
            slug: testSlug,
            description: 'Test collection for unit tests',
            status: 'active',
            type: 'manual',
            sort_order: 'manual',
        }).returning();

        testCollectionId = collection.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await db.delete(collections).where(eq(collections.id, testCollectionId));
    });

    describe('findCollectionById', () => {
        it('should find collection by ID', async () => {
            const collection = await findCollectionById(testCollectionId);

            expect(collection).toBeDefined();
            expect(collection?.id).toBe(testCollectionId);
            expect(collection?.slug).toBe(testSlug);
        });

        it('should return undefined for non-existent ID', async () => {
            const collection = await findCollectionById('00000000-0000-0000-0000-000000000000');
            expect(collection).toBeUndefined();
        });
    });

    describe('findCollectionBySlug', () => {
        it('should find collection by slug', async () => {
            const collection = await findCollectionBySlug(testSlug);

            expect(collection).toBeDefined();
            expect(collection?.id).toBe(testCollectionId);
            expect(collection?.slug).toBe(testSlug);
        });

        it('should return undefined for non-existent slug', async () => {
            const collection = await findCollectionBySlug('non-existent-slug');
            expect(collection).toBeUndefined();
        });
    });
});
