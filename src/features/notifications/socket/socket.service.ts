import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../../utils';

// Type for socket middleware
type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

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
   * @param httpServer - The HTTP server to attach Socket.IO to
   * @param authMiddleware - Optional authentication middleware to use
   */
  public initialize(httpServer: HTTPServer, authMiddleware?: SocketMiddleware): void {
    // Support multiple origins for development
    const allowedOrigins: string[] = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001', // Alternative port
      'http://localhost:5173', // Vite default (admin panel)
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8000',
    ].filter((origin): origin is string => typeof origin === 'string'); // Remove undefined values

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      path: '/socket.io',
      // Start with polling, then upgrade to websocket (more reliable)
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    logger.info('Socket.IO server initialized', {
      allowedOrigins,
      path: '/socket.io',
      transports: ['polling', 'websocket'],
    });

    // Apply authentication middleware BEFORE setting up connection handlers
    if (authMiddleware) {
      this.io.use(authMiddleware);
      logger.info('Socket.IO authentication middleware applied');
    }

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

      // Handle notification:subscribe from client (alternative to join)
      socket.on('notification:subscribe', (data: { userId: string }) => {
        // Only allow users to subscribe to their own notifications
        if (userId && data.userId === userId) {
          socket.join(`user:${data.userId}`);
          logger.info('User subscribed to notifications', {
            userId: data.userId,
            socketId: socket.id,
          });
          // Send acknowledgment
          socket.emit('notification:subscribed', { success: true });
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
      socket.on('disconnect', reason => {
        logger.info('Client disconnected', {
          socketId: socket.id,
          userId,
          reason,
        });
      });

      // Handle errors
      socket.on('error', error => {
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

    // Check if anyone is in the room before emitting
    const socketsInRoom = this.io.sockets.adapter.rooms.get(room)?.size || 0;

    logger.info(`[Socket Service] Preparing to emit to room: ${room}`, {
      userId,
      event,
      connectedSocketsInRoom: socketsInRoom,
      totalConnectedSockets: this.io.engine.clientsCount,
    });

    if (socketsInRoom === 0) {
      logger.warn(
        `[Socket Service] ⚠️ NO CLIENTS in room ${room} - Notification will NOT be delivered via WebSocket`,
        {
          userId,
          tip: 'User might be disconnected or socket auth failed',
        }
      );
    } else {
      this.io.to(room).emit(event, data);
      logger.info(`[Socket Service] ✅ Successfully emitted event to ${socketsInRoom} client(s)`, {
        room,
        event,
      });
    }
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
