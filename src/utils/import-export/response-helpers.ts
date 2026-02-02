/**
 * Response Helpers for Import/Export
 * 
 * Utilities for sending file download responses with proper headers.
 */

import { Response } from 'express';
import { FileResponseOptions, ExportFormat } from './types';

/**
 * Send file download response
 * 
 * Sets appropriate headers and sends buffer as downloadable file
 * 
 * @param res - Express response object
 * @param fileBuffer - File content as Buffer
 * @param options - File response options
 * 
 * @example
 * const csvBuffer = Buffer.from(generateCSV(data, columns));
 * sendFileResponse(res, csvBuffer, {
 *   format: 'csv',
 *   filename: 'products-export'
 * });
 */
export function sendFileResponse(
  res: Response,
  fileBuffer: Buffer,
  options: FileResponseOptions
): void {
  const { format, filename, includeTimestamp = true } = options;

  // Generate filename with extension and optional timestamp
  const timestamp = includeTimestamp ? `-${Date.now()}` : '';
  const extension = getFileExtension(format);
  const fullFilename = `${filename}${timestamp}.${extension}`;

  // Set content type
  const contentType = getContentType(format);
  res.setHeader('Content-Type', contentType);

  // Set download headers
  res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
  res.setHeader('Content-Length', fileBuffer.length.toString());

  // Disable caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Send file
  res.send(fileBuffer);
}

/**
 * Get file extension for format
 */
function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'xlsx':
      return 'xlsx';
    default:
      return 'txt';
  }
}

/**
 * Get content type for format
 */
function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Create download URL for client-side download
 * 
 * Useful for generating blob URLs in the response
 * 
 * @param buffer - File buffer
 * @param format - File format
 * @returns Object with contentType and base64 data
 */
export function createDownloadData(buffer: Buffer, format: ExportFormat): {
  contentType: string;
  data: string;
  extension: string;
} {
  return {
    contentType: getContentType(format),
    data: buffer.toString('base64'),
    extension: getFileExtension(format),
  };
}
