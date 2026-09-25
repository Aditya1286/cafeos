import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import {
  authenticateSocket,
  getSocketIdentity,
  canJoinBusinessRoom,
  canJoinOrderRoom,
  canJoinAdminRoom,
  RoomJoinResult
} from './socketAuth';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer, frontendUrl: string): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(authenticateSocket);

  io.on('connection', (socket: Socket) => {
    const identity = getSocketIdentity(socket);
    console.log(`[Socket.IO] Client connected: ${socket.id} (${identity ? `${identity.role} ${identity.userId}` : 'anonymous'})`);

    // Every join is authorized server-side (see socketAuth.ts) — a room is exactly as private
    // as the data emitted into it. The optional ack tells the client whether it got in.
    const reply = (ack: unknown, result: RoomJoinResult) => {
      if (typeof ack === 'function') ack(result);
    };

    // Join business room (e.g. for business staff dashboard)
    socket.on('join_business_room', (businessId: unknown, ack?: unknown) => {
      const result = canJoinBusinessRoom(getSocketIdentity(socket), businessId);
      if (result.ok) {
        socket.join(`business:${businessId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined room business:${businessId}`);
      } else {
        console.warn(`[Socket.IO] Socket ${socket.id} refused business:${String(businessId)} (${result.code})`);
      }
      reply(ack, result);
    });

    // Join order room (e.g. for customer tracking order status)
    socket.on('join_order_room', async (orderId: unknown, ack?: unknown) => {
      try {
        const result = await canJoinOrderRoom(orderId);
        if (result.ok) {
          socket.join(`order:${orderId}`);
          console.log(`[Socket.IO] Socket ${socket.id} joined room order:${orderId}`);
        } else {
          console.warn(`[Socket.IO] Socket ${socket.id} refused order:${String(orderId)} (${result.code})`);
        }
        reply(ack, result);
      } catch (error) {
        console.error(`[Socket.IO] join_order_room failed for ${socket.id}:`, error);
        reply(ack, { ok: false, code: 'NOT_FOUND' });
      }
    });

    // Platform-wide Super Admin rooms: the support-ticket queue and the live order feed.
    const adminRooms: Record<string, string> = {
      join_admin_support_room: 'admin:support',
      join_admin_orders_room: 'admin:orders'
    };
    for (const [event, room] of Object.entries(adminRooms)) {
      socket.on(event, (ack?: unknown) => {
        const result = canJoinAdminRoom(getSocketIdentity(socket));
        if (result.ok) {
          socket.join(room);
          console.log(`[Socket.IO] Socket ${socket.id} joined room ${room}`);
        } else {
          console.warn(`[Socket.IO] Socket ${socket.id} refused ${room} (${result.code})`);
        }
        reply(ack, result);
      });
    }

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const emitToBusiness = (businessId: string, event: string, data: any) => {
  if (io) {
    io.to(`business:${businessId}`).emit(event, data);
  }
};

export const emitToOrder = (orderId: string, event: string, data: any) => {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
};

export const emitToAdminSupport = (event: string, data: any) => {
  if (io) {
    io.to('admin:support').emit(event, data);
  }
};

export const emitToAdminOrders = (event: string, data: any) => {
  if (io) {
    io.to('admin:orders').emit(event, data);
  }
};
