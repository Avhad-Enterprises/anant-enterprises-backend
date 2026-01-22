/**
 * Entity Media Queries
 *
 * Database queries for entity-media relationships
 */

import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../../database';
import { entityMedia, type EntityMedia, type NewEntityMedia, type EntityType } from './entity-media.schema';
import { uploads } from '../../upload';

/**
 * Create an entity-media relationship
 */
export async function createEntityMedia(data: NewEntityMedia): Promise<EntityMedia> {
    const [media] = await db.insert(entityMedia).values(data).returning();
    return media;
}

/**
 * Find all media for a specific entity, ordered by display_order
 */
export async function findEntityMedia(
    entityType: EntityType,
    entityId: string,
    mediaType?: string
): Promise<EntityMedia[]> {
    const conditions = [
        eq(entityMedia.entity_type, entityType),
        eq(entityMedia.entity_id, entityId),
    ];

    if (mediaType) {
        conditions.push(eq(entityMedia.media_type, mediaType as any));
    }

    return await db
        .select()
        .from(entityMedia)
        .where(and(...conditions))
        .orderBy(asc(entityMedia.display_order));
}

/**
 * Find a specific media by ID
 */
export async function findEntityMediaById(mediaId: string): Promise<EntityMedia | undefined> {
    const [media] = await db
        .select()
        .from(entityMedia)
        .where(eq(entityMedia.id, mediaId))
        .limit(1);
    return media;
}

/**
 * Get the primary media for an entity
 */
export async function findPrimaryEntityMedia(
    entityType: EntityType,
    entityId: string
): Promise<EntityMedia | undefined> {
    const [primaryMedia] = await db
        .select()
        .from(entityMedia)
        .where(
            and(
                eq(entityMedia.entity_type, entityType),
                eq(entityMedia.entity_id, entityId),
                eq(entityMedia.is_primary, true)
            )
        )
        .limit(1);
    return primaryMedia;
}

/**
 * Update entity media
 */
export async function updateEntityMedia(
    mediaId: string,
    data: Partial<NewEntityMedia>
): Promise<EntityMedia> {
    const [updated] = await db
        .update(entityMedia)
        .set({ ...data, updated_at: new Date() })
        .where(eq(entityMedia.id, mediaId))
        .returning();
    return updated;
}

/**
 * Delete entity media by ID
 */
export async function deleteEntityMedia(mediaId: string): Promise<void> {
    await db.delete(entityMedia).where(eq(entityMedia.id, mediaId));
}

/**
 * Unset primary flag for all media of an entity
 */
export async function unsetPrimaryMedia(
    entityType: EntityType,
    entityId: string
): Promise<void> {
    await db
        .update(entityMedia)
        .set({ is_primary: false, updated_at: new Date() })
        .where(and(eq(entityMedia.entity_type, entityType), eq(entityMedia.entity_id, entityId)));
}

/**
 * Get count of media for an entity
 */
export async function getEntityMediaCount(
    entityType: EntityType,
    entityId: string
): Promise<number> {
    const result = await db
        .select()
        .from(entityMedia)
        .where(and(eq(entityMedia.entity_type, entityType), eq(entityMedia.entity_id, entityId)));
    return result.length;
}

/**
 * Get entity media with upload details (joined)
 */
export async function findEntityMediaWithUpload(mediaId: string) {
    const result = await db
        .select({
            media: entityMedia,
            upload: uploads,
        })
        .from(entityMedia)
        .leftJoin(uploads, eq(entityMedia.upload_id, uploads.id))
        .where(eq(entityMedia.id, mediaId))
        .limit(1);

    return result[0];
}

/**
 * Get all entity media with upload details (joined)
 */
export async function findEntityMediaWithUploads(
    entityType: EntityType,
    entityId: string,
    mediaType?: string
) {
    const conditions = [
        eq(entityMedia.entity_type, entityType),
        eq(entityMedia.entity_id, entityId),
    ];

    if (mediaType) {
        conditions.push(eq(entityMedia.media_type, mediaType as any));
    }

    return await db
        .select({
            media: entityMedia,
            upload: uploads,
        })
        .from(entityMedia)
        .leftJoin(uploads, eq(entityMedia.upload_id, uploads.id))
        .where(and(...conditions))
        .orderBy(asc(entityMedia.display_order));
}

/**
 * Batch update display orders
 */
export async function updateMediaOrder(
    mediaIds: string[],
    orders: number[]
): Promise<void> {
    if (mediaIds.length !== orders.length) {
        throw new Error('mediaIds and orders arrays must have the same length');
    }

    // Execute updates in a transaction
    await db.transaction(async (tx) => {
        for (let i = 0; i < mediaIds.length; i++) {
            await tx
                .update(entityMedia)
                .set({ display_order: orders[i], updated_at: new Date() })
                .where(eq(entityMedia.id, mediaIds[i]));
        }
    });
}
