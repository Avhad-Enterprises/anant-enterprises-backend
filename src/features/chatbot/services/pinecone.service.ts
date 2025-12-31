/**
 * Pinecone Service
 *
 * Handles connection and operations with Pinecone vector database.
 */

import { Pinecone, Index } from '@pinecone-database/pinecone';
import { logger } from '../../../utils';
import { config } from '../../../utils/validateEnv';
import { chatbotConfig } from '../config/chatbot.config';

// Lazy initialization of Pinecone client
let pineconeClient: Pinecone | null = null;
let pineconeIndexInstance: Index | null = null;
let niraNamespaceInstance: Index | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!config.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required but not configured');
    }
    pineconeClient = new Pinecone({
      apiKey: config.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

function getPineconeIndex(): Index {
  if (!pineconeIndexInstance) {
    const client = getPineconeClient();
    const indexName = config.PINECONE_INDEX_NAME;
    pineconeIndexInstance = client.index(indexName);
  }
  return pineconeIndexInstance;
}

function getNiraNamespace(): Index {
  if (!niraNamespaceInstance) {
    const index = getPineconeIndex();
    niraNamespaceInstance = index.namespace(chatbotConfig.general.namespace);
  }
  return niraNamespaceInstance;
}

// Create lazy-initialized proxy objects
export const pineconeIndex: Index = new Proxy({} as Index, {
  get(target, prop) {
    const index = getPineconeIndex();
    const value = (index as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(index);
    }
    return value;
  },
});

export const niraNamespace: Index = new Proxy({} as Index, {
  get(target, prop) {
    const namespace = getNiraNamespace();
    const value = (namespace as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(namespace);
    }
    return value;
  },
});

/**
 * Initialize and test Pinecone connection
 */
export async function initializePinecone(): Promise<boolean> {
  try {
    logger.info('🔄 Testing Pinecone connection...');

    // Test connection by getting index stats
    const stats = await pineconeIndex.describeIndexStats();

    logger.info('✅ Pinecone connection successful');
    logger.info(
      `📊 Pinecone index stats - Total records: ${stats.totalRecordCount}, Dimension: ${stats.dimension}`
    );

    return true;
  } catch (error) {
    logger.error('❌ Pinecone connection failed:', error);
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const stats = await pineconeIndex.describeIndexStats();
    return {
      totalRecords: stats.totalRecordCount,
      dimension: stats.dimension,
      namespaces: stats.namespaces,
    };
  } catch (error) {
    logger.error('Error getting Pinecone index stats:', error);
    throw error;
  }
}

/**
 * Health check for Pinecone
 */
export async function pineconeHealthCheck(): Promise<{
  healthy: boolean;
  message: string;
  stats?: object;
}> {
  try {
    const stats = await getIndexStats();
    return {
      healthy: true,
      message: 'Pinecone connection is healthy',
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Pinecone connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export default getPineconeClient;
