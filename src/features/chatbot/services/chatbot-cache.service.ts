/**
 * Redis-based Chatbot Cache Service
 *
 * Uses Redis for caching chatbot-related data:
 * - Document statistics (expensive aggregation queries)
 * - Document lists (admin panel)
 * - User session lists (chat history)
 *
 * Falls back to in-memory caching if Redis is unavailable.
 * Pattern based on rbac-cache.service.ts and user-cache.service.ts
 */

import { logger } from '../../../utils';
import { redisClient, isRedisReady } from '../../../utils';
import { db } from '../../../database';
import { chatbotDocuments, chatbotSessions } from '../shared/chatbot.schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { ChatbotDocument, ChatbotSession } from '../shared/chatbot.schema';

// Redis key prefixes
const STATS_KEY = 'chatbot:stats';
const DOCS_PREFIX = 'chatbot:docs:';
const SESSIONS_PREFIX = 'chatbot:sessions:';

// Cache TTL in seconds
const STATS_TTL = 2 * 60; // 2 minutes (stats can change with processing)
const DOCS_TTL = 1 * 60; // 1 minute (admin sees near real-time)
const SESSIONS_TTL = 1 * 60; // 1 minute (active chat sessions)

interface DocumentStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalChunks: number;
}

interface CachedStats {
  data: DocumentStats;
  expiresAt: number;
}

interface CachedDocs {
  documents: ChatbotDocument[];
  total: number;
  expiresAt: number;
}

interface CachedSessions {
  sessions: ChatbotSession[];
  total: number;
  expiresAt: number;
}

class ChatbotCacheService {
  // Fallback in-memory caches
  private statsCache: CachedStats | null = null;
  private docsCache: Map<string, CachedDocs> = new Map();
  private sessionsCache: Map<string, CachedSessions> = new Map();

  // ========================================================================
  // DOCUMENT STATS
  // ========================================================================

  /**
   * Get document statistics from cache or database
   */
  async getDocumentStats(): Promise<DocumentStats> {
    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(STATS_KEY);
        if (cached) {
          logger.debug('Chatbot stats cache hit');
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Redis error in getDocumentStats:', error);
      }
    }

    // Check memory cache as fallback
    if (this.statsCache && Date.now() < this.statsCache.expiresAt) {
      logger.debug('Chatbot stats memory cache hit');
      return this.statsCache.data;
    }

