import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Business } from '../models/Business';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { Remittance } from '../models/Remittance';
import { InventoryItem } from '../models/InventoryItem';
import { ensureClosedRemittancePeriods, getRemittanceSummary } from '../services/remittance.service';
import { computeRepeatCustomerStats, computeItemMargins, computeKitchenSpeed } from '../services/businessInsights.service';
import mongoose from 'mongoose';

export const getSuperAdminOverview = async (req: AuthRequest, res: Response) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ status: 'ACTIVE' });
    const suspendedBusinesses = await Business.countDocuments({ status: 'SUSPENDED' });

    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ paymentStatus: 'PAID' });

    // Financial Ledger Metrics
    const gmvAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'ORDER_PAYMENT', status: 'SUCCESS' } },
      { $group: { _id: null, totalGMVPaise: { $sum: '$amountPaise' } } }
    ]);
    const totalGMVPaise = gmvAggregation[0]?.totalGMVPaise || 0;

    const platformFeeAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'PLATFORM_FEE', status: 'SUCCESS' } },
      { $group: { _id: null, totalPlatformFeesPaise: { $sum: '$amountPaise' } } }
    ]);
    const totalPlatformFeesPaise = platformFeeAggregation[0]?.totalPlatformFeesPaise || 0;

    const subscriptionRevenueAggregation = await FinancialLedger.aggregate([
      { $match: { type: 'SUBSCRIPTION_FEE', status: 'SUCCESS' } },
      { $group: { _id: null, totalSubscriptionRevenuePaise: { $sum: '$amountPaise' } } }
    ]);
    const totalSubscriptionRevenuePaise = subscriptionRevenueAggregation[0]?.totalSubscriptionRevenuePaise || 0;

    const totalPlatformRevenuePaise = totalPlatformFeesPaise + totalSubscriptionRevenuePaise;

    // Average Order Value (AOV) — GMV only comes from PAID orders, so the denominator has to be
    // paid orders too (this used to divide by every order ever placed, including cancelled/unpaid
    // ones, which understated AOV).
    const avgOrderValuePaise = paidOrders > 0 ? Math.round(totalGMVPaise / paidOrders) : 0;

    // Platform-wide low stock alert count, for a genuine "needs attention" signal instead of a
    // fabricated one.
    const lowStockItemsCount = await InventoryItem.countDocuments({ status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] } });

    // Repeat-customer rate across every business, grouped by phone number (a customer can only
    // place an order with a phone, so it's a reliable identity key here).
    const customerAggregation = await Order.aggregate([
      { $group: { _id: '$customerPhone', orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } }
        }
      }
    ]);
    const totalCustomers = customerAggregation[0]?.totalCustomers || 0;
    const repeatCustomers = customerAggregation[0]?.repeatCustomers || 0;
    const repeatCustomerPercentage = totalCustomers > 0
      ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
      : null;

    // Fetch recent 10 orders with business info
    const recentOrdersRaw = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('businessId', 'name slug')
      .lean();

    const recentOrders = recentOrdersRaw.map((o: any) => ({
      _id: o._id.toString(),
      orderNumber: o.orderNumber,
      businessName: o.businessId?.name || 'Unknown Business',
      tableName: o.tableName,
      customerName: o.customerName,
      itemsCount: o.items?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 1,
      total: Math.round((o.totalAmountPaise || 0) / 100),
      status: o.orderStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt
    }));

    // Plans list, with how many active subscriptions are actually on each one —
    // the admin plans view is otherwise just a static pricing sheet with no signal
    // on whether anyone is actually subscribed to what's being edited.
    const plans = await SubscriptionPlan.find().lean();
    const subscriberCounts = await Subscription.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$planId', count: { $sum: 1 } } }
    ]);
    const countsByPlan = new Map(subscriberCounts.map((c: any) => [c._id.toString(), c.count]));
    const plansWithCounts = plans.map((p: any) => ({ ...p, subscriberCount: countsByPlan.get(p._id.toString()) || 0 }));

    return res.json({
      success: true,
      data: {
        metrics: {
          totalBusinesses,
          activeBusinesses,
          suspendedBusinesses,
          totalUsers,
          totalOrders,
          paidOrders,
          totalGMVPaise,
          totalPlatformFeesPaise,
          totalSubscriptionRevenuePaise,
          totalPlatformRevenuePaise,
          avgOrderValuePaise,
          lowStockItemsCount,
          totalCustomers,
          repeatCustomers,
          repeatCustomerPercentage
        },
        recentOrders,
        plans: plansWithCounts
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getAllBusinesses = async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await Business.find().sort({ createdAt: -1 }).lean();

    // Ensure every business's closed remittance periods exist, then pull a financial snapshot
    // per business in one aggregation. Fine at this app's scale — if the business count grows
    // large, move the period-generation step to a scheduled job instead of doing it per-request.
    await Promise.all(businesses.map((b: any) => ensureClosedRemittancePeriods(b._id)));

    const financials = await Remittance.aggregate([
      {
        $group: {
          _id: '$businessId',
          lifetimeGMVPaise: { $sum: '$grossAmountPaise' },
          totalCommissionOwedPaise: {
            $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, '$commissionOwedPaise', 0] }
          },
          overdueAmountPaise: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'UNPAID'] }, { $lt: ['$dueDate', new Date()] }] },
                '$commissionOwedPaise',
                0
              ]
            }
          },
          nextDueDate: {
            $min: { $cond: [{ $eq: ['$status', 'UNPAID'] }, '$dueDate', null] }
          }
        }
      }
    ]);

    const financialsByBusiness = new Map(financials.map((f: any) => [f._id.toString(), f]));

    // Which plan each business is actually on — the businesses table otherwise has no
    // way to show or change this, even though `/admin/plans` lets you edit the plans
    // themselves.
    const subscriptions = await Subscription.find({ businessId: { $in: businesses.map((b: any) => b._id) } })
      .populate('planId', 'name code')
      .lean();
    const subscriptionByBusiness = new Map(subscriptions.map((s: any) => [s.businessId.toString(), s]));

    const businessesWithFinancials = businesses.map((b: any) => {
      const f = financialsByBusiness.get(b._id.toString());
      const sub = subscriptionByBusiness.get(b._id.toString());
      return {
        ...b,
        lifetimeGMVPaise: f?.lifetimeGMVPaise || 0,
        totalCommissionOwedPaise: f?.totalCommissionOwedPaise || 0,
        overdueAmountPaise: f?.overdueAmountPaise || 0,
        nextDueDate: f?.nextDueDate || null,
        currentPlan: sub?.planId ? { _id: sub.planId._id, name: sub.planId.name, code: sub.planId.code } : null,
        subscriptionStatus: sub?.status || null
      };
    });

    return res.json({ success: true, data: businessesWithFinancials });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getBusinessRemittances = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found' } });
    }

    const summary = await getRemittanceSummary(id);

    return res.json({
      success: true,
      data: {
        business: {
          _id: business._id,
          name: business.name,
          slug: business.slug,
          commissionRatePercentage: business.commissionRatePercentage,
          remittanceCycleDays: business.remittanceCycleDays
        },
        ...summary
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const markRemittancePaid = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paidAmountPaise, notes } = req.body;

    const remittance = await Remittance.findById(id);
    if (!remittance) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Remittance period not found' } });
    }
    if (remittance.status === 'PAID') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'This period is already marked paid.' } });
    }

    remittance.status = 'PAID';
    remittance.paidAt = new Date();
    remittance.paidAmountPaise = paidAmountPaise ?? remittance.commissionOwedPaise;
    remittance.markedPaidByUserId = req.user?._id;
    if (notes) remittance.notes = notes;
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
      }
    });

    return res.json({ success: true, message: 'Remittance marked as paid', data: remittance });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Super admin: undo a mistaken "mark as paid" — reverts the period back to UNPAID (so it
// reappears in the pending queue) and removes the settlement ledger entry that was created,
// so the ledger never carries a settlement for a period that isn't actually settled.
export const markRemittanceUnpaid = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const remittance = await Remittance.findById(id);
    if (!remittance) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Remittance period not found' } });
    }
    if (remittance.status !== 'PAID') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PAID', message: 'This period is not marked paid.' } });
    }

    remittance.status = 'UNPAID';
    remittance.paidAt = undefined;
    remittance.paidAmountPaise = undefined;
    remittance.markedPaidByUserId = undefined;
    await remittance.save();

    await FinancialLedger.deleteOne({ type: 'BUSINESS_SETTLEMENT', 'metadata.remittanceId': remittance._id });

    return res.json({ success: true, message: 'Remittance reverted to unpaid', data: remittance });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Super admin: every remittance request across every business, in one place — so verifying and
