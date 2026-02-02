/**
 * Unit tests for audit-utils.ts
 */

import { Request } from 'express';
import { RequestWithUser } from '@/interfaces';
import {
  extractRequestContext,
  shouldAuditRequest,
  getAuditActionFromRequest,
  getResourceTypeFromPath,
  getResourceIdFromPath,
} from '@/utils/audit/audit-utils';
import { AuditAction, AuditResourceType } from '@/features/audit';

describe('Audit Utils', () => {
  describe('extractRequestContext', () => {
    it('should extract full context from request', () => {
      const mockReq = {
        userId: '123',
        ip: '192.168.1.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        headers: {
          'x-session-id': 'session-abc-123',
        },
      } as unknown as RequestWithUser;

      const context = extractRequestContext(mockReq);

      expect(context).toEqual({
        userId: '123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-abc-123',
      });
    });

    it('should handle missing optional fields', () => {
      const mockReq = {
        ip: undefined,
        connection: undefined,
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as unknown as Request;

      const context = extractRequestContext(mockReq);

      expect(context.userId).toBeUndefined();
      expect(context.ipAddress).toBeUndefined();
      expect(context.userAgent).toBeUndefined();
      expect(context.sessionId).toBeUndefined();
    });

    it('should fallback to connection.remoteAddress for IP', () => {
      const mockReq = {
        ip: undefined,
        connection: { remoteAddress: '10.0.0.1' },
        get: jest.fn(),
        headers: {},
      } as unknown as Request;

      const context = extractRequestContext(mockReq);

      expect(context.ipAddress).toBe('10.0.0.1');
    });
  });

  describe('shouldAuditRequest', () => {
    it('should audit API requests', () => {
      const mockReq = { path: '/api/users' } as Request;
      expect(shouldAuditRequest(mockReq)).toBe(true);
    });

    it('should not audit health check', () => {
      const mockReq = { path: '/health' } as Request;
      expect(shouldAuditRequest(mockReq)).toBe(false);
    });

    it('should not audit root path', () => {
      const mockReq = { path: '/' } as Request;
      expect(shouldAuditRequest(mockReq)).toBe(false);
    });

    it('should not audit static assets', () => {
      expect(shouldAuditRequest({ path: '/static/css/main.css' } as Request)).toBe(false);
      expect(shouldAuditRequest({ path: '/assets/img/logo.png' } as Request)).toBe(false);
    });

    it('should not audit non-API paths', () => {
      const mockReq = { path: '/public/docs' } as Request;
      expect(shouldAuditRequest(mockReq)).toBe(false);
    });

    it('should be case insensitive', () => {
      const mockReq = { path: '/API/Users' } as Request;
      expect(shouldAuditRequest(mockReq)).toBe(true);
    });
  });

  describe('getAuditActionFromRequest', () => {
    it('should map POST to CREATE', () => {
      const mockReq = { method: 'POST', path: '/api/users' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.CREATE);
    });

    it('should map GET to READ', () => {
      const mockReq = { method: 'GET', path: '/api/users/123' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.READ);
    });

    it('should map PUT to UPDATE', () => {
      const mockReq = { method: 'PUT', path: '/api/users/123' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.UPDATE);
    });

    it('should map PATCH to UPDATE', () => {
      const mockReq = { method: 'PATCH', path: '/api/users/123' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.UPDATE);
    });

    it('should map DELETE to DELETE', () => {
      const mockReq = { method: 'DELETE', path: '/api/users/123' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.DELETE);
    });

    it('should detect LOGIN action', () => {
      const mockReq = { method: 'POST', path: '/api/auth/login' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.LOGIN);
    });

    it('should detect LOGOUT action', () => {
      const mockReq = { method: 'POST', path: '/api/auth/logout' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.LOGOUT);
    });

    it('should detect TOKEN_REFRESH action', () => {
      const mockReq = { method: 'POST', path: '/api/auth/refresh' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.TOKEN_REFRESH);
    });

    it('should detect PASSWORD_RESET action', () => {
      const mockReq = { method: 'POST', path: '/api/auth/password/reset' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.PASSWORD_RESET);
    });

    it('should detect UPLOAD_DOWNLOAD action', () => {
      const mockReq = { method: 'GET', path: '/api/uploads/123/download' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.UPLOAD_DOWNLOAD);
    });

    it('should be case insensitive', () => {
      const mockReq = { method: 'post', path: '/API/AUTH/LOGIN' } as Request;
      expect(getAuditActionFromRequest(mockReq)).toBe(AuditAction.LOGIN);
    });
  });

  describe('getResourceTypeFromPath', () => {
    it('should identify USER resource', () => {
      expect(getResourceTypeFromPath('/api/users')).toBe(AuditResourceType.USER);
      expect(getResourceTypeFromPath('/api/users/123')).toBe(AuditResourceType.USER);
    });

    it('should identify AUTH resource', () => {
      expect(getResourceTypeFromPath('/api/auth/login')).toBe(AuditResourceType.AUTH);
    });

    it('should identify ROLE resource', () => {
      expect(getResourceTypeFromPath('/api/roles')).toBe(AuditResourceType.ROLE);
    });

    it('should identify PERMISSION resource', () => {
      expect(getResourceTypeFromPath('/api/permissions')).toBe(AuditResourceType.PERMISSION);
    });

    it('should identify INVITATION resource', () => {
      expect(getResourceTypeFromPath('/api/invitations/123')).toBe(AuditResourceType.INVITATION);
      expect(getResourceTypeFromPath('/api/invite/accept')).toBe(AuditResourceType.INVITATION);
    });

    it('should identify UPLOAD resource', () => {
      expect(getResourceTypeFromPath('/api/uploads')).toBe(AuditResourceType.UPLOAD);
      expect(getResourceTypeFromPath('/api/upload/file')).toBe(AuditResourceType.UPLOAD);
    });

    it('should default to SYSTEM for unknown resources', () => {
      expect(getResourceTypeFromPath('/api/products')).toBe(AuditResourceType.SYSTEM);
      expect(getResourceTypeFromPath('/api/orders/456')).toBe(AuditResourceType.SYSTEM);
    });

    it('should handle non-API paths', () => {
      expect(getResourceTypeFromPath('/public/docs')).toBe(AuditResourceType.SYSTEM);
    });

    it('should be case insensitive', () => {
      expect(getResourceTypeFromPath('/API/USERS/123')).toBe(AuditResourceType.USER);
    });
  });

  describe('getResourceIdFromPath', () => {
    it('should extract numeric ID from path', () => {
      expect(getResourceIdFromPath('/api/users/123')).toBe(123);
      expect(getResourceIdFromPath('/api/products/456')).toBe(456);
    });

    it('should extract ID from middle of path', () => {
      expect(getResourceIdFromPath('/api/users/123/profile')).toBe(123);
    });

    it('should return undefined when no ID present', () => {
      expect(getResourceIdFromPath('/api/users')).toBeUndefined();
      expect(getResourceIdFromPath('/api/auth/login')).toBeUndefined();
    });

    it('should return first ID when multiple IDs present', () => {
      expect(getResourceIdFromPath('/api/users/123/orders/456')).toBe(123);
    });

    it('should handle trailing slash', () => {
      expect(getResourceIdFromPath('/api/users/123/')).toBe(123);
    });
  });
});
