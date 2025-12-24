/**
 * Admin Invite Feature Index
 *
 * Central exports for all admin invitation-related functionality
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';
import createInvitationRouter from './apis/create-invitation';
import getInvitationsRouter from './apis/get-invitations';
import verifyInvitationRouter from './apis/verify-invitation';
import acceptInvitationRouter from './apis/accept-invitation';

class AdminInviteRoute implements Route {
  public path = '/admin/invitations';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Mount API routes
    this.router.use(this.path, createInvitationRouter);
    this.router.use(this.path, getInvitationsRouter);
    this.router.use(this.path, verifyInvitationRouter); // POST /verify - public, rate-limited
    this.router.use(this.path, acceptInvitationRouter); // POST /accept - public, rate-limited
  }
}

// Main route export
export default AdminInviteRoute;

// Individual API routes
export { default as createInvitationRouter } from './apis/create-invitation';
export { default as getInvitationsRouter } from './apis/get-invitations';
export { default as verifyInvitationRouter } from './apis/verify-invitation';
export { default as acceptInvitationRouter } from './apis/accept-invitation';

// Shared resources
export {
  invitations,
  invitationStatuses,
  type InvitationStatus,
  type Invitation,
  type NewInvitation,
} from './shared/schema';

export type {
  IInvitation,
  ICreateInvitation,
  IInvitationVerifyResponse,
} from './shared/interface';

export {
  findInvitationById,
  findInvitationByEmail,
  findInvitationByToken,
  getInvitations,
  createInvitation,
  updateInvitation,
} from './shared/queries';
