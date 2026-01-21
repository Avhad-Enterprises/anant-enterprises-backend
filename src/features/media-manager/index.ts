/**
 * Media Manager Feature Index
 *
 * Central exports for media management
 */

// Shared resources
export {
    entityMedia,
    entityTypeEnum,
    mediaTypeEnum,
    ENTITY_TYPES,
    MEDIA_TYPES,
    type EntityMedia,
    type NewEntityMedia,
    type EntityType,
    type MediaType,
} from './shared';

export * from './shared/entity-media.queries';
export * from './shared/interface';

// Services
export { mediaService, MediaService } from './services/media.service';
export {
    imageTransformerService,
    ImageTransformerService,
    IMAGE_VARIANTS,
    type ImageVariants,
    type ImageVariantType,
} from './services/image-transformer.service';
