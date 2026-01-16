import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  // Lookup proper auth_id from users table checks
  const [user] = await db
    .select({ auth_id: users.auth_id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.auth_id) {
    throw new HttpException(404, 'User not found or not linked to authentication provider');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new HttpException(401, 'No authorization header provided');
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!;

    // Create a client scoped to the user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    console.log(`[MFA] Starting enrollment via User Client for auth_id: ${user.auth_id}`);

    // Call MFA enroll using the USER client (not admin)
    // Use a unique friendly name based on timestamp to avoid conflicts
    const friendlyName = `TOTP-${Date.now()}`;
    const { data, error } = await supabaseUser.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      console.error('[MFA] Enrollment error:', error);
      throw new HttpException(400, error.message);
    }

    if (!data) {
      console.error('[MFA] No data returned');
      throw new HttpException(500, 'No data returned from MFA enrollment');
    }

    // data is { id, type, totp: { secret, qr_code, uri } }

    ResponseFormatter.success(res, {
      id: data.id,
      type: data.type,
      secret: data.totp.secret,
      qr_code: data.totp.qr_code,
      uri: data.totp.uri
    }, 'MFA enrollment started');

  } catch (error: any) {
    console.error('[MFA] Handler exception:', error);
    throw new HttpException(500, error.message || 'Failed to start MFA enrollment');
  }
};

const router = Router();
// Note: We need body parser for POST even if empty body, but express.json() in app.ts handles it.
router.post('/mfa/enroll', requireAuth, handler);

export default router;
