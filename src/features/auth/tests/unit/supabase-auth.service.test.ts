/**
 * Unit tests for supabase-auth.service
 */

// Mock Supabase before importing service
jest.mock('../../../../utils/supabase', () => ({
  supabaseAnon: {
    auth: {
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

jest.mock('../../../../database', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

jest.mock('../../../../utils/logging/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  verifySupabaseToken,
  requestPasswordReset,
  updatePassword,
  getUserByAuthId,
  loginWithSupabase,
} from '../../services/supabase-auth.service';
import { supabaseAnon } from '../../../../utils/supabase';

const mockSupabase = supabaseAnon as jest.Mocked<typeof supabaseAnon>;

describe('Supabase Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySupabaseToken', () => {
    it('should return user for valid token', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await verifySupabaseToken('valid-token');

      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should return null for invalid token', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const result = await verifySupabaseToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await verifySupabaseToken('token');

      expect(result).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('should send reset email successfully', async () => {
      (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await requestPasswordReset('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });

    it('should handle errors gracefully', async () => {
      (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        error: { message: 'Rate limited' },
      });

      const result = await requestPasswordReset('test@example.com');

      expect(result.error).toBeDefined();
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const mockData = { user: { id: 'user-123' } };
      (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await updatePassword('token', 'newPassword123');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockData);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
    });

    it('should handle update errors', async () => {
      (mockSupabase.auth.updateUser as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Password too weak' },
      });

      const result = await updatePassword('token', 'weak');

      expect(result.error).toBeDefined();
    });
  });

  describe('loginWithSupabase', () => {
    it('should login successfully with valid credentials', async () => {
      const mockData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await loginWithSupabase({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockData);
    });

    it('should handle invalid credentials', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const result = await loginWithSupabase({
        email: 'test@example.com',
        password: 'wrong',
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('getUserByAuthId', () => {
    it('should return null when user not found', async () => {
      const result = await getUserByAuthId('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
