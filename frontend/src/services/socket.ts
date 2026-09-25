import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;
// The token the current connection authenticated with — room access is decided server-side
// from the handshake, so a login/logout in this tab needs a fresh connection to take effect.
let connectedToken: string | null = null;

type RoomJoinResult = { ok: boolean; code?: string };
type RoomJoin = { event: string; arg?: string };

// Socket.IO forgets every room on reconnect (network blip, laptop sleep, server deploy), so
// remember what this tab joined and re-join all of it on each connect — otherwise a
// dashboard silently stops receiving live orders after the first disconnect.
const joinedRooms = new Map<string, RoomJoin>();

// Events emitted while this tab was disconnected are gone for good — Socket.IO doesn't replay
// them. Screens register here to re-fetch what they show after a reconnect (not the first
// connect, which their initial load already covers).
const reconnectListeners = new Set<() => void>();
let hasConnectedBefore = false;

const JOIN_ACK_TIMEOUT_MS = 5000;

/** Resolves once the server has answered the join (or it timed out) — never rejects. */
const emitJoin = async (s: Socket, { event, arg }: RoomJoin): Promise<void> => {
  try {
    const timed = s.timeout(JOIN_ACK_TIMEOUT_MS);
    const result: RoomJoinResult = arg === undefined ? await timed.emitWithAck(event) : await timed.emitWithAck(event, arg);
    if (!result?.ok) console.warn(`[WebSocket Client] ${event} refused: ${result?.code}`);
  } catch {
    console.warn(`[WebSocket Client] ${event}: no answer from server`);
  }
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      // A function, not an object, so every (re)connect sends whatever token is current.
      auth: (cb) => {
        connectedToken = getAuthToken();
        cb(connectedToken ? { token: connectedToken } : {});
      }
    });

    socket.on('connect', async () => {
      console.log('[WebSocket Client] Connected to server:', socket?.id);
      const isReconnect = hasConnectedBefore;
      hasConnectedBefore = true;
      // Re-join first and wait for the server to confirm, THEN let screens re-fetch: anything
      // that happens after the re-fetch's read then arrives as a live event, so no gap.
      await Promise.all([...joinedRooms.values()].map((room) => emitJoin(socket!, room)));
      if (isReconnect) reconnectListeners.forEach((listener) => listener());
    });
  }
  return socket;
};

const joinRoom = (key: string, room: RoomJoin) => {
  const s = getSocket();
  joinedRooms.set(key, room);
  if (s.connected && getAuthToken() !== connectedToken) {
    // Logged in/out since this connection was made — reconnect so the server sees the new
    // identity; the 'connect' handler then re-joins every room, this one included.
    s.disconnect().connect();
  } else if (s.connected) {
    emitJoin(s, room);
  }
  // Not connected yet: the 'connect' handler joins it once the handshake completes.
};

export const joinBusinessRoom = (businessId: string) =>
  joinRoom(`business:${businessId}`, { event: 'join_business_room', arg: businessId });

export const joinOrderRoom = (orderId: string) =>
  joinRoom(`order:${orderId}`, { event: 'join_order_room', arg: orderId });

export const joinAdminSupportRoom = () => joinRoom('admin:support', { event: 'join_admin_support_room' });

export const joinAdminOrdersRoom = () => joinRoom('admin:orders', { event: 'join_admin_orders_room' });

/** Runs `listener` after every reconnect, once this tab's rooms are re-joined. Returns an
 *  unsubscribe for the useEffect cleanup. */
export const onReconnect = (listener: () => void): (() => void) => {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
};
