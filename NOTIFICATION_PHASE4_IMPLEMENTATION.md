# Phase 4: Real-Time WebSocket Notifications - Implementation Plan

> **Objective**: Add real-time delivery of notifications to connected clients using WebSockets  
> **Technology**: Socket.IO for WebSocket connections  
> **Integration**: Extends Phase 3 queue-based notification system  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technical Requirements](#technical-requirements)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Phase 4?

Phase 4 adds **real-time delivery** of notifications to connected clients. When a notification is created (via the queue worker), it will be instantly pushed to the user's browser/app via WebSocket.

### Key Features

- ✅ **Instant Delivery**: Notifications appear immediately without polling
- ✅ **User-Specific Rooms**: Each user gets their own socket room
- ✅ **Authentication**: Only authenticated users can connect
- ✅ **Reconnection Handling**: Automatic reconnection on disconnect
- ✅ **Multiple Clients**: Same user can connect from multiple devices
- ✅ **Backward Compatible**: Polling still works for offline users

### User Flow

```
User Action → Queue Job → Worker → Creates Notification → WebSocket Broadcast → User's Browser
                                          ↓
                                    Database (stored)
```

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express Server                            │
│  ┌──────────────┐         ┌─────────────────┐                  │
│  │  HTTP Routes │         │  Socket.IO      │                  │
│  │  /api/...    │         │  WebSocket      │                  │
│  └──────────────┘         │  Server         │                  │
│                            └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
                    ┌───────────────┴────────────────┐
                    │                                 │
            ┌───────▼──────┐                 ┌───────▼──────┐
            │ User Rooms   │                 │ Auth         │
            │ user:123     │                 │ Middleware   │
            │ user:456     │                 │              │
            └──────────────┘                 └──────────────┘
                    ↑
                    │
        ┌───────────┴────────────┐
        │  Notification Worker   │
        │  - Creates notification│
        │  - Emits to user room  │
        └────────────────────────┘
```

### Room Strategy

- **User Rooms**: `user:{userId}` - Each user has a dedicated room
- **Admin Room**: `admin:notifications` - For admin dashboard (Phase 5)
- **Broadcast Room**: `announcements` - System-wide announcements

---

## Technical Requirements

### Dependencies

```json
{
  "socket.io": "^4.7.0",
  "@types/socket.io": "^3.0.0"
}
```

### Environment Variables

```bash
# .env.dev
SOCKET_IO_PORT=5001  # WebSocket server port (optional, can use same as HTTP)
SOCKET_IO_CORS_ORIGIN=http://localhost:3000  # Frontend URL
```

### File Structure

```
src/
├── features/
│   └── notifications/
│       ├── socket/
│       │   ├── socket.service.ts          # WebSocket service
│       │   ├── socket.middleware.ts       # Auth middleware
│       │   └── socket.handlers.ts         # Event handlers
│       └── services/
│           └── notification.service.ts    # Updated with broadcasting
└── server.ts                              # Updated with Socket.IO
```

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install socket.io @types/socket.io
```

### Step 2: Create WebSocket Service

**File**: `src/features/notifications/socket/socket.service.ts`

```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../../utils';

class SocketService {
    private io: SocketIOServer | null = null;

    /**
     * Initialize Socket.IO server
     */
    public initialize(httpServer: HTTPServer): void {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                credentials: true,
            },
            path: '/socket.io',
        });

        logger.info('Socket.IO server initialized');
        this.setupEventHandlers();
    }

    /**
     * Set up Socket.IO event handlers
     */
    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            logger.info('Client connected', { socketId: socket.id });

            // Handle join user room
            socket.on('join', (userId: string) => {
                socket.join(`user:${userId}`);
                logger.info('User joined room', { userId, socketId: socket.id });
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                logger.info('Client disconnected', { socketId: socket.id });
            });
        });
    }

    /**
     * Broadcast notification to a specific user
     */
    public emitToUser(userId: string, event: string, data: any): void {
        if (!this.io) {
            logger.warn('Socket.IO not initialized');
            return;
        }

        this.io.to(`user:${userId}`).emit(event, data);
        logger.debug('Emitted to user', { userId, event });
    }

    /**
     * Broadcast to all connected clients
     */
    public broadcast(event: string, data: any): void {
        if (!this.io) {
            logger.warn('Socket.IO not initialized');
            return;
        }

        this.io.emit(event, data);
        logger.debug('Broadcasted event', { event });
    }

    /**
     * Get Socket.IO instance
     */
    public getIO(): SocketIOServer | null {
        return this.io;
    }
}

export const socketService = new SocketService();
```

---

### Step 3: Add Authentication Middleware

**File**: `src/features/notifications/socket/socket.middleware.ts`

```typescript
import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { config } from '../../../utils/validateEnv';
import { logger } from '../../../utils';

export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from handshake auth
 */
export const socketAuthMiddleware = (
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        // Verify JWT
        const decoded = verify(token, config.JWT_SECRET) as { userId: string };
        socket.userId = decoded.userId;

        // Auto-join user room
        socket.join(`user:${decoded.userId}`);
        logger.info('User authenticated and joined room', {
            userId: decoded.userId,
            socketId: socket.id,
        });

        next();
    } catch (error) {
        logger.error('Socket authentication failed', { error });
        next(new Error('Invalid authentication token'));
    }
};
```

---

### Step 4: Integrate with Server

**File**: `src/server.ts` (Update)

```typescript
import express from 'express';
import http from 'http';
import { socketService } from './features/notifications/socket/socket.service';
import { socketAuthMiddleware } from './features/notifications/socket/socket.middleware';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(httpServer);

// Add authentication middleware
const io = socketService.getIO();
if (io) {
    io.use(socketAuthMiddleware);
}

// ... existing middleware and routes ...

// Start server
const PORT = config.PORT || 5000;
httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`WebSocket server ready`);
});
```

---

### Step 5: Update Notification Service

**File**: `src/features/notifications/services/notification.service.ts` (Add to existing)

```typescript
import { socketService } from '../socket/socket.service';

class NotificationService {
    // ... existing methods ...

    /**
     * Create notification and broadcast to user
     */
    async createFromTemplate(params: CreateFromTemplateParams): Promise<Notification> {
        // ... existing creation logic ...

        const notification = await this.create(createData);

        // 🔥 NEW: Broadcast to user via WebSocket
        try {
            socketService.emitToUser(params.userId, 'notification:new', {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                actionUrl: notification.action_url,
                actionText: notification.action_text,
                createdAt: notification.created_at,
            });

            logger.info('Notification broadcasted via WebSocket', {
                userId: params.userId,
                notificationId: notification.id,
            });
        } catch (error) {
            // Non-blocking: if WebSocket fails, notification still saved
            logger.error('Failed to broadcast notification via WebSocket', { error });
        }

        return notification;
    }
}
```

---

### Step 6: Frontend Integration Example

**React/Next.js Client Example**:

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useNotifications() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Get auth token (from your auth context)
        const token = localStorage.getItem('authToken');

        // Connect to WebSocket
        const newSocket = io('http://localhost:5000', {
            auth: { token },
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            console.log('WebSocket connected');
        });

        newSocket.on('notification:new', (notification) => {
            console.log('New notification received:', notification);
            
            // Add to state
            setNotifications(prev => [notification, ...prev]);
            
            // Show toast/notification
            toast.success(notification.title);
            
            // Play sound
            playNotificationSound();
        });

        newSocket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return { socket, notifications };
}
```

---

## Event Types

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `notification:new` | `{ id, type, title, message, ... }` | New notification created |
| `notification:read` | `{ id, readAt }` | Notification marked as read |
| `notification:deleted` | `{ id }` | Notification deleted |
| `unread:count` | `{ count }` | Updated unread count |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `userId` | Join user room (optional, auto-joined on auth) |
| `mark:read` | `{ notificationId }` | Mark notification as read |
| `mark:all:read` | `{}` | Mark all as read |

---

## Testing Strategy

### Manual Testing

1. **Connection Test**:
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test WebSocket connection
npx wscat -c ws://localhost:5000 --auth "Bearer <token>"
```

