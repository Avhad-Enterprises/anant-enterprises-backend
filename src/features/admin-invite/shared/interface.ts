import { InvitationStatus } from './admin-invite.schema';

export interface IInvitation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  invite_token?: string;
  status: InvitationStatus;
  assigned_role_id?: string | null;
  temp_password_encrypted?: string | null;
  password_hash?: string | null;
  verify_attempts: number;
  invited_by: string;
  expires_at: Date;
  accepted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: string | null;
  deleted_at?: Date | null;
}

export interface ICreateInvitation {
  first_name: string;
  last_name: string;
  email: string;
  assigned_role_id: string;
}
