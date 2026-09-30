import mongoose from 'mongoose';
import { Remittance } from '../models/Remittance';
import { FinancialLedger } from '../models/FinancialLedger';
import { ensureClosedRemittancePeriods } from '../services/remittance.service';
import { CafeContext } from './provision';

// Demo cafés pay their platform fees on time, so they never pile up as overdue in the super admin's
// fee queue. The billing periods themselves come from the existing remittance service; marking one
// paid writes what superAdminController.markRemittancePaid writes (status, paid date and amount, and
// a BUSINESS_SETTLEMENT ledger row), dated a day before it fell due.
const SETTLE_EVERY_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const settleDueFees = async (ctx: CafeContext, now: Date): Promise<number> => {
  const { state, business } = ctx;
  if (state.lastSettledAt && now.getTime() - state.lastSettledAt.getTime() < SETTLE_EVERY_MS) return 0;

  await ensureClosedRemittancePeriods(business._id);
  const due = await Remittance.find({ businessId: business._id, status: 'UNPAID', dueDate: { $lt: now } });

  for (const remittance of due) {
    const paidAt = new Date(Math.max(remittance.periodEnd.getTime(), remittance.dueDate.getTime() - DAY_MS));
    remittance.status = 'PAID';
    remittance.paidAt = paidAt;
    remittance.paidAmountPaise = remittance.commissionOwedPaise;
    remittance.notes = 'Demo café: paid on time automatically.';
    await remittance.save();

    await FinancialLedger.create({
      transactionId: `TXN_SETTLE_${new mongoose.Types.ObjectId().toString().toUpperCase()}`,
      businessId: remittance.businessId,
      type: 'BUSINESS_SETTLEMENT',
      amountPaise: remittance.paidAmountPaise,
      currency: 'INR',
      status: 'SUCCESS',
      metadata: {
        remittanceId: remittance._id,
        periodStart: remittance.periodStart,
        periodEnd: remittance.periodEnd,
        note: 'Commission remittance received from business'
      },
      createdAt: paidAt,
      updatedAt: paidAt
    });
  }

  state.lastSettledAt = now;
  await state.save();
  return due.length;
};
