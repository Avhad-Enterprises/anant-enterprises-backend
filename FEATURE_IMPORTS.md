# Feature Import Restructuring Guide

## Overview

This document outlines the import restructuring implemented across all features in the Anant Enterprises backend. All features now follow a consistent pattern where each feature exports everything from a single root `index.ts` file, eliminating subfolder index files and simplifying imports.

## Restructuring Pattern

### Before (Old Structure)
```typescript
// Importing from subfolder index files
import { userService } from '../features/user/services';
import { User } from '../features/user/shared/schema';
import { createUser } from '../features/user/shared/queries';

// Importing individual API routes
import userRoutes from '../features/user/apis/get-users';
```

### After (New Structure)
```typescript
// Single import from feature root
import { userService, User, createUser, getAllUsersRouter } from '../features/user';
```

## Feature Index Structure

Each feature now has a consolidated `index.ts` that exports:

1. **Main Route Class** (default export) - The Express route handler
2. **Individual API Routes** - Named exports for each API endpoint
3. **Services** - Business logic classes and instances
4. **Schema** - Database tables and types
5. **Interfaces/Types** - TypeScript type definitions
6. **Queries** - Database query functions

## Feature Exports Reference

### Auth Feature (`src/features/auth/index.ts`)

```typescript
// Main route
import AuthRoute from '../features/auth';

// Individual API routes
import { registerRouter, loginRouter, refreshTokenRouter, logoutRouter } from '../features/auth';
```

### User Feature (`src/features/user/index.ts`)

```typescript
// Main route
import UserRoute from '../features/user';

// Individual API routes
import { getAllUsersRouter, getUserByIdRouter, updateUserRouter, deleteUserRouter } from '../features/user';

// Services
import { userCacheService, UserCacheService } from '../features/user';

// Schema & Types
import { users, type User, type NewUser } from '../features/user';

// Interfaces
import type { IUser, IUserCreate, IUserUpdate } from '../features/user';

// Queries
import { findAllUsers, findUserById, createUser, updateUser, deleteUser } from '../features/user';
```

### Upload Feature (`src/features/upload/index.ts`)

```typescript
// Main route
import UploadRoute from '../features/upload';

// Individual API routes
import { uploadFileRouter, getUploadsRouter, downloadFileRouter, deleteFileRouter } from '../features/upload';

// Services
import { uploadService, UploadService } from '../features/upload';

// Schema & Types
import { uploads, type Upload, type NewUpload } from '../features/upload';

// Interfaces
import type { IUpload, IUploadCreate } from '../features/upload';

// Queries
import { findAllUploads, findUploadById, createUpload, updateUpload, deleteUpload } from '../features/upload';
```

### RBAC Feature (`src/features/rbac/index.ts`)

```typescript
// Main route
import RBACRoute from '../features/rbac';

// Individual API routes
import { getRolesRouter, createRoleRouter, updateRoleRouter, deleteRoleRouter } from '../features/rbac';
import { getPermissionsRouter, createPermissionRouter, assignPermissionsRouter } from '../features/rbac';

// Services
import { rbacService, RBACService } from '../features/rbac';

// Schema & Types
import { roles, permissions, userRoles, rolePermissions } from '../features/rbac';
import type { Role, NewRole, Permission, NewPermission } from '../features/rbac';

// Interfaces
import type { IRole, IRoleCreate, IPermission, IPermissionCreate } from '../features/rbac';

// Queries
import { findAllRoles, findRoleById, createRole, updateRole, deleteRole } from '../features/rbac';
import { findAllPermissions, findPermissionById, createPermission } from '../features/rbac';
import { assignRoleToUser, removeRoleFromUser, getUserRoles } from '../features/rbac';

// Seed data
import { seedRoles, seedPermissions, seedRolePermissions } from '../features/rbac';
```

### Chatbot Feature (`src/features/chatbot/index.ts`)

```typescript
// Main route
import ChatbotRoute from '../features/chatbot';

// Individual API routes
import { uploadDocumentRouter, listDocumentsRouter, deleteDocumentRouter } from '../features/chatbot';
import { sendMessageRouter, listSessionsRouter, getSessionRouter, deleteSessionRouter } from '../features/chatbot';

// Config
import { chatbotConfig, general, chunking, embedding, search, llm, chat, rateLimit, systemPrompt } from '../features/chatbot';

// Services
import { generateChatResponse, generateSessionTitle, getAvailableModels } from '../features/chatbot';
import { chatbotCacheService, ChatbotCacheService } from '../features/chatbot';
import { chunkText, chunkTextFixed, estimateChunkCount } from '../features/chatbot';
import { extractTextFromDocument, extractTextFromBuffer } from '../features/chatbot';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, isValidFileType, isValidFileSize, getExtensionFromMimeType, validateDocument } from '../features/chatbot';
import { embedText, embedTexts, getModelInfo } from '../features/chatbot';
import { pineconeIndex, niraNamespace, initializePinecone, getIndexStats, pineconeHealthCheck } from '../features/chatbot';
import { searchDocuments, buildContextFromResults, extractSourceReferences, hasDocuments, searchWithFilters } from '../features/chatbot';
import { upsertDocumentVectors, deleteDocumentVectors, fetchVectors, getVectorStats, parseVectorId } from '../features/chatbot';

// Schema & Types
import { chatbotDocuments, chatbotSessions, chatbotMessages } from '../features/chatbot';
import { documentStatuses, messageRoles } from '../features/chatbot';
import type { DocumentStatus, MessageRole, ChatbotDocument, NewChatbotDocument } from '../features/chatbot';
import type { ChatbotSession, NewChatbotSession, ChatbotMessage, NewChatbotMessage } from '../features/chatbot';

// Interfaces
import type { MessageSource, IDocument, IDocumentCreate, IDocumentUpdate } from '../features/chatbot';
import type { ISession, ISessionCreate, ISessionWithSummary, IMessage, IMessageCreate } from '../features/chatbot';
import type { IChatRequest, IChatResponse, IVectorRecord, IVectorMetadata } from '../features/chatbot';
import type { ISearchResult, IChunk, IChunkingResult, ITrainingResult } from '../features/chatbot';
import type { IDocumentListResponse, ISessionListResponse, IChatHistoryResponse } from '../features/chatbot';

// Queries
import { createDocument, getDocumentById, listDocuments, updateDocumentStatus } from '../features/chatbot';
import { updateDocumentProcessingResult, deleteDocument, getDocumentStats } from '../features/chatbot';
import { createSession, getSessionByIdForUser, listUserSessions, updateSessionTimestamp } from '../features/chatbot';
import { updateSessionTitle, deleteSession, createMessage, getSessionMessages, getRecentMessages } from '../features/chatbot';
```

