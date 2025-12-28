/**
 * IUserProfile Interface - Customer profile data
 */
export interface IUserProfile {
  id: number;
  user_id: number;
  name: string;
  profile_image_url: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  date_of_birth: Date | null;
  marketing_email_consent: boolean;
  marketing_sms_consent: boolean;
  marketing_push_consent: boolean;
  marketing_preferences: Record<string, any> | null;
  loyalty_enrolled: boolean;
  loyalty_points: number;
  loyalty_tier: string | null;
  credit_balance: number;
  customer_segment: string | null;
  risk_profile: 'low' | 'medium' | 'high';
  referral_code: string | null;
  referred_by_user_id: number | null;
  gdpr_status: 'na' | 'pending' | 'compliant';
  gdpr_consent_at: Date | null;
  created_by: number | null;
  created_at: Date;
  updated_by: number | null;
  updated_at: Date | null;
  is_deleted: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
}
