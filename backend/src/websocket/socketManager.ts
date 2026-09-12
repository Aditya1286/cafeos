import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer, frontendUrl: string): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join tenant room (e.g. for restaurant staff dashboard)
    socket.on('join_tenant_room', (tenantId: string) => {
      if (tenantId) {
        socket.join(`tenant:${tenantId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined room tenant:${tenantId}`);
      }
    });

    // Join order room (e.g. for customer tracking order status)
    socket.on('join_order_room', (orderId: string) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`[Socket.IO] Socket ${socket.id} joined room order:${orderId}`);
      }
    });

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

export const emitToTenant = (tenantId: string, event: string, data: any) => {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
};

export const emitToOrder = (orderId: string, event: string, data: any) => {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
};
