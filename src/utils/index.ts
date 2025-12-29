/**
 * Central Utils Index
 * 
 * Single point of export for all utility modules
 * Usage: import { logger, HttpException } from '@/utils' or '../../utils'
 */

// NOTE: audit-utils is NOT exported here to avoid circular dependency
// audit-utils imports from features/audit, which imports from utils
// Import audit-utils directly: import { ... } from './utils/audit/audit-utils'

// Auth utilities (encryption only - JWT/password moved to Supabase Auth)
export * from './auth/encryption';

// Database utilities
export * from './database/cache';
export * from './database/dbUrl';
export * from './database/redis';

// Email utilities
export * from './email/emailConfig';
export * from './email/sendInvitationEmail';

// Helper utilities
export { HttpException } from './helpers/httpException';
export * from './helpers/responseFormatter';
export * from './helpers/uuid';

// Logging utilities
export * from './logging/logger';

// Top-level utilities
export * from './gracefulShutdown';
export * from './loadEnv';
export * from './supabaseStorage';
export * from './supabase';
export * from './validateEnv';
