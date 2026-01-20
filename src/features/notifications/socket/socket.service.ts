import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../../utils';

/**
 * WebSocket Service for Real-Time Notifications
 * 
 * Manages Socket.IO connections and broadcasts notifications to connected clients.
 * Uses room-based architecture where each user has their own room (user:{userId}).
 */
class SocketService {
    private io: SocketIOServer | null = null;

    /**
     * Initialize Socket.IO server
     * Call this once when the HTTP server starts
     */
    public initialize(httpServer: HTTPServer): void {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                credentials: true,
            },
            path: '/socket.io',
            transports: ['websocket', 'polling'], // WebSocket preferred, polling as fallback
        });

        logger.info('Socket.IO server initialized', {
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        });

        this.setupEventHandlers();
    }

    /**
     * Set up Socket.IO event handlers
     */
    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            const userId = (socket as any).userId; // Set by auth middleware

            logger.info('Client connected', {
                socketId: socket.id,
                userId,
            });

            // Handle manual join (optional, auto-joined on auth)
            socket.on('join', (roomUserId: string) => {
                // Only allow users to join their own room
                if (userId && roomUserId === userId) {
                    socket.join(`user:${roomUserId}`);
                    logger.info('User manually joined room', {
                        userId: roomUserId,
                        socketId: socket.id,
                    });
                }
            });

            // Handle mark as read from client
            socket.on('notification:mark-read', (data: { notificationId: string }) => {
                logger.debug('Mark notification as read requested', {
                    userId,
                    notificationId: data.notificationId,
                });
                // Emit acknowledgment
                socket.emit('notification:read-ack', { notificationId: data.notificationId });
            });

            // Handle disconnect
            socket.on('disconnect', (reason) => {
                logger.info('Client disconnected', {
                    socketId: socket.id,
                    userId,
                    reason,
                });
            });

            // Handle errors
            socket.on('error', (error) => {
                logger.error('Socket error', { socketId: socket.id, error });
            });
        });
    }

    /**
     * Broadcast notification to a specific user
     * Sends to all sockets in the user's room (multi-device support)
     */
    public emitToUser(userId: string, event: string, data: any): void {
        if (!this.io) {
            logger.warn('Socket.IO not initialized, cannot emit event');
            return;
        }

        const room = `user:${userId}`;
        this.io.to(room).emit(event, data);

        logger.debug('Emitted to user room', {
            userId,
            event,
            room,
            dataKeys: Object.keys(data),
        });
    }

    /**
     * Broadcast to all connected clients
     */
    public broadcast(event: string, data: any): void {
        if (!this.io) {
            logger.warn('Socket.IO not initialized, cannot broadcast');
            return;
        }

        this.io.emit(event, data);
        logger.debug('Broadcasted event to all clients', { event });
    }

    /**
     * Broadcast to admin room (for Phase 5)
     */
    public emitToAdmins(event: string, data: any): void {
        if (!this.io) {
            logger.warn('Socket.IO not initialized, cannot emit to admins');
            return;
        }

        this.io.to('admin:notifications').emit(event, data);
        logger.debug('Emitted to admin room', { event });
    }

    /**
     * Get Socket.IO instance
     * Useful for advanced operations
     */
    public getIO(): SocketIOServer | null {
        return this.io;
    }

    /**
     * Check if Socket.IO is initialized
     */
    public isInitialized(): boolean {
        return this.io !== null;
    }

    /**
     * Get number of connected clients
     */
    public async getConnectionCount(): Promise<number> {
        if (!this.io) return 0;

        const sockets = await this.io.fetchSockets();
        return sockets.length;
    }

    /**
     * Get number of clients in a user's room
     */
    public async getUserConnectionCount(userId: string): Promise<number> {
        if (!this.io) return 0;

        const socketsInRoom = await this.io.in(`user:${userId}`).fetchSockets();
        return socketsInRoom.length;
    }
}

export const socketService = new SocketService();
