import { IUser } from './interface';

/**
 * Sanitized user type without sensitive fields
 */
export type SanitizedUser = Omit<IUser, 'password'> & { hasPassword: boolean };

/**
 * Remove sensitive fields from a single user object
 * Ensures password and other sensitive data never leak in API responses
 */
export const sanitizeUser = (user: IUser): SanitizedUser => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...sanitized } = user;
  return {
    ...sanitized,
    hasPassword: !!password,
  };
};

/**
 * Remove sensitive fields from an array of user objects
 */
export const sanitizeUsers = (users: IUser[]): SanitizedUser[] => {
  return users.map(sanitizeUser);
};

