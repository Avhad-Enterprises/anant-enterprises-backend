import { supabase } from './supabase';
import { HttpException } from './helpers/httpException';
import { logger } from './logging/logger';

/** Pre-signed URL expiration time in seconds (1 hour) */
const PRESIGNED_URL_EXPIRY = 3600;

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Get the storage bucket name from config
 */
function getBucketName(): string {
  const bucket = 'uploads'; // Supabase bucket name
  if (!bucket) {
    throw new HttpException(500, 'Storage bucket not configured');
  }
  return bucket;
}

/**
 * Generate a pre-signed URL for secure file access
 * Files are private by default, use this to grant temporary access
 * @param key - Storage object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    const bucket = getBucketName();

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn);

    if (error) {
      logger.error(`Failed to generate pre-signed URL: ${error.message}`, { key, error });
      throw new HttpException(500, 'Failed to generate download URL');
    }

    if (!data?.signedUrl) {
      throw new HttpException(500, 'Failed to generate download URL');
    }

    logger.info(`Generated pre-signed URL for: ${key}`, { expiresIn });
    return data.signedUrl;
  } catch (error) {
    logger.error(
      `Failed to generate pre-signed URL: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to generate download URL');
  }
}

/**
 * Generate a pre-signed URL for transformed images
 * Supports resizing, quality adjustment, and format conversion
 * @param key - Storage object key
 * @param options - Transformation options
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 */
export async function getTransformedImageUrl(
  key: string,
  options: ImageTransformOptions = {},
  expiresIn: number = PRESIGNED_URL_EXPIRY
): Promise<string> {
  try {
    // Get the base signed URL
    const baseUrl = await getPresignedDownloadUrl(key, expiresIn);

    // Append transformation parameters
    const url = new URL(baseUrl);
    if (options.width) url.searchParams.set('width', options.width.toString());
    if (options.height) url.searchParams.set('height', options.height.toString());
    if (options.quality) url.searchParams.set('quality', options.quality.toString());
    if (options.format) url.searchParams.set('format', options.format);
    if (options.resize) url.searchParams.set('resize', options.resize);

    logger.info(`Generated transformed image URL for: ${key}`, { options, expiresIn });
    return url.toString();
  } catch (error) {
    logger.error(
      `Failed to generate transformed image URL: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to generate transformed image URL');
  }
}

/**
 * Upload a file buffer to Supabase Storage (public access for images)
 * Product images need to be publicly accessible from the browser
 */
export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  mimetype: string,
  userId: string
): Promise<StorageUploadResult> {
  try {
    const bucket = getBucketName();

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename
      .replace(/^\\.+/, '') // Remove leading dots
      .replace(/[^a-zA-Z0-9.-]/g, '_');

    // Create a folder structure: {userId}/{timestamp}_{filename}
    // Don't include "uploads/" prefix since bucket is already named "uploads"
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}_${sanitizedFilename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(bucket).upload(key, buffer, {
      contentType: mimetype,
      cacheControl: '3600',
      upsert: false, // Don't overwrite existing files
    });

    if (error) {
      logger.error('Supabase Storage upload error', { error: error.message });
      throw new HttpException(500, 'Failed to upload file');
    }

    if (!data?.path) {
      throw new HttpException(500, 'Upload succeeded but no path returned');
    }

    // Get public URL instead of signed URL for browser accessibility
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    if (!publicUrlData?.publicUrl) {
      throw new HttpException(500, 'Failed to generate public URL');
    }

    logger.info(`File uploaded to Supabase Storage: ${data.path}`);

    return {
      key: data.path,
      url: publicUrlData.publicUrl,
      bucket,
      size: buffer.length,
      contentType: mimetype,
    };
  } catch (error) {
    // Log full error internally for debugging
    logger.error('Storage upload error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return generic message to client - don't expose internal details
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to upload file. Please try again later.');
  }
}

/**
 * Download a file from Supabase Storage
 * Returns the file as a blob
 */
export async function downloadFromStorage(
  key: string
): Promise<{ blob: Blob; contentType: string; contentLength: number }> {
  try {
    const bucket = getBucketName();

    const { data, error } = await supabase.storage.from(bucket).download(key);

    if (error) {
      logger.error('Supabase Storage download error', { error: error.message, key });
      if (error.message.includes('not found')) {
        throw new HttpException(404, 'File not found');
      }
      throw new HttpException(500, 'Failed to download file');
    }

    if (!data) {
      throw new HttpException(404, 'File not found in storage');
    }

    logger.info(`File downloaded from Supabase Storage: ${key}`);

    return {
      blob: data,
      contentType: data.type || 'application/octet-stream',
      contentLength: data.size,
    };
  } catch (error) {
    logger.error('Storage download error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key,
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to download file. Please try again later.');
  }
}

/**
 * Download a file from Supabase Storage as a Buffer
 * Useful for processing files (e.g., PDF extraction)
 */
export async function downloadFromStorageAsBuffer(key: string): Promise<Buffer> {
  try {
    const { blob } = await downloadFromStorage(key);

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info(`File downloaded from Supabase Storage as buffer: ${key}`);

    return buffer;
  } catch (error) {
    logger.error('Storage buffer download error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key,
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to download file. Please try again later.');
  }
}

/**
 * Delete a file from Supabase Storage
 * @param key - Storage object key to delete
 */
export async function deleteFromStorage(key: string): Promise<void> {
  try {
    const bucket = getBucketName();

    const { error } = await supabase.storage.from(bucket).remove([key]);

    if (error) {
      logger.error('Supabase Storage delete error', { error: error.message, key });
      throw new HttpException(500, 'Failed to delete file');
    }

    logger.info(`File deleted from Supabase Storage: ${key}`);
  } catch (error) {
    logger.error('Storage delete error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key,
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to delete file. Please try again later.');
  }
}

/**
 * Delete all files with a specific prefix from Supabase Storage
 * Useful for cleaning up test uploads or user data
 * @param prefix - Storage key prefix (e.g., 'uploads/test-user/')
 */
export async function deleteByPrefixFromStorage(prefix: string): Promise<number> {
  try {
    const bucket = getBucketName();

    // List all files with the prefix
    const { data: files, error: listError } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000, // Supabase limit
      sortBy: { column: 'name', order: 'asc' },
    });

    if (listError) {
      logger.error('Supabase Storage list error', { error: listError.message, prefix });
      throw new HttpException(500, 'Failed to list files');
    }

    if (!files || files.length === 0) {
      logger.info(`No files found with prefix: ${prefix}`);
      return 0;
    }

    // Extract full paths
    const filePaths = files.map(file => `${prefix}${file.name}`);

    // Delete all files
    const { error: deleteError } = await supabase.storage.from(bucket).remove(filePaths);

    if (deleteError) {
      logger.error('Supabase Storage batch delete error', { error: deleteError.message, prefix });
      throw new HttpException(500, 'Failed to delete files');
    }

    logger.info(`Deleted ${filePaths.length} files from Supabase Storage with prefix: ${prefix}`);
    return filePaths.length;
  } catch (error) {
    logger.error('Storage batch delete error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      prefix,
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to delete files. Please try again later.');
  }
}

/**
 * Get file metadata without downloading the file
 * @param key - Storage object key
 */
export async function getFileMetadata(key: string): Promise<{
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}> {
  try {
    const bucket = getBucketName();

    // Extract directory prefix from key
    const lastSlashIndex = key.lastIndexOf('/');
    const prefix = lastSlashIndex > 0 ? key.substring(0, lastSlashIndex + 1) : '';
    const filename = key.substring(lastSlashIndex + 1);

    const { data: files, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      logger.error('Supabase Storage list error for metadata', { error: error.message, key });
      throw new HttpException(500, 'Failed to get file metadata');
    }

    const file = files?.find(f => f.name === filename);
    if (!file) {
      throw new HttpException(404, 'File not found');
    }

    logger.info(`Retrieved metadata for file: ${key}`);

    return {
      name: file.name,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      createdAt: file.created_at || new Date().toISOString(),
      updatedAt: file.updated_at || file.created_at || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Storage metadata error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key,
    });
    if (error instanceof HttpException) throw error;
    throw new HttpException(500, 'Failed to get file metadata. Please try again later.');
  }
}

// Export legacy names for backward compatibility (deprecated)
/** @deprecated Use uploadToStorage instead */
export const uploadToS3 = uploadToStorage;

/** @deprecated Use downloadFromStorage instead */
export const downloadFromS3 = downloadFromStorage;

/** @deprecated Use deleteFromStorage instead */
export const deleteFromS3 = deleteFromStorage;

/** @deprecated Use deleteByPrefixFromStorage instead */
export const deleteByPrefixFromS3 = deleteByPrefixFromStorage;
