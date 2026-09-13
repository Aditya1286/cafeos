import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';

export type BillingCycle = 'MONTHLY' | 'ANNUAL';

const CYCLE_DAYS: Record<BillingCycle, number> = { MONTHLY: 30, ANNUAL: 365 };

/**
 * The one place a business's active plan actually changes — used by the super admin's direct
 * "set plan" action and by approving a business-initiated upgrade request, so both paths compute
 * the new billing period the same way instead of drifting apart.
 */
export async function applyPlanChange(
  businessId: mongoose.Types.ObjectId | string,
  planId: mongoose.Types.ObjectId | string,
  billingCycle: BillingCycle = 'MONTHLY'
) {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || plan.status !== 'ACTIVE') {
    throw new Error('Selected plan does not exist or is disabled.');
  }

  const periodDays = CYCLE_DAYS[billingCycle] || CYCLE_DAYS.MONTHLY;
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(currentPeriodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);

  let subscription = await Subscription.findOne({ businessId });
  if (subscription) {
    subscription.planId = plan._id;
    subscription.billingCycle = billingCycle;
    subscription.status = 'ACTIVE';
    subscription.currentPeriodStart = currentPeriodStart;
    subscription.currentPeriodEnd = currentPeriodEnd;
    await subscription.save();
  } else {
    subscription = await Subscription.create({
      businessId,
      planId: plan._id,
      billingCycle,
      status: 'ACTIVE',
      currentPeriodStart,
      currentPeriodEnd
    });
  }

  return { subscription, plan };
}
