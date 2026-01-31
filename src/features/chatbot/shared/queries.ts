/**
 * Chatbot Database Queries
 *
 * Core reusable queries for chatbot operations.
 * Less frequently used queries are in their respective API files.
 */

import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../../database';
import {
  chatbotDocuments,
  chatbotSessions,
  chatbotMessages,
  ChatbotDocument,
  ChatbotSession,
  ChatbotMessage,
  NewChatbotDocument,
  NewChatbotSession,
  NewChatbotMessage,
  DocumentStatus,
} from './chatbot.schema';

// ============================================================================
// DOCUMENT QUERIES (Core)
// ============================================================================

/**
 * Create a new chatbot document record
 */
export async function createDocument(data: NewChatbotDocument): Promise<ChatbotDocument> {
  const [document] = await db.insert(chatbotDocuments).values(data).returning();
  return document;
}

/**
 * Get a document by ID (excluding soft-deleted)
 */
export async function getDocumentById(id: number): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .select()
    .from(chatbotDocuments)
    .where(and(eq(chatbotDocuments.id, id), eq(chatbotDocuments.is_deleted, false)));
  return document;
}

/**
 * List all documents with pagination (excluding soft-deleted)
 */
export async function listDocuments(
  page: number = 1,
  limit: number = 20
): Promise<{ documents: ChatbotDocument[]; total: number }> {
  const offset = (page - 1) * limit;

  const [documents, countResult] = await Promise.all([
    db
      .select()
      .from(chatbotDocuments)
      .where(eq(chatbotDocuments.is_deleted, false))
      .orderBy(desc(chatbotDocuments.created_at))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatbotDocuments)
      .where(eq(chatbotDocuments.is_deleted, false)),
  ]);

  return {
    documents,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: number,
  status: DocumentStatus,
  updatedBy: string,
  errorMessage?: string
): Promise<ChatbotDocument | undefined> {
  const updateData: {
    status: DocumentStatus;
    updated_by: string;
    updated_at: Date;
    error_message?: string | null;
    is_embedded?: boolean;
  } = {
    status,
    updated_by: updatedBy,
    updated_at: new Date(),
  };

  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }

  // Mark as embedded when completed
  if (status === 'completed') {
    updateData.is_embedded = true;
  }

  const [document] = await db
    .update(chatbotDocuments)
    .set(updateData)
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Update document after successful processing
 */
export async function updateDocumentProcessingResult(
  id: number,
  chunkCount: number,
  updatedBy: string
): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .update(chatbotDocuments)
    .set({
      chunk_count: chunkCount,
      is_embedded: true,
      updated_by: updatedBy,
      updated_at: new Date(),
    })
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Soft delete a document
 */
export async function deleteDocument(
  id: number,
  deletedBy: string
): Promise<ChatbotDocument | undefined> {
  const [document] = await db
    .update(chatbotDocuments)
    .set({
      is_deleted: true,
      is_embedded: false, // Mark as not embedded when deleted
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(chatbotDocuments.id, id))
    .returning();

  return document;
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalChunks: number;
}> {
  // Fetch all non-deleted documents
  const allDocs = await db
    .select({
      status: chatbotDocuments.status,
      chunk_count: chatbotDocuments.chunk_count,
    })
    .from(chatbotDocuments)
    .where(eq(chatbotDocuments.is_deleted, false));

  // Calculate stats manually
  const stats = {
    total: allDocs.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalChunks: 0,
  };

  for (const doc of allDocs) {
    if (doc.status === 'pending') stats.pending++;
    else if (doc.status === 'processing') stats.processing++;
    else if (doc.status === 'completed') stats.completed++;
    else if (doc.status === 'failed') stats.failed++;
    stats.totalChunks += doc.chunk_count || 0;
  }

  return stats;
}

// ============================================================================
// SESSION QUERIES (Core)
// ============================================================================

/**
 * Create a new chat session
 */
export async function createSession(data: NewChatbotSession): Promise<ChatbotSession> {
  const [session] = await db.insert(chatbotSessions).values(data).returning();
  return session;
}

/**
 * Get a session by ID for a specific user
 */
export async function getSessionByIdForUser(
  id: number,
  userId: string
): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .select({
      id: chatbotSessions.id,
      user_id: chatbotSessions.user_id,
      title: chatbotSessions.title,
      created_by: chatbotSessions.created_by,
      created_at: chatbotSessions.created_at,
      updated_by: chatbotSessions.updated_by,
      updated_at: chatbotSessions.updated_at,
      is_deleted: chatbotSessions.is_deleted,
      deleted_by: chatbotSessions.deleted_by,
      deleted_at: chatbotSessions.deleted_at,
    })
    .from(chatbotSessions)
    .where(
      and(
        eq(chatbotSessions.id, id),
        eq(chatbotSessions.user_id, userId),
        eq(chatbotSessions.is_deleted, false)
      )
    );
  return session;
}

