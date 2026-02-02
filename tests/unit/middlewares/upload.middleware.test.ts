/**
 * Unit tests for upload.middleware.ts
 *
 * NOTE: These tests are currently SKIPPED due to Jest setup issues.
 * The test setup loads database/Pinecone before mocks can apply.
 * To enable: Remove .skip() and refactor tests/utils/setup.ts
 */

// Mock Pinecone before everything else
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue({}),
    }),
  })),
}));

import { Request, Response, NextFunction } from 'express';
import { uploadSingleFileMiddleware, uploadCsvMiddleware } from '@/middlewares/upload.middleware';
import { HttpException } from '@/utils';

// Mock config
jest.mock('@/utils/validateEnv', () => ({
  config: {
    ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/gif,application/pdf,text/csv',
    PINECONE_API_KEY: 'test-key',
  },
}));

jest.mock('@/utils', () => ({
  HttpException: class extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
      this.name = 'HttpException';
    }
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe.skip('Upload Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockReq = {
      file: undefined,
      method: 'POST',
      path: '/api/test',
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('uploadSingleFileMiddleware', () => {
    describe('File Validation', () => {
      it('should accept valid JPEG file with correct magic number', () => {
        const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: jpegBuffer,
          size: jpegBuffer.length,
        } as Express.Multer.File;

        uploadSingleFileMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should accept valid PNG file with correct magic number', () => {
        const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.png',
          encoding: '7bit',
          mimetype: 'image/png',
          buffer: pngBuffer,
          size: pngBuffer.length,
        } as Express.Multer.File;

        uploadSingleFileMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should accept valid PDF file with correct magic number', () => {
        const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          buffer: pdfBuffer,
          size: pdfBuffer.length,
        } as Express.Multer.File;

        uploadSingleFileMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject file with incorrect magic number (spoofed)', () => {
        // Wrong magic number for JPEG
        const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: fakeBuffer,
          size: fakeBuffer.length,
        } as Express.Multer.File;

        uploadSingleFileMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toContain('File content does not match');
        expect(error.message).toContain('file spoofing');
      });

      it('should accept CSV file (no magic number required)', () => {
        const csvBuffer = Buffer.from('name,email\\nJohn,john@example.com\\n');
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: csvBuffer,
          size: csvBuffer.length,
        } as Express.Multer.File;

        uploadSingleFileMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('uploadCsvMiddleware', () => {
    describe('CSV Validation', () => {
      it('should accept valid CSV content with comma delimiter', () => {
        const csvBuffer = Buffer.from(
          'name,email,age\\nJohn,john@example.com,30\\nJane,jane@example.com,25\\n'
        );
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: csvBuffer,
          size: csvBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should accept valid CSV content with semicolon delimiter', () => {
        const csvBuffer = Buffer.from('name;email;age\\nJohn;john@example.com;30\\n');
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: csvBuffer,
          size: csvBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should accept valid CSV content with tab delimiter', () => {
        const csvBuffer = Buffer.from('name\\temail\\tage\\nJohn\\tjohn@example.com\\t30\\n');
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: csvBuffer,
          size: csvBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject invalid CSV content (no delimiters)', () => {
        const invalidBuffer = Buffer.from(
          'This is just plain text without delimiters or structure'
        );
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: invalidBuffer,
          size: invalidBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toContain('Invalid CSV file');
      });

      it('should reject invalid CSV content (no newlines)', () => {
        const invalidBuffer = Buffer.from('name,email,age');
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: invalidBuffer,
          size: invalidBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toContain('Invalid CSV file');
      });

      it('should accept CSV with CRLF line endings', () => {
        const csvBuffer = Buffer.from('name,email\\r\\nJohn,john@example.com\\r\\n');
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: csvBuffer,
          size: csvBuffer.length,
        } as Express.Multer.File;

        uploadCsvMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });
});
