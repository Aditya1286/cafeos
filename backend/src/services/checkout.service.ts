// SMEPay Wizard Checkout — the optional, per-business online payment (see models/CheckoutSession.ts
// for the session lifecycle). The customer's cart is validated and priced up front, but no Order
// exists until SMEPay's /order/validate says the payment succeeded; only then is it placed, already
// PAID, through the same orderPlacement.service the normal flow uses.
//
// Confirmation never comes from anything the browser says: the return page, the customer's status
// polling and a background sweep all just trigger a server-side validate call. That also covers a
// customer who pays and closes the tab.
import mongoose from 'mongoose';
import { config } from '../config';
import { Business, IBusiness } from '../models/Business';
import { Order } from '../models/Order';
import { Table } from '../models/Table';
import { ICheckoutSession, ICheckoutAttempt, ICheckoutDraft } from '../models/CheckoutSession';
import * as sessionDao from '../dao/checkoutSession.dao';
import * as accountDao from '../dao/smepayAccount.dao';
import { ServiceError } from '../utils/serviceError';
import { decryptSecret } from '../utils/secretBox';
import { logger } from '../utils/logger';
import { wizCreateOrder, wizValidate, SmepayCredentials } from './payments/smepay.client';
import { prepareOrder, placeOrder, assertTableFree, markOrderPaid, OrderPlacementInput } from './orderPlacement.service';

const MAX_ATTEMPTS = 5;
// Customer polling hits SMEPay at most this often per session.
const STATUS_CHECK_THROTTLE_MS = 5_000;
// A finalizer that claimed a session but never finished (process died mid-way) is presumed dead
// after this long, and the session becomes claimable again.
const STALE_CLAIM_MS = 2 * 60_000;
const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH = 100;
// SMEPay payment_status values after which an attempt can't turn into a payment anymore.
const FINAL_FAILURE_STATUSES = ['FAILED', 'EXPIRED'];

type SessionDoc = ICheckoutSession;

export const isCheckoutAvailable = (business: Pick<IBusiness, 'checkoutAllowed' | 'checkoutEnabled'>) =>
  !!(business.checkoutAllowed && business.checkoutEnabled);

// What the customer's browser gets back — no phone, no draft, no SMEPay credentials.
const toView = (session: SessionDoc) => {
  const latest = session.attempts[session.attempts.length - 1];
  return {
    id: session._id,
    status: session.status,
    businessSlug: session.businessSlug,
    amountPaise: session.amountPaise,
    expiresAt: session.expiresAt,
    orderId: session.orderId || null,
    paymentUrl: latest?.paymentUrl || null,
    paymentStatus: latest?.lastStatus || null,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - session.attempts.length)
  };
};

export type CheckoutView = ReturnType<typeof toView>;

const ttlFromNow = () => new Date(Date.now() + config.checkoutSessionTtlMinutes * 60_000);

const getCredentials = async (businessId: mongoose.Types.ObjectId): Promise<SmepayCredentials> => {
  const account = await accountDao.findAccountWithSecret(businessId);
  if (!account || account.onboardingStatus !== 'CONNECTED' || !account.clientId || !account.clientSecretEnc) {
    throw new ServiceError(400, 'CHECKOUT_UNAVAILABLE', 'Online checkout is not available for this business right now.');
  }
  return { clientId: account.clientId, clientSecret: decryptSecret(account.clientSecretEnc) };
};

const loadSession = async (id: string): Promise<SessionDoc> => {
  const session = mongoose.Types.ObjectId.isValid(id) ? await sessionDao.findSessionById(id) : null;
  if (!session) {
    throw new ServiceError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found.');
  }
  return session;
};

const plainDraft = (session: SessionDoc): ICheckoutDraft => {
  const draft: any = session.draft;
  return typeof draft?.toObject === 'function' ? draft.toObject() : draft;
};

