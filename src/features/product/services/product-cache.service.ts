/**
 * Redis-based Product Cache Service
 *
 * Uses Redis for caching product lookups by ID, SKU, and slug.
 * Falls back to in-memory caching if Redis is unavailable.
 *
 * Pattern based on user-cache.service.ts
 */

import { logger } from '../../../utils';
import { redisClient, isRedisReady } from '../../../utils';
import { findProductById, findProductBySku, findProductBySlug } from '../shared/queries';
import type { Product } from '../shared/product.schema';

// Redis key prefixes
const PRODUCT_BY_ID_PREFIX = 'product:id:';
const PRODUCT_BY_SKU_PREFIX = 'product:sku:';
const PRODUCT_BY_SLUG_PREFIX = 'product:slug:';

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 5 * 60;

interface CachedProduct {
  product: Product;
  expiresAt: number;
}

class ProductCacheService {
  // Fallback in-memory cache when Redis is unavailable
  private memoryCache: Map<string, CachedProduct> = new Map();
  private readonly TTL = CACHE_TTL * 1000; // milliseconds for memory cache

  /**
   * Get product by ID from cache or database
   */
  async getProductById(id: string): Promise<Product | undefined> {
    const cacheKey = `${PRODUCT_BY_ID_PREFIX}${id}`;

    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug(`Product cache hit for ID ${id}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Redis error in getProductById for ID ${id}:`, error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`Product memory cache hit for ID ${id}`);
      return memoryCached.product;
    }

    // Cache miss - load from database
    logger.debug(`Product cache miss for ID ${id}, loading from database`);
    const product = await findProductById(id);

    if (product) {
      await this.cacheProduct(product);
    }

    return product;
  }

  /**
   * Get product by SKU from cache or database
   */
  async getProductBySku(sku: string): Promise<Product | undefined> {
    const normalizedSku = sku.toUpperCase();
    const cacheKey = `${PRODUCT_BY_SKU_PREFIX}${normalizedSku}`;

    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug(`Product cache hit for SKU ${normalizedSku}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Redis error in getProductBySku for ${normalizedSku}:`, error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`Product memory cache hit for SKU ${normalizedSku}`);
      return memoryCached.product;
    }

    // Cache miss - load from database
    logger.debug(`Product cache miss for SKU ${normalizedSku}, loading from database`);
    const product = await findProductBySku(normalizedSku);

    if (product) {
      await this.cacheProduct(product);
    }

    return product;
  }

  /**
   * Get product by slug from cache or database
   */
  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const cacheKey = `${PRODUCT_BY_SLUG_PREFIX}${slug}`;

    // Try Redis first
    if (isRedisReady()) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          logger.debug(`Product cache hit for slug ${slug}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Redis error in getProductBySlug for ${slug}:`, error);
      }
    }

    // Check memory cache as fallback
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached && Date.now() < memoryCached.expiresAt) {
      logger.debug(`Product memory cache hit for slug ${slug}`);
      return memoryCached.product;
    }

    // Cache miss - load from database
    logger.debug(`Product cache miss for slug ${slug}, loading from database`);
    const product = await findProductBySlug(slug);

    if (product) {
      await this.cacheProduct(product);
    }

    return product;
  }

  /**
   * Cache a product object (by ID, SKU, and slug)
   */
  async cacheProduct(product: Product): Promise<void> {
    const idKey = `${PRODUCT_BY_ID_PREFIX}${product.id}`;
    const skuKey = `${PRODUCT_BY_SKU_PREFIX}${product.sku.toUpperCase()}`;
    const slugKey = `${PRODUCT_BY_SLUG_PREFIX}${product.slug}`;
    const serialized = JSON.stringify(product);

    // Cache in Redis
    if (isRedisReady()) {
      try {
        await Promise.all([
          redisClient.setEx(idKey, CACHE_TTL, serialized),
          redisClient.setEx(skuKey, CACHE_TTL, serialized),
          redisClient.setEx(slugKey, CACHE_TTL, serialized),
        ]);
        logger.debug(`Cached product ${product.id} in Redis`);
      } catch (error) {
        logger.warn(`Failed to cache product ${product.id} in Redis:`, error);
      }
    }

    // Also cache in memory as fallback
    const expiresAt = Date.now() + this.TTL;
    this.memoryCache.set(idKey, { product, expiresAt });
    this.memoryCache.set(skuKey, { product, expiresAt });
    this.memoryCache.set(slugKey, { product, expiresAt });
  }

  /**
   * Invalidate cache for a specific product
   */
  async invalidateProduct(id: string, sku?: string, slug?: string): Promise<void> {
    const idKey = `${PRODUCT_BY_ID_PREFIX}${id}`;

    // Clear from Redis
    if (isRedisReady()) {
      try {
        const keysToDelete = [idKey];
        if (sku) {
          keysToDelete.push(`${PRODUCT_BY_SKU_PREFIX}${sku.toUpperCase()}`);
        }
        if (slug) {
          keysToDelete.push(`${PRODUCT_BY_SLUG_PREFIX}${slug}`);
        }
        await redisClient.del(keysToDelete);
        logger.debug(`Invalidated Redis cache for product ${id}`);
      } catch (error) {
        logger.warn(`Failed to invalidate Redis cache for product ${id}:`, error);
      }
    }

    // Clear from memory cache
    this.memoryCache.delete(idKey);
    if (sku) {
      this.memoryCache.delete(`${PRODUCT_BY_SKU_PREFIX}${sku.toUpperCase()}`);
    }
    if (slug) {
      this.memoryCache.delete(`${PRODUCT_BY_SLUG_PREFIX}${slug}`);
    }
    logger.debug(`Invalidated cache for product ${id}`);
  }

  /**
   * Invalidate all product caches
   */
  async invalidateAll(): Promise<void> {
    // Clear from Redis using pattern matching
    if (isRedisReady()) {
      try {
        const idKeys = await redisClient.keys(`${PRODUCT_BY_ID_PREFIX}*`);
        const skuKeys = await redisClient.keys(`${PRODUCT_BY_SKU_PREFIX}*`);
        const slugKeys = await redisClient.keys(`${PRODUCT_BY_SLUG_PREFIX}*`);
        const allKeys = [...idKeys, ...skuKeys, ...slugKeys];

        if (allKeys.length > 0) {
          await redisClient.del(allKeys);
        }
        logger.info(`Invalidated ${allKeys.length} product cache entries in Redis`);
      } catch (error) {
        logger.warn('Failed to invalidate all product caches in Redis:', error);
      }
    }

    // Clear memory cache
    this.memoryCache.clear();
    logger.info('Invalidated all product caches');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisAvailable: boolean;
    memoryCacheSize: number;
    redisCacheSize?: number;
  }> {
    const stats = {
      redisAvailable: isRedisReady(),
      memoryCacheSize: this.memoryCache.size,
      redisCacheSize: undefined as number | undefined,
    };

    if (isRedisReady()) {
      try {
        const idKeys = await redisClient.keys(`${PRODUCT_BY_ID_PREFIX}*`);
        stats.redisCacheSize = idKeys.length;
      } catch (error) {
        logger.warn('Failed to get Redis cache stats:', error);
      }
    }

    return stats;
  }
}

// Export singleton instance
export const productCacheService = new ProductCacheService();

// Export class for testing
export { ProductCacheService };
