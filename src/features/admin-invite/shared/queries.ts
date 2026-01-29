import { eq, and, desc, asc, gte, lte, SQL, inArray } from 'drizzle-orm';
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
  filters: { status?: string; startDate?: string; endDate?: string; roleId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<{ invitations: Invitation[]; total: number }> => {
  const { status, sortBy, sortOrder, roleId, startDate, endDate } = filters;
  const { page = 1, limit = 10 } = pagination;

  const conditions: (SQL | undefined)[] = [eq(invitations.is_deleted, false)];

  if (status) {
    const statuses = status.split(',').filter(Boolean);
    if (statuses.length > 0) {
      conditions.push(inArray(invitations.status, statuses as InvitationStatus[]));
    }
  }

  if (roleId) {
    const roleIds = roleId.split(',').filter(Boolean);
    if (roleIds.length > 0) {
      conditions.push(inArray(invitations.assigned_role_id, roleIds));
    }
  }

  if (startDate) {
    conditions.push(gte(invitations.created_at, new Date(startDate)));
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(invitations.created_at, end));
  }

  const whereClause = and(...conditions);

  /* Sort Order Configuration */
  let orderByClause: SQL | ReturnType<typeof desc> | ReturnType<typeof asc> = desc(invitations.created_at);

  if (sortBy) {
    const orderFunc = sortOrder === 'asc' ? asc : desc;

    switch (sortBy) {
      case 'first_name':
        orderByClause = orderFunc(invitations.first_name);
        break;
      case 'last_name':
        orderByClause = orderFunc(invitations.last_name);
        break;
      case 'email':
        orderByClause = orderFunc(invitations.email);
        break;
      case 'assigned_role_name':
        orderByClause = orderFunc(invitations.assigned_role_id);
        break;
      case 'status':
        orderByClause = orderFunc(invitations.status);
        break;
      case 'created_at':
        orderByClause = orderFunc(invitations.created_at);
        break;
      case 'expires_at':
        orderByClause = orderFunc(invitations.expires_at);
        break;
      default:
        orderByClause = desc(invitations.created_at);
    }
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
    .orderBy(orderByClause)
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

/**
 * Soft delete invitation by ID
 */
export const deleteInvitation = async (
  id: number,
  deletedBy: string
): Promise<Invitation | undefined> => {
  const [deletedInvitation] = await db
    .update(invitations)
    .set({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date(),
    })
    .where(and(eq(invitations.id, id), eq(invitations.is_deleted, false)))
    .returning();

  return deletedInvitation;
};
