# Comprehensive Audit Logging System - Implementation Plan

## Overview

This document outlines the implementation plan for a comprehensive audit logging system that will track all critical operations in the ecommerce backend for compliance, fraud detection, and business analytics.

## 🏗️ Architecture Design

### Core Components

1. **Audit Log Table** - Central storage for all audit events
2. **Audit Service** - Business logic for logging operations
3. **Audit Middleware** - Automatic capture of database changes
4. **Audit API** - Query endpoints for audit data
5. **Audit Types** - TypeScript interfaces and enums

## 📊 Database Schema

### Audit Logs Table

```sql
-- Comprehensive audit logging table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Who performed the action
  user_id INTEGER REFERENCES users(id),
  user_email VARCHAR(255), -- Store email for historical reference
  user_role VARCHAR(100), -- Store role for context

  -- What action was performed
  action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'user', 'product', 'order', 'inventory', etc.
  resource_id INTEGER, -- ID of the affected resource

  -- Before/After state (JSON for flexibility)
  old_values JSONB, -- Previous state of the resource
  new_values JSONB, -- New state of the resource

  -- Context information
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),

  -- Additional metadata
  metadata JSONB, -- Extra context (order total, product price change, etc.)
  reason TEXT, -- Optional reason for the change

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Audit Event Types

```typescript
export enum AuditAction {
  // Authentication & Authorization
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',

  // User Management
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ROLE_ASSIGN = 'USER_ROLE_ASSIGN',

  // Product Management
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  PRODUCT_PRICE_CHANGE = 'PRODUCT_PRICE_CHANGE',

  // Inventory Management
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  INVENTORY_RESERVE = 'INVENTORY_RESERVE',
  INVENTORY_RELEASE = 'INVENTORY_RELEASE',

  // Order Management
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  ORDER_REFUND = 'ORDER_REFUND',

  // Payment
  PAYMENT_PROCESS = 'PAYMENT_PROCESS',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Admin Actions
  ADMIN_INVITE = 'ADMIN_INVITE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG'
}

export enum AuditResourceType {
  USER = 'USER',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  INVENTORY = 'INVENTORY',
  PAYMENT = 'PAYMENT',
  PERMISSION = 'PERMISSION',
  SETTINGS = 'SETTINGS',
  INVITATION = 'INVITATION'
}
```

## 🔧 Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Create Database Schema & Migrations

**Files to create:**
- `src/features/audit/shared/schema.ts` - Audit log table schema
- `src/database/migrations/0004_create_audit_logs.sql` - Migration file

#### 1.2 Create Audit Service

**Files to create:**
- `src/features/audit/shared/types.ts` - TypeScript interfaces
- `src/features/audit/services/audit.service.ts` - Core audit logging service
- `src/features/audit/services/audit.service.test.ts` - Unit tests

**Audit Service Implementation:**
```typescript
interface AuditLogData {
  userId?: number;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async log(data: AuditLogData): Promise<void> {
    // Implementation with user context enrichment
  }

  async getAuditTrail(resourceType: AuditResourceType, resourceId: number): Promise<AuditLog[]> {
    // Get audit history for a specific resource
  }

