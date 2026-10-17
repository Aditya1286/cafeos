import { Business } from '../models/Business';
import { Table } from '../models/Table';
import { findRecentOrdersByPhonePattern } from '../dao/orderRecovery.dao';
import { isPhoneRecoveryVerified } from './otp.service';
import { ServiceError } from '../utils/serviceError';
import { phoneMatchPattern } from '../utils/phone';
import { readRecoveryToken, signRecoveryToken, RecoverySession } from '../utils/recoveryToken';

/** How far back a customer can recover orders. Long enough for a day out, short enough that an old
 * link isn't handed to whoever holds the number now. */
export const RECOVERY_WINDOW_HOURS = 12;
export const RECOVERY_LIMIT = 10;

export interface RecoverableOrder {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  tableName: string | undefined;
  totalAmountPaise: number;
  createdAt: Date;
}

/** The ten digits of an Indian mobile number given as 9876543210, +91 98765 43210 or 919876543210. */
const tenDigits = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
};

export interface RecoverResult {
  orders: RecoverableOrder[];
  /** Only after a fresh OTP: lets this device list the same number's orders again without one. */
  session?: RecoverySession;
}

const SESSION_EXPIRED = () =>
  new ServiceError(401, 'SESSION_EXPIRED', 'Your saved sign-in has expired. Verify your phone number again to see your orders.');

/**
 * Orders a customer can get back: the ones placed from this phone number at this café in the last
 * RECOVERY_WINDOW_HOURS. The café is named by the table QR they scanned or the café's own link.
 * The caller proves the number one of two ways:
 *  - a FRESH recovery OTP for it (not merely an ordering verification), which also earns a
 *    session token; or
 *  - that session token, scoped to one number at one café, on a later visit. The number then comes
 *    from the token, never from the request, so a token can't be pointed at someone else's orders.
 * Only what is needed to open the tracking page comes back: no name, no phone, no items.
 */
export const recoverOrders = async (input: {
  qrToken?: unknown;
  businessSlug?: unknown;
  customerPhone?: unknown;
  recoveryToken?: unknown;
}): Promise<RecoverResult> => {
  const { qrToken, businessSlug, customerPhone, recoveryToken } = input;
  const present = (v: unknown) => v !== undefined && v !== null && v !== '';
  const hasToken = present(qrToken);
  const hasSlug = present(businessSlug);
  const hasSession = present(recoveryToken);
  if (
    (hasToken && typeof qrToken !== 'string') ||
    (hasSlug && typeof businessSlug !== 'string') ||
    (hasSession && typeof recoveryToken !== 'string')
  ) {
    throw new ServiceError(400, 'INVALID_REQUEST', 'Invalid request.');
  }

  // A saved session is checked first (cheap, no database), then the café it must match.
  const session = hasSession ? readRecoveryToken(recoveryToken) : null;
  if (hasSession && !session) throw SESSION_EXPIRED();

  const ten = session ? session.phone : tenDigits(customerPhone);
  if (!ten) throw new ServiceError(400, 'INVALID_PHONE', 'Enter a valid 10-digit phone number.');
  if (!hasToken && !hasSlug) throw new ServiceError(400, 'CAFE_REQUIRED', 'Scan the table QR code or open the café’s menu link first.');

  let businessId;
  if (hasToken) {
    const table = await Table.findOne({ qrToken });
    if (!table) throw new ServiceError(404, 'TABLE_NOT_FOUND', 'Invalid table QR code.');
    businessId = table.businessId;
  } else {
    const business = await Business.findOne({ slug: businessSlug });
    if (!business) throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Café not found.');
    businessId = business._id;
  }

  if (session) {
    if (session.businessId !== String(businessId)) throw SESSION_EXPIRED();
  } else if (!(await isPhoneRecoveryVerified(ten))) {
    throw new ServiceError(403, 'VERIFICATION_REQUIRED', 'Verify your phone number with the code we send you to find your order.');
  }

  const since = new Date(Date.now() - RECOVERY_WINDOW_HOURS * 3_600_000);
  const orders = await findRecentOrdersByPhonePattern(businessId, phoneMatchPattern(ten), since, RECOVERY_LIMIT);
  return {
    orders: orders.map((o) => ({
      _id: String(o._id),
      orderNumber: o.orderNumber,
      orderStatus: o.orderStatus,
      tableName: o.tableName,
      totalAmountPaise: o.totalAmountPaise,
      createdAt: o.createdAt
    })),
    ...(session ? {} : { session: signRecoveryToken({ phone: ten, businessId: String(businessId) }) })
  };
};
