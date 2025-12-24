/**
 * Audit System Type Definitions
 * 
 * Comprehensive types for the audit logging system that tracks all critical
 * operations for compliance, fraud detection, and business analytics.
 */

/**
 * Audit action types - all possible actions that can be audited
 */
export enum AuditAction {
    // Authentication & Authorization
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    LOGIN_FAILED = 'LOGIN_FAILED',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET = 'PASSWORD_RESET',
    TOKEN_REFRESH = 'TOKEN_REFRESH',

    // User Management
    USER_CREATE = 'USER_CREATE',
    USER_READ = 'USER_READ',
    USER_UPDATE = 'USER_UPDATE',
    USER_DELETE = 'USER_DELETE',
    USER_ROLE_ASSIGN = 'USER_ROLE_ASSIGN',
    USER_ROLE_REMOVE = 'USER_ROLE_REMOVE',

    // RBAC - Role Management
    ROLE_CREATE = 'ROLE_CREATE',
    ROLE_READ = 'ROLE_READ',
    ROLE_UPDATE = 'ROLE_UPDATE',
    ROLE_DELETE = 'ROLE_DELETE',

    // RBAC - Permission Management
    PERMISSION_CREATE = 'PERMISSION_CREATE',
    PERMISSION_READ = 'PERMISSION_READ',
    PERMISSION_DELETE = 'PERMISSION_DELETE',
    PERMISSION_ASSIGN = 'PERMISSION_ASSIGN',
    PERMISSION_REVOKE = 'PERMISSION_REVOKE',

    // Admin Invitations
    ADMIN_INVITE_CREATE = 'ADMIN_INVITE_CREATE',
    ADMIN_INVITE_ACCEPT = 'ADMIN_INVITE_ACCEPT',
    ADMIN_INVITE_REJECT = 'ADMIN_INVITE_REJECT',
    ADMIN_INVITE_REVOKE = 'ADMIN_INVITE_REVOKE',
    ADMIN_INVITE_DELETE = 'ADMIN_INVITE_DELETE',

    // File Uploads
    UPLOAD_CREATE = 'UPLOAD_CREATE',
    UPLOAD_DELETE = 'UPLOAD_DELETE',
    UPLOAD_DOWNLOAD = 'UPLOAD_DOWNLOAD',

    // Chatbot
    CHATBOT_DOCUMENT_CREATE = 'CHATBOT_DOCUMENT_CREATE',
    CHATBOT_DOCUMENT_DELETE = 'CHATBOT_DOCUMENT_DELETE',
    CHATBOT_SESSION_CREATE = 'CHATBOT_SESSION_CREATE',
    CHATBOT_SESSION_DELETE = 'CHATBOT_SESSION_DELETE',
    CHATBOT_MESSAGE_SEND = 'CHATBOT_MESSAGE_SEND',
    CHATBOT_MESSAGE_CREATE = 'CHATBOT_MESSAGE_CREATE',

    // System Configuration
    SETTINGS_CHANGE = 'SETTINGS_CHANGE',
    SYSTEM_CONFIG = 'SYSTEM_CONFIG',
    SYSTEM_START = 'SYSTEM_START',
    SYSTEM_STOP = 'SYSTEM_STOP',

    // Generic CRUD operations (for extensibility)
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',

    // Generic API operations
    API_REQUEST_READ = 'API_REQUEST_READ',
    API_REQUEST_CREATE = 'API_REQUEST_CREATE',
    API_REQUEST_UPDATE = 'API_REQUEST_UPDATE',
    API_REQUEST_DELETE = 'API_REQUEST_DELETE',
}

/**
 * Resource types that can be audited
 */
export enum AuditResourceType {
    USER = 'USER',
    ROLE = 'ROLE',
    PERMISSION = 'PERMISSION',
    USER_ROLE = 'USER_ROLE',
    ROLE_PERMISSION = 'ROLE_PERMISSION',
    INVITATION = 'INVITATION',
    UPLOAD = 'UPLOAD',
    CHATBOT_DOCUMENT = 'CHATBOT_DOCUMENT',
    CHATBOT_SESSION = 'CHATBOT_SESSION',
    CHATBOT_MESSAGE = 'CHATBOT_MESSAGE',
    SETTINGS = 'SETTINGS',
    SYSTEM = 'SYSTEM',
    AUTH = 'AUTH',
}

/**
 * Data required to create an audit log entry
 */
export interface AuditLogData {
    // Who performed the action
    userId?: number;
    userEmail?: string;
    userRole?: string;

    // What action was performed
    action: AuditAction;
    resourceType: AuditResourceType;
    resourceId?: number | string;

    // Before/After state
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;

    // Context information
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;

    // Additional metadata
    metadata?: Record<string, any>;
    reason?: string;
}

/**
 * Complete audit log entry as stored in the database
 */
export interface AuditLog {
    id: number;
    timestamp: Date;

    // Who
    userId: number | null;
    userEmail: string | null;
    userRole: string | null;

    // What
    action: string;
    resourceType: string;
    resourceId: number | null;

    // Changes
    oldValues: Record<string, any> | null;
    newValues: Record<string, any> | null;

    // Context
    ipAddress: string | null;
    userAgent: string | null;
    sessionId: string | null;

    // Metadata
    metadata: Record<string, any> | null;
    reason: string | null;

    createdAt: Date;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
    userId?: number;
    action?: AuditAction | AuditAction[];
    resourceType?: AuditResourceType | AuditResourceType[];
    resourceId?: number | string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    limit?: number;
    offset?: number;
}

/**
 * Sanitized audit data (removes sensitive information)
 */
export interface SanitizedAuditData {
    [key: string]: any;
}

/**
 * Request context for audit logging
 */
export interface AuditContext {
    userId?: number;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    userEmail?: string;
    userRole?: string;
}
