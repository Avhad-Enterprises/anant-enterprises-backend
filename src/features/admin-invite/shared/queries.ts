import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../../database';
import {
  invitations,
  type Invitation,
  type NewInvitation,
  type InvitationStatus,
} from './admin-invite.schema';

/**
 * Find invitation by ID (excluding deleted invitations)
 */
export const findInvitationById = async (id: number): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select({
      id: invitations.id,
      first_name: invitations.first_name,
      last_name: invitations.last_name,
      email: invitations.email,
      invite_token: invitations.invite_token,
      status: invitations.status,
      assigned_role_id: invitations.assigned_role_id,
      temp_password_encrypted: invitations.temp_password_encrypted,
      password_hash: invitations.password_hash,
      verify_attempts: invitations.verify_attempts,
      invited_by: invitations.invited_by,
      expires_at: invitations.expires_at,
      accepted_at: invitations.accepted_at,
      created_at: invitations.created_at,
      updated_at: invitations.updated_at,
      is_deleted: invitations.is_deleted,
      deleted_by: invitations.deleted_by,
      deleted_at: invitations.deleted_at,
    })
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Find invitation by email (excluding deleted invitations)
 */
export const findInvitationByEmail = async (email: string): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select({
      id: invitations.id,
      first_name: invitations.first_name,
      last_name: invitations.last_name,
      email: invitations.email,
      invite_token: invitations.invite_token,
      status: invitations.status,
      assigned_role_id: invitations.assigned_role_id,
      temp_password_encrypted: invitations.temp_password_encrypted,
      password_hash: invitations.password_hash,
      verify_attempts: invitations.verify_attempts,
      invited_by: invitations.invited_by,
      expires_at: invitations.expires_at,
      accepted_at: invitations.accepted_at,
      created_at: invitations.created_at,
      updated_at: invitations.updated_at,
      is_deleted: invitations.is_deleted,
      deleted_by: invitations.deleted_by,
      deleted_at: invitations.deleted_at,
    })
    .from(invitations)
    .where(and(eq(invitations.email, email), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Find invitation by token (excluding deleted invitations)
 */
export const findInvitationByToken = async (token: string): Promise<Invitation | undefined> => {
  const [invitation] = await db
    .select({
      id: invitations.id,
      first_name: invitations.first_name,
      last_name: invitations.last_name,
      email: invitations.email,
      invite_token: invitations.invite_token,
      status: invitations.status,
      assigned_role_id: invitations.assigned_role_id,
      temp_password_encrypted: invitations.temp_password_encrypted,
      password_hash: invitations.password_hash,
      verify_attempts: invitations.verify_attempts,
      invited_by: invitations.invited_by,
      expires_at: invitations.expires_at,
      accepted_at: invitations.accepted_at,
      created_at: invitations.created_at,
      updated_at: invitations.updated_at,
      is_deleted: invitations.is_deleted,
      deleted_by: invitations.deleted_by,
      deleted_at: invitations.deleted_at,
    })
    .from(invitations)
    .where(and(eq(invitations.invite_token, token), eq(invitations.is_deleted, false)))
    .limit(1);

  return invitation;
};

/**
 * Get all invitations with optional filtering and pagination
 */
export const getInvitations = async (
  filters: { status?: InvitationStatus } = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<{ invitations: Invitation[]; total: number }> => {
  const { status } = filters;
  const { page = 1, limit = 10 } = pagination;

  let whereClause: ReturnType<typeof eq> = eq(invitations.is_deleted, false);

  if (status) {
    whereClause = and(whereClause, eq(invitations.status, status))!;
  }

  const offset = (page - 1) * limit;

  const invitationsResult = await db
    .select({
      id: invitations.id,
      first_name: invitations.first_name,
      last_name: invitations.last_name,
      email: invitations.email,
      invite_token: invitations.invite_token,
      status: invitations.status,
      assigned_role_id: invitations.assigned_role_id,
      temp_password_encrypted: invitations.temp_password_encrypted,
      password_hash: invitations.password_hash,
      verify_attempts: invitations.verify_attempts,
      invited_by: invitations.invited_by,
      expires_at: invitations.expires_at,
      accepted_at: invitations.accepted_at,
      created_at: invitations.created_at,
      updated_at: invitations.updated_at,
      is_deleted: invitations.is_deleted,
      deleted_by: invitations.deleted_by,
      deleted_at: invitations.deleted_at,
    })
    .from(invitations)
    .where(whereClause)
    .orderBy(desc(invitations.created_at))
    .limit(limit)
    .offset(offset);

  const allIds = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(whereClause);

  const total = allIds.length;

  return {
    invitations: invitationsResult,
    total,
  };
};

/**
 * Create a new invitation
 */
export const createInvitation = async (invitationData: NewInvitation): Promise<Invitation> => {
  const [newInvitation] = await db.insert(invitations).values(invitationData).returning();

  return newInvitation;
};

/**
 * Update invitation by ID
 */
export const updateInvitation = async (
  id: number,
  updateData: Partial<NewInvitation>
): Promise<Invitation | undefined> => {
  const [updatedInvitation] = await db
    .update(invitations)
    .set(updateData)
    .where(eq(invitations.id, id))
    .returning();

  return updatedInvitation;
};