// Opens a fresh SMEPay Wizard order for this session and extends its hold window.
const openAttempt = async (session: SessionDoc, creds: SmepayCredentials): Promise<SessionDoc> => {
  const ref = `${session._id}-${session.attempts.length + 1}`;
  const order = await wizCreateOrder(creds, {
    ref,
    amountPaise: session.amountPaise,
    callbackUrl: `${config.frontendUrl}/c/${session.businessSlug}/checkout/${session._id}`,
    customer: { name: session.customerName, phone: session.customerPhone }
  });
  const attempt: ICheckoutAttempt = {
    ref,
    smepayOrderId: order.smepayOrderId,
    slug: order.slug,
    paymentUrl: order.paymentUrl,
    lastStatus: 'CREATED',
    createdAt: new Date()
  };
  const updated = await sessionDao.pushAttempt(session._id, attempt, ttlFromNow());
  if (!updated) throw new ServiceError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found.');
  return updated;
};

// ── Finalizing ──────────────────────────────────────────────────────────────

/**
 * Turns a paid session into its order. Exactly one caller wins the claim; everyone else just
 * reloads. Safe to re-run after a crash: an order already carrying this checkoutSessionId is
 * picked up instead of a second one being created (Order.checkoutSessionId is unique too).
 */
const finalize = async (session: SessionDoc, attempt: ICheckoutAttempt): Promise<SessionDoc> => {
  const now = new Date();
  const claimed = await sessionDao.claimForFinalize(session._id, now, new Date(now.getTime() - STALE_CLAIM_MS));
  if (!claimed) {
    return (await sessionDao.findSessionById(session._id)) || session;
  }

  const smepayTransactionId = attempt.smepayOrderId || attempt.ref;

  // The customer switched to cash/direct UPI, but this payment went through after all — mark
  // the order they already have as paid instead of creating a second one.
  const existingOrder = claimed.orderId
    ? await Order.findById(claimed.orderId)
    : await Order.findOne({ checkoutSessionId: claimed._id });

  if (existingOrder) {
    if (existingOrder.paymentMethod !== 'CHECKOUT') {
      const paid = await markOrderPaid(existingOrder._id, { smepayTransactionId });
      if (!paid) {
        // Already paid another way (staff confirmed cash too) — the customer has paid twice.
        logger.warn(
          { checkoutSessionId: claimed._id.toString(), orderId: existingOrder._id.toString() },
          '[checkout] SMEPay payment succeeded for an order that was already paid — needs a manual refund'
        );
      }
    }
    return (await sessionDao.updateSession(claimed._id, { status: 'PAID', orderId: existingOrder._id, paidAt: now })) || claimed;
  }

  const business = await Business.findById(claimed.businessId);
  if (!business) {
    throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  }
  // The money is already taken, so the order is placed even if the table has meanwhile been
  // taken by someone else, disabled, or deleted (tableName is kept in the draft either way).
  const table = claimed.tableId ? await Table.findById(claimed.tableId) : null;

  let order;
  try {
    order = await placeOrder({
      business,
      table,
      customerName: claimed.customerName,
      customerPhone: claimed.customerPhone,
      draft: plainDraft(claimed),
      paymentMethod: 'CHECKOUT',
      paymentStatus: 'PAID',
      paymentProvider: 'SMEPAY',
      transactionId: smepayTransactionId,
      checkoutSessionId: claimed._id
    });
  } catch (error: any) {
    // Duplicate key on checkoutSessionId: another finalizer got there first after all.
    if (error?.code === 11000) {
      const winner = await Order.findOne({ checkoutSessionId: claimed._id });
      if (winner) {
        return (await sessionDao.updateSession(claimed._id, { status: 'PAID', orderId: winner._id, paidAt: now })) || claimed;
      }
    }
    throw error;
  }

  return (await sessionDao.updateSession(claimed._id, { status: 'PAID', orderId: order._id, paidAt: now })) || claimed;
};

// A FINALIZING claim whose owner died without the payment having succeeded (i.e. a crashed
// switchMethod): put the session back into whichever state its order (if any) says it's in.
const recoverStaleClaim = async (session: SessionDoc): Promise<SessionDoc> => {
  const order = await Order.findOne({ checkoutSessionId: session._id });
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS);
  if (!session.claimedAt || session.claimedAt > staleBefore) return session;

  let update: Partial<ICheckoutSession>;
  if (order) {
    update = order.paymentMethod === 'CHECKOUT'
      ? { status: 'PAID', orderId: order._id, paidAt: order.paymentConfirmedAt || new Date() }
      : { status: 'SWITCHED', orderId: order._id };
  } else {
    update = { status: session.expiresAt < new Date() ? 'EXPIRED' : 'PENDING' };
  }
  return (await sessionDao.transitionSession(session._id, ['FINALIZING'], update.status!, update)) || session;
};

