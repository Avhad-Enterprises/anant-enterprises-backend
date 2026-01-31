/**
 * Interfaces Index
 *
 * Re-exports all interface definitions for convenient imports
 */

// Route interface
export type { default as Route } from './route.interface';

// Request interfaces
export type {
  RequestWithId,
  RequestWithUser,
  IAuthUser,
  IAuthUserWithToken,
  DataStoredInToken,
} from './request.interface';

// Express type declarations (global namespace extensions)
// Note: express.d.ts contains global declarations and doesn't export named exports
