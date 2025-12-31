/**
 * Unit tests for request-password-reset API
 */

import { handleRequestPasswordReset } from '../../apis/request-password-reset';
import * as supabaseAuthService from '../../services/supabase-auth.service';

// Mock the supabase auth service
jest.mock('../../services/supabase-auth.service');

const mockRequestPasswordReset = supabaseAuthService.requestPasswordReset as jest.MockedFunction<
  typeof supabaseAuthService.requestPasswordReset
>;

describe('Request Password Reset API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRequestPasswordReset', () => {
    it('should return success message for valid email', async () => {
      mockRequestPasswordReset.mockResolvedValue({ data: null, error: null });

      const result = await handleRequestPasswordReset('test@example.com');

      expect(result.message).toContain('password reset');
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    it('should return success even if email does not exist (prevents enumeration)', async () => {
      // Supabase returns error for non-existent email but we don't expose this
      mockRequestPasswordReset.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const result = await handleRequestPasswordReset('nonexistent@example.com');

      // Should still return success to prevent user enumeration
      expect(result.message).toContain('password reset');
    });

    it('should call requestPasswordReset with correct email', async () => {
      mockRequestPasswordReset.mockResolvedValue({ data: null, error: null });

      await handleRequestPasswordReset('user@domain.com');

      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@domain.com');
      expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('should handle Supabase service errors gracefully', async () => {
      mockRequestPasswordReset.mockResolvedValue({
        data: null,
        error: { message: 'Service error' },
      });

      const result = await handleRequestPasswordReset('test@example.com');

      // Still returns success message (security)
      expect(result.message).toBeDefined();
    });
  });
});
