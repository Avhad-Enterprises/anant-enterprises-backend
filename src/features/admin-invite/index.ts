/**
 * Admin Invite Feature Index
 *
 * Central exports
 * NOTE: API routers use dynamic imports to avoid circular dependency with middlewares for all admin invitation-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

class AdminInviteRoute implements Route {
  public path = '/admin/invitations';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private async initializeRoutes() {
    // Dynamic imports to avoid circular dependency
    const { default: createInvitationRouter } = await import('./apis/create-invitation');
    const { default: getInvitationsRouter } = await import('./apis/get-invitations');
    const { default: getInvitationDetailsRouter } = await import('./apis/get-invitation-details');
    const { default: acceptInvitationRouter } = await import('./apis/accept-invitation');

    // Mount API routes
    this.router.use(this.path, createInvitationRouter); // POST / - admin only
    this.router.use(this.path, getInvitationsRouter); // GET / - admin only
    this.router.use(this.path, getInvitationDetailsRouter); // GET /details - public
    this.router.use(this.path, acceptInvitationRouter); // POST /accept - public
  }
}

// Main route export
export default AdminInviteRoute;

// Individual API routes

// Shared resources - SAFE to export
export {
  invitations,
  invitationStatuses,
  type InvitationStatus,
  type Invitation,
  type NewInvitation,
} from './shared/schema';

export type { IInvitation, ICreateInvitation } from './shared/interface';

export {
  findInvitationById,
  findInvitationByEmail,
  findInvitationByToken,
  getInvitations,
  createInvitation,
  updateInvitation,
} from './shared/queries';
