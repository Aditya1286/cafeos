// Client-side realtime behaviour of src/services/socket.ts: remembering rooms and re-joining
// them after every reconnect, reconnecting when the login token changes, and the onReconnect
// catch-up hook (which must fire only after the rooms are re-joined).
//
// Runs against a small stand-in Socket.IO server that speaks the same join/ack protocol as
// the backend, so these tests need no backend or database. The backend's own tests cover the
// real authorization rules.
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';

const OWNER_TOKEN = 'owner-token';
const ADMIN_TOKEN = 'admin-token';
const BUSINESS_ID = 'biz1';
const ORDER_ID = 'order1';

let io: Server;
let url: string;
// Knobs individual tests flip to make the stand-in server slow or unresponsive.
let joinAckDelayMs = 0;
let silentJoinEvents = new Set<string>();

const handleJoin = (socket: ServerSocket, event: string, allowed: boolean, room: string, ack: unknown) => {
  if (silentJoinEvents.has(event)) return; // never answers — simulates a hung server
  setTimeout(() => {
    if (allowed) socket.join(room);
    if (typeof ack === 'function') ack(allowed ? { ok: true } : { ok: false, code: 'UNAUTHORIZED' });
  }, joinAckDelayMs);
};

beforeAll(async () => {
  const server = http.createServer();
  io = new Server(server);
  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    socket.on('join_business_room', (id: string, ack: unknown) =>
      handleJoin(socket, 'join_business_room', token === OWNER_TOKEN || token === ADMIN_TOKEN, `business:${id}`, ack)
    );
    socket.on('join_order_room', (id: string, ack: unknown) => handleJoin(socket, 'join_order_room', true, `order:${id}`, ack));
    socket.on('join_admin_orders_room', (ack: unknown) =>
      handleJoin(socket, 'join_admin_orders_room', token === ADMIN_TOKEN, 'admin:orders', ack)
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  io.close();
});

type SocketModule = typeof import('../src/services/socket');
type ApiModule = typeof import('../src/services/api');
let client: SocketModule;
let api: ApiModule;

beforeEach(async () => {
  joinAckDelayMs = 0;
  silentJoinEvents = new Set();
  const storage = new Map<string, string>();
  vi.stubGlobal('window', { location: { origin: url } });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k)
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  // A fresh module per test = a fresh page load (new singleton, no remembered rooms).
  vi.resetModules();
  client = await import('../src/services/socket');
  api = await import('../src/services/api');
});

afterEach(() => {
  client.getSocket().disconnect();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// --- helpers ------------------------------------------------------------------------------

const roomSize = (room: string) => io.sockets.adapter.rooms.get(room)?.size ?? 0;

const waitFor = async (cond: () => boolean, ms = 5000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('condition not met in time');
    await new Promise((r) => setTimeout(r, 20));
  }
};

/** Cuts every connection at the transport level — what a Wi-Fi drop or a server deploy looks
 *  like to the browser (Socket.IO then reconnects on its own). */
const dropAllConnections = () => io.sockets.sockets.forEach((s) => s.conn.close());

const received = (event: string) => {
  const payloads: any[] = [];
  client.getSocket().on(event, (p: any) => payloads.push(p));
  return payloads;
};

// --- Joining & re-joining -----------------------------------------------------------------

describe('rooms', () => {
  test('a room joined before the socket has connected is joined once it connects', async () => {
    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);

    const got = received('order:new');
    io.to(`business:${BUSINESS_ID}`).emit('order:new', { orderId: 'A-1' });
    await waitFor(() => got.length === 1);
    expect(got[0].orderId).toBe('A-1');
  });

  test('after a network drop every remembered room is re-joined and events flow again', async () => {
    api.setAuthToken(ADMIN_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    client.joinOrderRoom(ORDER_ID);
    client.joinAdminOrdersRoom();
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1 && roomSize(`order:${ORDER_ID}`) === 1 && roomSize('admin:orders') === 1);

    dropAllConnections();
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 0);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1 && roomSize(`order:${ORDER_ID}`) === 1 && roomSize('admin:orders') === 1);

    const got = received('admin_order:new');
    io.to('admin:orders').emit('admin_order:new', { _id: 'x' });
    await waitFor(() => got.length === 1);
  });

  test('joining the same room twice does not double-join or double-deliver', async () => {
    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);
    const got = received('order:new');
    io.to(`business:${BUSINESS_ID}`).emit('order:new', { orderId: 'A-2' });
    await new Promise((r) => setTimeout(r, 200));
    expect(got).toHaveLength(1);
  });

  test('a customer tracking page (no login) follows its order through a drop', async () => {
    client.joinOrderRoom(ORDER_ID);
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 1);
    dropAllConnections();
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 0);
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 1);
  });
});

