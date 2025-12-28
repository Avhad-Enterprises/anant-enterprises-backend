/**
 * POST /api/auth/login
 * Login with email and password (Public - no auth)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { verifyPassword } from '../../../utils';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { generateToken } from '../../../utils';
import { findUserByEmail } from '../../user';
import { IAuthUserWithToken } from '../../../interfaces';

const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginDto = z.infer<typeof schema>;

export async function handleLogin(email: string, password: string): Promise<IAuthUserWithToken> {
  if (!email || !password) {
    throw new HttpException(400, 'Email and password are required');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    // Generic error to prevent user enumeration
    throw new HttpException(401, 'Invalid credentials');
  }

  if (!user.password_hash) {
    throw new HttpException(401, 'Invalid credentials');
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    // Same error message for wrong password
    throw new HttpException(401, 'Invalid credentials');
  }

  const token = generateToken(
    {
      id: user.id,
      email: user.email,
    },
    '24h'
  );

  return {
    id: user.id,
    email: user.email,
    phone_number: user.phone_number || undefined,
    created_at: user.created_at,
    updated_at: user.updated_at,
    token,
  };
}

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loginData: LoginDto = req.body;
    const user = await handleLogin(loginData.email, loginData.password);

    ResponseFormatter.success(res, user, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/login', validationMiddleware(schema), handler);

export default router;