// ── Checking with SMEPay ────────────────────────────────────────────────────

/**
 * Asks SMEPay about every attempt that could still turn into a payment; finalizes on the first
 * validated SUCCESS, otherwise expires the session once its hold window has passed.
 */
const pollProvider = async (session: SessionDoc): Promise<SessionDoc> => {
  if (session.status === 'PAID' || !session.attempts.length) return session;

  const creds = await getCredentials(session.businessId);
  const checkedAt = new Date();

  for (const attempt of session.attempts) {
    if (FINAL_FAILURE_STATUSES.includes(attempt.lastStatus)) continue;

    const result = await wizValidate(creds, { slug: attempt.slug, amountPaise: session.amountPaise });
    if (result.paymentStatus && result.paymentStatus !== attempt.lastStatus) {
      attempt.lastStatus = result.paymentStatus;
    }
    await sessionDao.setAttemptStatus(session._id, attempt.ref, attempt.lastStatus, checkedAt);

    if (result.valid && result.paymentStatus === 'SUCCESS') {
      return finalize(session, attempt);
    }
  }

  if (session.status === 'FINALIZING') {
    return recoverStaleClaim(session);
  }
  if (session.status === 'PENDING' && session.expiresAt < checkedAt) {
    return (await sessionDao.transitionSession(session._id, ['PENDING'], 'EXPIRED')) || session;
  }
  return (await sessionDao.findSessionById(session._id)) || session;
};

// ── Public API ──────────────────────────────────────────────────────────────

export const startCheckout = async (input: OrderPlacementInput): Promise<CheckoutView> => {
  const prepared = await prepareOrder(input);
  const { business, table } = prepared;

  if (!isCheckoutAvailable(business)) {
    throw new ServiceError(400, 'CHECKOUT_UNAVAILABLE', 'Online checkout is not available for this business right now.');
  }
  const creds = await getCredentials(business._id);

  const session = await sessionDao.createSession({
    businessId: business._id,
    businessSlug: business.slug,
    tableId: table ? table._id : undefined,
    customerName: prepared.customerName,
    customerPhone: prepared.customerPhone,
    draft: prepared.draft,
    amountPaise: prepared.draft.totalAmountPaise,
    status: 'PENDING',
    attempts: [],
    expiresAt: ttlFromNow()
  });

  try {
    return toView(await openAttempt(session, creds));
  } catch (error) {
    // Nothing was charged — close the session so nothing ever tries to validate it.
    await sessionDao.transitionSession(session._id, ['PENDING'], 'EXPIRED');
    throw error;
  }
};

/**
 * The customer's return page polls this. Checks with SMEPay (throttled) while the session is
 * still open; a provider outage just returns the last known state rather than failing the poll.
 */
export const getCheckoutStatus = async (id: string): Promise<CheckoutView> => {
  let session = await loadSession(id);
  const due = !session.lastCheckedAt || Date.now() - session.lastCheckedAt.getTime() >= STATUS_CHECK_THROTTLE_MS;

  if (['PENDING', 'EXPIRED'].includes(session.status) && due) {
    try {
      session = await pollProvider(session);
    } catch (error: any) {
      if (!(error instanceof ServiceError) || error.statusCode !== 502) throw error;
      logger.warn({ checkoutSessionId: id, err: error.message }, '[checkout] SMEPay status check failed');
    }
  }
  return toView(session);
};

