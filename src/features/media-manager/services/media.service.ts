/**
 * Media Service
 *
 * Business logic for entity media management
 */

import {
    createEntityMedia,
    findEntityMedia,
    findEntityMediaById,
    findPrimaryEntityMedia,
    updateEntityMedia,
    deleteEntityMedia,
    unsetPrimaryMedia,
    getEntityMediaCount,
    findEntityMediaWithUpload,
    findEntityMediaWithUploads,
    updateMediaOrder,
} from '../shared/entity-media.queries';
import type { NewEntityMedia, EntityType, MediaType } from '../shared/entity-media.schema';
import type {
    MediaResponse,
    MediaUploadInput,
    MediaUpdateInput,
    MediaReorderInput,
} from '../shared/interface';
import { imageTransformerService } from './image-transformer.service';
import { HttpException, logger } from '../../../utils';

/**
 * Transform entity media with upload data to response format
 */
async function transformMediaResponse(mediaData: {
    media: any;
    upload: any;
}): Promise<MediaResponse> {
    const { media, upload } = mediaData;

    if (!upload) {
        throw new HttpException(500, 'Upload data not found for media');
    }

    // Generate image variants if media is an image
    let variants;
    if (imageTransformerService.isImage(upload.mime_type)) {
        variants = await imageTransformerService.generateImageVariants(upload.file_path);
    }

    return {
        id: media.id,
        entity_type: media.entity_type,
        entity_id: media.entity_id,
        media_type: media.media_type,
        display_order: media.display_order,
        is_primary: media.is_primary,
        alt_text: media.alt_text,
        caption: media.caption,
        original_url: upload.file_url,
        variants,
        metadata: {
            filename: upload.original_filename,
            size: upload.file_size,
            mime_type: upload.mime_type,
            ...media.metadata,
        },
        created_at: media.created_at,
        updated_at: media.updated_at,
    };
}

/**
 * Media Service Class
 */
export class MediaService {
    /**
     * Attach media to an entity
     */
    async attachMediaToEntity(input: MediaUploadInput): Promise<MediaResponse> {
        const { entity_type, entity_id, upload_id, alt_text, caption, set_as_primary, metadata } =
            input;

        // Get current media count to determine display order
        const currentCount = await getEntityMediaCount(entity_type, entity_id);

        // If this is the first media or explicitly set as primary, make it primary
        const isPrimary = currentCount === 0 || set_as_primary === true;

        // If setting as primary, unset other primary media
        if (isPrimary) {
            await unsetPrimaryMedia(entity_type, entity_id);
        }

        // Create the entity-media relationship
        const mediaData: NewEntityMedia = {
            entity_type,
            entity_id,
            upload_id,
            media_type: input.media_type,
            display_order: currentCount, // Append to end
            is_primary: isPrimary,
            alt_text,
            caption,
            metadata: metadata ? metadata as any : undefined,
        };

        const createdMedia = await createEntityMedia(mediaData);

        // Fetch with upload data for response
        const mediaWithUpload = await findEntityMediaWithUpload(createdMedia.id);

        if (!mediaWithUpload) {
            throw new HttpException(500, 'Failed to retrieve created media');
        }

        logger.info('Media attached to entity', {
            mediaId: createdMedia.id,
            entityType: entity_type,
            entityId: entity_id,
        });

        return await transformMediaResponse(mediaWithUpload);
    }

    /**
     * Get all media for an entity
     */
    async getEntityMedia(
        entityType: EntityType,
        entityId: string,
        mediaType?: MediaType
    ): Promise<MediaResponse[]> {
        const mediaWithUploads = await findEntityMediaWithUploads(entityType, entityId, mediaType);

        return await Promise.all(mediaWithUploads.map((m) => transformMediaResponse(m)));
    }

    /**
     * Get a single media by ID
     */
    async getMediaById(mediaId: string): Promise<MediaResponse> {
        const mediaWithUpload = await findEntityMediaWithUpload(mediaId);

        if (!mediaWithUpload) {
            throw new HttpException(404, 'Media not found');
        }

        return await transformMediaResponse(mediaWithUpload);
    }