2. **Notification Delivery Test**:
```bash
# Create an order (triggers ORDER_CREATED notification)
POST /api/orders

# Check WebSocket client receives notification
# Should see: notification:new event
```

### Automated Tests

```typescript
// tests/socket.test.ts
import { io as Client } from 'socket.io-client';

describe('WebSocket Notifications', () => {
    let clientSocket;

    beforeAll((done) => {
        clientSocket = Client('http://localhost:5000', {
            auth: { token: process.env.TEST_TOKEN },
        });
        clientSocket.on('connect', done);
    });

    afterAll(() => {
        clientSocket.close();
    });

    test('should receive notification when created', (done) => {
        clientSocket.on('notification:new', (data) => {
            expect(data).toHaveProperty('id');
            expect(data).toHaveProperty('title');
            done();
        });

        // Trigger notification creation
        // ... create order or payment ...
    });
});
```

---

## Performance Considerations

### Scalability

For **horizontal scaling** (multiple server instances):

1. **Use Redis Adapter**:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

2. **Sticky Sessions**: Ensure load balancer uses sticky sessions

### Connection Limits

- **Max connections per instance**: ~10,000-65,000 (Node.js limit)
- **Recommended**: 5,000 concurrent connections per instance
- **Monitoring**: Track connection count

---

## Troubleshooting

### Common Issues

**1. CORS Errors**

```
Access to XMLHttpRequest blocked by CORS
```

**Fix**: Update `cors.origin` in Socket.IO initialization

**2. Authentication Failures**

```
Error: Invalid authentication token
```

**Fix**: Ensure token is passed in `auth` object on client

**3. Disconnections**

```
Client disconnects frequently
```

**Fix**: Check firewall/proxy settings, enable WebSocket transport

---

## Migration Checklist

- [ ] Install Socket.IO dependencies
- [ ] Create socket service
- [ ] Add authentication middleware
- [ ] Update server.ts with Socket.IO initialization
- [ ] Update NotificationService to broadcast events
- [ ] Test WebSocket connections
- [ ] Update frontend to connect to WebSocket
- [ ] Test notification delivery end-to-end
- [ ] Add error monitoring
- [ ] Document API for frontend team

---

## Security Considerations

1. **Authentication**: Always validate JWT tokens
2. **Rate Limiting**: Limit events per user per second
3. **Input Validation**: Sanitize all client events
4. **Room Isolation**: Users can only join their own rooms
5. **CORS**: Restrict to known origins only

---

## Next Steps After Phase 4

Once Phase 4 is complete:

1. **Phase 5**: Admin Dashboard UI
2. **Phase 6**: User Notification Center UI
3. **Phase 7**: Push Notifications (PWA/mobile)

---

**Estimated Implementation Time**: 6-8 hours

**Ready to proceed?** Let me know when you want to start implementing Phase 4!
