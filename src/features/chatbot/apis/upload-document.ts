/**
 * Upload Document API
 *
 * POST /api/chatbot/documents
 *
 * Admin-only endpoint to upload a document for NIRA AI training.
 * Automatically starts processing and training after upload.
 */

import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../middlewares';
import { requirePermission } from '../../../middlewares';
import { ResponseFormatter } from '../../../utils';
import { asyncHandler } from '../../../utils';
import { HttpException } from '../../../utils';
import { logger } from '../../../utils';
import { uploadSingleFileMiddleware } from '../../../middlewares';
import { uploadToS3 } from '../../../utils/s3Upload';
import {
  createDocument,
  updateDocumentStatus,
  updateDocumentProcessingResult,
} from '../shared/queries';
import {
  extractTextFromBuffer,
  isValidFileType,
  isValidFileSize,
} from '../services/document-processor.service';
import { chunkText } from '../services/chunker.service';
import { upsertDocumentVectors } from '../services/vector.service';
import { chatbotConfig } from '../config/chatbot.config';
import { chatbotCacheService } from '../services/chatbot-cache.service';

// Validation schema for optional metadata
const uploadMetadataSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

/**
 * Process document: extract text, chunk, and store vectors
 */
async function processDocument(
  documentId: number,
  buffer: Buffer,
  mimeType: string,
  documentName: string,
  userId: number
): Promise<{ chunkCount: number }> {
  try {
    // Update status to processing
    await updateDocumentStatus(documentId, 'processing', userId);

    // Extract text from document
    logger.info(`📄 Extracting text from document ${documentId}`);
    const text = await extractTextFromBuffer(buffer, mimeType);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from the document');
    }

    // Chunk the text
    logger.info(`✂️ Chunking text for document ${documentId}`);
    const { chunks } = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('No chunks could be created from the document');
    }

    // Store vectors in Pinecone
    logger.info(`📤 Upserting ${chunks.length} vectors for document ${documentId}`);
    await upsertDocumentVectors(chunks, documentId, documentName, mimeType);

    // Update document with chunk count, then set status to completed
    await updateDocumentProcessingResult(documentId, chunks.length, userId);
    await updateDocumentStatus(documentId, 'completed', userId);

    logger.info(`✅ Document ${documentId} processed successfully`);

    return { chunkCount: chunks.length };
  } catch (error) {
    logger.error(`❌ Document ${documentId} processing failed:`, error);

    // Update status to failed
    await updateDocumentStatus(
      documentId,
      'failed',
      userId,
      error instanceof Error ? error.message : 'Unknown processing error'
    );

    throw error;
  }
}

/**
 * Upload document handler
 */
const handler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const file = req.file;

  if (!file) {
    throw new HttpException(400, 'No file uploaded');
  }

  // Validate file type
  if (!isValidFileType(file.mimetype)) {
    throw new HttpException(
      400,
      `Invalid file type: ${file.mimetype}. Allowed types: ${chatbotConfig.general.allowedMimeTypes.join(', ')}`
    );
  }

  // Validate file size
  if (!isValidFileSize(file.size)) {
    throw new HttpException(
      400,
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${chatbotConfig.general.maxFileSize / 1024 / 1024}MB`
    );
  }

  // Parse optional metadata from body
  const metadata = uploadMetadataSchema.parse(req.body);

  // Generate document name from filename or provided name
  const documentName = metadata.name || file.originalname;

  // Upload file to S3
  logger.info(`📤 Uploading document to S3: ${documentName}`);
  const uploadResult = await uploadToS3(file.buffer, file.originalname, file.mimetype, userId);

  // Create document record
  const document = await createDocument({
    name: documentName,
    description: metadata.description || null,
    file_url: uploadResult.url,
    file_path: uploadResult.key,
    file_size: file.size,
    mime_type: file.mimetype,
    status: 'pending',
    created_by: userId,
    updated_by: userId,
  });

  // Invalidate document caches (new document added)
  await chatbotCacheService.invalidateDocuments();

  // Process document asynchronously (training)
  // Note: We don't await this - processing happens in background
  processDocument(document.id, file.buffer, file.mimetype, documentName, userId)
    .then(async result => {
      logger.info(
        `✅ Document ${document.id} training completed: ${result.chunkCount} chunks embedded`
      );
      // Invalidate cache again after processing completes (status changed)
      await chatbotCacheService.invalidateDocuments();
    })
    .catch(async error => {
      logger.error(`❌ Document ${document.id} training failed:`, error);
      // Invalidate cache on failure too (status changed)
      await chatbotCacheService.invalidateDocuments();
    });

  // Return immediately with pending status
  ResponseFormatter.created(
    res,
    {
      id: document.id,
      name: document.name,
      description: document.description,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      status: document.status,
      createdAt: document.created_at,
    },
    'Document uploaded successfully. Training started in background.'
  );
});

const router = Router();

// POST /api/chatbot/documents - Upload document (admin only)
router.post(
  '/documents',
  requireAuth,
  requirePermission('chatbot:documents'),
  uploadSingleFileMiddleware,
  handler
);

export default router;
