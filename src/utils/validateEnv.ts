import dotenv from 'dotenv';

// Load environment-specific .env file FIRST based on NODE_ENV
// This ensures correct values before any other imports
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'development') {
  dotenv.config({ path: '.env.dev' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.prod' });
} else if (nodeEnv === 'test') {
  dotenv.config({ path: '.env.dev' }); // Use same env as development
}
// Fallback to default .env only for missing values
dotenv.config();

import { cleanEnv, port, str, num } from 'envalid';

/**
 * Validate all required environment variables for the application
 * Throws an error if any required variable is missing or invalid
 */
export const validateEnv = () => {
  try {
    const env = cleanEnv(process.env, {
      // Environment
      NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),

      // Server configuration
      JWT_SECRET: str(),
      PORT: port({ default: 8000 }),

      // Database configuration - using DATABASE_URL for connection
      DATABASE_URL: str({ default: '' }), // Make optional to debug

      // Redis configuration (optional)
      REDIS_HOST: str({ default: 'localhost' }),
      REDIS_PORT: num({ default: 6379 }),
      REDIS_PASSWORD: str({ default: '' }),
      REDIS_URL: str({ default: '' }),

      // Queue configuration
      QUEUE_WORKERS_ENABLED: str({ default: 'true' }),
      QUEUE_CONCURRENCY: num({ default: 5 }),

      // Supabase configuration
      SUPABASE_URL: str({ default: '' }),
      SUPABASE_ANON_KEY: str({ default: '', desc: 'Legacy: Supabase anonymous key (JWT-based)' }),
      SUPABASE_SERVICE_ROLE_KEY: str({
        default: '',
        desc: 'Legacy: Supabase service role key (JWT-based)',
      }),
      SUPABASE_PUBLISHABLE_KEY: str({ default: '', desc: 'New: Supabase publishable key' }),
      SUPABASE_SECRET_KEY: str({ default: '', desc: 'New: Supabase secret key' }),

      // Email configuration
      EMAIL_SERVICE: str({ default: '' }),
      EMAIL_USER: str({ default: '' }),
      EMAIL_PASSWORD: str({ default: '' }),
      EMAIL_FROM: str({ default: '' }),
      APP_NAME: str({ default: 'Anant Enterprises' }),

      // Security configuration
      ALLOWED_ORIGINS: str({ default: '*' }),
      FRONTEND_URL: str({ default: '', desc: 'Frontend URL for invitation links' }),

      // File upload configuration
      ALLOWED_FILE_TYPES: str({
        default:
          'application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
      }),

      // Chatbot - Groq LLM
      GROQ_API_KEY: str({ default: '', desc: 'Groq API key for LLM' }),

      // Chatbot - Pinecone Vector DB
      PINECONE_API_KEY: str({ default: '', desc: 'Pinecone API key for vector storage' }),
      PINECONE_INDEX_NAME: str({ default: 'nira', desc: 'Pinecone index name' }),

      // Chatbot - HuggingFace Embeddings
      HUGGINGFACE_TOKEN: str({ default: '', desc: 'HuggingFace token for BGE-M3 embeddings' }),

      // Razorpay Payment Gateway
      RAZORPAY_KEY_ID: str({ default: '', desc: 'Razorpay API Key ID (rzp_test_xxx or rzp_live_xxx)' }),
      RAZORPAY_KEY_SECRET: str({ default: '', desc: 'Razorpay API Key Secret' }),
      RAZORPAY_WEBHOOK_SECRET: str({ default: '', desc: 'Razorpay Webhook Secret for signature verification' }),
    }, {
      reporter: ({ errors }) => {
        if (Object.keys(errors).length > 0) {
          throw new Error("Environment validation failed");
        }
      }
    });

    // Additional JWT secret validation
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      // throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }

    // Use console.log to avoid circular dependency with logger
    console.log('info: ✅ Environment variables validated.');
    return env;
  } catch (error) {
    process.exit(1);
  }
};

/**
 * Singleton validated environment configuration
 * Import and use this instead of process.env for type safety and validation
 *
 * @example
 * import { config } from '@utils/validateEnv';
 * const port = config.PORT;
 * const isDev = config.isDevelopment;
 */
export const config = validateEnv();

/**
 * Environment helper utilities
 */
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