// --- Login state --------------------------------------------------------------------------

describe('login token', () => {
  test('logging in after the socket connected anonymously reconnects with the token first', async () => {
    const s = client.getSocket();
    await waitFor(() => s.connected);
    const anonymousId = s.id;

    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);
    expect(client.getSocket().id).not.toBe(anonymousId);
  });

  test('a logged-out page is refused a business room and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => warn.mock.calls.some((c) => String(c[0]).includes('join_business_room refused')));
    expect(roomSize(`business:${BUSINESS_ID}`)).toBe(0);
  });
});

// --- Catch-up after a reconnect -----------------------------------------------------------

describe('onReconnect', () => {
  test('does not fire on the first connect', async () => {
    const listener = vi.fn();
    client.onReconnect(listener);
    client.joinOrderRoom(ORDER_ID);
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 1);
    await new Promise((r) => setTimeout(r, 200));
    expect(listener).not.toHaveBeenCalled();
  });

  test('an event sent while offline is lost, and the listener runs so the screen can re-fetch it', async () => {
    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);
    const live = received('order:new');
    const listener = vi.fn();
    client.onReconnect(listener);

    dropAllConnections();
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 0);
    io.to(`business:${BUSINESS_ID}`).emit('order:new', { orderId: 'MISSED' }); // nobody is listening

    await waitFor(() => listener.mock.calls.length === 1);
    expect(live).toHaveLength(0); // Socket.IO never replays it — hence the re-fetch
  });

  test('fires only after the server has confirmed the re-join, even when it answers slowly', async () => {
    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);

    let roomSizeWhenListenerRan = -1;
    client.onReconnect(() => {
      roomSizeWhenListenerRan = roomSize(`business:${BUSINESS_ID}`);
    });
    joinAckDelayMs = 300;
    dropAllConnections();
    await waitFor(() => roomSizeWhenListenerRan !== -1);
    // Re-fetching before the re-join could miss an order placed in between the two.
    expect(roomSizeWhenListenerRan).toBe(1);
  });

  test('a server that never answers a join does not block the catch-up forever', async () => {
    api.setAuthToken(OWNER_TOKEN);
    client.joinBusinessRoom(BUSINESS_ID);
    await waitFor(() => roomSize(`business:${BUSINESS_ID}`) === 1);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = vi.fn();
    client.onReconnect(listener);

    silentJoinEvents.add('join_business_room');
    dropAllConnections();
    // The join ack times out after 5s; the catch-up must still run.
    await waitFor(() => listener.mock.calls.length === 1, 10_000);
  });

  test('unsubscribing stops further calls', async () => {
    client.joinOrderRoom(ORDER_ID);
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 1);
    const listener = vi.fn();
    const stop = client.onReconnect(listener);

    dropAllConnections();
    await waitFor(() => listener.mock.calls.length === 1);

    stop();
    const firstId = client.getSocket().id;
    dropAllConnections();
    await waitFor(() => client.getSocket().connected && client.getSocket().id !== firstId);
    await waitFor(() => roomSize(`order:${ORDER_ID}`) === 1);
    await new Promise((r) => setTimeout(r, 200));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