/**
 * List sessions for a user with pagination
 */
export async function listUserSessions(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ sessions: ChatbotSession[]; total: number }> {
  const offset = (page - 1) * limit;

  const sessions = await db
    .select({
      id: chatbotSessions.id,
      user_id: chatbotSessions.user_id,
      title: chatbotSessions.title,
      created_by: chatbotSessions.created_by,
      created_at: chatbotSessions.created_at,
      updated_by: chatbotSessions.updated_by,
      updated_at: chatbotSessions.updated_at,
      is_deleted: chatbotSessions.is_deleted,
      deleted_by: chatbotSessions.deleted_by,
      deleted_at: chatbotSessions.deleted_at,
    })
    .from(chatbotSessions)
    .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false)))
    .orderBy(desc(chatbotSessions.updated_at))
    .limit(limit)
    .offset(offset);

  const allIds = await db
    .select({ id: chatbotSessions.id })
    .from(chatbotSessions)
    .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false)));

  const total = allIds.length;

  return {
    sessions,
    total,
  };
}

/**
 * Update session timestamp and title
 */
export async function updateSessionTimestamp(id: number): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .update(chatbotSessions)
    .set({ updated_at: new Date() })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  id: number,
  title: string
): Promise<ChatbotSession | undefined> {
  const [session] = await db
    .update(chatbotSessions)
    .set({ title, updated_at: new Date() })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

/**
 * Soft delete a session and all its messages
 */
export async function deleteSession(
  id: number,
  deletedBy: string
): Promise<ChatbotSession | undefined> {
  // First soft-delete all messages in the session
  await db
    .update(chatbotMessages)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(and(eq(chatbotMessages.session_id, id), eq(chatbotMessages.is_deleted, false)));

  // Then soft-delete the session itself
  const [session] = await db
    .update(chatbotSessions)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(eq(chatbotSessions.id, id))
    .returning();

  return session;
}

// ============================================================================
// MESSAGE QUERIES (Core)
// ============================================================================

/**
 * Create a new message
 */
export async function createMessage(data: NewChatbotMessage): Promise<ChatbotMessage> {
  const [message] = await db.insert(chatbotMessages).values(data).returning();
  return message;
}

/**
 * Get messages for a session with pagination
 */
export async function getSessionMessages(
  sessionId: number,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: ChatbotMessage[]; total: number }> {
  const offset = (page - 1) * limit;

  const messages = await db
    .select({
      id: chatbotMessages.id,
      session_id: chatbotMessages.session_id,
      role: chatbotMessages.role,
      content: chatbotMessages.content,
      sources: chatbotMessages.sources,
      created_by: chatbotMessages.created_by,
      created_at: chatbotMessages.created_at,
      updated_by: chatbotMessages.updated_by,
      updated_at: chatbotMessages.updated_at,
      is_deleted: chatbotMessages.is_deleted,
      deleted_by: chatbotMessages.deleted_by,
      deleted_at: chatbotMessages.deleted_at,
    })
    .from(chatbotMessages)
    .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false)))
    .orderBy(asc(chatbotMessages.created_at))
    .limit(limit)
    .offset(offset);

  const allIds = await db
    .select({ id: chatbotMessages.id })
    .from(chatbotMessages)
    .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false)));

  const total = allIds.length;

  return {
    messages,
    total,
  };
}

/**
 * Get recent messages for a session (for conversation context)
 */
export async function getRecentMessages(
  sessionId: number,
  count: number = 10
): Promise<ChatbotMessage[]> {
  const messages = await db
    .select({
      id: chatbotMessages.id,
      session_id: chatbotMessages.session_id,
      role: chatbotMessages.role,
      content: chatbotMessages.content,
      sources: chatbotMessages.sources,
      created_by: chatbotMessages.created_by,
      created_at: chatbotMessages.created_at,
      updated_by: chatbotMessages.updated_by,
      updated_at: chatbotMessages.updated_at,
      is_deleted: chatbotMessages.is_deleted,
      deleted_by: chatbotMessages.deleted_by,
      deleted_at: chatbotMessages.deleted_at,
    })
    .from(chatbotMessages)
    .where(and(eq(chatbotMessages.session_id, sessionId), eq(chatbotMessages.is_deleted, false)))
    .orderBy(desc(chatbotMessages.created_at))
    .limit(count);

  return messages.reverse();
}
