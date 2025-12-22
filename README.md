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

The API runs at `http://localhost:8000/api/v1`

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

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | User registration |
| POST | `/auth/login` | Public | User login |
| POST | `/auth/refresh-token` | Public | Refresh JWT |
| GET | `/users/:id` | Auth | Get user profile |
| PUT | `/users/:id` | Auth | Update profile |
| GET | `/users` | Admin | List all users |
| DELETE | `/users/:id` | Admin | Delete user |
| POST | `/uploads` | Auth | Upload file (PDF/DOC) |
| GET | `/uploads` | Auth | List uploads |
| GET | `/uploads/:id/download` | Auth | Download file |
| POST | `/admin/invitations` | Admin | Send user invite |
| POST | `/chatbot/documents` | Admin | Upload training document |
| POST | `/chatbot/sessions` | Auth | Create chat session |
| POST | `/chatbot/sessions/:id/messages` | Auth | Send message |
| GET | `/health` | Public | Health check |

All protected endpoints require `Authorization: Bearer <token>` header.

## User Roles

| Role | Access Level |
|------|--------------|
| `admin` | Full access, user management |
| `scientist` | Data access, file uploads |
| `researcher` | Limited data access |
| `policymaker` | Read-only access |

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run all tests |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npm run docker:dev` | Run full stack with Docker |
| `npm run build` | Build for production |

## Environment Variables

Required in `.env.dev` / `.env.prod`:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret key for JWT (min 32 characters)
- `AWS_*` — S3 credentials (access key, secret, bucket, region, endpoint)
- `EMAIL_*` — SMTP credentials for sending invitations
- `GROQ_API_KEY` — Groq LLM API key for chatbot
- `PINECONE_API_KEY` — Pinecone vector database API key

See `.env.example` for the complete list.

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
