import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { InventoryItem } from '../models/InventoryItem';
import { Table } from '../models/Table';
import { Business } from '../models/Business';
import { Subscription } from '../models/Subscription';
import { getBusinessDayRange, getTrailingDayRange } from '../utils/timezone';

const sumSalesInRange = async (businessId: any, start: Date, end: Date) => {
  const result = await Order.aggregate([
    {
      $match: {
        businessId,
        paymentStatus: 'PAID',
        createdAt: { $gte: start, $lt: end }
      }
    },
    { $group: { _id: null, salesPaise: { $sum: '$totalAmountPaise' }, orders: { $sum: 1 } } }
  ]);
  return { salesPaise: result[0]?.salesPaise || 0, orders: result[0]?.orders || 0 };
};

export const getOwnerAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId;
    const business = await Business.findById(businessId);
    const timezone = business?.timezone || 'Asia/Kolkata';

    const totalOrders = await Order.countDocuments({ businessId });
    const completedOrders = await Order.countDocuments({ businessId, orderStatus: 'COMPLETED' });
    const pendingOrders = await Order.countDocuments({ businessId, orderStatus: { $in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] } });

    // Sales metrics (all-time)
    const salesAggregation = await Order.aggregate([
      { $match: { businessId, paymentStatus: 'PAID' } },
      { $group: { _id: null, totalSalesPaise: { $sum: '$totalAmountPaise' }, totalEarningsPaise: { $sum: '$businessEarningsPaise' } } }
    ]);

    const totalSalesPaise = salesAggregation[0]?.totalSalesPaise || 0;
    const totalEarningsPaise = salesAggregation[0]?.totalEarningsPaise || 0;

    // Active tables & low stock alerts
    const totalTables = await Table.countDocuments({ businessId });
    const occupiedTables = await Table.countDocuments({ businessId, status: 'OCCUPIED' });
    const lowStockItems = await InventoryItem.countDocuments({ businessId, status: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] } });
    const totalMenuItems = await Product.countDocuments({ businessId });

    // Precise "today" / weekly figures, aligned to the business's own timezone
    // (the same calendar day used to mint the ART-DDMMYY-#### order sequence).
    const { start: todayStart, end: todayEnd } = getBusinessDayRange(timezone);
    const todayOrdersCount = await Order.countDocuments({ businessId, createdAt: { $gte: todayStart, $lt: todayEnd } });
    const { salesPaise: todaySalesPaise } = await sumSalesInRange(businessId, todayStart, todayEnd);

    const thisWeekRange = getTrailingDayRange(timezone, 7);
    const lastWeekRange = getTrailingDayRange(timezone, 14);
    const { salesPaise: weekSalesPaise } = await sumSalesInRange(businessId, thisWeekRange.start, thisWeekRange.end);
    const { salesPaise: previousWeekSalesPaise } = await sumSalesInRange(businessId, lastWeekRange.start, thisWeekRange.start);

    const salesTrendPercentage = previousWeekSalesPaise > 0
      ? Math.round(((weekSalesPaise - previousWeekSalesPaise) / previousWeekSalesPaise) * 1000) / 10
      : null;

    // Daily Sales chart data (last 7 days)
    const dailySales = await Order.aggregate([
      { $match: { businessId, createdAt: { $gte: thisWeekRange.start }, paymentStatus: 'PAID' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone } },
          orders: { $sum: 1 },
          salesPaise: { $sum: '$totalAmountPaise' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling items
    const topProducts = await Order.aggregate([
      { $match: { businessId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenuePaise: { $sum: '$items.itemTotalPaise' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    // Subscription plan limits & current usage, so the Settings hub never
    // has to hardcode plan caps — every business has one assigned at signup.
    const subscription = business?.subscriptionId
      ? await Subscription.findById(business.subscriptionId).populate('planId')
      : null;
    const plan: any = subscription?.planId;

    return res.json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          completedOrders,
          pendingOrders,
          totalSalesPaise,
          totalEarningsPaise,
          totalTables,
          occupiedTables,
          lowStockItems,
          totalMenuItems,
          todaySalesPaise,
          todayOrdersCount,
          weekSalesPaise,
          previousWeekSalesPaise,
          salesTrendPercentage
        },
        dailySales,
        topProducts,
        subscription: plan
          ? {
              planName: plan.name,
              planCode: plan.code,
              limits: plan.limits,
              usage: { tables: totalTables, menuItems: totalMenuItems }
            }
          : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