export const retryCheckout = async (id: string): Promise<CheckoutView> => {
  let session = await loadSession(id);
  if (session.status === 'SWITCHED') {
    throw new ServiceError(409, 'CHECKOUT_CLOSED', 'This order was already placed with another payment method.');
  }

  // The previous attempt may have gone through after all — never charge twice.
  session = await pollProvider(session);
  if (session.status !== 'PENDING' && session.status !== 'EXPIRED') {
    return toView(session);
  }
  if (session.attempts.length >= MAX_ATTEMPTS) {
    throw new ServiceError(429, 'TOO_MANY_ATTEMPTS', 'Too many payment attempts. Please choose another payment method.');
  }

  const business = await Business.findById(session.businessId);
  if (!business || !isCheckoutAvailable(business)) {
    throw new ServiceError(400, 'CHECKOUT_UNAVAILABLE', 'Online checkout is not available for this business right now.');
  }
  const creds = await getCredentials(session.businessId);

  const reopened = await sessionDao.transitionSession(session._id, ['PENDING', 'EXPIRED'], 'PENDING');
  if (!reopened) {
    return toView((await sessionDao.findSessionById(session._id)) || session);
  }
  return toView(await openAttempt(reopened, creds));
};

/**
 * Gives up on online checkout and places a normal, unpaid cash/direct-UPI order from the saved
 * cart. The session stays linked to that order, so a payment that still goes through later marks
 * it paid rather than creating a duplicate.
 */
export const switchPaymentMethod = async (id: string, paymentMethod: unknown): Promise<CheckoutView> => {
  if (paymentMethod !== 'CASH' && paymentMethod !== 'ONLINE') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'paymentMethod must be CASH or ONLINE.');
  }

  let session = await loadSession(id);
  if (session.status === 'SWITCHED' || session.status === 'PAID') {
    return toView(session);
  }

  // If the payment actually went through, the customer gets their paid order, not a second one.
  session = await pollProvider(session);
  if (session.status !== 'PENDING' && session.status !== 'EXPIRED') {
    return toView(session);
  }

  const previousStatus = session.status;
  const claimed = await sessionDao.transitionSession(session._id, [previousStatus], 'FINALIZING', { claimedAt: new Date() });
  if (!claimed) {
    return toView((await sessionDao.findSessionById(session._id)) || session);
  }

  try {
    const business = await Business.findById(claimed.businessId);
    if (!business || business.status === 'SUSPENDED') {
      throw new ServiceError(403, 'BUSINESS_INACTIVE', 'This business is currently inactive.');
    }
    // Nothing is paid yet, so the normal one-active-order-per-table rule applies again.
    const table = claimed.tableId ? await Table.findById(claimed.tableId) : null;
    if (table) await assertTableFree(table);

    const order = await placeOrder({
      business,
      table,
      customerName: claimed.customerName,
      customerPhone: claimed.customerPhone,
      draft: plainDraft(claimed),
      paymentMethod,
      paymentStatus: 'UNPAID',
      checkoutSessionId: claimed._id
    });
    const switched = await sessionDao.updateSession(claimed._id, { status: 'SWITCHED', orderId: order._id });
    return toView(switched || claimed);
  } catch (error) {
    await sessionDao.transitionSession(claimed._id, ['FINALIZING'], previousStatus);
    throw error;
  }
};

// ── Background sweep ────────────────────────────────────────────────────────

/**
 * One pass over every session that could still be (or become) paid: open ones, recently expired
 * ones (late payments still create the order), switched ones (a late payment marks that order
 * paid) and claims left behind by a crashed finalizer.
 */
export const sweepOnce = async (): Promise<void> => {
  const now = Date.now();
  const sessions = await sessionDao.findSessionsToSweep(
    new Date(now - config.checkoutLateGraceMinutes * 60_000),
    new Date(now - STALE_CLAIM_MS),
    SWEEP_BATCH
  );
  for (const session of sessions) {
    try {
      await pollProvider(session);
    } catch (error: any) {
      logger.warn({ checkoutSessionId: session._id.toString(), err: error?.message }, '[checkout] sweep check failed');
    }
  }
};

let sweepStarted = false;
let sweepRunning = false;

export const startCheckoutSweep = () => {
  if (sweepStarted) return;
  sweepStarted = true;
  setInterval(async () => {
    if (sweepRunning) return; // a slow SMEPay must not stack overlapping sweeps
    sweepRunning = true;
    try {
      await sweepOnce();
    } catch (error: any) {
      logger.error({ err: error?.message }, '[checkout] sweep failed');
    } finally {
      sweepRunning = false;
    }
  }, SWEEP_INTERVAL_MS).unref();
};
