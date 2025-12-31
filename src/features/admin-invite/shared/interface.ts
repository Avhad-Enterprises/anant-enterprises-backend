import { InvitationStatus } from './schema';

export interface IInvitation {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  invite_token?: string;
  status: InvitationStatus;
  assigned_role_id?: number | null;
  temp_password_encrypted?: string | null;
  password_hash?: string | null;
  verify_attempts: number;
  invited_by: number;
  expires_at: Date;
  accepted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
}

export interface ICreateInvitation {
  first_name: string;
  last_name: string;
  email: string;
  assigned_role_id: number;
}
