/**
 * Chatbot Feature Index
 *
 * Central exports for all chatbot-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routers
import uploadDocumentRouter from './apis/upload-document';
import listDocumentsRouter from './apis/list-documents';
import deleteDocumentRouter from './apis/delete-document';
import sendMessageRouter from './apis/send-message';
import listSessionsRouter from './apis/list-sessions';
import getSessionRouter from './apis/get-session';
import deleteSessionRouter from './apis/delete-session';

/**
 * Chatbot Route
 *
 * Provides NIRA AI chatbot functionality:
 * - Document management (admin)
 * - Chat sessions (all users)
 * - Message exchange with AI
 */
class ChatbotRoute implements Route {
  public path = '/chatbot';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Document management (admin only)
    this.router.use(this.path, uploadDocumentRouter);   // POST /chatbot/documents
    this.router.use(this.path, listDocumentsRouter);    // GET /chatbot/documents, GET /chatbot/documents/stats
    this.router.use(this.path, deleteDocumentRouter);   // DELETE /chatbot/documents/:id

    // Chat functionality (all authenticated users)
    this.router.use(this.path, sendMessageRouter);      // POST /chatbot/chat
    this.router.use(this.path, listSessionsRouter);     // GET /chatbot/sessions
    this.router.use(this.path, getSessionRouter);       // GET /chatbot/sessions/:id
    this.router.use(this.path, deleteSessionRouter);    // DELETE /chatbot/sessions/:id
  }
}

// Main route export
export default ChatbotRoute;

// Individual API routes
export { default as uploadDocumentRouter } from './apis/upload-document';
export { default as listDocumentsRouter } from './apis/list-documents';
export { default as deleteDocumentRouter } from './apis/delete-document';
export { default as sendMessageRouter } from './apis/send-message';
export { default as listSessionsRouter } from './apis/list-sessions';
export { default as getSessionRouter } from './apis/get-session';
export { default as deleteSessionRouter } from './apis/delete-session';

// Configuration
export { chatbotConfig, general, chunking, embedding, search, llm, chat, rateLimit, systemPrompt } from './config/chatbot.config';

// Services
export {
  pineconeIndex,
  niraNamespace,
  initializePinecone,
  getIndexStats,
  pineconeHealthCheck,
} from './services/pinecone.service';

export {
  embedText,
  embedTexts,
  getModelInfo,
} from './services/embedding.service';

export {
  extractTextFromDocument,
  extractTextFromBuffer,
  isValidFileType,
  isValidFileSize,
  getExtensionFromMimeType,
} from './services/document-processor.service';

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  validateDocument,
} from './services/document-utils.service';

export {
  chunkText,
  chunkTextFixed,
  estimateChunkCount,
} from './services/chunker.service';

export {
  upsertDocumentVectors,
  deleteDocumentVectors,
  fetchVectors,
  getVectorStats,
  parseVectorId,
} from './services/vector.service';

export {
  searchDocuments,
  buildContextFromResults,
  extractSourceReferences,
  hasDocuments,
  searchWithFilters,
} from './services/search.service';

export {
  generateChatResponse,
  generateSessionTitle,
  getAvailableModels,
} from './services/chat.service';

export { chatbotCacheService, ChatbotCacheService } from './services/chatbot-cache.service';

// Shared resources
export {
  documentStatuses,
  type DocumentStatus,
  chatbotSessions,
  type ChatbotSession,
  type NewChatbotSession,
  chatbotMessages,
  type ChatbotMessage,
  type NewChatbotMessage,
  messageRoles,
  type MessageRole,
  type MessageSource,
  chatbotDocuments,
  type ChatbotDocument,
  type NewChatbotDocument,
} from './shared/schema';

export {
  type IDocument,
  type IDocumentCreate,
  type IDocumentUpdate,
  type ISession,
  type ISessionCreate,
  type ISessionWithSummary,
  type IMessage,
  type IMessageCreate,
  type IChatRequest,
  type IChatResponse,
  type IVectorRecord,
  type IVectorMetadata,
  type ISearchResult,
  type IChunk,
  type IChunkingResult,
  type ITrainingResult,
  type IDocumentListResponse,
  type ISessionListResponse,
  type IChatHistoryResponse,
} from './shared/interface';

export {
  createDocument,
  getDocumentById,
  listDocuments,
  updateDocumentStatus,
  updateDocumentProcessingResult,
  deleteDocument,
  getDocumentStats,
  createSession,
  getSessionByIdForUser,
  listUserSessions,
  updateSessionTimestamp,
  updateSessionTitle,
  deleteSession,
  createMessage,
  getSessionMessages,
  getRecentMessages,
} from './shared/queries';
