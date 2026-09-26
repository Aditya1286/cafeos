import mongoose from 'mongoose';
import { Socket } from 'socket.io';
import { User, UserRole } from '../models/User';
import { Order } from '../models/Order';
import { verifyAuthToken, isTokenRevoked } from '../utils/authToken';

// Who a socket connection belongs to. Staff/admin sockets carry the same JWT the REST API
// uses (sent as `auth.token` in the Socket.IO handshake); customer sockets carry none and
// stay anonymous — they may only follow an individual order, never a whole business.
export interface SocketIdentity {
  userId: string;
  role: UserRole;
  businessId?: string;
}

export type RoomJoinResult = { ok: true } | { ok: false; code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_ID' };

export const getSocketIdentity = (socket: Socket): SocketIdentity | null => socket.data.identity ?? null;

/**
 * Handshake middleware. Mirrors middleware/auth.ts's `protect`: the JWT must verify and its
 * user must still exist and be ACTIVE. A missing or bad token never rejects the connection —
 * it just leaves the socket anonymous — because the customer order-tracking page shares the
 * same browser (and so possibly a stale owner token in localStorage) and must keep working.
 */
export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  socket.data.identity = null;
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || !token) return next();

  try {
    const decoded = verifyAuthToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.status === 'ACTIVE' && !isTokenRevoked(user, decoded)) {
      const identity: SocketIdentity = {
        userId: user._id.toString(),
        role: user.role,
        businessId: user.businessId?.toString()
      };
      socket.data.identity = identity;
    }
  } catch {
    // Invalid/expired token or a lookup failure: fall through as anonymous.
  }
  return next();
};

/** Staff may only follow their own business; a SUPER_ADMIN (no fixed business) may follow any,
 *  the same exception enforceBusiness makes for the `x-business-id` header. */
export const canJoinBusinessRoom = (identity: SocketIdentity | null, businessId: unknown): RoomJoinResult => {
  if (!identity) return { ok: false, code: 'UNAUTHORIZED' };
  if (typeof businessId !== 'string' || !mongoose.Types.ObjectId.isValid(businessId)) {
    return { ok: false, code: 'INVALID_ID' };
  }
  if (identity.role === 'SUPER_ADMIN') return { ok: true };
  if (identity.businessId && identity.businessId === businessId) return { ok: true };
  return { ok: false, code: 'FORBIDDEN' };
};

/** Platform-wide rooms (admin:support, admin:orders) carry every business's data. */
export const canJoinAdminRoom = (identity: SocketIdentity | null): RoomJoinResult => {
  if (!identity) return { ok: false, code: 'UNAUTHORIZED' };
  return identity.role === 'SUPER_ADMIN' ? { ok: true } : { ok: false, code: 'FORBIDDEN' };
};

/**
 * Order rooms stay open to anonymous customers — the tracking page has no login — but only
 * by the order's unguessable Mongo _id, which is exactly what the tracking URL carries and
 * what every emitToOrder call is keyed by. The short daily IDs (ART-250926-0001) are
 * sequential and guessable, so they're refused here.
 */
export const canJoinOrderRoom = async (orderId: unknown): Promise<RoomJoinResult> => {
  if (typeof orderId !== 'string' || !mongoose.Types.ObjectId.isValid(orderId) || orderId.length !== 24) {
    return { ok: false, code: 'INVALID_ID' };
  }
  const exists = await Order.exists({ _id: orderId });
  return exists ? { ok: true } : { ok: false, code: 'NOT_FOUND' };
};
