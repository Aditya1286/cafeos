import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { SubscriptionUpgradeRequest } from '../models/SubscriptionUpgradeRequest';
import { config } from '../config';

// Owner/Staff: current plan + any pending upgrade request + where to pay for one.
export const getMySubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await Subscription.findOne({ businessId: req.businessId }).populate('planId');
    const pendingRequest = await SubscriptionUpgradeRequest.findOne({ businessId: req.businessId, status: 'PENDING' }).populate('planId');

    return res.json({
      success: true,
      data: {
        currentPlan: subscription?.planId || null,
        billingCycle: subscription?.billingCycle || 'MONTHLY',
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        pendingRequest,
        platformUpiVpa: config.platformUpiVpa,
        platformPayeeName: config.platformPayeeName
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: request a plan change. Doesn't touch the active subscription — only a super
// admin approving this (after payment) does that. Only one pending request at a time; asking
// again before paying just updates the existing one instead of piling up duplicates.
export const createUpgradeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { planId, billingCycle } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A plan is required.' } });
    }
    const cycle = billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || plan.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Selected plan does not exist or is disabled.' } });
    }

    const amountPaise = cycle === 'ANNUAL' ? plan.annualPricePaise : plan.monthlyPricePaise;

    let request = await SubscriptionUpgradeRequest.findOne({ businessId: req.businessId, status: 'PENDING' });
    if (request) {
      request.planId = plan._id;
      request.billingCycle = cycle;
      request.amountPaise = amountPaise;
      request.merchantMarkedPaidAt = undefined;
      request.merchantReportedUtr = '';
      await request.save();
    } else {
      request = await SubscriptionUpgradeRequest.create({
        businessId: req.businessId,
        planId: plan._id,
        billingCycle: cycle,
        amountPaise,
        status: 'PENDING'
      });
    }

    return res.status(201).json({ success: true, data: request, message: `Upgrade to ${plan.name} requested` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: self-report payment for the pending request — same limitation as commission
// remittance, no gateway, so this only timestamps the claim for a super admin to verify and
// approve. Never changes the active plan by itself.
export const markUpgradeRequestPaid = async (req: AuthRequest, res: Response) => {
  try {
    const { utr } = req.body;
    const request = await SubscriptionUpgradeRequest.findOne({ businessId: req.businessId, status: 'PENDING' });
    if (!request) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No pending upgrade request found.' } });
    }
    request.merchantMarkedPaidAt = new Date();
    request.merchantReportedUtr = utr ? String(utr).trim() : '';
    await request.save();

    return res.json({ success: true, message: "Thanks — we'll confirm receipt and activate your plan shortly.", data: request });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: back out of a pending request before paying.
export const cancelUpgradeRequest = async (req: AuthRequest, res: Response) => {
  try {
    const request = await SubscriptionUpgradeRequest.findOne({ businessId: req.businessId, status: 'PENDING' });
    if (!request) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No pending upgrade request found.' } });
    }
    await request.deleteOne();
    return res.json({ success: true, message: 'Upgrade request cancelled.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