  async getUserActivity(userId: number, limit?: number): Promise<AuditLog[]> {
    // Get all actions performed by a user
  }
}
```

### Phase 2: Middleware & Hooks (Week 2)

#### 2.1 Database Change Tracking Middleware

**Files to create:**
- `src/middlewares/audit.middleware.ts` - Express middleware for request auditing
- `src/utils/audit-hooks.ts` - Database operation hooks

**Implementation:**
```typescript
// Middleware to capture all API requests
export const auditMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture request details
  const auditData = {
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    body: sanitizeAuditData(req.body)
  };

  // Log after response
  res.on('finish', async () => {
    await auditService.log({
      ...auditData,
      action: getAuditActionFromRequest(req),
      resourceType: getResourceTypeFromPath(req.path),
      metadata: { duration: Date.now() - startTime, statusCode: res.statusCode }
    });
  });

  next();
};
```

#### 2.2 Database Operation Hooks

**Files to create:**
- `src/database/audit-hooks.ts` - Drizzle hooks for automatic change tracking

**Implementation:**
```typescript
// Hook into Drizzle operations to automatically log changes
export const auditHooks = {
  beforeUpdate: async (table: string, oldData: any, newData: any, userId?: number) => {
    await auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resourceType: table as AuditResourceType,
      resourceId: oldData.id,
      oldValues: oldData,
      newValues: newData
    });
  },

  beforeDelete: async (table: string, data: any, userId?: number) => {
    await auditService.log({
      userId,
      action: AuditAction.DELETE,
      resourceType: table as AuditResourceType,
      resourceId: data.id,
      oldValues: data
    });
  }
};
```

### Phase 3: API Endpoints (Week 3)

#### 3.1 Audit Query API

**Files to create:**
- `src/features/audit/apis/get-audit-logs.ts` - Get audit logs with filtering
- `src/features/audit/apis/get-resource-audit.ts` - Get audit trail for specific resource
- `src/features/audit/apis/get-user-activity.ts` - Get user activity history

**API Endpoints:**
```
GET /api/admin/audit/logs - List audit logs with filters
GET /api/admin/audit/resource/:type/:id - Audit trail for specific resource
GET /api/admin/audit/user/:id/activity - User activity history
GET /api/admin/audit/stats - Audit statistics and summaries
```

#### 3.2 Integration with Existing Features

**Update existing files:**
- Add audit logging to all critical operations in:
  - `src/features/user/apis/` - User creation, updates, role changes
  - `src/features/admin-invite/apis/` - Invitation creation, acceptance
  - `src/features/auth/apis/` - Login, password changes
  - Future: Product, inventory, order operations

### Phase 4: Advanced Features (Week 4)

#### 4.1 Audit Analytics & Reporting

**Files to create:**
- `src/features/audit/services/audit-analytics.service.ts` - Analytics and reporting
- `src/features/audit/apis/audit-reports.ts` - Report generation endpoints

#### 4.2 Real-time Audit Monitoring

**Files to create:**
- `src/features/audit/services/audit-monitor.service.ts` - Real-time monitoring
- WebSocket integration for live audit feeds

## 🔒 Security & Compliance

### Data Protection
- **PII Masking**: Automatically mask sensitive data in audit logs
- **Retention Policy**: Configurable retention periods for different audit types
- **Encryption**: Encrypt sensitive audit data at rest

### Access Control
- **RBAC Integration**: Audit viewing requires specific permissions
- **Audit of Audit**: Log when someone views audit logs
- **Export Controls**: Restricted audit data export capabilities

## 📈 Performance Considerations

### Database Optimization
- **Partitioning**: Partition audit logs by month/year for large datasets
- **Archiving**: Move old audit logs to cheaper storage
- **Indexing**: Strategic indexes for common query patterns

### Caching Strategy
- **Redis Caching**: Cache frequently accessed audit summaries
- **Background Processing**: Async audit log writing to avoid blocking operations

## 🧪 Testing Strategy

### Unit Tests
- Audit service functionality
- Middleware behavior
- Hook integration

### Integration Tests
- End-to-end audit trail verification
- Database change tracking
- API endpoint testing

### Performance Tests
- Audit logging impact on response times
- Query performance with large audit datasets

## 📋 Implementation Checklist

### Week 1: Core Infrastructure ✅
- [ ] Create audit_logs table schema
- [ ] Implement basic AuditService
- [ ] Add audit types and enums
- [ ] Create database migration

### Week 2: Middleware & Hooks ✅
- [ ] Implement audit middleware
- [ ] Create database operation hooks
- [ ] Add request context capture
- [ ] Integrate with existing operations

### Week 3: API & Integration ✅
- [ ] Create audit query endpoints
- [ ] Add audit logging to existing features
- [ ] Implement filtering and pagination
- [ ] Add audit permissions

### Week 4: Advanced Features ✅
- [ ] Implement audit analytics
- [ ] Add monitoring and alerts
- [ ] Performance optimization
- [ ] Documentation and testing

## 🎯 Success Metrics

- **100% coverage** of critical operations
- **<5ms impact** on API response times
- **Comprehensive audit trails** for compliance
- **Real-time monitoring** capabilities
- **Scalable storage** and querying

## 🚀 Next Steps

1. **Start with Phase 1**: Create the core audit infrastructure
2. **Integrate gradually**: Add audit logging to existing features
3. **Test thoroughly**: Ensure performance impact is minimal
4. **Monitor and iterate**: Use audit data to improve the system

This audit system will provide complete visibility into all system activities, ensuring compliance, enabling fraud detection, and supporting business analytics.</content>
<parameter name="filePath">/Users/harshalpatil/Documents/Avhad Enterprises/Anant-Enterprises/anant-enterprises-backend/AUDIT_SYSTEM_IMPLEMENTATION.md