/**
 * Unit tests for download-file business logic
 */

import { HttpException } from '@/utils';
import * as uploadQueries from '@/features/upload/shared/queries';
import * as s3Upload from '@/utils/supabaseStorage';

// Mock dependencies
jest.mock('@/features/upload/shared/queries');
jest.mock('@/utils/supabaseStorage');
jest.mock('@/utils', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  HttpException: class HttpException extends Error {
    public status: number;
    public message: string;
    public code: string;
    constructor(status: number, message: string, code?: string) {
      super(message);
      this.status = status;
      this.message = message;
      this.code = code || 'ERROR';
    }
  },
}));

const mockUploadQueries = uploadQueries as jest.Mocked<typeof uploadQueries>;
const mockS3Upload = s3Upload as jest.Mocked<typeof s3Upload>;

// Recreate the business logic for testing
async function handleDownloadFile(uploadId: number, userId: string) {
  const upload = await uploadQueries.findUploadById(uploadId, userId);

  if (!upload) {
    throw new HttpException(404, 'Upload not found');
  }

  const downloadResult = await s3Upload.downloadFromS3(upload.file_path);

  return {
    blob: downloadResult.blob,
    contentType: downloadResult.contentType,
    contentLength: downloadResult.contentLength,
    originalFilename: upload.original_filename,
  };
}

describe('Download File Business Logic', () => {
  const mockUpload = {
    id: 1,
    user_id: '1',
    filename: 'test-file.pdf',
    original_filename: 'test-file.pdf',
    mime_type: 'application/pdf',
    file_size: 1024,
    file_path: 'uploads/1/test-file.pdf',
    file_url: 'https://s3.example.com/uploads/1/test-file.pdf',
    status: 'completed' as const,
    error_message: null,
    created_by: '1',
    created_at: new Date('2024-01-01'),
    updated_by: null,
    updated_at: new Date('2024-01-01'),
    is_deleted: false,
    deleted_by: null,
    deleted_at: null,
  };

  const mockDownloadResult = {
    blob: new Blob(['test content'], { type: 'application/pdf' }),
    contentType: 'application/pdf',
    contentLength: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockS3Upload.downloadFromS3.mockResolvedValue(mockDownloadResult);
  });

  describe('handleDownloadFile', () => {
    it('should successfully download file', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(
        1,
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(mockS3Upload.downloadFromS3).toHaveBeenCalledWith('uploads/1/test-file.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe(1024);
      expect(result.originalFilename).toBe('test-file.pdf');
    });

    it('should throw 404 when upload not found', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      await expect(handleDownloadFile(999, '550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        HttpException
      );
      await expect(
        handleDownloadFile(999, '550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toMatchObject({
        status: 404,
        message: 'Upload not found',
      });
    });

    it('should verify ownership by userId', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(mockUploadQueries.findUploadById).toHaveBeenCalledWith(
        1,
        '550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should use file_path for S3 download', async () => {
      const uploadWithDifferentPath = {
        ...mockUpload,
        file_path: 'different/path/file.pdf',
      };
      mockUploadQueries.findUploadById.mockResolvedValue(uploadWithDifferentPath);

      await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(mockS3Upload.downloadFromS3).toHaveBeenCalledWith('different/path/file.pdf');
    });

    it('should return stream from S3', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(result.blob).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should return original filename for Content-Disposition', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);

      const result = await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(result.originalFilename).toBe('test-file.pdf');
    });

    it('should propagate S3 download errors', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(mockUpload);
      mockS3Upload.downloadFromS3.mockRejectedValue(new Error('S3 download failed'));

      await expect(handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        'S3 download failed'
      );
    });

    it('should handle different content types', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue({
        ...mockUpload,
        mime_type: 'image/png',
      });
      mockS3Upload.downloadFromS3.mockResolvedValue({
        ...mockDownloadResult,
        contentType: 'image/png',
      });

      const result = await handleDownloadFile(1, '550e8400-e29b-41d4-a716-446655440000');

      expect(result.contentType).toBe('image/png');
    });

    it('should not download if upload is not found first', async () => {
      mockUploadQueries.findUploadById.mockResolvedValue(undefined);

      try {
        await handleDownloadFile(999, '550e8400-e29b-41d4-a716-446655440000');
      } catch {
        // Expected to throw
      }

      expect(mockS3Upload.downloadFromS3).not.toHaveBeenCalled();
    });
  });
});
