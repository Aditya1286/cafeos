import mongoose from 'mongoose';
import { CheckoutSession, ICheckoutSession, ICheckoutAttempt, CheckoutSessionStatus } from '../models/CheckoutSession';

// Pure data-access layer for CheckoutSession — no validation or business rules here, that
// lives in ../services/checkout.service.ts.

type Id = mongoose.Types.ObjectId | string;

export const createSession = (data: Partial<ICheckoutSession>): Promise<ICheckoutSession> =>
  CheckoutSession.create(data);

export const findSessionById = (id: Id): Promise<ICheckoutSession | null> => CheckoutSession.findById(id);

export const pushAttempt = (id: Id, attempt: ICheckoutAttempt, expiresAt: Date): Promise<ICheckoutSession | null> =>
  CheckoutSession.findByIdAndUpdate(id, { $push: { attempts: attempt }, $set: { expiresAt } }, { new: true });

export const setAttemptStatus = (id: Id, ref: string, lastStatus: string, checkedAt: Date): Promise<unknown> =>
  CheckoutSession.updateOne(
    { _id: id, 'attempts.ref': ref },
    { $set: { 'attempts.$.lastStatus': lastStatus, lastCheckedAt: checkedAt } }
  );

// Atomically moves a session from one of `from` to `to` — the compare-and-set that lets exactly
// one caller (status poll, sweep, retry, switch) win a transition.
export const transitionSession = (
  id: Id,
  from: CheckoutSessionStatus[],
  to: CheckoutSessionStatus,
  extra: Record<string, unknown> = {}
): Promise<ICheckoutSession | null> =>
  CheckoutSession.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: { status: to, ...extra } }, { new: true });

// Claims a session for finalizing: either still open, or stuck mid-finalize past `staleBefore`
// (the finalizer that claimed it died before finishing).
export const claimForFinalize = (id: Id, now: Date, staleBefore: Date): Promise<ICheckoutSession | null> =>
  CheckoutSession.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { status: { $in: ['PENDING', 'EXPIRED', 'SWITCHED'] } },
        { status: 'FINALIZING', claimedAt: { $lt: staleBefore } }
      ]
    },
    { $set: { status: 'FINALIZING', claimedAt: now } },
    { new: true }
  );

export const updateSession = (id: Id, update: Partial<ICheckoutSession>): Promise<ICheckoutSession | null> =>
  CheckoutSession.findByIdAndUpdate(id, { $set: update }, { new: true });

// Sessions the background sweep should still ask SMEPay about.
export const findSessionsToSweep = (openSince: Date, staleBefore: Date, limit: number): Promise<ICheckoutSession[]> =>
  CheckoutSession.find({
    $or: [
      { status: { $in: ['PENDING', 'EXPIRED', 'SWITCHED'] }, expiresAt: { $gt: openSince } },
      { status: 'FINALIZING', claimedAt: { $lt: staleBefore } }
    ]
  })
    .sort({ expiresAt: 1 })
    .limit(limit);