### Audit Feature (`src/features/audit/index.ts`)

```typescript
// Main route
import AuditRoute from '../features/audit';

// Individual API routes
import { getAuditLogsRouter, getResourceHistoryRouter, getUserActivityRouter } from '../features/audit';

// Services
import { auditService, AuditService } from '../features/audit';

// Schema & Types
import { auditLogs, type AuditLog, type NewAuditLog } from '../features/audit';

// Types
import { AuditAction, AuditResourceType, type AuditLogData, type AuditLogFilters } from '../features/audit';
import type { SanitizedAuditData, AuditContext } from '../features/audit';

// Queries
import { createAuditLog, queryAuditLogs, getResourceAuditTrail, getUserActivityHistory } from '../features/audit';
```

### Admin Invite Feature (`src/features/admin-invite/index.ts`)

```typescript
// Main route
import AdminInviteRoute from '../features/admin-invite';

// Individual API routes
import { createInvitationRouter, getInvitationsRouter, verifyInvitationRouter, acceptInvitationRouter } from '../features/admin-invite';

// Schema & Types
import { invitations, invitationStatuses, type InvitationStatus, type Invitation, type NewInvitation } from '../features/admin-invite';

// Interfaces
import type { IInvitation, ICreateInvitation, IInvitationVerifyResponse } from '../features/admin-invite';

// Queries
import { findInvitationById, findInvitationByEmail, findInvitationByToken } from '../features/admin-invite';
import { getInvitations, createInvitation, updateInvitation } from '../features/admin-invite';
```

## Migration Guide

### Step 1: Update Feature Imports

Replace subfolder imports with root imports:

```typescript
// ❌ Old way
import { userService } from '../features/user/services';
import { User } from '../features/user/shared/schema';
import { createUser } from '../features/user/shared/queries';

// ✅ New way
import { userService, User, createUser } from '../features/user';
```

### Step 2: Update Database Schema Imports

```typescript
// ❌ Old way
import { users } from '../features/user/shared/schema';
import { invitations } from '../features/admin-invite/shared/schema';

// ✅ New way
import { users } from '../features/user';
import { invitations } from '../features/admin-invite';
```

### Step 3: Update Middleware Imports

```typescript
// ❌ Old way
import { auditService } from '../features/audit/services';

// ✅ New way
import { auditService } from '../features/audit';
```

### Step 4: Update Utility Imports

```typescript
// ❌ Old way
import { AuditAction, AuditResourceType } from '../../features/audit/shared/types';

// ✅ New way
import { AuditAction, AuditResourceType } from '../../features/audit';
```

## Benefits of This Structure

1. **Simplified Imports** - Single import path per feature
2. **Better Tree Shaking** - Only import what you need
3. **Consistent API** - All features follow the same pattern
4. **Easier Refactoring** - Internal structure changes don't affect imports
5. **Cleaner Code** - No subfolder index files to maintain

## Verification

After updating imports, run:

```bash
npm run build    # Ensure TypeScript compilation passes
npm test         # Run tests to verify functionality
```

## Examples

### Complete Feature Import Example

```typescript
// Import everything you need from a feature in one place
import UserRoute, {
  // API routes
  getAllUsersRouter,
  getUserByIdRouter,

  // Services
  userCacheService,

  // Schema & Types
  users,
  type User,
  type NewUser,

  // Interfaces
  type IUser,

  // Queries
  findAllUsers,
  createUser
} from '../features/user';
```

### Database Schema Import Example

```typescript
// In database/drizzle.ts
import { users } from '../features/user';
import { uploads } from '../features/upload';
import { invitations } from '../features/admin-invite';
import { chatbotDocuments, chatbotSessions, chatbotMessages } from '../features/chatbot';
import { auditLogs } from '../features/audit';
```

This restructuring provides a clean, maintainable import system that scales well as the codebase grows.</content>
<parameter name="filePath">/Users/harshalpatil/Documents/Avhad Enterprises/Anant-Enterprises/anant-enterprises-backend/FEATURE_IMPORTS.md