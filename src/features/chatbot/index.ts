/**
 * Chatbot Feature Index
 *
 * Central exports
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares for all chatbot-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import { logger } from '../../utils';
import { isDevelopment } from '../../utils/validateEnv';

// Import API routers

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
    // Use sync initialization in development for faster startup, async in production
    if (isDevelopment) {
      // In development, initialize synchronously for simplicity
      this.initializeRoutesSync();
    } else {
      // In production, use async initialization
      this.initializeRoutes();
    }
  }

  private initializeRoutesSync(): void {
    // Synchronous initialization for tests - import synchronously to avoid async issues
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const uploadDocumentRouter = require('./apis/upload-document').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const listDocumentsRouter = require('./apis/list-documents').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const deleteDocumentRouter = require('./apis/delete-document').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sendMessageRouter = require('./apis/send-message').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const listSessionsRouter = require('./apis/list-sessions').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const getSessionRouter = require('./apis/get-session').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const deleteSessionRouter = require('./apis/delete-session').default;

      // Document management (admin only)
      this.router.use(this.path, uploadDocumentRouter); // POST /chatbot/documents
      this.router.use(this.path, listDocumentsRouter); // GET /chatbot/documents, GET /chatbot/documents/stats
      this.router.use(this.path, deleteDocumentRouter); // DELETE /chatbot/documents/:id

      // Chat functionality (all authenticated users)
      this.router.use(this.path, sendMessageRouter); // POST /chatbot/chat
      this.router.use(this.path, listSessionsRouter); // GET /chatbot/sessions
      this.router.use(this.path, getSessionRouter); // GET /chatbot/sessions/:id
      this.router.use(this.path, deleteSessionRouter); // DELETE /chatbot/sessions/:id
    } catch (error) {
      // In development, routes might not be available or might fail
      logger.warn('Chatbot routes initialization failed', { error });
    }
  }

  private async initializeRoutes(): Promise<void> {
    // Dynamic imports to avoid circular dependency
    const { default: uploadDocumentRouter } = await import('./apis/upload-document');
    const { default: listDocumentsRouter } = await import('./apis/list-documents');
    const { default: deleteDocumentRouter } = await import('./apis/delete-document');
    const { default: sendMessageRouter } = await import('./apis/send-message');
    const { default: listSessionsRouter } = await import('./apis/list-sessions');
    const { default: getSessionRouter } = await import('./apis/get-session');
    const { default: deleteSessionRouter } = await import('./apis/delete-session');

    // Document management (admin only)
    this.router.use(this.path, uploadDocumentRouter); // POST /chatbot/documents
    this.router.use(this.path, listDocumentsRouter); // GET /chatbot/documents, GET /chatbot/documents/stats
    this.router.use(this.path, deleteDocumentRouter); // DELETE /chatbot/documents/:id

    // Chat functionality (all authenticated users)
    this.router.use(this.path, sendMessageRouter); // POST /chatbot/chat
    this.router.use(this.path, listSessionsRouter); // GET /chatbot/sessions
    this.router.use(this.path, getSessionRouter); // GET /chatbot/sessions/:id
    this.router.use(this.path, deleteSessionRouter); // DELETE /chatbot/sessions/:id
  }
}

// Main route export
export default ChatbotRoute;

// Only export what's actually used externally (by tests)
export {
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
  type ChatbotDocument,
  type ChatbotSession,
  type ChatbotMessage,
} from './shared/chatbot.schema';

export { chatbotCacheService } from './services/chatbot-cache.service';
export { pineconeIndex } from './services/pinecone.service';
