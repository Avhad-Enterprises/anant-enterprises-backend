import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils';

/**
 * Extended Socket interface with user authentication data
 */
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

/**
 * Socket.IO authentication middleware
 * 
 * Verifies JWT token from handshake auth and auto-joins user to their room.
 * Tokens should be passed in the `auth` object when connecting from the client.
 * 
 * Example client connection:
 * ```
 * const socket = io('http://localhost:5000', {
 *   auth: { token: 'your-jwt-token' }
 * });
 * ```
 */
export const socketAuthMiddleware = (
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
) => {
    try {
        // Extract token from handshake auth
        const token = socket.handshake.auth.token;

        if (!token) {
            logger.warn('Socket connection attempted without token', {
                socketId: socket.id,
            });
            return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = verify(token, config.JWT_SECRET) as { userId: string };

        if (!decoded.userId) {
            logger.warn('Invalid token payload', { socketId: socket.id });
            return next(new Error('Invalid token payload'));
        }

        // Attach userId to socket for future use
        socket.userId = decoded.userId;

        // Auto-join user to their personal room
        socket.join(`user:${decoded.userId}`);

        logger.info('Socket authenticated and user joined room', {
            userId: decoded.userId,
            socketId: socket.id,
            room: `user:${decoded.userId}`,
        });

        next();
    } catch (error) {
        logger.error('Socket authentication failed', {
            socketId: socket.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        next(new Error('Invalid authentication token'));
    }
};

/**
 * Admin authentication middleware (for Phase 5)
 * Joins admins to the admin notifications room
 */
export const adminSocketMiddleware = (
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify JWT and check for admin role
        const decoded = verify(token, config.JWT_SECRET) as {
            userId: string;
            role?: string;
        };

        if (decoded.role === 'admin') {
            socket.join('admin:notifications');
            logger.info('Admin joined admin notifications room', {
                userId: decoded.userId,
                socketId: socket.id,
            });
        }

        next();
    } catch (error) {
        logger.error('Admin socket authentication failed', { error });
        next(new Error('Invalid admin token'));
    }
};
