import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../utils/authToken';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { isDemoEnabled } from './demo.config';
import { DEMO_CAFES } from './cafes';

// Keeps the public demo owner login safe to hand out: whoever signs in to a demo café sees guests'
// phone numbers partly hidden, and can't change what the next prospect will see. Everything here
// is a no-op unless the demo is switched on, and only ever applies to the demo cafés' own users.

const CACHE_MS = 60_000;
const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS']);
// Open to everyone (guest ordering, OTP, tracking) or about signing in. A browser that is signed in
// as the demo owner sends that login with these requests too, but they are not the owner's to limit.
const OPEN_PATHS = /^\/(public|auth)(\/|$)/;
// The writes a visitor is meant to try: moving an order through the kitchen and marking it paid.
// The analytics screen reads its charts with a POST, so that is let through too.
const ALLOWED_WRITES: Array<[string, RegExp]> = [
  ['PUT', /^\/orders\/(bulk-status|[^/]+\/(status|confirm-payment))$/],
  ['POST', /^\/analytics\/query$/]
];

let demoIds: { at: number; ids: Set<string> } | null = null;
export const getDemoBusinessIds = async (): Promise<Set<string>> => {
  if (demoIds && Date.now() - demoIds.at < CACHE_MS) return demoIds.ids;
  const rows = await Business.find({ isDemo: true, slug: { $in: DEMO_CAFES.map((cafe) => cafe.slug) } }).select('_id').lean();
  demoIds = { at: Date.now(), ids: new Set(rows.map((row) => String(row._id))) };
  return demoIds.ids;
};

const userBusiness = new Map<string, { at: number; businessId: string | null }>();
const businessOfUser = async (userId: string): Promise<string | null> => {
  const hit = userBusiness.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.businessId;
  const user = await User.findById(userId).select('businessId').lean();
  const businessId = user?.businessId ? String(user.businessId) : null;
  userBusiness.set(userId, { at: Date.now(), businessId });
  return businessId;
};

/** 98••••3412: first two and last four digits of the number. */
export const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length < 7 ? '••••' : `${digits.slice(0, 2)}••••${digits.slice(-4)}`;
};

const maskIn = (node: any, parentKey?: string): void => {
  if (Array.isArray(node)) return node.forEach((item) => maskIn(item, parentKey));
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string' && (key === 'customerPhone' || (key === 'phone' && parentKey === 'customer'))) node[key] = maskPhone(value);
    else maskIn(value, key);
  }
};

/** A copy of `data` with guests' phone numbers hidden. */
export const maskPhones = <T>(data: T): T => {
  const copy = JSON.parse(JSON.stringify(data ?? null));
  maskIn(copy);
  return copy;
};

/** For realtime events: hides phone numbers when the café is a demo one, otherwise passes `data` through. */
export const maskForBusiness = async (businessId: string, data: any): Promise<any> =>
  (await getDemoBusinessIds()).has(String(businessId)) ? maskPhones(data) : data;

export const demoGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!isDemoEnabled() || !header?.startsWith('Bearer ') || OPEN_PATHS.test(req.path)) return next();
    const { id } = verifyAuthToken(header.split(' ')[1]);
    const businessId = await businessOfUser(String(id));
    if (!businessId || !(await getDemoBusinessIds()).has(businessId)) return next();

    if (!READ_ONLY.has(req.method) && !ALLOWED_WRITES.some(([method, path]) => req.method === method && path.test(req.path))) {
      return res.status(403).json({ success: false, error: { code: 'DEMO_READ_ONLY', message: 'This is a demo café, so changes are turned off. Request a demo to try it on your own café.' } });
    }
    const json = res.json.bind(res);
    res.json = (body: any) => json(maskPhones(body));
    next();
  } catch {
    next(); // an invalid token is the auth middleware's to reject
  }
};
