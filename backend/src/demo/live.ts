import { v4 as uuidv4 } from 'uuid';
import { Table } from '../models/Table';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { upsertVerifiedPhone, deleteVerifiedPhone } from '../dao/verifiedPhone.dao';
import { signAuthToken } from '../utils/authToken';
import { CafeContext } from './provision';
import { DemoOrderPlan, IDemoPlanStep, DemoPlanAction } from './models/DemoOrderPlan';
import { demoConfig } from './demo.config';
import { MINUTE_MS } from './clock';
import { between, chance } from './random';
import { pickCustomer, verificationMobileOf } from './customers';
import { buildBasket, kitchenMinutesFor, pickOutcome, pickPaymentMethod, BasketLine } from './demand';

// Live demo orders go through the same HTTP API a real customer and a real kitchen use: the
// customer's order is POSTed to /public/orders, and the "Kitchen Team" login moves it along with
// PUT /orders/:id/status. So every live demo order runs the app's own logic end to end — pricing,
// order numbers, table occupancy, payment ledger, sockets (the owner's dashboard rings and the
// kitchen board updates just as for a real order).

interface ApiResult {
  ok: boolean;
  status: number;
  body: any;
}

const callApi = async (method: string, path: string, body?: unknown, token?: string): Promise<ApiResult> => {
  const res = await fetch(`${demoConfig().apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text };
  }
  return { ok: res.ok, status: res.status, body: parsed };
};

const minutesAfter = (at: Date, minutes: number) => new Date(at.getTime() + minutes * MINUTE_MS);

// The kitchen's timeline for one order, starting now.
const planFor = (outcome: ReturnType<typeof pickOutcome>, lines: BasketLine[], paymentMethod: string, atTable: boolean, now: Date): IDemoPlanStep[] => {
  if (outcome === 'CUSTOMER_CANCEL') return [{ action: 'CUSTOMER_CANCEL', at: minutesAfter(now, between(1, 3)) }];
  if (outcome === 'STAFF_CANCEL') return [{ action: 'CANCELLED', at: minutesAfter(now, between(1, 4)) }];

  const acceptedAt = minutesAfter(now, between(1, 3));
  const preparingAt = minutesAfter(acceptedAt, between(1, 2));
  const readyAt = minutesAfter(preparingAt, kitchenMinutesFor(lines));
  const completedAt = minutesAfter(readyAt, atTable ? between(4, 12) : between(1, 4));
  const steps: IDemoPlanStep[] = [
    { action: 'CONFIRMED', at: acceptedAt },
    { action: 'PREPARING', at: preparingAt }
  ];
  // Most UPI payers tap "I've paid" on their tracking page while they wait.
  if (paymentMethod === 'ONLINE' && chance(0.7)) steps.push({ action: 'CUSTOMER_MARK_PAID', at: minutesAfter(readyAt, -between(0, 1)) });
  steps.push({ action: 'READY', at: readyAt }, { action: 'COMPLETED', at: completedAt });
  return steps.sort((a, b) => a.at.getTime() - b.at.getTime());
};

/** One customer walks in (or scans a table QR) and orders. Returns false if the order didn't go through. */
export const placeLiveOrder = async (ctx: CafeContext, now: Date): Promise<boolean> => {
  const { cafe, business } = ctx;
  if (!ctx.menu.length) return false;
  const customer = pickCustomer(cafe);
  const lines = buildBasket(cafe, ctx.menu);
  const paymentMethod = pickPaymentMethod(cafe);

  // A table order needs a table with no order in progress; otherwise it's a counter order.
  let qrToken: string | undefined;
  if (ctx.tables.length && chance(cafe.traffic.tableShare)) {
    const free = await Table.find({ businessId: business._id, status: 'AVAILABLE', isActive: true }).select('qrToken');
    if (free.length) qrToken = free[Math.floor(Math.random() * free.length)].qrToken;
  }

  // The order API only takes orders from a phone that passed OTP. These numbers can't receive an
  // OTP (none of them is real), so the bot records the verification itself, just for this order,
  // and removes it again afterwards.
  const mobile = verificationMobileOf(customer.phone);
  await upsertVerifiedPhone(mobile, 'ORDER', new Date(Date.now() + 10 * MINUTE_MS));

  try {
    const order = {
      customerName: customer.name,
      customerPhone: customer.phone,
      paymentMethod,
      items: lines.map((l) => ({ productId: String(l.entry.productId), quantity: l.quantity, name: l.entry.name })),
      idempotencyKey: `demo-${uuidv4()}`
    };
    let res = await callApi('POST', '/public/orders', qrToken ? { ...order, qrToken } : { ...order, businessSlug: business.slug });
    // Someone sat down at that table in the meantime: take it at the counter instead.
    if (!res.ok && res.body?.error?.code === 'TABLE_OCCUPIED') {
      qrToken = undefined;
      res = await callApi('POST', '/public/orders', { ...order, idempotencyKey: `demo-${uuidv4()}`, businessSlug: business.slug });
    }
    if (!res.ok) {
      console.warn(`[demo] ${cafe.slug}: order not placed (${res.status} ${res.body?.error?.code || ''} ${res.body?.error?.message || ''})`);
      return false;
    }

    const steps = planFor(pickOutcome(cafe), lines, paymentMethod, !!qrToken, now);
    await DemoOrderPlan.create({ orderId: res.body.data._id, businessId: business._id, steps, next: 0, nextAt: steps[0].at, done: false });
    return true;
  } finally {
    await deleteVerifiedPhone(mobile, 'ORDER');
  }
};

// Errors that mean "this step no longer applies" (a person already moved or cancelled the order
// from the dashboard) rather than "try again later".
const OBSOLETE_STEP_CODES = new Set(['ORDER_FINISHED', 'CANNOT_CANCEL', 'INVALID_TRANSITION', 'ORDER_NOT_FOUND', 'NOTHING_TO_REFUND', 'NOT_ONLINE_ORDER']);

const runStep = (action: DemoPlanAction, orderId: string, kitchenToken: string): Promise<ApiResult> => {
  if (action === 'CUSTOMER_CANCEL') return callApi('PUT', `/public/orders/${orderId}/cancel`);
  if (action === 'CUSTOMER_MARK_PAID') return callApi('PUT', `/public/orders/${orderId}/mark-paid`);
  return callApi('PUT', `/orders/${orderId}/status`, { status: action }, kitchenToken);
};

/** Carries out every plan step that's due by `now`. Returns how many steps went through. */
export const advanceLivePlans = async (now: Date, businessIds: string[]): Promise<number> => {
  const plans = await DemoOrderPlan.find({ done: false, nextAt: { $lte: now }, businessId: { $in: businessIds } })
    .sort({ nextAt: 1 })
    .limit(300);
  if (!plans.length) return 0;

  // One kitchen login per café, signed the same way a real login is.
  const tokens = new Map<string, string>();
  const kitchenTokenFor = async (businessId: string) => {
    if (!tokens.has(businessId)) {
      const kitchen = await User.findOne({ businessId, role: 'STAFF', email: /^kitchen\./ });
      tokens.set(businessId, kitchen ? signAuthToken(kitchen) : '');
    }
    return tokens.get(businessId)!;
  };

  let applied = 0;
  for (const plan of plans) {
    const orderId = plan.orderId.toString();
    const token = await kitchenTokenFor(plan.businessId.toString());
    let blocked = false;

    while (plan.next < plan.steps.length && plan.steps[plan.next].at <= now) {
      const res = await runStep(plan.steps[plan.next].action, orderId, token).catch(
        (err): ApiResult => ({ ok: false, status: 0, body: { error: { code: 'NETWORK_ERROR', message: err?.message } } })
      );
      if (res.ok) {
        applied++;
      } else if (!OBSOLETE_STEP_CODES.has(res.body?.error?.code) && res.status !== 404) {
        // Couldn't reach the API or something unexpected: leave the step for the next tick.
        console.warn(`[demo] step ${plan.steps[plan.next].action} on ${orderId} failed (${res.status} ${res.body?.error?.code || ''})`);
        blocked = true;
        break;
      }
      plan.next++;
    }

    // Also done once a person has finished the order from the dashboard themselves.
    const order = blocked ? null : await Order.findById(orderId).select('orderStatus');
    const finished = !order || ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.orderStatus);
    plan.done = !blocked && (plan.next >= plan.steps.length || finished);
    plan.nextAt = plan.done ? undefined : plan.steps[plan.next]?.at;
    await plan.save();
  }
  return applied;
};
