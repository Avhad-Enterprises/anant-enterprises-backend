/**
 * Profile Feature Index
 *
 * Central exports for all profile-related functionality
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class ProfileRoute implements Route {
  public path = '/profile';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    try {
      // Dynamic imports to avoid circular dependency
      const { default: getProfileSettingsRouter } = await import('./apis/get-profile-settings');
      const { default: getSecuritySettingsRouter } = await import('./apis/get-security-settings');
      const { default: changePasswordRouter } = await import('./apis/change-password');
      const { default: enrollMfaRouter } = await import('./apis/enroll-mfa');
      const { default: verifyMfaRouter } = await import('./apis/verify-mfa');
      const { default: disableMfaRouter } = await import('./apis/disable-mfa');
      const { default: getNotificationPreferencesRouter } = await import('./apis/get-notification-preferences');
      const { default: updateNotificationPreferencesRouter } = await import('./apis/update-notification-preferences');
      const { default: logoutSessionRouter } = await import('./apis/logout-session');

      this.router.use(this.path, getProfileSettingsRouter);
      this.router.use(this.path, getSecuritySettingsRouter);
      this.router.use(this.path, changePasswordRouter);
      this.router.use(this.path, enrollMfaRouter);
      this.router.use(this.path, verifyMfaRouter);
      this.router.use(this.path, disableMfaRouter);
      this.router.use(this.path, logoutSessionRouter);
      this.router.use(this.path, getNotificationPreferencesRouter);
      this.router.use(this.path, updateNotificationPreferencesRouter);
    } catch (error) {
      console.error('Failed to initialize profile routes:', error);
    }
  }
}

// Main route export
export default ProfileRoute;

// Shared resources - SAFE to export
export * from './shared/sessions.schema';
export * from './shared/interface';