    // Cache miss - load from database
    logger.debug('Chatbot stats cache miss, loading from database');
    const stats = await this.fetchDocumentStats();
    await this.cacheStats(stats);
    return stats;
  }

  private async fetchDocumentStats(): Promise<DocumentStats> {
    const [result] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'pending')::int`,
        processing: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'processing')::int`,
        completed: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${chatbotDocuments.status} = 'failed')::int`,
        totalChunks: sql<number>`coalesce(sum(${chatbotDocuments.chunk_count}), 0)::int`,
      })
      .from(chatbotDocuments)
      .where(eq(chatbotDocuments.is_deleted, false));

    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      processing: result?.processing || 0,
      completed: result?.completed || 0,
      failed: result?.failed || 0,
      totalChunks: result?.totalChunks || 0,
    };
  }

  private async cacheStats(stats: DocumentStats): Promise<void> {
    // Cache in Redis
    if (isRedisReady()) {
      try {
        await redisClient.setEx(STATS_KEY, STATS_TTL, JSON.stringify(stats));
        logger.debug('Cached document stats in Redis');
      } catch (error) {
        logger.warn('Failed to cache stats in Redis:', error);
      }
    }

    // Also cache in memory
    this.statsCache = {
      data: stats,
      expiresAt: Date.now() + STATS_TTL * 1000,
    };
  }

  // ========================================================================
  // DOCUMENT LISTS
  // ========================================================================

  /**
   * Get paginated document list from cache or database
   */
  async listDocuments(
    page: number = 1,
    limit: number = 20
  ): Promise<{ documents: ChatbotDocument[]; total: number }> {
    const cacheKey = `${DOCS_PREFIX}${page}:${limit}`;

    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug(`Chatbot docs cache hit for page ${page}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Redis error in listDocuments:', error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.docsCache.get(cacheKey);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`Chatbot docs memory cache hit for page ${page}`);
      return { documents: memoryCached.documents, total: memoryCached.total };
    }

    // Cache miss - load from database
    logger.debug(`Chatbot docs cache miss for page ${page}, loading from database`);
    const result = await this.fetchDocuments(page, limit);
    await this.cacheDocuments(cacheKey, result);
    return result;
  }

  private async fetchDocuments(
    page: number,
    limit: number
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

  private async cacheDocuments(
    cacheKey: string,
    data: { documents: ChatbotDocument[]; total: number }
  ): Promise<void> {
    // Cache in Redis
    if (isRedisReady()) {
      try {
        await redisClient.setEx(cacheKey, DOCS_TTL, JSON.stringify(data));
        logger.debug('Cached document list in Redis');
      } catch (error) {
        logger.warn('Failed to cache documents in Redis:', error);
      }
    }

    // Also cache in memory
    this.docsCache.set(cacheKey, {
      ...data,
      expiresAt: Date.now() + DOCS_TTL * 1000,
    });
  }

  // ========================================================================
  // USER SESSIONS
  // ========================================================================

  /**
   * Get user's session list from cache or database
   */
  async listUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ sessions: ChatbotSession[]; total: number }> {
    const cacheKey = `${SESSIONS_PREFIX}${userId}:${page}:${limit}`;

    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug(`Sessions cache hit for user ${userId}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Redis error in listUserSessions:', error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.sessionsCache.get(cacheKey);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`Sessions memory cache hit for user ${userId}`);
      return { sessions: memoryCached.sessions, total: memoryCached.total };
    }

    // Cache miss - load from database
    logger.debug(`Sessions cache miss for user ${userId}, loading from database`);
    const result = await this.fetchUserSessions(userId, page, limit);
    await this.cacheSessions(cacheKey, result);
    return result;
  }

  private async fetchUserSessions(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ sessions: ChatbotSession[]; total: number }> {
    const offset = (page - 1) * limit;

    const [sessions, countResult] = await Promise.all([
      db
        .select()
        .from(chatbotSessions)
        .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false)))
        .orderBy(desc(chatbotSessions.updated_at))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatbotSessions)
        .where(and(eq(chatbotSessions.user_id, userId), eq(chatbotSessions.is_deleted, false))),
    ]);

    return {
      sessions,
      total: countResult[0]?.count || 0,
    };
  }

  private async cacheSessions(
    cacheKey: string,
    data: { sessions: ChatbotSession[]; total: number }
  ): Promise<void> {
    // Cache in Redis
    if (isRedisReady()) {
      try {
        await redisClient.setEx(cacheKey, SESSIONS_TTL, JSON.stringify(data));
        logger.debug('Cached session list in Redis');
      } catch (error) {
        logger.warn('Failed to cache sessions in Redis:', error);
      }
    }

    // Also cache in memory
    this.sessionsCache.set(cacheKey, {
      ...data,
      expiresAt: Date.now() + SESSIONS_TTL * 1000,
    });
  }

  // ========================================================================
  // CACHE INVALIDATION
  // ========================================================================

  /**
   * Invalidate document-related caches (stats + document lists)
   * Call after document upload, delete, or status change
   */
  async invalidateDocuments(): Promise<void> {
    // Clear from Redis
    if (isRedisReady()) {
      try {
        // Clear stats
        await redisClient.del(STATS_KEY);
        // Clear all document list caches
        const docKeys = await redisClient.keys(`${DOCS_PREFIX}*`);
        if (docKeys.length > 0) {
          await redisClient.del(docKeys);
        }
        logger.debug('Invalidated document caches in Redis');
      } catch (error) {
        logger.warn('Failed to invalidate document caches in Redis:', error);
      }
    }

    // Clear memory caches
    this.statsCache = null;
    this.docsCache.clear();
    logger.debug('Invalidated document caches');
  }

  /**
   * Invalidate session caches for a specific user
   * Call after session create, delete, or message send
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    // Clear from Redis
    if (isRedisReady()) {
      try {
        const sessionKeys = await redisClient.keys(`${SESSIONS_PREFIX}${userId}:*`);
        if (sessionKeys.length > 0) {
          await redisClient.del(sessionKeys);
        }
        logger.debug(`Invalidated session caches for user ${userId} in Redis`);
      } catch (error) {
        logger.warn(`Failed to invalidate session caches for user ${userId}:`, error);
      }
    }

    // Clear from memory cache
    for (const key of this.sessionsCache.keys()) {
      if (key.startsWith(`${SESSIONS_PREFIX}${userId}:`)) {
        this.sessionsCache.delete(key);
      }
    }
    logger.debug(`Invalidated session caches for user ${userId}`);
  }

  /**
   * Invalidate all chatbot caches
   */
  async invalidateAll(): Promise<void> {
    // Clear from Redis
    if (isRedisReady()) {
      try {
        const allKeys = [
          ...(await redisClient.keys(`${DOCS_PREFIX}*`)),
          ...(await redisClient.keys(`${SESSIONS_PREFIX}*`)),
          STATS_KEY,
        ];
        if (allKeys.length > 0) {
          await redisClient.del(allKeys);
        }
        logger.info(`Invalidated ${allKeys.length} chatbot cache entries in Redis`);
      } catch (error) {
        logger.warn('Failed to invalidate all chatbot caches in Redis:', error);
      }
    }

    // Clear memory caches
    this.statsCache = null;
    this.docsCache.clear();
    this.sessionsCache.clear();
    logger.info('Invalidated all chatbot caches');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisAvailable: boolean;
    memoryStatsCache: boolean;
    memoryDocsCacheSize: number;
    memorySessionsCacheSize: number;
  }> {
    return {
      redisAvailable: isRedisReady(),
      memoryStatsCache: this.statsCache !== null,
      memoryDocsCacheSize: this.docsCache.size,
      memorySessionsCacheSize: this.sessionsCache.size,
    };
  }
}

// Export singleton instance
export const chatbotCacheService = new ChatbotCacheService();

// Export class for testing
export { ChatbotCacheService };
