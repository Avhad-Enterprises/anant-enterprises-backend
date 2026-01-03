/**
 * Image Transformer Service
 *
 * Generates image variant URLs using Supabase CDN transformations
 */

import { getTransformedImageUrl } from '../../../utils/supabaseStorage';
import { logger } from '../../../utils';

/**
 * Image variant configurations
 */
export const IMAGE_VARIANTS = {
    thumbnail: { width: 150, height: 150, resize: 'cover' as const },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    zoom: { width: 2400, quality: 90 },
} as const;

export type ImageVariantType = keyof typeof IMAGE_VARIANTS;

/**
 * Image variants response
 */
export interface ImageVariants {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    zoom: string;
}

/**
 * Image Transformer Service Class
 */
export class ImageTransformerService {
    /**
     * Generate all image variant URLs
     */
    async generateImageVariants(filePath: string): Promise<ImageVariants> {
        try {
            const [thumbnail, small, medium, large, zoom] = await Promise.all([
                getTransformedImageUrl(filePath, IMAGE_VARIANTS.thumbnail),
                getTransformedImageUrl(filePath, IMAGE_VARIANTS.small),
                getTransformedImageUrl(filePath, IMAGE_VARIANTS.medium),
                getTransformedImageUrl(filePath, IMAGE_VARIANTS.large),
                getTransformedImageUrl(filePath, IMAGE_VARIANTS.zoom),
            ]);

            return {
                thumbnail,
                small,
                medium,
                large,
                zoom,
            };
        } catch (error) {
            logger.error('Failed to generate image variants', { filePath, error });
            throw error;
        }
    }

    /**
     * Generate a specific variant URL
     */
    async generateVariant(
        filePath: string,
        variantType: ImageVariantType
    ): Promise<string> {
        try {
            const config = IMAGE_VARIANTS[variantType];
            return await getTransformedImageUrl(filePath, config);
        } catch (error) {
            logger.error('Failed to generate image variant', { filePath, variantType, error });
            throw error;
        }
    }

    /**
     * Check if file is an image based on mime type
     */
    isImage(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    /**
     * Check if file is a video based on mime type
     */
    isVideo(mimeType: string): boolean {
        return mimeType.startsWith('video/');
    }
}

// Export singleton instance
export const imageTransformerService = new ImageTransformerService();
