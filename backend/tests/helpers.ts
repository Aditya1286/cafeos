// Shared harness for the backend integration tests: an in-memory MongoDB seeded with the same
// demo data a fresh dev boot gets, plus a real HTTP + Socket.IO server on a random port running
// the actual routes/controllers/socket handlers (not mocks).
//
// Test-only code: lives outside src/, so tsc never compiles it into dist/ and the Docker
// image (which copies only src/) never contains it; tests/ is also in .dockerignore.
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { config } from '../src/config';
import { seedDatabase } from '../src/database/seed';
import { initSocketServer, getIO } from '../src/websocket/socketManager';
import publicRoutes from '../src/routes/publicRoutes';
import orderRoutes from '../src/routes/orderRoutes';
import menuRoutes from '../src/routes/menuRoutes';
import { rejectMongoOperators } from '../src/middleware/rejectMongoOperators';
import { User } from '../src/models/User';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';

export interface Harness {
  app: express.Express;
  url: string;
  stop: () => Promise<void>;
}

export const startHarness = async (): Promise<Harness> => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // The seed is chatty; keep test output readable.
  const log = console.log;
  console.log = () => {};
  try {
    await seedDatabase(false);
  } finally {
    console.log = log;
  }
  await mongoose.connection.syncIndexes();

  const app = express();
  app.use(express.json());
  app.use('/api/v1', rejectMongoOperators); // as in server.ts
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/menu', menuRoutes);

  const server = http.createServer(app);
  initSocketServer(server, 'http://localhost:5173');
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    app,
    url,
    stop: async () => {
      getIO().close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mongoose.disconnect();
      await mongo.stop();
    }
  };
};

/** Same token shape authController issues on login. */
export const tokenFor = async (email: string): Promise<string> => {
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No seeded user ${email}`);
  return jwt.sign({ id: user._id, role: user.role, businessId: user.businessId }, config.jwtSecret, { expiresIn: '7d' });
};

/** By role, not email — the seeded admin's address follows APP_SLUG, which changes on rebrand. */
export const superAdminToken = async (): Promise<string> => tokenFor((await User.findOne({ role: 'SUPER_ADMIN' }))!.email);

export const businessIdFor = async (slug: string): Promise<string> => {
  const business = await Business.findOne({ slug });
  if (!business) throw new Error(`No seeded business ${slug}`);
  return business._id.toString();
};

export const firstProductIdFor = async (slug: string): Promise<string> => {
  const product = await Product.findOne({ businessId: await businessIdFor(slug) });
  if (!product) throw new Error(`No product for ${slug}`);
  return product._id.toString();
};

/**
 * Places orders at the seeded artisan café the way a customer would: through a table QR.
 * A table takes one active order at a time, so every order gets a fresh table, and every
 * customer a fresh, already-verified phone (each test file runs in its own process + DB).
 */
export const createOrderPlacer = async (app: express.Express, prefix: string) => {
  const artisanId = await businessIdFor('artisan-cafe');
  const productId = await firstProductIdFor('artisan-cafe');
  let seq = 0;
  return async (paymentMethod: 'CASH' | 'ONLINE' = 'CASH', itemProductId: string = productId) => {
    seq++;
    const qrToken = `tok_${prefix}_${seq}`;
    const phone = `98${String(seq).padStart(8, '0')}`;
    await Table.create({ businessId: artisanId, tableNumber: `${prefix} ${seq}`, capacity: 2, qrToken });
    await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
    const res = await request(app)
      .post('/api/v1/public/orders')
      .send({ qrToken, customerName: 'Test Customer', customerPhone: phone, items: [{ productId: itemProductId, quantity: 1 }], paymentMethod });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data as { _id: string; orderId: string; customerPhone: string };
  };
};

export const connectSocket = (url: string, token?: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      auth: token ? { token } : {}
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

export type JoinResult = { ok: boolean; code?: string };

export const join = (socket: ClientSocket, event: string, ...args: unknown[]): Promise<JoinResult> =>
  socket.timeout(2000).emitWithAck(event, ...args);

/** Resolves with the event's payload, or rejects if it doesn't arrive within `ms`. */
export const nextEvent = <T = any>(socket: ClientSocket, event: string, ms = 1500): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for ${event}`));
    }, ms);
    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });

/** Resolves true if the event does NOT arrive within `ms` — used to prove a room leaks nothing. */
export const noEvent = (socket: ClientSocket, event: string, ms = 600): Promise<boolean> =>
  nextEvent(socket, event, ms).then(
    () => false,
    () => true
  );
