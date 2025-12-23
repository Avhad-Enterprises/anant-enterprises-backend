/**
 * Documents API Integration Tests
 *
 * Tests for document management endpoints:
 * - POST /api/chatbot/documents - Upload document
 * - GET /api/chatbot/documents - List documents
 * - GET /api/chatbot/documents/stats - Get document stats
 * - DELETE /api/chatbot/documents/:id - Delete document
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import ChatbotRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { chatbotDocuments } from '../../shared/schema';
import { chatbotCacheService } from '../../services/chatbot-cache.service';

describe('Documents API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let userToken: string;
  let adminUserId: number;

  beforeAll(async () => {
    const chatbotRoute = new ChatbotRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, chatbotRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Invalidate cache first to avoid stale data
    await chatbotCacheService.invalidateAll();

    // Clean up RBAC tables first (in correct order due to FK constraints)
    await db.execute(sql`TRUNCATE TABLE user_roles CASCADE`);
    await db.execute(sql`TRUNCATE TABLE role_permissions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE permissions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE roles CASCADE`);

    // Clean up chatbot tables
    await db.execute(sql`TRUNCATE TABLE chatbot_messages CASCADE`);
    await db.execute(sql`TRUNCATE TABLE chatbot_sessions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE chatbot_documents CASCADE`);

    // Clean up users
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Reset chatbot sequences
    await db.execute(sql`ALTER SEQUENCE chatbot_documents_id_seq RESTART WITH 1`);

    // Create admin user with full permissions
    const { token: aToken, userId: aId } = await AuthTestHelper.createTestAdminUser();
    adminToken = aToken;
    adminUserId = aId;

    // Create regular user (uses 'user' role which exists in RBAC)
    const uniqueUserEmail = `user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const { token: uToken } = await AuthTestHelper.createTestUser({
      email: uniqueUserEmail,
      password: 'UserPass123!',
      name: 'Regular User',
      role: 'user', // Use 'user' role instead of 'researcher'
    });
    userToken = uToken;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('GET /api/chatbot/documents', () => {
    it('should list documents for admin', async () => {
      // Create test documents directly in DB using actual user IDs
      await db.insert(chatbotDocuments).values({
        name: 'Test Doc 1',
        file_url: 'https://example.com/doc1.pdf',
        file_path: 'docs/doc1.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        status: 'completed',
        chunk_count: 10,
        created_by: adminUserId,
        updated_by: adminUserId,
      });

      await db.insert(chatbotDocuments).values({
        name: 'Test Doc 2',
        file_url: 'https://example.com/doc2.pdf',
        file_path: 'docs/doc2.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        status: 'pending',
        created_by: adminUserId,
        updated_by: adminUserId,
      });

      const response = await apiHelper.get('/api/chatbot/documents', adminToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.total).toBe(2);
    });

    it('should paginate documents correctly', async () => {
      // Create 5 documents
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
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(2);
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
      // Create documents with various statuses
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
      expect(response.body.data.pending).toBe(0);
      expect(response.body.data.completed).toBe(0);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.totalChunks).toBe(0);
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

      // Verify document is soft deleted
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

    it('should reject invalid document ID', async () => {
      const response = await apiHelper.delete('/api/chatbot/documents/invalid', adminToken);

      // Invalid ID causes Zod parse error - returns 400
      expect(response.status).toBe(400);
    });
  });

  // Note: POST /api/chatbot/documents (upload) tests require file upload
  // The route uses multipart/form-data, not JSON. Testing without file returns different status.
  describe('POST /api/chatbot/documents', () => {
    it('should reject requests without file (multipart expected)', async () => {
      // This endpoint expects multipart/form-data with a file
      // Sending JSON without file results in 400 (no file)
      const response = await apiHelper.post('/api/chatbot/documents', {}, adminToken);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await apiHelper.post('/api/chatbot/documents', {});

      expect(response.status).toBe(401);
    });
  });
});
