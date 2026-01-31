/**
 * Unit tests for reset-password API
 */

import { handleResetPassword } from '../../apis/reset-password';
import * as supabaseAuthService from '../../services/supabase-auth.service';
import { HttpException } from '../../../../utils';

// Mock the supabase auth service
jest.mock('../../services/supabase-auth.service');
jest.mock('../../../../utils', () => ({
  HttpException: class extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message);
      this.name = 'HttpException';
    }
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockUpdatePassword = supabaseAuthService.updatePassword as jest.MockedFunction<
  typeof supabaseAuthService.updatePassword
>;

describe('Reset Password API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleResetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await handleResetPassword('valid-access-token', 'NewPassword123!');

      expect(result.message).toBe('Password reset successfully');
      expect(mockUpdatePassword).toHaveBeenCalledWith('valid-access-token', 'NewPassword123!');
    });

    it('should throw HttpException with invalid token', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      await expect(handleResetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
        HttpException
      );
    });

    it('should throw HttpException with error message from Supabase', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: null,
        error: { message: 'Token expired' },
      });

      await expect(handleResetPassword('expired-token', 'NewPassword123!')).rejects.toThrow(
        'Token expired'
      );
    });

    it('should call updatePassword with correct parameters', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      await handleResetPassword('access-token-xyz', 'SecurePass456!');

      expect(mockUpdatePassword).toHaveBeenCalledWith('access-token-xyz', 'SecurePass456!');
      expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
    });

    it('should handle Supabase API errors gracefully', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: null,
        error: { code: 'SERVICE_ERROR', message: 'Service unavailable' },
      });

      await expect(handleResetPassword('token', 'password')).rejects.toThrow('Service unavailable');
    });

    it('should provide default message when error has no message', async () => {
      mockUpdatePassword.mockResolvedValue({
        data: null,
        error: {}, // No message property
      });

      await expect(handleResetPassword('token', 'password')).rejects.toThrow(
        'Password reset failed'
      );
    });
  });
});
