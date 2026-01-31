import { Socket } from 'socket.io';
import { logger } from '../../../utils';
import { supabaseAnon } from '../../../utils/supabase';

/**
 * Extended Socket interface with user authentication data
 */
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

/**
 * Socket.IO authentication middleware
 * 
 * Verifies Supabase Auth JWT token from handshake auth and auto-joins user to their room.
 * Tokens should be passed in the `auth` object when connecting from the client.
 * 
 * Example client connection:
 * ```
 * const socket = io('http://localhost:8000', {
 *   auth: { token: 'your-supabase-jwt-token' }
 * });
 * ```
 */
export const socketAuthMiddleware = async (
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

        logger.info('Socket authentication attempt', {
            socketId: socket.id,
            tokenPreview: token.substring(0, 20) + '...',
        });

        // Verify Supabase Auth token using Supabase's built-in verification
        const {
            data: { user },
            error,
        } = await supabaseAnon.auth.getUser(token);

        if (error || !user) {
            logger.warn('Supabase token verification failed', {
                socketId: socket.id,
                error: error?.message,
            });
            return next(new Error('Invalid authentication token'));
        }

        logger.info('Token verified successfully', {
            socketId: socket.id,
            authId: user.id,
            email: user.email,
        });

        // Attach Supabase Auth user ID to socket
        socket.userId = user.id;

        // Auto-join user to their personal room
        socket.join(`user:${user.id}`);

        logger.info('Socket authenticated and user joined room', {
            userId: user.id,
            socketId: socket.id,
            room: `user:${user.id}`,
        });

        next();
    } catch (error) {
        logger.error('Socket authentication failed', {
            socketId: socket.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorName: error instanceof Error ? error.name : undefined,
        });
        next(new Error('Invalid authentication token'));
    }
};

/**
 * Admin authentication middleware (for Phase 5)
 * Joins admins to the admin notifications room
 */
export const adminSocketMiddleware = async (
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify Supabase Auth token and check for admin role
        const {
            data: { user },
            error,
        } = await supabaseAnon.auth.getUser(token);

        if (error || !user) {
            return next(new Error('Invalid admin token'));
        }

        // Check user metadata for admin role (adjust based on your implementation)
        const userRole = user.user_metadata?.role || user.app_metadata?.role;

        if (userRole === 'admin') {
            socket.join('admin:notifications');
            logger.info('Admin joined admin notifications room', {
                userId: user.id,
                socketId: socket.id,
            });
        }

        next();
    } catch (error) {
        logger.error('Admin socket authentication failed', { error });
        next(new Error('Invalid admin token'));
    }
};
