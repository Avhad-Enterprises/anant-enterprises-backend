import { Router, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { RequestWithUser } from '../../../interfaces';
import { requireAuth } from '../../../middlewares';
import { ResponseFormatter, HttpException } from '../../../utils';
import { db } from '../../../database';
import { users } from '../../user/shared/user.schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const verifyMfaSchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().min(6).max(6),
});

const handler = async (req: RequestWithUser, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    throw new HttpException(401, 'Authentication required');
  }

  const { factorId, code } = verifyMfaSchema.parse(req.body);

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

    // 1. Create a challenge for the factor
    const { data: challengeData, error: challengeError } = await supabaseUser.auth.mfa.challenge({
      factorId: factorId,
    });

    if (challengeError) {
      
      throw new HttpException(400, `Challenge failed: ${challengeError.message}`);
    }

    // 2. Verify the challenge with the code
    const { data: verifyData, error: verifyError } = await supabaseUser.auth.mfa.verify({
      factorId: factorId,
      challengeId: challengeData.id,
      code: code,
    });

    if (verifyError) {
      
      throw new HttpException(400, `Verification failed: ${verifyError.message}`);
    }

    ResponseFormatter.success(res, verifyData, 'MFA enabled successfully');

  } catch (error: any) {
    if (error instanceof HttpException) throw error;
    
    throw new HttpException(500, error.message || 'Failed to verify MFA');
  }
};

const router = Router();
router.post('/mfa/verify', requireAuth, handler);

export default router;
