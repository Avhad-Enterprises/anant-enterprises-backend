/**
 * Unit tests for refresh-token business logic
 */

import { handleRefreshToken } from '../../apis/refresh-token';
import { db } from '../../../../database';

// Mock Supabase client
jest.mock('../../../../utils/supabase', () => ({
  supabaseAnon: {
    auth: {
      refreshSession: jest.fn(),
    },
  },
}));

// Mock database
jest.mock('../../../../database', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

// Mock drizzle-orm eq function
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

import { supabaseAnon } from '../../../../utils/supabase';
import { eq } from 'drizzle-orm';

const mockSupabaseAnon = supabaseAnon as jest.Mocked<typeof supabaseAnon>;
const mockRefreshSession = mockSupabaseAnon.auth.refreshSession as jest.MockedFunction<any>;
const mockDb = db as jest.Mocked<typeof db>;
const mockEq = eq as jest.MockedFunction<typeof eq>;

describe('Refresh Token Business Logic', () => {
  const mockUser = {
    id: 1,
    auth_id: 'supabase-user-id-123',
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockSupabaseUser = {
    id: 'supabase-user-id-123',
    email: 'test@example.com',
  };

  const mockSupabaseSession = {
    access_token: 'new.access.token',
    refresh_token: 'new.refresh.token',
    expires_at: 1234567890,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRefreshToken', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // Mock Supabase refreshSession success
      mockRefreshSession.mockResolvedValue({
        data: {
          user: mockSupabaseUser,
          session: mockSupabaseSession,
        },
        error: null,
      });

      // Mock database query
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelectChain as any);
      mockEq.mockReturnValue('auth_id_condition' as any);

      const result = await handleRefreshToken('valid.refresh.token');

      expect(mockSupabaseAnon.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid.refresh.token',
      });
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          auth_id: mockUser.auth_id,
          name: mockUser.name,
          email: mockUser.email,
          phone_number: mockUser.phone_number,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at,
        },
        token: mockSupabaseSession.access_token,
        refreshToken: mockSupabaseSession.refresh_token,
      });
    });

    it('should throw 401 if refresh session fails', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid refresh token' },
      });

      await expect(handleRefreshToken('invalid.token')).rejects.toMatchObject({
        status: 401,
        message: 'Invalid refresh token',
      });
    });

    it('should throw 500 if user sync failed', async () => {
      mockRefreshSession.mockResolvedValue({
        data: {
          user: mockSupabaseUser,
          session: mockSupabaseSession,
        },
        error: null,
      });

      // Mock database query returning empty result
      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectChain as any);

      await expect(handleRefreshToken('valid.token')).rejects.toMatchObject({
        status: 500,
        message: 'User sync failed',
      });
    });

    it('should return undefined phone_number if user has no phone', async () => {
      const userWithoutPhone = { ...mockUser, phone_number: null };

      mockRefreshSession.mockResolvedValue({
        data: {
          user: mockSupabaseUser,
          session: mockSupabaseSession,
        },
        error: null,
      });

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([userWithoutPhone]),
      };
      mockDb.select.mockReturnValue(mockSelectChain as any);

      const result = await handleRefreshToken('valid.token');

      expect(result.user.phone_number).toBeUndefined();
    });

    it('should handle different user roles correctly', async () => {
      // Test with admin user
      const adminUser = { ...mockUser, name: 'Admin User' };

      mockRefreshSession.mockResolvedValue({
        data: {
          user: mockSupabaseUser,
          session: mockSupabaseSession,
        },
        error: null,
      });

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([adminUser]),
      };
      mockDb.select.mockReturnValue(mockSelectChain as any);

      const result = await handleRefreshToken('admin.token');

      expect(result.user.name).toBe('Admin User');
      expect(result.token).toBe(mockSupabaseSession.access_token);
    });
  });
});
