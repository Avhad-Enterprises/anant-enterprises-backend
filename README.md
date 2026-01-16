# Anant Enterprises Backend

REST API backend for Anant Enterprises with authentication, user management, file uploads, admin workflows, and AI chatbot.

## Tech Stack

**Runtime:** Node.js 18+ · Express.js 5.x · TypeScript  
**Database:** PostgreSQL + Drizzle ORM  
**Storage:** AWS S3 (Supabase compatible)  
**Auth:** JWT + bcrypt · Role-based access control  
**AI:** Groq LLM + Pinecone Vector DB · RAG Chatbot  
**Testing:** Jest + Supertest  
**DevOps:** Docker · Winston logging

## Quick Start

1. **Install dependencies:** `npm install`
2. **Configure environment:** Copy `.env.example` → `.env.dev` and fill in database, AWS S3, and email credentials
3. **Setup database:** `npm run db:migrate && npm run db:seed`
4. **Start server:** `npm run dev`

The API runs at `http://localhost:8000/api`

## Project Structure

```
src/
├── features/       # Feature modules (auth, user, upload, admin-invite, chatbot)
├── middlewares/    # Auth, validation, security, rate limiting
├── utils/          # Shared utilities (JWT, logger, S3, email)
├── database/       # Drizzle ORM connection, migrations, seeds
└── interfaces/     # TypeScript definitions
```

Each feature is self-contained with its own APIs, schema, queries, and tests.

## API Endpoints

| Method | Endpoint                         | Access | Description              |
| ------ | -------------------------------- | ------ | ------------------------ |
| POST   | `/auth/register`                 | Public | User registration        |
| POST   | `/auth/login`                    | Public | User login               |
| POST   | `/auth/refresh-token`            | Public | Refresh JWT              |
| GET    | `/users/:id`                     | Auth   | Get user profile         |
| PUT    | `/users/:id`                     | Auth   | Update profile           |
| GET    | `/users`                         | Admin  | List all users           |
| DELETE | `/users/:id`                     | Admin  | Delete user              |
| POST   | `/uploads`                       | Auth   | Upload file (PDF/DOC)    |
| GET    | `/uploads`                       | Auth   | List uploads             |
| GET    | `/uploads/:id/download`          | Auth   | Download file            |
| POST   | `/admin/invitations`             | Admin  | Send user invite         |
| POST   | `/chatbot/documents`             | Admin  | Upload training document |
| POST   | `/chatbot/sessions`              | Auth   | Create chat session      |
| POST   | `/chatbot/sessions/:id/messages` | Auth   | Send message             |
| GET    | `/health`                        | Public | Health check             |

All protected endpoints require `Authorization: Bearer <token>` header.

## User Roles

| Role          | Access Level                 |
| ------------- | ---------------------------- |
| `admin`       | Full access, user management |
| `scientist`   | Data access, file uploads    |
| `researcher`  | Limited data access          |
| `policymaker` | Read-only access             |

## Common Commands

| Command              | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | Start development server   |
| `npm test`           | Run all tests              |
| `npm run db:migrate` | Apply database migrations  |
| `npm run db:studio`  | Open Drizzle Studio GUI    |
| `npm run docker:dev` | Run full stack with Docker |
| `npm run build`      | Build for production       |

## Environment Variables

Required environment variables for local development (`.env.dev`) and production (`.env.prod`):

### Database & Backend

- `DATABASE_URL` — PostgreSQL connection string (format: `postgresql://user:pass@host:port/db`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (recommended)
- `SUPABASE_SECRET_KEY` — Supabase secret key
- `PORT` — Server port (default: 8000)
- `REQUEST_TIMEOUT` — Request timeout in milliseconds (default: 30000)
- `NODE_ENV` — Environment (`development`, `production`, `test`)

### Redis Cache

- `REDIS_URL` — Redis connection string (format: `redis://host:port`)

### Authentication & Security

- `JWT_SECRET` — JWT signing secret (minimum 32 characters)
- `JWT_EXPIRATION` — JWT token expiration time (e.g., `1h`, `7d`)
- `ENCRYPTION_KEY` — 32-character encryption key for sensitive data

### AWS S3 Storage

- `AWS_ACCESS_KEY_ID` — S3 access key
- `AWS_SECRET_ACCESS_KEY` — S3 secret key
- `AWS_BUCKET_NAME` — S3 bucket name
- `AWS_REGION` — AWS region (e.g., `us-east-1`)
- `AWS_ENDPOINT` — S3 endpoint URL (for Supabase or MinIO)

### Email (SMTP)

- `SMTP_HOST` — Email server host
- `SMTP_PORT` — Email server port (usually 587 or 465)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password
- `SMTP_FROM` — Default "from" email address

### AI Chatbot (Optional)

- `GROQ_API_KEY` — Groq LLM API key for chat completions
- `PINECONE_API_KEY` — Pinecone vector database API key
- `PINECONE_INDEX_NAME` — Pinecone index name
- `PINECONE_NAMESPACE` — Pinecone namespace (optional)

**See `.env.example` for the complete reference.**

> **Security Note:** Never commit `.env` files to version control. They are already in `.gitignore`.

## Security Features

This API includes comprehensive security measures:

### Input Sanitization (XSS Protection)

- All user inputs are automatically sanitized using DOMPurify
- HTML tags and JavaScript code are stripped from requests
- Protects against Cross-Site Scripting (XSS) attacks
- Applied to all POST, PUT, PATCH requests

### Rate Limiting

Production rate limits (automatically disabled in development/test):

| Endpoint Type | Limit | Window | Notes |
|---------------|-------|--------|-------|
| **Auth endpoints** (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh-token`) | 5 requests | 15 minutes | Prevents brute-force attacks |
| **General API** (`/api/*`) | 100 requests | 1 minute | Standard API protection |

**Redis Backing:** In production, rate limits are distributed across instances using Redis. Development/test environments use in-memory storage.

**Important:** Redis is mandatory in production. The server will fail to start if Redis is unavailable in production mode.

### Additional Security

- Helmet.js for security headers
- CORS with configurable origins
- HPP (HTTP Parameter Pollution) protection
- JWT token authentication
- Password hashing with bcrypt
- Request logging and audit trails

## Features

### Authentication & Authorization

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Secure password hashing with bcrypt

### User Management

- User registration and profile management
- Admin invitation system with temporary passwords
- Soft delete functionality

### File Upload

- S3-compatible file storage
- Support for PDF, DOC, DOCX, images
- File metadata tracking

### AI Chatbot

- RAG (Retrieval-Augmented Generation) chatbot
- Document upload and vectorization
- Context-aware responses using Pinecone + Groq

## Documentation

- **Docker setup:** See `docker/README.md`
- **Database guide:** See `src/database/README.md`
- **AI coding guidelines:** See `.github/copilot-instructions.md`

## License

MIT

ISC
