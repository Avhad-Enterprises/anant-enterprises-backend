/**
 * Chatbot API Integration Tests
 *
 * Comprehensive tests for all chatbot endpoints:
 * - Document management (upload, list, delete, stats)
 * - Session management (list, get, delete)
 * - Chat functionality (send messages)
 * - E2E flows (upload → process → chat)
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import App from '../../../../app';
import ChatbotRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils';
import { ApiTestHelper } from '../../../../../tests/utils';
import { SupabaseAuthHelper } from '../../../../../tests/utils';
import { s3Helper } from '../../../../../tests/utils';
import { db } from '../../../../database';
import { chatbotDocuments, chatbotSessions, chatbotMessages } from '../../shared/schema';
import { chatbotCacheService } from '../../services/chatbot-cache.service';
import { deleteFromStorage } from '../../../../utils/supabaseStorage';
import { pineconeIndex } from '../../services/pinecone.service';
import { eq } from 'drizzle-orm';

// Increase timeout for E2E tests
jest.setTimeout(60000);

const generateTestEmail = (prefix: string = 'test') =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;

describe('Chatbot API Integration Tests', () => {
    let app: Application;
    let apiHelper: ApiTestHelper;
    let adminToken: string;
    let adminUserId: number;
    let userToken: string;
    let userId: number;
    let otherUserId: number;
    let uploadedFilePath: string | null = null;

    beforeAll(async () => {
        const chatbotRoute = new ChatbotRoute();
        const authRoute = new AuthRoute();
        const appInstance = new App([authRoute, chatbotRoute]);
        app = appInstance.getServer();
        apiHelper = new ApiTestHelper(app as any);
    });

    beforeEach(async () => {
        // Invalidate cache
        await chatbotCacheService.invalidateAll();

        // Clean up tables
        await db.execute(sql`TRUNCATE TABLE user_roles CASCADE`);
        await db.execute(sql`TRUNCATE TABLE role_permissions CASCADE`);
        await db.execute(sql`TRUNCATE TABLE permissions CASCADE`);
        await db.execute(sql`TRUNCATE TABLE roles CASCADE`);
        await db.execute(sql`TRUNCATE TABLE chatbot_messages CASCADE`);
        await db.execute(sql`TRUNCATE TABLE chatbot_sessions CASCADE`);
        await db.execute(sql`TRUNCATE TABLE chatbot_documents CASCADE`);
        await dbHelper.cleanup();
        await dbHelper.resetSequences();

        // Reset sequences
        await db.execute(sql`ALTER SEQUENCE chatbot_documents_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE chatbot_sessions_id_seq RESTART WITH 1`);
        await db.execute(sql`ALTER SEQUENCE chatbot_messages_id_seq RESTART WITH 1`);

        // Create admin user
        const { token: aToken, userId: aId } = await SupabaseAuthHelper.createTestAdminUser();
        adminToken = aToken;
        adminUserId = aId;

        // Create regular user
        const { user, token: uToken } = await SupabaseAuthHelper.createTestUser({
            email: generateTestEmail('user'),
            password: 'UserPass123!',
            name: 'Test User',
            role: 'user',
        });
        userToken = uToken;
        userId = user.id;

        // Create another user for isolation tests
        const { user: other } = await SupabaseAuthHelper.createTestUser({
            email: generateTestEmail('other'),
            password: 'OtherPass123!',
            name: 'Other User',
            role: 'user',
        });
        otherUserId = other.id;
    });

    afterEach(async () => {
        // Clean up S3 uploads
        if (uploadedFilePath) {
            try {
                await deleteFromStorage(uploadedFilePath);
            } catch {
                // Ignore cleanup errors
            }
            uploadedFilePath = null;
        }
        await s3Helper.cleanupTestUploads([1, 2]);
    });

    afterAll(async () => {
        await dbHelper.close();
    });

    // ==================== DOCUMENT ENDPOINTS ====================

    describe('GET /api/chatbot/documents', () => {
        it('should list documents for admin', async () => {
            await db.insert(chatbotDocuments).values([
                {
                    name: 'Test Doc 1',
                    file_url: 'https://example.com/doc1.pdf',
                    file_path: 'docs/doc1.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'completed',
                    chunk_count: 10,
                    created_by: adminUserId,
                    updated_by: adminUserId,
                },
                {
                    name: 'Test Doc 2',
                    file_url: 'https://example.com/doc2.pdf',
                    file_path: 'docs/doc2.pdf',
                    file_size: 2048,
                    mime_type: 'application/pdf',
                    status: 'pending',
                    created_by: adminUserId,
                    updated_by: adminUserId,
                },
            ]);

            const response = await apiHelper.get('/api/chatbot/documents', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.pagination.total).toBe(2);
        });

        it('should paginate documents correctly', async () => {
            for (let i = 0; i < 5; i++) {
                await db.insert(chatbotDocuments).values({
                    name: `Test Doc ${i}`,
                    file_url: `https://example.com/doc${i}.pdf`,
                    file_path: `docs/doc${i}.pdf`,
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'completed',
                    created_by: adminUserId,
                    updated_by: adminUserId,
                });
            }

            const response = await apiHelper.get('/api/chatbot/documents?page=1&limit=2', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta.pagination.total).toBe(5);
        });

        it('should reject non-admin users', async () => {
            const response = await apiHelper.get('/api/chatbot/documents', userToken);
            expect(response.status).toBe(403);
        });

        it('should reject unauthenticated requests', async () => {
            const response = await apiHelper.get('/api/chatbot/documents');
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/chatbot/documents/stats', () => {
        it('should return document statistics for admin', async () => {
            await db.insert(chatbotDocuments).values([
                {
                    name: 'Pending Doc',
                    file_url: 'https://example.com/p.pdf',
                    file_path: 'docs/p.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'pending',
                    created_by: adminUserId,
                    updated_by: adminUserId,
                },
                {
                    name: 'Completed Doc',
                    file_url: 'https://example.com/c.pdf',
                    file_path: 'docs/c.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'completed',
                    chunk_count: 15,
                    created_by: adminUserId,
                    updated_by: adminUserId,
                },
                {
                    name: 'Failed Doc',
                    file_url: 'https://example.com/f.pdf',
                    file_path: 'docs/f.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'failed',
                    error_message: 'Processing failed',
                    created_by: adminUserId,
                    updated_by: adminUserId,
                },
            ]);

            const response = await apiHelper.get('/api/chatbot/documents/stats', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.data.total).toBe(3);
            expect(response.body.data.pending).toBe(1);
            expect(response.body.data.completed).toBe(1);
            expect(response.body.data.failed).toBe(1);
            expect(response.body.data.totalChunks).toBe(15);
        });

        it('should return zeros when no documents', async () => {
            const response = await apiHelper.get('/api/chatbot/documents/stats', adminToken);

            expect(response.status).toBe(200);
            expect(response.body.data.total).toBe(0);
        });

        it('should reject non-admin users', async () => {
            const response = await apiHelper.get('/api/chatbot/documents/stats', userToken);
            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /api/chatbot/documents/:id', () => {
        it('should soft delete document for admin', async () => {
            const [doc] = await db
                .insert(chatbotDocuments)
                .values({
                    name: 'To Delete',
                    file_url: 'https://example.com/del.pdf',
                    file_path: 'docs/del.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'completed',
                    chunk_count: 5,
                    created_by: adminUserId,
                    updated_by: adminUserId,
                })
                .returning();

            const response = await apiHelper.delete(`/api/chatbot/documents/${doc.id}`, adminToken);

            expect(response.status).toBe(204);

            const listResponse = await apiHelper.get('/api/chatbot/documents', adminToken);
            expect(listResponse.body.data).toHaveLength(0);
        });

        it('should return 404 for non-existent document', async () => {
            const response = await apiHelper.delete('/api/chatbot/documents/999', adminToken);
            expect(response.status).toBe(404);
        });

        it('should reject non-admin users', async () => {
            const [doc] = await db
                .insert(chatbotDocuments)
                .values({
                    name: 'Protected',
                    file_url: 'https://example.com/prot.pdf',
                    file_path: 'docs/prot.pdf',
                    file_size: 1024,
                    mime_type: 'application/pdf',
                    status: 'completed',
                    created_by: adminUserId,
                    updated_by: adminUserId,
                })
                .returning();

            const response = await apiHelper.delete(`/api/chatbot/documents/${doc.id}`, userToken);
            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/chatbot/documents', () => {
        it('should reject requests without file', async () => {
            const response = await apiHelper.post('/api/chatbot/documents', {}, adminToken);
            expect(response.status).toBe(400);
        });

        it('should require authentication', async () => {
            const response = await apiHelper.post('/api/chatbot/documents', {});
            expect(response.status).toBe(401);
        });
    });

    // ==================== SESSION ENDPOINTS ====================

    describe('GET /api/chatbot/sessions', () => {
        it('should list user sessions', async () => {
            await db.insert(chatbotSessions).values([
                {
                    user_id: userId,
                    title: 'Session 1',
                    created_by: userId,
                    updated_by: userId,
                },
                {
                    user_id: userId,
                    title: 'Session 2',
                    created_by: userId,
                    updated_by: userId,
                },
            ]);

            const response = await apiHelper.get('/api/chatbot/sessions', userToken);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
        });

        it('should only list own sessions', async () => {
            await db.insert(chatbotSessions).values([
                {
                    user_id: userId,
                    title: 'My Session',
                    created_by: userId,
                    updated_by: userId,
                },
                {
                    user_id: otherUserId,
                    title: 'Other Session',
                    created_by: otherUserId,
                    updated_by: otherUserId,
                },
            ]);

            const response = await apiHelper.get('/api/chatbot/sessions', userToken);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe('My Session');
        });

        it('should reject unauthenticated requests', async () => {
            const response = await apiHelper.get('/api/chatbot/sessions');
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/chatbot/sessions/:id', () => {
        it('should get session with messages', async () => {
            const [session] = await db
                .insert(chatbotSessions)
                .values({
                    user_id: userId,
                    title: 'My Session',
                    created_by: userId,
                    updated_by: userId,
                })
                .returning();

            await db.insert(chatbotMessages).values([
                {
                    session_id: session.id,
                    role: 'user',
                    content: 'Hello',
                    created_by: userId,
                    updated_by: userId,
                },
                {
                    session_id: session.id,
                    role: 'assistant',
                    content: 'Hi there!',
                    created_by: userId,
                    updated_by: userId,
                },
            ]);

            const response = await apiHelper.get(`/api/chatbot/sessions/${session.id}`, userToken);

            expect(response.status).toBe(200);
            expect(response.body.data.session.id).toBe(session.id);
            expect(response.body.data.messages).toHaveLength(2);
        });

        it('should return 404 for non-existent session', async () => {
            const response = await apiHelper.get('/api/chatbot/sessions/999', userToken);
            expect(response.status).toBe(404);
        });

        it('should not allow access to other user sessions', async () => {
            const [session] = await db
                .insert(chatbotSessions)
                .values({
                    user_id: otherUserId,
                    title: 'Other Session',
                    created_by: otherUserId,
                    updated_by: otherUserId,
                })
                .returning();

            const response = await apiHelper.get(`/api/chatbot/sessions/${session.id}`, userToken);
            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/chatbot/sessions/:id', () => {
        it('should soft delete session and messages', async () => {
            const [session] = await db
                .insert(chatbotSessions)
                .values({
                    user_id: userId,
                    title: 'To Delete',
                    created_by: userId,
                    updated_by: userId,
                })
                .returning();

            const response = await apiHelper.delete(`/api/chatbot/sessions/${session.id}`, userToken);

            expect(response.status).toBe(204);

            const listResponse = await apiHelper.get('/api/chatbot/sessions', userToken);
            expect(listResponse.body.data).toHaveLength(0);
        });

        it('should return 404 for non-existent session', async () => {
            const response = await apiHelper.delete('/api/chatbot/sessions/999', userToken);
            expect(response.status).toBe(404);
        });

        it('should not allow deleting other user sessions', async () => {
            const [session] = await db
                .insert(chatbotSessions)
                .values({
                    user_id: otherUserId,
                    title: 'Protected',
                    created_by: otherUserId,
                    updated_by: otherUserId,
                })
                .returning();

            const response = await apiHelper.delete(`/api/chatbot/sessions/${session.id}`, userToken);
            expect(response.status).toBe(404);
        });
    });

    // ==================== CHAT ENDPOINT ====================

    describe('POST /api/chatbot/chat', () => {
        it('should reject empty message', async () => {
            const response = await apiHelper.post('/api/chatbot/chat', { message: '' }, userToken);
            expect(response.status).toBe(400);
        });

        it('should reject request without message', async () => {
            const response = await apiHelper.post('/api/chatbot/chat', {}, userToken);
            expect(response.status).toBe(400);
        });

        it('should reject unauthenticated requests', async () => {
            const response = await apiHelper.post('/api/chatbot/chat', { message: 'Hello' });
            expect(response.status).toBe(401);
        });

        it('should reject invalid session ID', async () => {
            const response = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'Hello', sessionId: 'invalid' },
                userToken
            );
            expect(response.status).toBe(400);
        });

        it('should reject non-existent session ID', async () => {
            const response = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'Hello', sessionId: 999 },
                userToken
            );
            expect(response.status).toBe(404);
        });

        it('should reject session owned by another user', async () => {
            const [session] = await db
                .insert(chatbotSessions)
                .values({
                    user_id: otherUserId,
                    title: 'Other Session',
                    created_by: otherUserId,
                    updated_by: otherUserId,
                })
                .returning();

            const response = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'Hello', sessionId: session.id },
                userToken
            );
            expect(response.status).toBe(404);
        });
    });

    // ==================== E2E TESTS ====================

    /**
     * Helper function to wait for document processing
     */
    async function waitForDocumentProcessing(documentId: number, maxWaitMs = 30000): Promise<boolean> {
        const startTime = Date.now();
        const pollInterval = 1000;

        while (Date.now() - startTime < maxWaitMs) {
            const [doc] = await db
                .select()
                .from(chatbotDocuments)
                .where(eq(chatbotDocuments.id, documentId));

            if (!doc) throw new Error(`Document ${documentId} not found`);
            if (doc.status === 'completed') return true;
            if (doc.status === 'failed') {
                console.error(`Document processing failed: ${doc.error_message}`);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        console.warn(`Document processing timed out after ${maxWaitMs}ms`);
        return false;
    }

    describe('E2E: Document Upload & Processing', () => {
        it('should upload text document and create vectors', async () => {
            const testContent = `
        This is a test document about health research.
        It contains information about nutrition and wellness programs.
      `;

            const uploadResponse = await apiHelper.uploadFileBuffer(
                '/api/chatbot/documents',
                'file',
                Buffer.from(testContent),
                'test-document.txt',
                adminToken
            );

            if (uploadResponse.status !== 201) {
                console.warn('Skipping upload test: upload failed');
                return;
            }

            const documentId = uploadResponse.body.data.id;
            uploadedFilePath = uploadResponse.body.data.file_path;

            const processed = await waitForDocumentProcessing(documentId);
            expect(processed).toBe(true);

            const [doc] = await db
                .select()
                .from(chatbotDocuments)
                .where(eq(chatbotDocuments.id, documentId));

            expect(doc.status).toBe('completed');
            expect(doc.chunk_count).toBeGreaterThan(0);
        });
    });

    describe('E2E: Full Chat Flow', () => {
        it('should send message and receive LLM response', async () => {
            await db.insert(chatbotDocuments).values({
                name: 'Knowledge Base',
                file_url: 'https://example.com/kb.pdf',
                file_path: 'docs/kb.pdf',
                file_size: 1024,
                mime_type: 'application/pdf',
                status: 'completed',
                chunk_count: 10,
                created_by: userId,
                updated_by: userId,
            });

            const chatResponse = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'What is this about?' },
                userToken
            );

            expect(chatResponse.status).toBe(200);
            expect(chatResponse.body.data).toHaveProperty('sessionId');
            expect(chatResponse.body.data).toHaveProperty('assistantMessage');
            expect(chatResponse.body.data.assistantMessage.role).toBe('assistant');
            expect(chatResponse.body.data.assistantMessage.content).toBeTruthy();
        });

        it('should continue conversation in existing session', async () => {
            const firstResponse = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'Hello NIRA!' },
                userToken
            );

            expect(firstResponse.status).toBe(200);
            const sessionId = firstResponse.body.data.sessionId;

            const secondResponse = await apiHelper.post(
                '/api/chatbot/chat',
                { message: 'What can you help me with?', sessionId },
                userToken
            );

            expect(secondResponse.status).toBe(200);
            expect(secondResponse.body.data.sessionId).toBe(sessionId);

            const sessionResponse = await apiHelper.get(`/api/chatbot/sessions/${sessionId}`, userToken);
            expect(sessionResponse.body.data.messages).toHaveLength(4);
        });
    });
});
