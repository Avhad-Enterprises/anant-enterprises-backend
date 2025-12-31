import { Application } from 'express';
import App from '../../src/app';
import UserRoute from '../../src/features/user';
import AuthRoute from '../../src/features/auth';
import UploadRoute from '../../src/features/upload';
import AdminInviteRoute from '../../src/features/admin-invite';
import ChatbotRoute from '../../src/features/chatbot';
import RBACRoute from '../../src/features/rbac';

/**
 * Get Express app instance for testing
 * Creates a singleton app instance with all routes
 */
let appInstance: Application | null = null;

export function createTestApp(): Application {
  if (!appInstance) {
    const app = new App([
      new AuthRoute(),
      new UserRoute(),
      new UploadRoute(),
      new AdminInviteRoute(),
      new ChatbotRoute(),
      new RBACRoute(),
    ]);
    appInstance = app.getServer();
  }
  return appInstance;
}

// Export default app for easy import in tests
export default createTestApp();