    /**
     * Get primary media for an entity
     */
    async getPrimaryMedia(entityType: EntityType, entityId: string): Promise<MediaResponse | null> {
        const primaryMedia = await findPrimaryEntityMedia(entityType, entityId);

        if (!primaryMedia) {
            return null;
        }

        const mediaWithUpload = await findEntityMediaWithUpload(primaryMedia.id);

        if (!mediaWithUpload) {
            return null;
        }

        return await transformMediaResponse(mediaWithUpload);
    }

    /**
     * Update media metadata
     */
    async updateMediaMetadata(
        mediaId: string,
        input: MediaUpdateInput
    ): Promise<MediaResponse> {
        const media = await findEntityMediaById(mediaId);

        if (!media) {
            throw new HttpException(404, 'Media not found');
        }

        // Merge existing metadata with new metadata
        const updatedMetadata = input.metadata
            ? { ...media.metadata, ...input.metadata }
            : media.metadata;

        await updateEntityMedia(mediaId, {
            alt_text: input.alt_text,
            caption: input.caption,
            display_order: input.display_order,
            metadata: updatedMetadata as any,
        });

        // Fetch updated media with upload data
        const mediaWithUpload = await findEntityMediaWithUpload(mediaId);

        if (!mediaWithUpload) {
            throw new HttpException(500, 'Failed to retrieve updated media');
        }

        logger.info('Media metadata updated', { mediaId });

        return await transformMediaResponse(mediaWithUpload);
    }

    /**
     * Set media as primary
     */
    async setAsPrimary(mediaId: string): Promise<MediaResponse> {
        const media = await findEntityMediaById(mediaId);

        if (!media) {
            throw new HttpException(404, 'Media not found');
        }

        // Unset other primary media for this entity
        await unsetPrimaryMedia(media.entity_type, media.entity_id);

        // Set this media as primary
        await updateEntityMedia(mediaId, { is_primary: true });

        const mediaWithUpload = await findEntityMediaWithUpload(mediaId);

        if (!mediaWithUpload) {
            throw new HttpException(500, 'Failed to retrieve updated media');
        }

        logger.info('Media set as primary', {
            mediaId,
            entityType: media.entity_type,
            entityId: media.entity_id,
        });

        return await transformMediaResponse(mediaWithUpload);
    }

    /**
     * Delete media
     */
    async deleteMedia(mediaId: string): Promise<void> {
        const media = await findEntityMediaById(mediaId);

        if (!media) {
            throw new HttpException(404, 'Media not found');
        }

        // Delete the relationship
        await deleteEntityMedia(mediaId);

        // If this was the primary media, set another media as primary
        if (media.is_primary) {
            const remainingMedia = await findEntityMedia(media.entity_type, media.entity_id);
            if (remainingMedia.length > 0) {
                // Set the first media as primary
                await updateEntityMedia(remainingMedia[0].id, { is_primary: true });
            }
        }

        logger.info('Media deleted', {
            mediaId,
            entityType: media.entity_type,
            entityId: media.entity_id,
        });
    }

    /**
     * Reorder entity media
     */
    async reorderMedia(
        entityType: EntityType,
        entityId: string,
        reorderData: MediaReorderInput[]
    ): Promise<MediaResponse[]> {
        // Verify all media belongs to the entity
        const entityMediaIds = (await findEntityMedia(entityType, entityId)).map((m) => m.id);
        const inputMediaIds = reorderData.map((r) => r.media_id);

        const invalidIds = inputMediaIds.filter((id) => !entityMediaIds.includes(id));
        if (invalidIds.length > 0) {
            throw new HttpException(400, `Invalid media IDs: ${invalidIds.join(', ')}`);
        }

        // Update display orders
        const mediaIds = reorderData.map((r) => r.media_id);
        const orders = reorderData.map((r) => r.display_order);

        await updateMediaOrder(mediaIds, orders);

        logger.info('Media reordered', {
            entityType,
            entityId,
            count: reorderData.length,
        });

        // Return updated media list
        return await this.getEntityMedia(entityType, entityId);
    }
}

// Export singleton instance
export const mediaService = new MediaService();
