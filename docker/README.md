# Docker Setup for Express Backend Template

## Quick Start

```bash
# Development (with hot reload)
npm run docker:dev

# Production
npm run docker:prod
```

## Tests

Tests run on the **host machine** (not in Docker) using the same local Supabase instance as development. See [TESTING.md](../TESTING.md) for detailed testing guide.

```bash
# Ensure Supabase is running
supabase start

# Run tests
npm test
```

## Database Migrations

### Development Environment
Migrations are run **manually** from host machine:

```bash
# Start dev environment first
npm run docker:dev

# Then run migrations (in another terminal)
npm run db:migrate:dev

# Or use Drizzle Studio to inspect DB
npm run db:studio:dev
```

### Test Environment
Migrations run **automatically** before tests via Jest setup (`tests/utils/setup.ts`):

```bash
# Migrations happen automatically when you run tests
npm test
```

### Production Environment
Migrations are run **manually** before deployment:

```bash
# Run migrations against production DB
npm run db:migrate:prod

# Or push schema directly (use with caution!)
npm run db:push:prod
```

### Migration Commands Reference

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate:dev` | Apply migrations to dev database |
| `npm run db:migrate:test` | Apply migrations to test database |
| `npm run db:migrate:prod` | Apply migrations to production database |
| `npm run db:push:dev` | Push schema to dev (no migration file) |
| `npm run db:studio:dev` | Open Drizzle Studio for dev DB |
| `npm run db:studio:test` | Open Drizzle Studio for test DB |

## Environments

### Development (`docker/compose.dev.yaml`)
- **Backend**: Hot reload enabled, source mounted
- **Redis**: Local container on port 6379
- **Supabase**: Running on host machine (ports 54321, 54322)
- **Migrations**: Manual (`npm run db:migrate:dev`)
- **Use case**: Local development with Docker backend + host Supabase

### Production (`docker/compose.prod.yaml`)
- **Backend only**: Optimized production build
- **No PostgreSQL/Redis**: Uses external managed services
- **Migrations**: Manual before deployment
- **Use case**: Production deployment

## Commands

```bash
# Start services
docker compose -f docker/compose.dev.yaml up -d
docker compose -f docker/compose.prod.yaml up -d

# Stop services
docker compose -f docker/compose.dev.yaml down
docker compose -f docker/compose.test.yaml down
docker compose -f docker/compose.prod.yaml down

# View logs
docker compose -f docker/compose.dev.yaml logs -f api

# Rebuild after code changes
docker compose -f docker/compose.dev.yaml up --build

# Clean up volumes (removes data!)
docker compose -f docker/compose.dev.yaml down -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Development                             │
├─────────────────────────────────────────────────────────────┤
│  Host Machine:                                              │
│  ┌──────────────┐                                           │
│  │  Supabase    │  Ports: 54321 (API), 54322 (DB)          │
│  │  Local       │                                           │
│  └──────────────┘                                           │
│         ▲                                                    │
│         │ (host.docker.internal)                           │
│  Docker Network:                                            │
│  ┌─────────────────────────────────────────────────┐       │
│  │  ┌─────────┐                    ┌─────────┐     │       │
│  │  │   API   │◀──────────────────▶│  Redis  │     │       │
│  │  │ :8001   │                    │  :6379  │     │       │
│  │  └─────────┘                    └─────────┘     │       │
│  │           anant-enterprises-dev network         │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         Tests                                │
├─────────────────────────────────────────────────────────────┤
│  Host Machine:                                              │
│  ┌──────────────┐                    ┌─────────┐           │
│  │  Supabase    │  (Ports: 54321/2)  │  Tests  │           │
│  │  Local       │◀───────────────────│  (Jest) │           │
│  └──────────────┘                    └─────────┘           │
│  Same Supabase instance as Development                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Production                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐     ┌─────────────┐     ┌─────────┐           │
│  │   API   │────▶│  Supabase   │     │  Redis  │           │
│  │ :8000   │     │  (External) │     │ (Cloud) │           │
│  └─────────┘     └─────────────┘     └─────────┘           │
│    Docker            External Services                      │
└─────────────────────────────────────────────────────────────┘
```

## Image Size Optimization

The Dockerfile uses multi-stage builds:
1. **base**: Alpine Node.js with curl
2. **deps**: All dependencies for building
3. **prod-deps**: Production dependencies only
4. **build**: TypeScript compilation
5. **production**: Minimal runtime (~523MB)

## Ports

| Environment | API   | Supabase (Host) | Redis       |
|-------------|-------|-----------------|-------------|
| Development | 8001  | 54321/54322     | 6379 (Docker)|
| Tests       | N/A   | 54321/54322     | N/A         |
| Production  | 8000  | External        | External    |

> **Note**: Development and tests share the same local Supabase instance running on the host machine.