// settling commission collections doesn't require opening each business's finance drawer one at
// a time. Defaults to the actionable queue (UNPAID); ?status=PAID reads back the settled log.
export const getAllRemittanceRequests = async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = (req.query.status as string) || 'UNPAID';

    const businesses = await Business.find().select('_id').lean();
    await Promise.all(businesses.map((b: any) => ensureClosedRemittancePeriods(b._id)));

    const query: any = {};
    if (statusFilter !== 'ALL') {
      query.status = statusFilter;
    }

    const remittances = await Remittance.find(query)
      .populate('businessId', 'name slug')
      .populate('markedPaidByUserId', 'name email')
      .sort(statusFilter === 'PAID' ? { paidAt: -1 } : { dueDate: 1 })
      .lean();

    return res.json({ success: true, data: remittances });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateBusinessFinanceSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { commissionRatePercentage, remittanceCycleDays } = req.body;

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found' } });
    }

    if (commissionRatePercentage !== undefined) {
      if (typeof commissionRatePercentage !== 'number' || commissionRatePercentage < 0 || commissionRatePercentage > 100) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'commissionRatePercentage must be a number between 0 and 100.' } });
      }
      business.commissionRatePercentage = commissionRatePercentage;
    }
    if (remittanceCycleDays !== undefined) {
      if (typeof remittanceCycleDays !== 'number' || remittanceCycleDays < 1) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'remittanceCycleDays must be a positive number.' } });
      }
      business.remittanceCycleDays = remittanceCycleDays;
    }

    await business.save();
    return res.json({ success: true, message: 'Finance settings updated', data: business });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Moves a business onto a different subscription plan. Every business gets one
