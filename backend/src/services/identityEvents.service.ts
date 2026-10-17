// Measurement for café identity (spec §11): anonymous engagement events, the 30-day return rate
// computed from existing orders, and the per-café super admin readout comparing that rate before
// and after the café's identity was switched on.
import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { Order } from '../models/Order';
import { insertIdentityEvent, countIdentityEventsByKind } from '../dao/identityEvent.dao';
import { isIdentityOnFor } from './cafeIdentity.service';
import { phoneKeyOf } from '../utils/phone';
import { ServiceError } from '../utils/serviceError';

export const IDENTITY_EVENT_KINDS = [
  'welcome_shown',
  'welcome_usual_added',
  'tip_shown',
  'pairing_shown',
  'pairing_added',
  'pairing_ordered',
  'question_shown',
  'question_answered',
  'not_you_clicked'
] as const;
export type IdentityEventKind = (typeof IDENTITY_EVENT_KINDS)[number];

export const isIdentityEventKind = (kind: unknown): kind is IdentityEventKind =>
  typeof kind === 'string' && (IDENTITY_EVENT_KINDS as readonly string[]).includes(kind);

const DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_WINDOW_MS = 30 * DAY_MS;
/** The "before" rate looks at this many days before identity.enabledAt. */
export const BEFORE_WINDOW_DAYS = 60;

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const META_MAX_KEYS = 8;
const META_MAX_STRING = 100;
// Events stay anonymous whatever a caller passes in meta.
const IDENTIFYING_KEY = /phone|mobile|name|email/i;

const cleanMeta = (meta?: Record<string, unknown>): Record<string, string | number> | undefined => {
  if (!meta || typeof meta !== 'object') return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (Object.keys(out).length >= META_MAX_KEYS) break;
    if (key === 'orderId' || IDENTIFYING_KEY.test(key) || key.startsWith('$') || key.includes('.')) continue;
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, META_MAX_STRING);
  }
  return Object.keys(out).length ? out : undefined;
};

/**
 * Records one engagement event. Ignored (no write, no error) when identity is off for the café or
 * the platform, or the café doesn't exist. `meta.orderId`, when a valid id, is stored as the event's
 * orderId; other meta keeps only short string/number values and never identifying keys.
 * An unknown kind is a caller error (400).
 */
export const recordEvent = async (
  businessId: string,
  kind: IdentityEventKind,
  meta?: Record<string, string | number>
): Promise<void> => {
  if (!isIdentityEventKind(kind)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Unknown event kind.');
  }
  if (typeof businessId !== 'string' || !OBJECT_ID.test(businessId)) return;
  const business = await Business.findById(businessId, { identity: 1 }).lean();
  if (!isIdentityOnFor(business)) return;

  const orderId = typeof meta?.orderId === 'string' && OBJECT_ID.test(meta.orderId) ? new mongoose.Types.ObjectId(meta.orderId) : undefined;
  await insertIdentityEvent({
    businessId: new mongoose.Types.ObjectId(businessId),
    kind,
    at: new Date(),
    orderId,
    meta: cleanMeta(meta)
  });
};

/**
 * The 30-day return rate over the orders placed in [from, to]: of the guests (by phone, as
 * phoneKeyOf reads it) with an order in that window, the share who had an order there whose NEXT
 * order at the café came within 30 days. The next order may fall after `to`. Cancelled and refunded
 * orders don't count as visits. `rate` is 0 when there were no guests.
 */
export const returnRate30d = async (
  businessId: string,
  from: Date,
  to: Date
): Promise<{ guests: number; returned: number; rate: number }> => {
  const orders = await Order.find(
    {
      businessId,
      createdAt: { $gte: from, $lte: new Date(to.getTime() + RETURN_WINDOW_MS) },
      orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] }
    },
    { customerPhone: 1, createdAt: 1 }
  )
    .sort({ createdAt: 1 })
    .lean();

  const byGuest = new Map<string, number[]>();
  for (const o of orders) {
    const key = phoneKeyOf(o.customerPhone);
    if (!key) continue;
    const list = byGuest.get(key) ?? [];
    list.push(new Date(o.createdAt).getTime());
    byGuest.set(key, list);
  }

  const fromMs = from.getTime();
  const toMs = to.getTime();
  let guests = 0;
  let returned = 0;
  for (const times of byGuest.values()) {
    const inWindow = times.some((t) => t >= fromMs && t <= toMs);
    if (!inWindow) continue;
    guests++;
    const cameBack = times.some((t, i) => t >= fromMs && t <= toMs && i + 1 < times.length && times[i + 1] - t <= RETURN_WINDOW_MS);
    if (cameBack) returned++;
  }
  return { guests, returned, rate: guests ? returned / guests : 0 };
};

export interface IdentitySummaryRow {
  businessId: string;
  name: string;
  enabledAt?: Date;
  appliedAt?: Date;
  returnRateBefore: number | null;
  returnRateAfter: number | null;
  events30d: Partial<Record<IdentityEventKind, number>>;
}

/**
 * The super admin readout: every café with identity switched on, with its return rate in the
 * 60 days before identity.enabledAt and since then, the theme adoption date, and its event counts
 * for the last 30 days. A rate is null when there's no enabledAt or no guests in that window
 * (unknown, not 0%). Note the "after" window includes recent guests who haven't had 30 days to
 * come back yet, so it reads low for a café switched on recently.
 */
export const identitySummary = async (): Promise<IdentitySummaryRow[]> => {
  const businesses = await Business.find({ 'identity.enabled': true }, { name: 1, identity: 1 }).sort({ name: 1 }).lean();
  if (!businesses.length) return [];

  const now = new Date();
  const counts = await countIdentityEventsByKind(
    businesses.map((b) => b._id as mongoose.Types.ObjectId),
    new Date(now.getTime() - 30 * DAY_MS)
  );
  const eventsFor = new Map<string, Partial<Record<IdentityEventKind, number>>>();
  for (const c of counts) {
    const id = c._id.businessId.toString();
    const row = eventsFor.get(id) ?? {};
    if (isIdentityEventKind(c._id.kind)) row[c._id.kind] = c.count;
    eventsFor.set(id, row);
  }

  const rateOrNull = async (id: string, from: Date, to: Date) => {
    const r = await returnRate30d(id, from, to);
    return r.guests ? r.rate : null;
  };

  return Promise.all(
    businesses.map(async (b) => {
      const id = b._id.toString();
      const enabledAt = b.identity?.enabledAt ? new Date(b.identity.enabledAt) : undefined;
      return {
        businessId: id,
        name: b.name,
        enabledAt,
        appliedAt: b.identity?.appliedAt,
        returnRateBefore: enabledAt
          ? await rateOrNull(id, new Date(enabledAt.getTime() - BEFORE_WINDOW_DAYS * DAY_MS), enabledAt)
          : null,
        returnRateAfter: enabledAt ? await rateOrNull(id, enabledAt, now) : null,
        events30d: eventsFor.get(id) ?? {}
      };
    })
  );
};
