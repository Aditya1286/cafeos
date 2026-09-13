import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Business } from '../models/Business';
import { Remittance } from '../models/Remittance';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Fixed reference point so period boundaries are deterministic regardless of when they're
// computed — every business's periods land on the same grid, offset only by cycle length.
const PERIOD_EPOCH_MS = new Date('2024-01-01T00:00:00.000Z').getTime();
const MAX_PERIODS_PER_RUN = 2000; // safety cap, not a realistic ceiling (weekly cadence ~38yrs)

function getPeriodBounds(date: Date, cycleDays: number): { periodStart: Date; periodEnd: Date } {
  const cycleMs = cycleDays * MS_PER_DAY;
  const periodIndex = Math.floor((date.getTime() - PERIOD_EPOCH_MS) / cycleMs);
  const periodStart = new Date(PERIOD_EPOCH_MS + periodIndex * cycleMs);
  const periodEnd = new Date(periodStart.getTime() + cycleMs);
  return { periodStart, periodEnd };
}

/**
 * Lazily generates (upserts) a Remittance document for every CLOSED billing period between a
 * business's first paid order and now. No cron exists in this codebase — same on-demand-upsert
 * philosophy as orderSequence.ts's daily counter. Never touches status/paidAt/paidAmountPaise on
 * a period that's already been recorded, so marking one paid is never undone by regeneration.
 */
export async function ensureClosedRemittancePeriods(businessId: mongoose.Types.ObjectId | string): Promise<void> {
  const business = await Business.findById(businessId);
  if (!business) return;

  const cycleDays = business.remittanceCycleDays || 7;
  const cycleMs = cycleDays * MS_PER_DAY;

  const firstPaidOrder = await Order.findOne({ businessId, paymentStatus: 'PAID' }).sort({ createdAt: 1 });
  if (!firstPaidOrder) return; // nothing to bill yet

  const now = new Date();
  let { periodStart } = getPeriodBounds(firstPaidOrder.createdAt, cycleDays);

  for (let i = 0; i < MAX_PERIODS_PER_RUN; i++) {
    const periodEnd = new Date(periodStart.getTime() + cycleMs);
    if (periodEnd > now) break; // current period is still in progress — not persisted

    const [agg] = await Order.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId.toString()),
          paymentStatus: 'PAID',
          createdAt: { $gte: periodStart, $lt: periodEnd }
        }
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          grossAmountPaise: { $sum: '$totalAmountPaise' },
          commissionOwedPaise: { $sum: '$platformFeePaise' }
        }
      }
    ]);

    const ordersCount = agg?.ordersCount || 0;
    if (ordersCount > 0) {
      const dueDate = new Date(periodEnd.getTime() + cycleMs);
      await Remittance.findOneAndUpdate(
        { businessId, periodStart },
        {
          $set: {
            periodEnd,
            dueDate,
            ordersCount,
            grossAmountPaise: agg.grossAmountPaise || 0,
            commissionOwedPaise: agg.commissionOwedPaise || 0
          },
          $setOnInsert: { businessId, periodStart, status: 'UNPAID' }
        },
        { upsert: true }
      );
    }

    periodStart = periodEnd;
  }
}

export interface IRemittanceSummary {
  cycleDays: number;
  periods: any[];
  currentPeriod: {
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    ordersCount: number;
    grossAmountPaise: number;
    commissionOwedPaise: number;
  };
  totalUnpaidOwedPaise: number;
  overdueAmountPaise: number;
  overdueCount: number;
  nextDueDate: Date | null;
}

export async function getRemittanceSummary(businessId: mongoose.Types.ObjectId | string): Promise<IRemittanceSummary> {
  await ensureClosedRemittancePeriods(businessId);

  const business = await Business.findById(businessId);
  const cycleDays = business?.remittanceCycleDays || 7;
  const cycleMs = cycleDays * MS_PER_DAY;
  const now = new Date();

  const periods = await Remittance.find({ businessId }).sort({ periodStart: -1 }).lean();

  const { periodStart: curStart, periodEnd: curEnd } = getPeriodBounds(now, cycleDays);
  const [curAgg] = await Order.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId.toString()),
        paymentStatus: 'PAID',
        createdAt: { $gte: curStart, $lt: now }
      }
    },
    {
      $group: {
        _id: null,
        ordersCount: { $sum: 1 },
        grossAmountPaise: { $sum: '$totalAmountPaise' },
        commissionOwedPaise: { $sum: '$platformFeePaise' }
      }
    }
  ]);

  const currentPeriod = {
    periodStart: curStart,
    periodEnd: curEnd,
    dueDate: new Date(curEnd.getTime() + cycleMs),
    ordersCount: curAgg?.ordersCount || 0,
    grossAmountPaise: curAgg?.grossAmountPaise || 0,
    commissionOwedPaise: curAgg?.commissionOwedPaise || 0
  };

  const unpaid = periods.filter((p: any) => p.status === 'UNPAID');
  const overdue = unpaid.filter((p: any) => new Date(p.dueDate) < now);

  const totalUnpaidOwedPaise = unpaid.reduce((acc: number, p: any) => acc + p.commissionOwedPaise, 0);
  const overdueAmountPaise = overdue.reduce((acc: number, p: any) => acc + p.commissionOwedPaise, 0);
  const nextDueDate = unpaid.length > 0
    ? unpaid.reduce((earliest: Date, p: any) => (new Date(p.dueDate) < earliest ? new Date(p.dueDate) : earliest), new Date(unpaid[0].dueDate))
    : null;

  return {
    cycleDays,
    periods,
    currentPeriod,
    totalUnpaidOwedPaise,
    overdueAmountPaise,
    overdueCount: overdue.length,
    nextDueDate
  };
}
