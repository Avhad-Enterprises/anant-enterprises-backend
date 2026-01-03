/**
 * Media Manager Interfaces
 *
 * Type definitions for media management
 */

import type { EntityType, MediaType } from './entity-media.schema';
import type { ImageVariants } from '../services/image-transformer.service';

/**
 * Media response with variants and metadata
 */
export interface MediaResponse {
    id: string;
    entity_type: EntityType;
    entity_id: string;
    media_type: MediaType;
    display_order: number;
    is_primary: boolean;
    alt_text: string | null;
    caption: string | null;
    original_url: string;
    variants?: ImageVariants;
    metadata: {
        filename: string;
        size: number;
        mime_type: string;
        dimensions?: { width: number; height: number };
        duration?: number;
        exif?: Record<string, any>;
        palette?: string[];
    };
    created_at: Date;
    updated_at: Date;
}

/**
 * Media upload input
 */
export interface MediaUploadInput {
    entity_type: EntityType;
    entity_id: string;
    media_type: MediaType;
    upload_id: number;
    alt_text?: string;
    caption?: string;
    set_as_primary?: boolean;
    metadata?: Record<string, any>;
}

/**
 * Media update input
 */
export interface MediaUpdateInput {
    alt_text?: string;
    caption?: string;
    display_order?: number;
    metadata?: Record<string, any>;
}

/**
 * Media reorder input
 */
export interface MediaReorderInput {
    media_id: string;
    display_order: number;
}
