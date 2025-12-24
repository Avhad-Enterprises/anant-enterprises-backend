/**
 * POST /api/auth/register
 * Register new user account (Public - no auth)
 * 
 * NOTE: New users are automatically assigned the 'user' role via RBAC system
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationMiddleware } from '../../../middlewares';
import { hashPassword } from '../../../utils';
import { ResponseFormatter } from '../../../utils';
import { HttpException } from '../../../utils';
import { generateToken } from '../../../utils';
import { findUserByEmail, createUser, updateUserById } from '../../user';
import { assignRoleToUser, findRoleByName } from '../../rbac';
import { IAuthUserWithToken } from '../../../interfaces';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

type RegisterDto = z.infer<typeof schema>;

export async function handleRegister(data: RegisterDto): Promise<IAuthUserWithToken> {
  const existingUser = await findUserByEmail(data.email);
  if (existingUser) {
    throw new HttpException(409, 'Email already registered');
  }

  const hashedPassword = await hashPassword(data.password);
  const userData = {
    ...data,
    password: hashedPassword,
  };

  const newUser = await createUser(userData);

  // Self-reference: User created themselves
  await updateUserById(newUser.id, { created_by: newUser.id, updated_by: newUser.id });

  // Assign default 'user' role via RBAC system
  const userRole = await findRoleByName('user');
  if (userRole) {
    await assignRoleToUser(newUser.id, userRole.id, newUser.id);
  }

  const token = generateToken(
    {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    },
    '24h'
  );

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone_number: newUser.phone_number || undefined,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
    token,
  };
}

const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userData: RegisterDto = req.body;
    const user = await handleRegister(userData);

    ResponseFormatter.created(res, user, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

const router = Router();
router.post('/register', validationMiddleware(schema), handler);

export default router;