// Subscription row at registration and previously had no way to ever change it —
// this is the only place that plan assignment can happen post-signup.
export const changeBusinessPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;

    if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid planId is required.' } });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found' } });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || plan.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Selected plan does not exist or is disabled.' } });
    }

    let subscription = await Subscription.findOne({ businessId: business._id });
    if (subscription) {
      subscription.planId = plan._id;
      subscription.status = 'ACTIVE';
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        businessId: business._id,
        planId: plan._id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    return res.json({
      success: true,
      message: `${business.name} moved to the ${plan.name} plan`,
      data: { subscription, plan: { _id: plan._id, name: plan.name, code: plan.code } }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const toggleBusinessStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' | 'SUSPENDED'

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found' } });

    business.status = status;
    await business.save();

    return res.json({
      success: true,
      message: `Business status updated to ${status}`,
      data: business
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, monthlyPricePaise, annualPricePaise, perOrderFeePaise, limits, isPopular } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Plan name is required.' } });
    }
    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Plan code is required.' } });
    }

    const existing = await SubscriptionPlan.findOne({ code: String(code).trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_CODE', message: `A plan with code "${code}" already exists.` } });
    }

    const plan = await SubscriptionPlan.create({
      name,
      code,
      description: description || '',
      monthlyPricePaise: monthlyPricePaise || 0,
      annualPricePaise: annualPricePaise || 0,
      perOrderFeePaise: perOrderFeePaise || 200,
      limits: limits || {},
      isPopular: isPopular || false
    });

    return res.status(201).json({ success: true, data: plan, message: 'Subscription Plan created' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateSubscriptionPlan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    return res.json({ success: true, data: plan, message: 'Subscription Plan updated' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getSuperAdminAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // Matches the exact preset ids SuperAdminDashboard/NavbarAdmin already use as `dateRange`.
    const range = (req.query.range as string) || 'today';
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let dateFormat: string;

    if (range === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFormat = '%Y-%m-%d';
    } else if (range === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFormat = '%Y-%m-%d';
    } else if (range === 'yesterday') {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      startDate = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      endDate = startOfToday;
      dateFormat = '%H:00';
    } else {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      dateFormat = '%H:00';
    }

    const revenueTimeseriesRaw = await FinancialLedger.aggregate([
      { $match: { status: 'SUCCESS', createdAt: { $gte: startDate, $lt: endDate }, type: { $in: ['ORDER_PAYMENT', 'PLATFORM_FEE'] } } },
      {
        $group: {
          _id: { bucket: { $dateToString: { format: dateFormat, date: '$createdAt' } }, type: '$type' },
          amountPaise: { $sum: '$amountPaise' }
        }
      },
      { $sort: { '_id.bucket': 1 } }
    ]);

    const bucketMap = new Map<string, { time: string; revenue: number; fees: number }>();
    for (const row of revenueTimeseriesRaw) {
      const bucket = row._id.bucket;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, { time: bucket, revenue: 0, fees: 0 });
      const entry = bucketMap.get(bucket)!;
      if (row._id.type === 'ORDER_PAYMENT') entry.revenue = Math.round(row.amountPaise / 100);
      if (row._id.type === 'PLATFORM_FEE') entry.fees = Math.round(row.amountPaise / 100);
    }
    const revenueTimeseries = Array.from(bucketMap.values());

    const paymentMethodBreakdown = await Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amountPaise: { $sum: '$totalAmountPaise' } } },
      { $sort: { amountPaise: -1 } }
    ]);

    const bestSellers = await Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenuePaise: { $sum: '$items.itemTotalPaise' }
        }
      },
      { $sort: { totalRevenuePaise: -1 } },
      { $limit: 5 }
    ]);

    // Scoped to the same [startDate, endDate) window as revenueTimeseries above, so the
    // heatmap actually reflects whatever date range the admin has selected instead of
    // always showing all-time lifetime data regardless of the dashboard's range filter.
    // $hour defaults to UTC — explicitly bucketing in the platform's operating timezone
    // (IST, same default as Business.timezone) so "9 AM" in the chart means 9 AM local
    // wall-clock time for the restaurants, not 9 AM UTC (2:30 PM IST).
    const peakHeatmap = await Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Cancellation & refund rate — the negative-signal counterpart to bestSellers/revenue above:
    // how much of the platform's order volume is failing, not just how much it's making.
    // "Terminal" orders are ones that reached a final state (COMPLETED, CANCELLED, or REFUNDED);
    // still-in-progress orders (PLACED/CONFIRMED/PREPARING/READY/SERVED) aren't a rate yet.
    const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REFUNDED'];
    const MIN_ORDERS_FOR_LEADERBOARD = 3;

    const cancellationTimeseriesRaw = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, orderStatus: { $in: TERMINAL_STATUSES } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          total: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$orderStatus', 'REFUNDED'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const cancellationTimeseries = cancellationTimeseriesRaw.map((row: any) => ({
      time: row._id,
      cancelled: row.cancelled,
      refunded: row.refunded,
      total: row.total,
      rate: row.total > 0 ? Math.round(((row.cancelled + row.refunded) / row.total) * 1000) / 10 : null
    }));

    const platformTotals = cancellationTimeseriesRaw.reduce(
      (acc: any, row: any) => ({
        total: acc.total + row.total,
        cancelled: acc.cancelled + row.cancelled,
        refunded: acc.refunded + row.refunded
      }),
      { total: 0, cancelled: 0, refunded: 0 }
    );
    const cancellationStats = {
      totalTerminalCount: platformTotals.total,
      cancelledCount: platformTotals.cancelled,
      refundedCount: platformTotals.refunded,
      rate: platformTotals.total > 0
        ? Math.round(((platformTotals.cancelled + platformTotals.refunded) / platformTotals.total) * 1000) / 10
        : null
    };

    // Highest cancellation/refund rate businesses — a minimum sample size keeps a business
    // with e.g. 1 cancelled order out of 1 total from showing a meaningless "100%".
    const worstBusinessesByCancellation = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, orderStatus: { $in: TERMINAL_STATUSES } } },
      {
        $group: {
          _id: '$businessId',
          total: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$orderStatus', 'REFUNDED'] }, 1, 0] } }
        }
      },
      { $match: { total: { $gte: MIN_ORDERS_FOR_LEADERBOARD } } },
      { $addFields: { rate: { $multiply: [{ $divide: [{ $add: ['$cancelled', '$refunded'] }, '$total'] }, 100] } } },
      { $sort: { rate: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'businesses', localField: '_id', foreignField: '_id', as: 'business' } },
      { $unwind: '$business' },
      {
        $project: {
          _id: 0,
          businessId: '$_id',
          name: '$business.name',
          slug: '$business.slug',
          total: 1,
          cancelled: 1,
          refunded: 1,
          rate: { $round: ['$rate', 1] }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        revenueTimeseries,
        paymentMethodBreakdown,
        bestSellers,
        peakHeatmap,
        cancellationStats,
        cancellationTimeseries,
        worstBusinessesByCancellation
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Day-of-week x hour-of-day revenue heatmap for a single business — a platform-wide
// hour-only heatmap smears every business's rhythm into noise (a breakfast café's 8 AM
// rush and a bar's 11 PM rush cancel out), and order-count alone hides the fact that a
// handful of big dinner orders can matter more than a lot of small ones. This scopes to
// one business at a time and weights by revenue so the actual pattern is visible. Fixed
// 90-day window: bounded (avoids an unbounded scan as history grows) and long enough
// to give every weekday several samples, which a day-of-week breakdown needs to mean
// anything at all.
const BUSINESS_HEATMAP_WINDOW_DAYS = 90;

// Ranks businesses by actual order revenue in the same 90-day window the heatmap above
// covers — NOT by `lifetimeGMVPaise` (used elsewhere for the businesses table), which is
// derived from *closed remittance periods* and can sit at 0 for a business with plenty of
// live paid orders if its first billing period simply hasn't closed yet. Using that field
// here would make "top N" an arbitrary/tied ordering instead of a real ranking.
export const getTopBusinessesByRevenue = async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 50);
    const since = new Date(Date.now() - BUSINESS_HEATMAP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const ranked = await Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: since } } },
      { $group: { _id: '$businessId', revenuePaise: { $sum: '$totalAmountPaise' }, orders: { $sum: 1 } } },
      { $sort: { revenuePaise: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'businesses',
          localField: '_id',
          foreignField: '_id',
          as: 'business'
        }
      },
      { $unwind: '$business' },
      {
        $project: {
          _id: 1,
          revenuePaise: 1,
          orders: 1,
          name: '$business.name',
          slug: '$business.slug'
        }
      }
    ]);

    return res.json({ success: true, data: { windowDays: BUSINESS_HEATMAP_WINDOW_DAYS, businesses: ranked } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getBusinessHourlyHeatmap = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId as string)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid businessId is required.' } });
    }

    const business = await Business.findById(businessId).select('name slug');
    if (!business) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found.' } });
    }

    const since = new Date(Date.now() - BUSINESS_HEATMAP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const cellsRaw = await Order.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId as string),
          paymentStatus: 'PAID',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          // $dayOfWeek: 1 = Sunday ... 7 = Saturday, timezone-aware so a day genuinely
          // "belongs" to whichever local calendar day the order was placed on — the same
          // Asia/Kolkata convention used for the platform-wide peakHeatmap above.
          _id: {
            day: { $dayOfWeek: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
            hour: { $hour: { date: '$createdAt', timezone: 'Asia/Kolkata' } }
          },
          revenuePaise: { $sum: '$totalAmountPaise' },
          orders: { $sum: 1 }
        }
      }
    ]);

    const cells = cellsRaw.map((c) => ({
      day: c._id.day,
      hour: c._id.hour,
      revenuePaise: c.revenuePaise,
      orders: c.orders
    }));

    return res.json({
      success: true,
      data: {
        business: { _id: business._id, name: business.name, slug: business.slug },
        windowDays: BUSINESS_HEATMAP_WINDOW_DAYS,
        cells
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Super admin: repeat-customer rate, true item margins, and real kitchen speed for one
// business, looked up by id — the same computations getOwnerAnalytics exposes to the business
// itself, so support/ops can inspect any single business without impersonating its owner.
export const getBusinessInsights = async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.query;
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId as string)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid businessId is required.' } });
    }

    const business = await Business.findById(businessId).select('name slug');
    if (!business) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Business not found.' } });
    }

    const [repeatCustomers, itemMargins, kitchenSpeed] = await Promise.all([
      computeRepeatCustomerStats(businessId as string),
      computeItemMargins(businessId as string),
      computeKitchenSpeed(businessId as string)
    ]);

    return res.json({
      success: true,
      data: {
        business: { _id: business._id, name: business.name, slug: business.slug },
        repeatCustomers,
        itemMargins,
        kitchenSpeed
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getSystemHealth = async (req: AuthRequest, res: Response) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return res.json({
      success: true,
      data: {
        status: 'HEALTHY',
        uptimeSeconds: Math.floor(uptime),
        memoryUsage: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        database: 'CONNECTED',
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
